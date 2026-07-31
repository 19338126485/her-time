import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePeriodData } from '@/hooks/usePeriodData';
import { PHASE_LABELS, PHASE_DOT_COLORS, type PeriodPhase } from '@/data/period';
import DailyLogSection from '@/pages/CalendarPage/DailyLogSection';
import { Button } from '@/components/ui/button';
import {
  generateCalendarCells,
  formatDate,
  isFuture,
  isToday,
  getMonthLabel,
  addDays,
  diffDays,
} from '@/utils/date';

function formatMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarPage() {
  const {
    settings,
    getPredictedPeriodDates,
    getActualPeriodDates,
    getDaysUntilNextPeriod,
    getPhaseForDate,
    getPhaseDatesMap,
    updateDailyLog,
    dailyLogs,
    records,
    togglePeriodDay,
    isDateInActualPeriod,
    adjustPeriodStart,
    prediction,
  } = usePeriodData();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(formatDate(today));

  // 日期范围限制：向前1年 + 向后2年（仅在挂载时计算一次）
  const [dateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const end = new Date(now.getFullYear() + 2, now.getMonth(), 28);
    return { start, end };
  });

  const canGoPrev = useMemo(() => {
    const firstDate = new Date(viewYear, viewMonth, 1);
    return firstDate > dateRange.start;
  }, [viewYear, viewMonth, dateRange]);

  const canGoNext = useMemo(() => {
    const lastDate = new Date(viewYear, viewMonth + 1, 0);
    return lastDate < dateRange.end;
  }, [viewYear, viewMonth, dateRange]);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth, canGoPrev]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth, canGoNext]);

  const cells = useMemo(
    () => generateCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // 计算当月预测经期和实际经期
  const monthDates = useMemo(() => {
    const currentCells = cells.filter((c) => c.isCurrentMonth);
    if (currentCells.length === 0) return { from: '', to: '' };
    return {
      from: currentCells[0].date,
      to: currentCells[currentCells.length - 1].date,
    };
  }, [cells]);

  const predictedDates = useMemo(() => {
    if (!monthDates.from || !prediction) return new Set<string>();
    return getPredictedPeriodDates(monthDates.from, monthDates.to);
  }, [monthDates, prediction, getPredictedPeriodDates]);

  const actualDates = useMemo(() => {
    if (!monthDates.from) return new Set<string>();
    return getActualPeriodDates(monthDates.from, monthDates.to);
  }, [monthDates, getActualPeriodDates]);

  // 计算当月每天的周期阶段
  const phaseMap = useMemo(() => {
    if (!monthDates.from || !prediction) return new Map<string, PeriodPhase>();
    return getPhaseDatesMap(monthDates.from, monthDates.to);
  }, [monthDates, prediction, getPhaseDatesMap]);

  // 选中日期的阶段
  const selectedPhase = useMemo(() => {
    if (!prediction) return null;
    return getPhaseForDate(selectedDate);
  }, [selectedDate, prediction, getPhaseForDate]);

  const daysUntilNext = useMemo(() => getDaysUntilNextPeriod(), [getDaysUntilNextPeriod]);

  const isSelectedFuture = isFuture(selectedDate);
  const isDatePeriod = isDateInActualPeriod(selectedDate);
  const isPeriodStartDay = useMemo(() => {
    if (!isDatePeriod) return false;
    // 找到包含该日期的记录，判断是否为开始日
    for (const rec of records) {
      const end = rec.endDate ?? rec.startDate;
      if (rec.startDate <= selectedDate && end >= selectedDate) {
        return rec.startDate === selectedDate;
      }
    }
    return false;
  }, [isDatePeriod, records, selectedDate]);

  const switchLabel = useMemo(() => {
    if (!isDatePeriod) return '月经开始';
    if (isPeriodStartDay) return '月经开始';
    return '月经结束';
  }, [isDatePeriod, isPeriodStartDay]);

  const handleTogglePeriod = () => {
    // 如果当前已是经期 → 直接执行关闭逻辑
    if (isDatePeriod) {
      togglePeriodDay(selectedDate);
      toast.success(isPeriodStartDay ? '已取消整段经期标记' : '已取消当日经期标记');
      return;
    }

    // 如果是打开开关，检查是否在某段经期开始日之前
    const targetRecord = findRecordBeforeDate(selectedDate);
    if (targetRecord) {
      setConfirmDialog({ open: true, oldStart: targetRecord.startDate, newStart: selectedDate });
      return;
    }

    togglePeriodDay(selectedDate);
    toast.success('已标记当日为经期');
  };

  // 找到开始日在 selectedDate 之后、且与 selectedDate 间隔在经期天数内的经期记录
  const findRecordBeforeDate = (date: string) => {
    for (const rec of records) {
      const end = rec.endDate ?? rec.startDate;
      // 该日期在记录开始日之前，且间隔在经期天数以内（属于同一段可能的前移）
      if (date < rec.startDate) {
        const diff = Math.abs(diffDays(date, rec.startDate));
        if (diff <= settings.periodDays) {
          return rec;
        }
      }
    }
    return null;
  };

  const handleConfirmAdjust = () => {
    if (!confirmDialog.oldStart || !confirmDialog.newStart) return;
    adjustPeriodStart(confirmDialog.oldStart, confirmDialog.newStart);
    setConfirmDialog({ open: false, oldStart: null, newStart: null });
    toast.success('已调整经期开始日期');
  };

  const handleCancelAdjust = () => {
    setConfirmDialog({ open: false, oldStart: null, newStart: null });
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    oldStart: string | null;
    newStart: string | null;
  }>({ open: false, oldStart: null, newStart: null });

  return (
    <div className="space-y-5 px-4 pt-6 pb-24">
      {/* 倒计时横幅 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-300 via-pink-200 to-cyan-100 p-5 shadow-sm"
      >
        <div className="relative z-10">
          {!prediction ? (
            <>
              <p className="text-sm text-pink-800/80">请继续记录，以开启预测</p>
              <div className="mt-1">
                <span className="text-2xl font-bold text-pink-600">--</span>
              </div>
            </>
          ) : prediction.level === 'level3' ? (
            <>
              <p className="text-sm text-pink-800/80">
                {daysUntilNext > 0
                  ? `距离下次月经约 ${daysUntilNext} 天`
                  : daysUntilNext === 0
                  ? '预计最近几天来潮'
                  : `月经已推迟约 ${-daysUntilNext} 天`}
              </p>
              <div className="mt-1">
                <span className="text-xl font-bold text-pink-600">
                  预计 {formatMonthDay(prediction.nextStartDate)} - {formatMonthDay(prediction.nextEndDate)}
                </span>
              </div>
            </>
          ) : daysUntilNext < 0 ? (
            <>
              <p className="text-sm text-pink-800/80">月经已推迟</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-pink-600">
                  {-daysUntilNext}
                </span>
                <span className="text-sm text-pink-700">天</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-pink-800/80">
                {daysUntilNext === 0 ? '预计今天来潮' : '距离下次月经还有'}
              </p>
              {daysUntilNext > 0 && (
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-pink-600">
                    {daysUntilNext}
                  </span>
                  <span className="text-sm text-pink-700">天</span>
                </div>
              )}
            </>
          )}
          {/* 档位提示 */}
          {prediction?.level === 'level1' && (
            <p className="mt-2 text-xs text-pink-700/80">
              此为初始估算，记录2次真实经期后将自动切换为精准模式
            </p>
          )}
          {prediction?.level === 'level2' && (
            <p className="mt-2 text-xs text-pink-700/80">
              数据较少，暂以此周期推算，建议再记录1次以提高准确率
            </p>
          )}
          {prediction?.level === 'level3' && prediction.deviationFromPreset >= 3 && (
            <p className="mt-2 text-xs text-pink-700/80">
              检测到实际周期与预设不同，已自动切换为真实数据模式
            </p>
          )}
        </div>
        <Droplets className="absolute -right-2 -bottom-2 h-20 w-20 text-white/30" />
      </motion.div>

      {/* 日历卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur-sm"
      >
        {/* 月份切换 */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50 hover:text-pink-500 disabled:opacity-30"
            aria-label="上个月"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold text-foreground">
            {getMonthLabel(viewYear, viewMonth)}
          </h2>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50 hover:text-pink-500 disabled:opacity-30"
            aria-label="下个月"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* 周期阶段图例 */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${PHASE_DOT_COLORS.follicular}`} />
            <span>{PHASE_LABELS.follicular}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${PHASE_DOT_COLORS.ovulation}`} />
            <span>{PHASE_LABELS.ovulation}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${PHASE_DOT_COLORS.luteal}`} />
            <span>{PHASE_LABELS.luteal}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${PHASE_DOT_COLORS.menstrual}`} />
            <span>{PHASE_LABELS.menstrual}</span>
          </div>
        </div>

        {/* 星期表头 */}
        <div className="mb-2 grid grid-cols-7 text-center text-xs text-muted-foreground">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* 日期格子 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-7 gap-1"
          >
            {cells.map((cell) => {
              const isActual = actualDates.has(cell.date);
              const isPredicted = predictedDates.has(cell.date) && !isActual;
              const isSelected = cell.date === selectedDate;
              const isTodayCell = isToday(cell.date);
              const phase = cell.isCurrentMonth ? phaseMap.get(cell.date) : undefined;

              let bgClass = '';
              let textClass = '';

              if (isActual) {
                bgClass = 'text-white';
              } else if (isPredicted && cell.isCurrentMonth) {
                if (prediction?.level === 'level1') {
                  // level1: 灰色虚线圆圈标记，不用粉色
                  bgClass = 'border border-dashed border-gray-300 text-gray-500';
                } else {
                  // level2/3: 浅粉色半透明背景
                  bgClass = 'text-pink-700';
                }
              } else if (!cell.isCurrentMonth) {
                textClass = 'text-muted-foreground/40';
              }

              const dotColor = phase ? PHASE_DOT_COLORS[phase] : '';

              // 真实经期 / 预测经期的背景用内联样式保证精确色值
              const cellStyle: React.CSSProperties = {};
              if (isActual) {
                cellStyle.backgroundColor = '#D6336C';
              } else if (isPredicted && cell.isCurrentMonth && prediction?.level !== 'level1') {
                cellStyle.backgroundColor = 'rgba(255, 182, 193, 0.5)';
              }

              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDate(cell.date)}
                  style={cellStyle}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-all duration-200 ${bgClass} ${textClass} ${
                    isSelected
                      ? 'ring-2 ring-pink-400 ring-offset-1'
                      : 'hover:bg-pink-50'
                  } ${cell.isCurrentMonth ? '' : 'opacity-50'}`}
                >
                  <span className={isTodayCell && !isActual ? 'font-bold text-pink-500' : ''}>
                    {cell.day}
                  </span>
                  {dotColor && (
                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${dotColor}`} />
                  )}
                  {isTodayCell && !dotColor && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pink-400" />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* 图例 */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md border border-dashed border-gray-300" />
            <span>初始估算</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: 'rgba(255, 182, 193, 0.5)' }}
            />
            <span>预测经期</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: '#D6336C' }}
            />
            <span>实际经期</span>
          </div>
        </div>
      </motion.div>

      {/* 操作按钮区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="pb-4"
      >
        {/* 选中日期阶段信息 */}
        {selectedPhase && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            key={`phase-${selectedDate}`}
            className="mb-3 text-center text-xs text-muted-foreground"
          >
            当前处于
            <span
              className={`ml-1 inline-flex items-center gap-1 font-medium ${
                selectedPhase === 'ovulation'
                  ? 'text-purple-500'
                  : selectedPhase === 'follicular'
                  ? 'text-cyan-500'
                  : selectedPhase === 'luteal'
                  ? 'text-amber-600'
                  : 'text-pink-500'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${PHASE_DOT_COLORS[selectedPhase]}`} />
              {PHASE_LABELS[selectedPhase]}
            </span>
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          {isSelectedFuture ? (
            <motion.div
              key="future-tip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex flex-col items-center gap-2"
            >
              <p className="text-center text-sm text-muted-foreground">
                无法记录未来的日子
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="toggle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center justify-between rounded-2xl bg-white/80 px-5 py-4 shadow-sm backdrop-blur-sm"
            >
              <span className="text-sm font-medium text-foreground">
                {switchLabel}
              </span>
              <button
                onClick={handleTogglePeriod}
                role="switch"
                aria-checked={isDatePeriod}
                className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${isDatePeriod ? 'bg-pink-400' : 'bg-muted'}`}
              >
                <motion.span
                  animate={{ x: isDatePeriod ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm"
                />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 选中日期显示 */}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          已选日期：{selectedDate}
        </p>
      </motion.div>

      {/* 每日健康记录 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="pb-4"
      >
        <DailyLogSection
          date={selectedDate}
          records={dailyLogs}
          periodRecords={records}
          periodDays={settings.periodDays}
          onChange={updateDailyLog}
        />
       </motion.div>

      {/* 调整经期开始日确认弹窗 */}
      <AnimatePresence>
        {confirmDialog.open && confirmDialog.oldStart && confirmDialog.newStart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6"
            onClick={handleCancelAdjust}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-foreground">
                调整经期开始日期？
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                你已经在
                {parseInt(confirmDialog.oldStart.slice(5, 7), 10)}月
                {parseInt(confirmDialog.oldStart.slice(8, 10), 10)}日
                标记了经期开始，要调整到
                {parseInt(confirmDialog.newStart.slice(5, 7), 10)}月
                {parseInt(confirmDialog.newStart.slice(8, 10), 10)}日
                吗？月经周期会相应调整哦~
              </p>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full border-pink-200 text-foreground hover:bg-pink-50"
                  onClick={handleCancelAdjust}
                >
                  否
                </Button>
                <Button
                  className="flex-1 rounded-full bg-pink-400 text-white hover:bg-pink-500"
                  onClick={handleConfirmAdjust}
                >
                  是
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
