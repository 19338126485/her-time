import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { usePeriodData } from '@/hooks/usePeriodData';
import { formatDate } from '@/utils/date';
import WheelPicker from '@/components/WheelPicker';
import DatePickerSheet from '@/components/DatePickerSheet';

export default function PeriodSettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, setLastPeriodDate } = usePeriodData();

  const [pickerType, setPickerType] = useState<'period' | 'cycle' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handlePeriodConfirm = (value: number) => {
    updateSettings({ periodDays: value });
    toast.success(`经期天数已设置为 ${value} 天`);
  };

  const handleCycleConfirm = (value: number) => {
    updateSettings({ cycleLength: value });
    toast.success(`周期长度已设置为 ${value} 天`);
  };

  const handleDateConfirm = (date: string) => {
    setLastPeriodDate(date);
    setShowDatePicker(false);
    toast.success('上次月经日期已更新');
  };

  return (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-pink-50 bg-white/80 px-4 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-pink-50"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-medium text-foreground">经期设置</h1>
      </div>

      {/* 设置项列表 */}
      <div className="space-y-4 px-4 py-6">
        {/* 经期天数 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl bg-white/70 p-5 shadow-sm backdrop-blur-sm"
        >
          <p className="text-sm text-muted-foreground">
            您的月经大概持续几天？
          </p>
          <button
            onClick={() => setPickerType('period')}
            className="mt-3 flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-pink-50 to-cyan-50 px-4 py-3 text-left transition-all active:scale-[0.98]"
          >
            <span className="text-sm font-medium text-foreground">
              经期天数
            </span>
            <span className="text-sm font-semibold text-pink-500">
              {settings.periodDays} 天
            </span>
          </button>
        </motion.div>

        {/* 周期长度 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl bg-white/70 p-5 shadow-sm backdrop-blur-sm"
        >
          <p className="text-sm text-muted-foreground">
            两次月经开始日大概间隔多久？
          </p>
          <button
            onClick={() => setPickerType('cycle')}
            className="mt-3 flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-pink-50 to-cyan-50 px-4 py-3 text-left transition-all active:scale-[0.98]"
          >
            <span className="text-sm font-medium text-foreground">
              选择周期长度
            </span>
            <span className="text-sm font-semibold text-pink-500">
              {settings.cycleLength} 天
            </span>
          </button>
        </motion.div>

        {/* 上次月经日期 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl bg-white/70 p-5 shadow-sm backdrop-blur-sm"
        >
          <p className="text-sm text-muted-foreground">
            您上次月经来潮是什么时间？
          </p>
          <button
            onClick={() => setShowDatePicker(true)}
            className="mt-3 flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-pink-50 to-cyan-50 px-4 py-3 text-left transition-all active:scale-[0.98]"
          >
            <span className="text-sm font-medium text-foreground">
              选择日期
            </span>
            <span className="text-sm font-semibold text-pink-500">
              {settings.lastPeriodDate || '未设置'}
            </span>
          </button>
        </motion.div>

        {/* 提示文字 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="pt-2 text-center text-xs text-muted-foreground/60"
        >
          设置完成后，日历将自动预测下次经期
        </motion.p>
      </div>

      {/* 轮盘选择器 */}
      <WheelPicker
        open={pickerType === 'period'}
        min={2}
        max={14}
        value={settings.periodDays}
        title="选择经期天数"
        unit="天"
        onConfirm={handlePeriodConfirm}
        onClose={() => setPickerType(null)}
      />
      <WheelPicker
        open={pickerType === 'cycle'}
        min={15}
        max={100}
        value={settings.cycleLength}
        title="选择周期长度"
        unit="天"
        onConfirm={handleCycleConfirm}
        onClose={() => setPickerType(null)}
      />

      {/* 日期选择器（不能选未来日期） */}
      <DatePickerSheet
        open={showDatePicker}
        value={settings.lastPeriodDate}
        title="选择上次月经日期"
        maxDate={formatDate(new Date())}
        onConfirm={handleDateConfirm}
        onClose={() => setShowDatePicker(false)}
      />
    </div>
  );
}
