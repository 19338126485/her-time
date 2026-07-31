import { addDays, diffDays, formatDate } from './date';

/**
 * 预测档位
 * - level1: 0~1 个真实日期，用 presetCycle 估算，灰色虚线
 * - level2: 2 个真实日期，用实际间隔推算，浅粉色实心
 * - level3: ≥3 个真实日期，用最近3次间隔平均值+最大偏差范围，浅粉色实心
 */
export type PredictionLevel = 'level1' | 'level2' | 'level3';

export interface PredictionResult {
  /** 预测档位 */
  level: PredictionLevel;
  /** 最近一次真实月经开始日 */
  lastActualDate: string;
  /** 预测的下次月经起始日（level3 为范围起始日） */
  nextStartDate: string;
  /** level3 时预测范围结束日；level1/level2 时等于 nextStartDate */
  nextEndDate: string;
  /** 用于计算的周期天数（level3 为最近3次平均，level2 为实际间隔，level1 为 presetCycle） */
  cycleDays: number;
  /** 经期持续天数（用于计算预测经期整段） */
  periodDays: number;
  /** 最近 3 次间隔的最大偏差（天），level1/level2 为 0 */
  maxDeviation: number;
  /** 实际周期与 presetCycle 的偏差（天），level3 时计算，其他档位为 0 */
  deviationFromPreset: number;
}

/**
 * 本模块为纯函数：不读写 localStorage，不产生副作用。
 * 预测输入（historyDates / presetCycle）全部由调用方从 records/settings 派生，
 * records 是经期数据的唯一事实源。
 */

/** 规范化历史日期：去空、去重、升序 */
function normalizeDates(dates: string[]): string[] {
  return [...new Set(dates.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** 医学上一个周期至少 15 天才有可能，小于此视为脏数据 */
const MIN_PLAUSIBLE_CYCLE = 15;

/**
 * 三档预测计算
 * @param historyDatesRaw 所有真实月经开始日（允许乱序/重复，内部会规范化）
 * @param presetCycle 用户设置的周期天数（仅作初始参考），可为 null
 * @param periodDays 经期持续天数
 */
export function computePrediction(
  historyDatesRaw: string[],
  presetCycle: number | null,
  periodDays: number
): PredictionResult | null {
  const historyDates = normalizeDates(historyDatesRaw);
  if (historyDates.length === 0) return null;

  const lastDate = historyDates[historyDates.length - 1];
  const preset = presetCycle ?? 28;

  if (historyDates.length === 1) {
    // 第1档：用 presetCycle，没有就用 28 天兜底
    const nextStart = addDays(lastDate, preset);
    return {
      level: 'level1',
      lastActualDate: lastDate,
      nextStartDate: nextStart,
      nextEndDate: nextStart,
      cycleDays: preset,
      periodDays,
      maxDeviation: 0,
      deviationFromPreset: 0,
    };
  }

  if (historyDates.length === 2) {
    // 第2档：两个日期的实际间隔
    let interval = diffDays(historyDates[0], historyDates[1]);
    // 防御：间隔异常（脏数据）时回退到预设周期，避免下游除零/死循环
    if (interval < MIN_PLAUSIBLE_CYCLE) interval = preset;
    const nextStart = addDays(lastDate, interval);
    const dev = presetCycle ? Math.abs(interval - presetCycle) : 0;
    return {
      level: 'level2',
      lastActualDate: lastDate,
      nextStartDate: nextStart,
      nextEndDate: nextStart,
      cycleDays: interval,
      periodDays,
      maxDeviation: 0,
      deviationFromPreset: dev,
    };
  }

  // 第3档：最近 3 次间隔的平均值 + 最大偏差范围
  const recent3 = historyDates.slice(-3);
  const intervals: number[] = [];
  for (let i = 1; i < recent3.length; i++) {
    intervals.push(diffDays(recent3[i - 1], recent3[i]));
  }
  let avgCycle = Math.round(
    intervals.reduce((a, b) => a + b, 0) / intervals.length
  );
  // 防御：平均周期异常时回退到预设周期
  if (avgCycle < MIN_PLAUSIBLE_CYCLE) avgCycle = preset;
  const maxDev = Math.max(...intervals) - Math.min(...intervals);
  const nextStart = addDays(lastDate, avgCycle);
  // 范围：起始日为平均值 - maxDev/2，结束日为平均值 + maxDev/2
  // 至少 ±2 天保证范围有意义
  const halfDev = Math.max(2, Math.ceil(maxDev / 2));
  const rangeStart = addDays(nextStart, -halfDev);
  const rangeEnd = addDays(nextStart, halfDev);
  const devFromPreset = presetCycle ? Math.abs(avgCycle - presetCycle) : 0;

  return {
    level: 'level3',
    lastActualDate: lastDate,
    nextStartDate: rangeStart,
    nextEndDate: rangeEnd,
    cycleDays: avgCycle,
    periodDays,
    maxDeviation: maxDev,
    deviationFromPreset: devFromPreset,
  };
}

/** 预测向后推算的最远范围：日历允许向后翻 2 年，预测需覆盖 */
const HORIZON_DAYS = 2 * 365 + 30;

/**
 * 计算指定日期范围内所有预测经期日期集合
 * level3: 范围内每一天都用浅粉色覆盖（开始日~结束日 + 经期天数）
 * level1/2: 按周期循环推算
 */
export function getPredictedDateSet(
  fromDate: string,
  toDate: string,
  periodDays: number,
  historyDates: string[],
  presetCycle: number | null,
  actualRecords: { startDate: string; endDate: string | null }[]
): Set<string> {
  const dates = new Set<string>();
  const pred = computePrediction(historyDates, presetCycle, periodDays);
  if (!pred) return dates;

  const { lastActualDate, cycleDays, level } = pred;
  // 防御：周期天数异常时直接返回空集，避免死循环
  if (cycleDays <= 0) return dates;

  // 向后推算，至少覆盖日历可翻页的范围（2 年）
  const horizonEnd = addDays(formatDate(new Date()), HORIZON_DAYS);
  const farEnd = toDate > horizonEnd ? toDate : horizonEnd;

  if (level === 'level3') {
    // level3: 只标记未来最近一次预测范围（从 nextStartDate 到 nextEndDate + periodDays - 1）
    // 再往后按 cycleDays 继续推算
    let rangeStart = pred.nextStartDate;
    let rangeEnd = pred.nextEndDate;

    while (rangeStart <= farEnd) {
      // 这段预测经期的实际覆盖范围：rangeStart ~ rangeEnd + periodDays - 1
      const periodEnd = addDays(rangeEnd, periodDays - 1);
      // 检查是否与实际记录重叠
      let overlaps = false;
      for (const rec of actualRecords) {
        const recEnd = rec.endDate ?? rec.startDate;
        if (rangeStart <= recEnd && periodEnd >= rec.startDate) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        let d = rangeStart < fromDate ? fromDate : rangeStart;
        while (d <= periodEnd && d <= farEnd) {
          if (d >= fromDate && d <= toDate) {
            dates.add(d);
          }
          d = addDays(d, 1);
        }
      }
      // 下一段：按平均周期推进
      rangeStart = addDays(rangeStart, cycleDays);
      rangeEnd = addDays(rangeEnd, cycleDays);
    }
  } else {
    // level1/2: 从最后一次实际经期开始，按周期循环推算
    let currentStart = lastActualDate;
    // 向前回溯（如果 fromDate 早于 lastActualDate）
    while (addDays(currentStart, periodDays - 1) >= fromDate) {
      currentStart = addDays(currentStart, -cycleDays);
    }

    while (currentStart <= farEnd) {
      const periodEnd = addDays(currentStart, periodDays - 1);
      let overlaps = false;
      for (const rec of actualRecords) {
        const recEnd = rec.endDate ?? rec.startDate;
        if (currentStart <= recEnd && periodEnd >= rec.startDate) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        let d = currentStart < fromDate ? fromDate : currentStart;
        while (d <= periodEnd && d <= farEnd) {
          if (d >= fromDate && d <= toDate) {
            dates.add(d);
          }
          d = addDays(d, 1);
        }
      }
      currentStart = addDays(currentStart, cycleDays);
    }
  }

  return dates;
}
