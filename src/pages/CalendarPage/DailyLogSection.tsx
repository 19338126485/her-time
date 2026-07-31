import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DAILY_LOG_OPTIONS,
  NON_PERIOD_DISCOMFORT_OPTIONS,
  DISCHARGE_OPTIONS,
  DISCHARGE_WARNING_VALUES,
  type IDailyLogRecord,
  type IPeriodRecord,
} from '@/data/period';

type DailyLogKey = keyof typeof DAILY_LOG_OPTIONS;

interface DailyLogSectionProps {
  date: string;
  records: Record<string, IDailyLogRecord>;
  periodRecords: IPeriodRecord[];
  periodDays: number;
  onChange: (date: string, field: keyof IDailyLogRecord, value: string) => void;
}

/**
 * 判断指定日期是否为经期（实际记录的经期）
 */
function isPeriodDay(
  date: string,
  records: IPeriodRecord[],
  periodDays: number
): boolean {
  for (const rec of records) {
    const start = rec.startDate;
    // 如果有结束日期，用结束日期；否则用 start + periodDays - 1
    const end = rec.endDate ?? addDaysStr(start, periodDays - 1);
    if (date >= start && date <= end) return true;
  }
  return false;
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr.replace(/-/g, '/'));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DailyLogSection({
  date,
  records,
  periodRecords,
  periodDays,
  onChange,
}: DailyLogSectionProps) {
  const current = records[date] || {};
  const inPeriod = useMemo(
    () => isPeriodDay(date, periodRecords, periodDays),
    [date, periodRecords, periodDays]
  );

  const handleSelect = (field: keyof IDailyLogRecord, value: string) => {
    onChange(date, field, value);
  };

  // 非经期：多选不适项的处理
  const selectedDiscomforts = useMemo(() => {
    if (!current.discomforts) return new Set<string>();
    return new Set(current.discomforts.split(',').filter(Boolean));
  }, [current.discomforts]);

  const toggleDiscomfort = (value: string) => {
    const next = new Set(selectedDiscomforts);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(date, 'discomforts', Array.from(next).join(','));
  };

  const keys = Object.keys(DAILY_LOG_OPTIONS) as DailyLogKey[];

  return (
    <div className="space-y-4">
      {inPeriod ? (
        // ===== 经期：显示痛经/血块/流量/颜色 =====
        <>
          {keys.map((fieldKey) => {
            const config = DAILY_LOG_OPTIONS[fieldKey];
            const selectedValue = current[fieldKey as keyof IDailyLogRecord] || '';
            const selectedOption = config.options.find((o) => o.value === selectedValue);

            return (
              <div
                key={fieldKey}
                className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur-sm"
              >
                <h3 className="mb-3 text-sm font-medium text-foreground">
                  {config.label}
                </h3>

                <div className="grid grid-cols-4 gap-2">
                  {config.options.map((opt) => {
                    const isActive = selectedValue === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleSelect(fieldKey, opt.value)}
                        className={`rounded-xl border px-1 py-2 text-xs font-medium transition-all ${
                          isActive
                            ? 'border-pink-300 bg-pink-400 text-white shadow-sm'
                            : 'border-border bg-white text-foreground hover:border-pink-200 hover:bg-pink-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  {selectedOption && (
                    <motion.p
                      key={selectedValue}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3 text-xs leading-relaxed text-muted-foreground"
                    >
                      {selectedOption.tip}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </>
      ) : (
        // ===== 非经期：显示整体感受 + 不适选项 + 白带记录 =====
        <>
          <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            今天有哪里不舒服吗？
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSelect('overall', 'fine')}
              className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition-all ${
                current.overall === 'fine'
                  ? 'border-pink-300 bg-pink-400 text-white shadow-sm'
                  : 'border-border bg-white text-foreground hover:border-pink-200 hover:bg-pink-50'
              }`}
            >
              一切安好~
            </button>
            <button
              onClick={() => handleSelect('overall', 'unwell')}
              className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition-all ${
                current.overall === 'unwell'
                  ? 'border-pink-300 bg-pink-400 text-white shadow-sm'
                  : 'border-border bg-white text-foreground hover:border-pink-200 hover:bg-pink-50'
              }`}
            >
              有点不舒服......
            </button>
          </div>

          {/* 一切安好提示 */}
          <AnimatePresence>
            {current.overall === 'fine' && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="mt-3 text-xs leading-relaxed text-muted-foreground"
              >
                今天也是元气满满的一天呢✨
              </motion.p>
            )}
          </AnimatePresence>

          {/* 不适选项展开 */}
          <AnimatePresence>
            {current.overall === 'unwell' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {NON_PERIOD_DISCOMFORT_OPTIONS.map((opt) => {
                    const isActive = selectedDiscomforts.has(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleDiscomfort(opt.value)}
                        className={`rounded-lg border px-1 py-2 text-[11px] font-medium transition-all ${
                          isActive
                            ? 'border-cyan-200 bg-cyan-50 text-cyan-600'
                            : 'border-border bg-white text-muted-foreground hover:border-cyan-100 hover:bg-cyan-50/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* 选中的不适提示语 */}
                <div className="mt-3 space-y-2">
                  {NON_PERIOD_DISCOMFORT_OPTIONS.filter((opt) =>
                    selectedDiscomforts.has(opt.value)
                  ).map((opt) => (
                    <motion.p
                      key={opt.value}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-xs leading-relaxed text-muted-foreground"
                    >
                      <span className="font-medium text-cyan-500">{opt.label}：</span>
                      {opt.tip}
                    </motion.p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 白带状态记录（非经期始终显示） */}
        <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur-sm">
          <p className="mb-3 text-sm font-medium text-foreground">
            记录白带是了解自己身体的好习惯，今天是什么状态呢？
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DISCHARGE_OPTIONS.map((opt) => {
              const isActive = current.discharge === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect('discharge', opt.value)}
                  className={`rounded-xl border px-1 py-2 text-xs font-medium transition-all ${isActive ? 'border-pink-300 bg-pink-400 text-white shadow-sm' : 'border-border bg-white text-foreground hover:border-pink-200 hover:bg-pink-50'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {current.discharge && (
              <motion.div
                key={current.discharge}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="mt-3 space-y-2"
              >
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {DISCHARGE_OPTIONS.find((o) => o.value === current.discharge)?.tip}
                </p>
                {DISCHARGE_WARNING_VALUES.has(current.discharge) && (
                  <p className="text-center text-[11px] text-pink-400">
                    去看医生不是因为你做错了什么，你的身体值得被认真对待。
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </>
      )}

      {/* 日记记录（所有日期始终显示） */}
      <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur-sm">
        <h3 className="mb-3 text-sm font-medium text-foreground">
          回顾一下今天吧~
        </h3>
        <textarea
          value={current.diary || ''}
          onChange={(e) => handleSelect('diary', e.target.value)}
          placeholder="今天心情怎么样？哪里不舒服？记录下来吧。"
          rows={3}
          className="w-full resize-y min-h-[84px] rounded-xl border border-pink-100 bg-white/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200/50 transition-colors"
        />
      </div>

      {/* 底部提示 */}
      <p className="pt-1 text-center text-[11px] text-muted-foreground/60">
        内容仅供参考，如有不适请前往医院咨询专业人士。
      </p>
    </div>
  );
}
