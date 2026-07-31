import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import {
  formatDate,
  generateCalendarCells,
  getMonthLabel,
} from '@/utils/date';

interface DatePickerSheetProps {
  open: boolean;
  value: string;
  title?: string;
  maxDate?: string;
  onConfirm: (date: string) => void;
  onClose: () => void;
}

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function DatePickerSheet({
  open,
  value,
  title = '选择日期',
  maxDate,
  onConfirm,
  onClose,
}: DatePickerSheetProps) {
  const today = new Date();
  const initialDate = value ? new Date(value.replace(/-/g, '/')) : today;
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selected, setSelected] = useState(value);

  // 每次打开时重置视图和选中值
  useEffect(() => {
    if (open) {
      const d = value ? new Date(value.replace(/-/g, '/')) : today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(value);
    }
  }, [open, value]);

  const cells = useMemo(
    () => generateCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelect = (date: string) => {
    if (maxDate && date > maxDate) return;
    setSelected(date);
  };

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl"
          >
            {/* 顶部抓手 */}
            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-muted" />

            {/* 标题栏 */}
            <div className="flex items-center justify-between px-5 py-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-pink-400" />
                <h3 className="text-sm font-medium text-foreground">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 月份切换 */}
            <div className="mb-1 flex items-center justify-between px-4">
              <button
                onClick={goPrev}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50 hover:text-pink-500"
                aria-label="上个月"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-foreground">
                {getMonthLabel(viewYear, viewMonth)}
              </span>
              <button
                onClick={goNext}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50 hover:text-pink-500"
                aria-label="下个月"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* 星期表头 */}
            <div className="mb-1 grid grid-cols-7 px-4 text-center text-xs text-muted-foreground">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* 日期格子 */}
            <div className="grid grid-cols-7 gap-1 px-4 pb-3">
              {cells.map((cell) => {
                const isSelected = cell.date === selected;
                const isTodayCell = cell.date === formatDate(new Date());
                const isDisabled =
                  !cell.isCurrentMonth || (maxDate && cell.date > maxDate);
                return (
                  <button
                    key={cell.date}
                    onClick={() => !isDisabled && handleSelect(cell.date)}
                    disabled={isDisabled}
                    className={`flex aspect-square items-center justify-center rounded-xl text-sm transition-all ${
                      isSelected
                        ? 'bg-pink-400 text-white shadow-sm'
                        : isDisabled
                        ? 'opacity-30'
                        : 'hover:bg-pink-50'
                    } ${isTodayCell && !isSelected ? 'font-bold text-pink-500' : ''}`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* 确认按钮 */}
            <div className="px-5">
              <button
                onClick={handleConfirm}
                disabled={!selected}
                className="w-full rounded-2xl bg-gradient-to-r from-pink-400 to-pink-300 py-3 text-base font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
              >
                确认
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
