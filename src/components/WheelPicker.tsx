import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface WheelPickerProps {
  open: boolean;
  min: number;
  max: number;
  value: number;
  unit?: string;
  title: string;
  onConfirm: (value: number) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 48;
const VISIBLE_COUNT = 5; // 显示 5 项，中间为选中

export default function WheelPicker({
  open,
  min,
  max,
  value,
  unit = '天',
  title,
  onConfirm,
  onClose,
}: WheelPickerProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const isDragging = useRef(false);
  const [offset, setOffset] = useState(0);
  // 拖拽中禁用弹簧过渡，否则每一帧都在和动画打架（手感发肉）
  const [dragging, setDragging] = useState(false);

  const total = max - min + 1;
  const centerIndex = Math.floor(VISIBLE_COUNT / 2);

  // 根据值计算初始偏移
  useEffect(() => {
    if (open) {
      setCurrentValue(value);
      const index = value - min;
      setOffset(-index * ITEM_HEIGHT);
    }
  }, [open, value, min]);

  // 根据偏移量计算当前选中值
  const getValueFromOffset = useCallback(
    (off: number) => {
      const index = Math.round(-off / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(total - 1, index));
      return min + clampedIndex;
    },
    [min, total]
  );

  // 吸附到最近的项
  const snapToNearest = useCallback(
    (off: number) => {
      const index = Math.round(-off / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(total - 1, index));
      return -clampedIndex * ITEM_HEIGHT;
    },
    [total]
  );

  // 触摸/鼠标共用一套拖拽逻辑
  const dragBegin = (clientY: number) => {
    isDragging.current = true;
    setDragging(true);
    startY.current = clientY;
    startOffset.current = offset;
  };

  const dragMove = (clientY: number) => {
    if (!isDragging.current) return;
    const deltaY = clientY - startY.current;
    let newOffset = startOffset.current + deltaY;
    // 边界阻尼
    const maxOffset = 0;
    const minOffset = -(total - 1) * ITEM_HEIGHT;
    if (newOffset > maxOffset) {
      newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
    } else if (newOffset < minOffset) {
      newOffset = minOffset + (newOffset - minOffset) * 0.3;
    }
    setOffset(newOffset);
    setCurrentValue(getValueFromOffset(newOffset));
  };

  const dragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    const snapped = snapToNearest(offset);
    setOffset(snapped);
    setCurrentValue(getValueFromOffset(snapped));
  };

  const handleConfirm = () => {
    onConfirm(currentValue);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30"
            onClick={onClose}
          />
          {/* 弹窗 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white pb-6 pt-4 shadow-xl"
          >
            {/* 顶部把手 */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />

            {/* 标题栏 */}
            <div className="flex items-center justify-between px-5 pb-3">
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-sm font-medium text-foreground">{title}</h3>
              <button
                onClick={handleConfirm}
                className="rounded-full bg-pink-400 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-pink-500"
              >
                确认
              </button>
            </div>

            {/* 轮盘区域 */}
            <div
              ref={containerRef}
              className="relative mx-auto h-[240px] w-40 overflow-hidden select-none"
              onTouchStart={(e) => dragBegin(e.touches[0].clientY)}
              onTouchMove={(e) => dragMove(e.touches[0].clientY)}
              onTouchEnd={dragEnd}
              onMouseDown={(e) => {
                e.preventDefault();
                dragBegin(e.clientY);
              }}
              onMouseMove={(e) => dragMove(e.clientY)}
              onMouseUp={dragEnd}
              onMouseLeave={dragEnd}
            >
              {/* 上下渐变遮罩 */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-white to-transparent" />

              {/* 中间选中线 */}
              <div
                className="pointer-events-none absolute left-0 right-0 z-10 border-y border-pink-200/50"
                style={{ top: centerIndex * ITEM_HEIGHT, height: ITEM_HEIGHT }}
              />

              {/* 滚轮内容 */}
              <motion.div
                style={{
                  y: offset,
                  paddingTop: centerIndex * ITEM_HEIGHT,
                  paddingBottom: centerIndex * ITEM_HEIGHT,
                }}
                transition={
                  dragging
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 300, damping: 25 }
                }
              >
                {Array.from({ length: total }, (_, i) => {
                  const val = min + i;
                  const isSelected = val === currentValue;
                  return (
                    <div
                      key={val}
                      className={`flex items-center justify-center transition-all duration-150 ${
                        isSelected
                          ? 'text-lg font-bold text-pink-500'
                          : 'text-base text-muted-foreground'
                      }`}
                      style={{ height: ITEM_HEIGHT }}
                    >
                      {val}
                      <span className="ml-1 text-xs opacity-70">{unit}</span>
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
