import { useState, useEffect, useCallback, useMemo } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import {
  IPeriodSettings,
  IPeriodRecord,
  DEFAULT_SETTINGS,
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_RECORDS,
  STORAGE_KEY_ONBOARDING,
  STORAGE_KEY_DAILY_LOG,
  type PeriodPhase,
  type IOnboardingSurvey,
  type IDailyLogRecord,
} from '@/data/period';
import { formatDate, addDays, diffDays } from '@/utils/date';
import {
  computePrediction,
  getPredictedDateSet,
  type PredictionResult,
} from '@/utils/cycle-store';

/**
 * 经期数据 hook — 统一管理设置和记录，自动同步 localStorage
 *
 * 数据流：records（实际经期记录）是唯一事实源。
 * 预测输入 historyDates / presetCycle 全部由 records/settings 派生（纯函数），
 * 不存在第二份需要手工同步的存储。
 */
export function usePeriodData() {
  const [settings, setSettings] = useState<IPeriodSettings>(() => {
    try {
      const raw = scopedStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // 忽略解析错误，使用默认值
    }
    // 首次进入：默认上次月经为 7 天前
    const today = formatDate(new Date());
    const defaultLast = addDays(today, -7);
    return { ...DEFAULT_SETTINGS, lastPeriodDate: defaultLast };
  });

  const [records, setRecords] = useState<IPeriodRecord[]>(() => {
    try {
      const raw = scopedStorage.getItem(STORAGE_KEY_RECORDS);
      if (raw) {
        return JSON.parse(raw) as IPeriodRecord[];
      }
    } catch {
      // 忽略
    }
    return [];
  });

  // onboarding 完成状态
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(() => {
    try {
      const raw = scopedStorage.getItem(STORAGE_KEY_ONBOARDING);
      if (raw) {
        const data = JSON.parse(raw);
        return !!data.completed;
      }
    } catch {
      // 忽略
    }
    return false;
  });

  // 每日健康记录：{ [date]: IDailyLogRecord }
  const [dailyLogs, setDailyLogs] = useState<Record<string, IDailyLogRecord>>(() => {
    try {
      const raw = scopedStorage.getItem(STORAGE_KEY_DAILY_LOG);
      if (raw) {
        return JSON.parse(raw) as Record<string, IDailyLogRecord>;
      }
    } catch {
      // 忽略
    }
    return {};
  });

  // 持久化设置
  useEffect(() => {
    scopedStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // 持久化记录
  useEffect(() => {
    scopedStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  }, [records]);

  // 持久化每日健康记录
  useEffect(() => {
    scopedStorage.setItem(STORAGE_KEY_DAILY_LOG, JSON.stringify(dailyLogs));
  }, [dailyLogs]);

  // 注意：onboarding 状态在 completeOnboarding 中同步写入 localStorage，
  // 这里不再用 useEffect 持久化，避免与 settings/records 的 useEffect 顺序导致的竞态

  /** 所有真实月经开始日（去重、升序），由 records 派生 */
  const historyDates = useMemo(
    () =>
      [...new Set(records.map((r) => r.startDate))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [records]
  );

  // 预测结果（三档计算，纯函数，输入全部由 records/settings 派生）
  const prediction = useMemo<PredictionResult | null>(() => {
    return computePrediction(
      historyDates,
      settings.cycleLength,
      settings.periodDays
    );
  }, [historyDates, settings.cycleLength, settings.periodDays]);

  /** 更新设置 */
  const updateSettings = useCallback((partial: Partial<IPeriodSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  /**
   * 设置「上次月经日期」
   * 预测引擎只认 records，因此这里实际修改的是最新一条经期记录：
   * - 无记录 → 新建一条（仅开始日）
   * - 有记录 → 把最新一条的开始日改为所选日期
   */
  const setLastPeriodDate = useCallback((date: string) => {
    setRecords((prev) => {
      if (prev.length === 0) {
        return [{ id: `rec_${Date.now()}`, startDate: date, endDate: null }];
      }
      const sorted = [...prev].sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
      );
      const lastIdx = sorted.length - 1;
      if (sorted[lastIdx].startDate === date) return prev;
      sorted[lastIdx] = { ...sorted[lastIdx], startDate: date };
      return sorted;
    });
    setSettings((prev) => ({ ...prev, lastPeriodDate: date }));
  }, []);

  /**
   * 提交问卷并完成 onboarding
   * - 导入最近一次月经日期到 settings.lastPeriodDate
   * - 所有历史日期（含最近一次）去重后作为实际经期记录存入 records
   * - 每条记录按默认经期天数补齐 endDate（否则未结束记录会把之后所有日子染成经期）
   * - 根据历史日期计算平均周期长度
   */
  const completeOnboarding = useCallback((survey: IOnboardingSurvey) => {
    const periodDays = DEFAULT_SETTINGS.periodDays;
    const allDates = [
      ...new Set(
        [survey.lastPeriodDate, ...survey.historyDates].filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    // 计算平均周期长度
    let avgCycle = 28;
    if (allDates.length >= 2) {
      let totalDiff = 0;
      for (let i = 1; i < allDates.length; i++) {
        totalDiff += diffDays(allDates[i - 1], allDates[i]);
      }
      avgCycle = Math.round(totalDiff / (allDates.length - 1));
      // 限制在合理范围
      avgCycle = Math.max(15, Math.min(100, avgCycle));
    }

    // 更新设置
    const newSettings: IPeriodSettings = {
      periodDays,
      cycleLength: avgCycle,
      lastPeriodDate: allDates[allDates.length - 1] ?? survey.lastPeriodDate,
    };
    setSettings(newSettings);

    // 生成历史经期记录（用户只填了开始日，按默认经期天数补齐结束日）
    const newRecords: IPeriodRecord[] = allDates.map((date, idx) => ({
      id: `rec_onboard_${idx}_${date}`,
      startDate: date,
      endDate: addDays(date, periodDays - 1),
    }));
    setRecords(newRecords);

    // 保存问卷数据并标记完成
    const surveyWithComplete: IOnboardingSurvey = {
      ...survey,
      completed: true,
    };
    scopedStorage.setItem(
      STORAGE_KEY_ONBOARDING,
      JSON.stringify(surveyWithComplete)
    );
    setOnboardingCompleted(true);
  }, []);

  /**
   * 更新指定日期的健康记录字段
   */
  const updateDailyLog = useCallback(
    (date: string, field: keyof IDailyLogRecord, value: string) => {
      setDailyLogs((prev) => {
        const next = { ...prev };
        const current = next[date] || {};
        // 如果点击的是当前已选中的值，则取消选择
        if (current[field] === value) {
          const { [field]: _, ...rest } = current;
          if (Object.keys(rest).length === 0) {
            delete next[date];
          } else {
            next[date] = rest as IDailyLogRecord;
          }
        } else {
          next[date] = { ...current, [field]: value };
        }
        return next;
      });
    },
    []
  );

  /**
   * 判断指定日期是否在实际经期记录中
   */
  const isDateInActualPeriod = useCallback(
    (date: string): boolean => {
      for (const rec of records) {
        const end = rec.endDate ?? rec.startDate;
        if (rec.startDate <= date && end >= date) return true;
      }
      return false;
    },
    [records]
  );

  /**
   * 调整指定经期记录的开始日（前移），结束日保持不变
   * 用于用户在已有的经期开始日之前打开开关时的确认后操作
   */
  const adjustPeriodStart = useCallback(
    (oldStartDate: string, newStartDate: string) => {
      setRecords((prev) => {
        const next = [...prev];
        const idx = next.findIndex((r) => r.startDate === oldStartDate);
        if (idx === -1) return prev;
        next[idx] = { ...next[idx], startDate: newStartDate };
        return next.sort((a, b) => a.startDate.localeCompare(b.startDate));
      });
      // 同步更新 lastPeriodDate（如新日期更晚）
      setSettings((prev) => {
        if (newStartDate > prev.lastPeriodDate) {
          return { ...prev, lastPeriodDate: newStartDate };
        }
        return prev;
      });
    },
    []
  );

  /**
   * 切换指定日期的经期标记（开关形式）
   * - 打开开关：自动从该日起按 periodDays 填充整段经期
   * - 关闭开关：
   *   - 若是开始日 → 删除整段经期记录
   *   - 若是中间/结束日 → 只取消当天标记
   */
  const togglePeriodDay = useCallback(
    (date: string) => {
      setRecords((prev) => {
        // 找到包含该日期的记录
        const containingIndex = prev.findIndex((r) => {
          const end = r.endDate ?? r.startDate;
          return r.startDate <= date && end >= date;
        });

        if (containingIndex !== -1) {
          // ===== 已是经期 → 关闭开关 =====
          const rec = prev[containingIndex];
          const end = rec.endDate ?? rec.startDate;
          const next = [...prev];

          if (rec.startDate === date) {
            // 是开始日 → 删除整段经期
            next.splice(containingIndex, 1);
          } else if (end === date) {
            // 是结束日 → endDate 前移一天
            next[containingIndex] = { ...rec, endDate: addDays(date, -1) };
          } else {
            // 在中间 → 只取消当天，拆成两段
            const beforeRec = { ...rec, endDate: addDays(date, -1) };
            const afterRec = {
              ...rec,
              id: `rec_${Date.now()}_split`,
              startDate: addDays(date, 1),
            };
            next.splice(containingIndex, 1, beforeRec, afterRec);
          }

          return next.sort((a, b) => a.startDate.localeCompare(b.startDate));
        } else {
          // ===== 非经期 → 打开开关，自动填充整段经期 =====
          const next = [...prev];
          const prevDay = addDays(date, -1);
          const nextDay = addDays(date, 1);

          // 找前一天所在的记录（endDate == prevDay）
          const prevRecIndex = next.findIndex((r) => {
            const end = r.endDate ?? r.startDate;
            return end === prevDay;
          });

          // 找后一天所在的记录（startDate == nextDay）
          const nextRecIndex = next.findIndex((r) => r.startDate === nextDay);

          if (prevRecIndex !== -1 && nextRecIndex !== -1) {
            // 前后都有 → 合并两段
            const prevRec = next[prevRecIndex];
            const nextRec = next[nextRecIndex];
            const merged = {
              ...prevRec,
              endDate: nextRec.endDate ?? nextRec.startDate,
            };
            const [first, second] =
              prevRecIndex < nextRecIndex
                ? [prevRecIndex, nextRecIndex]
                : [nextRecIndex, prevRecIndex];
            next.splice(second, 1);
            next.splice(first, 1, merged);
          } else if (prevRecIndex !== -1) {
            // 前面有经期 → 扩展一天
            next[prevRecIndex] = { ...next[prevRecIndex], endDate: date };
          } else if (nextRecIndex !== -1) {
            // 后面有经期 → 前移一天
            next[nextRecIndex] = { ...next[nextRecIndex], startDate: date };
          } else {
            // 全新一段 → 按设置的经期天数自动填充
            const endDate = addDays(date, settings.periodDays - 1);
            next.push({
              id: `rec_${Date.now()}`,
              startDate: date,
              endDate,
            });
          }

          return next.sort((a, b) => a.startDate.localeCompare(b.startDate));
        }
      });

      // 同步更新 lastPeriodDate（如果新日期更晚）
      setSettings((prev) => {
        if (date > prev.lastPeriodDate) {
          return { ...prev, lastPeriodDate: date };
        }
        return prev;
      });
    },
    [settings.periodDays]
  );

  /**
   * 计算预测经期日期集合
   * 基于三档预测逻辑推算
   * 返回 Set<string> 格式的预测经期日期
   */
  const getPredictedPeriodDates = useCallback(
    (fromDate: string, toDate: string): Set<string> => {
      return getPredictedDateSet(
        fromDate,
        toDate,
        settings.periodDays,
        historyDates,
        settings.cycleLength,
        records
      );
    },
    [records, historyDates, settings.periodDays, settings.cycleLength]
  );

  /**
   * 计算实际经期日期集合（从 records 中提取）
   * endDate 为 null 的记录只标记开始日一天
   */
  const getActualPeriodDates = useCallback(
    (fromDate: string, toDate: string): Set<string> => {
      const dates = new Set<string>();

      for (const record of records) {
        const start = record.startDate;
        const end = record.endDate ?? record.startDate;
        if (end < fromDate || start > toDate) continue;

        let d = start < fromDate ? fromDate : start;
        const realEnd = end > toDate ? toDate : end;
        while (d <= realEnd) {
          dates.add(d);
          d = addDays(d, 1);
        }
      }

      return dates;
    },
    [records]
  );

  /**
   * 计算距离下次月经的天数（负数表示已推迟）
   */
  const getDaysUntilNextPeriod = useCallback((): number => {
    if (!prediction) return -1;
    const today = formatDate(new Date());
    return diffDays(today, prediction.nextStartDate);
  }, [prediction]);

  /**
   * 计算指定日期所属的周期阶段
   * 显示优先级：实际经期记录 > 月经期推算 > 排卵日 > 黄体期 > 卵泡期
   * 返回 null 表示无法计算
   *
   * 计算规则（严格按日期划分，不重叠）：
   * - 月经期：周期第 1 天 ~ 第 M 天（M = 经期天数）
   * - 卵泡期：月经结束后第一天 ~ 排卵日前 1 天
   * - 排卵日：仅 1 天（下次月经第一天往前推 14 天，黄体期固定 14 天是常用近似）
   * - 黄体期：排卵日后 1 天 ~ 下次月经前 1 天
   *
   * 动态计算：
   * - 多个历史月经日：相邻两个实际日期之间按实际间隔天数计算
   * - 只有一个月经日：按预测周期长度向前向后推算
   * - 未来预测：基于最近一次实际月经 + 三档预测结果
   */
  const getPhaseForDate = useCallback(
    (date: string): PeriodPhase | null => {
      if (!prediction && records.length === 0) return null;

      const { periodDays } = settings;
      const LUTEAL_PHASE_DAYS = 14; // 黄体期固定 14 天（常用近似值）

      // 实际记录优先：当天在实际经期记录内，一律视为月经期
      for (const rec of records) {
        const end = rec.endDate ?? rec.startDate;
        if (rec.startDate <= date && date <= end) return 'menstrual';
      }

      // 收集所有实际月经开始日（升序）
      const actualStarts = records
        .map((r) => r.startDate)
        .sort((a, b) => a.localeCompare(b));

      let cycleStart: string;
      let nextPeriodStart: string;

      if (actualStarts.length === 0) {
        // 无实际记录且无预测 → 返回 null
        return null;
      } else {
        // 找 date 之前/之后最近的实际开始日
        let prevActual: string | null = null;
        let nextActual: string | null = null;
        for (const s of actualStarts) {
          if (s <= date) {
            prevActual = s;
          } else {
            nextActual = s;
            break;
          }
        }

        const predCycle = prediction?.cycleDays ?? settings.cycleLength;

        if (prevActual && nextActual) {
          // 在两次实际记录之间：用实际间隔
          cycleStart = prevActual;
          nextPeriodStart = nextActual;
        } else if (prevActual) {
          // 在最后一次实际记录之后：用预测周期长度推算
          cycleStart = prevActual;
          const diff = diffDays(prevActual, date);
          const cyclesAhead = Math.floor(diff / predCycle);
          cycleStart = addDays(prevActual, cyclesAhead * predCycle);
          nextPeriodStart = addDays(cycleStart, predCycle);
        } else {
          // 在首次实际记录之前：用预测周期长度回溯
          const firstActual = actualStarts[0];
          const diff = diffDays(date, firstActual);
          const cyclesBack = Math.ceil(diff / predCycle);
          cycleStart = addDays(firstActual, -cyclesBack * predCycle);
          nextPeriodStart = addDays(cycleStart, predCycle);
        }
      }

      // 排卵日 = 下次月经第一天往前推 14 天
      const ovulationDay = addDays(nextPeriodStart, -LUTEAL_PHASE_DAYS);
      // 黄体期：排卵日后 1 天 ~ 下次月经前 1 天
      const lutealStart = addDays(ovulationDay, 1);
      const lutealEnd = addDays(nextPeriodStart, -1);
      // 月经期：周期开始日起 periodDays 天
      const periodEndDate = addDays(cycleStart, periodDays - 1);

      // 按优先级判断（月经期 > 排卵日 > 黄体期 > 卵泡期）
      if (date >= cycleStart && date <= periodEndDate) {
        return 'menstrual';
      }
      if (date === ovulationDay) {
        return 'ovulation';
      }
      if (date >= lutealStart && date <= lutealEnd) {
        return 'luteal';
      }
      // 卵泡期：月经结束后到排卵日前
      if (date > periodEndDate && date < ovulationDay) {
        return 'follicular';
      }

      return null;
    },
    [settings.periodDays, settings.cycleLength, records, prediction]
  );

  /**
   * 批量计算日期范围内每天的周期阶段
   * 返回 Map<date, PeriodPhase>
   */
  const getPhaseDatesMap = useCallback(
    (fromDate: string, toDate: string): Map<string, PeriodPhase> => {
      const map = new Map<string, PeriodPhase>();
      if (!prediction && records.length === 0) return map;

      let d = fromDate;
      while (d <= toDate) {
        const phase = getPhaseForDate(d);
        if (phase) {
          map.set(d, phase);
        }
        d = addDays(d, 1);
      }
      return map;
    },
    [records, prediction, getPhaseForDate]
  );

  return {
    settings,
    records,
    dailyLogs,
    onboardingCompleted,
    prediction,
    updateSettings,
    setLastPeriodDate,
    togglePeriodDay,
    isDateInActualPeriod,
    adjustPeriodStart,
    completeOnboarding,
    updateDailyLog,
    getPredictedPeriodDates,
    getActualPeriodDates,
    getDaysUntilNextPeriod,
    getPhaseForDate,
    getPhaseDatesMap,
  };
}
