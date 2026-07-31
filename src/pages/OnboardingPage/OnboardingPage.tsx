import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, X, Calendar, Heart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { usePeriodData } from '@/hooks/usePeriodData';
import {
  type IOnboardingSurvey,
  type CycleRegularity,
  type DysmenorrheaLevel,
} from '@/data/period';
import { formatDate } from '@/utils/date';
import DatePickerSheet from '@/components/DatePickerSheet';

const REGULARITY_OPTIONS: { value: CycleRegularity; label: string; desc: string }[] = [
  { value: 'regular', label: '规律', desc: '周期天数基本固定' },
  { value: 'irregular', label: '不规律', desc: '周期波动较大' },
  { value: 'unsure', label: '不确定', desc: '还不太清楚' },
];

const DYSMENORRHEA_OPTIONS: { value: DysmenorrheaLevel; label: string; desc: string }[] = [
  { value: 'none', label: '几乎不痛', desc: '没有明显感觉' },
  { value: 'mild', label: '轻微疼痛', desc: '不影响生活' },
  { value: 'moderate', label: '中等疼痛', desc: '需要休息' },
  { value: 'severe', label: '严重疼痛', desc: '影响日常活动' },
];

const MAX_HISTORY_DATES = 8;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { completeOnboarding } = usePeriodData();

  const todayStr = formatDate(new Date());

  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [historyDates, setHistoryDates] = useState<string[]>(['']);
  const [cycleRegularity, setCycleRegularity] = useState<CycleRegularity | ''>('');
  const [dysmenorrhea, setDysmenorrhea] = useState<DysmenorrheaLevel | ''>('');
  const [otherInfo, setOtherInfo] = useState('');

  // 日期选择器状态：-1 = 最近一次，>=0 = 历史第几个，null = 关闭
  const [datePickerIndex, setDatePickerIndex] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [errorBounceKey, setErrorBounceKey] = useState(0);

  const isLastPeriodValid = !!lastPeriodDate;
  const isRegularityValid = !!cycleRegularity;
  const isDysmenorrheaValid = !!dysmenorrhea;

  const canSubmit = isLastPeriodValid && isRegularityValid && isDysmenorrheaValid;

  const openLastPeriodPicker = () => setDatePickerIndex(-1);
  const openHistoryPicker = (index: number) => setDatePickerIndex(index);
  const closePicker = () => setDatePickerIndex(null);

  const handleDateConfirm = (date: string) => {
    // 校验：不允许与其他已填日期重复（重复日期会让预测引擎算出 0 天间隔）
    const others =
      datePickerIndex === -1
        ? historyDates.filter(Boolean)
        : [
            lastPeriodDate,
            ...historyDates.filter((_, i) => i !== datePickerIndex),
          ].filter(Boolean);
    if (others.includes(date)) {
      toast.error('这个日期已经填写过了，请换一个日期');
      closePicker();
      return;
    }
    if (datePickerIndex === -1) {
      setLastPeriodDate(date);
    } else if (datePickerIndex !== null) {
      const next = [...historyDates];
      next[datePickerIndex] = date;
      setHistoryDates(next);
    }
    closePicker();
  };

  const addHistoryDate = () => {
    if (historyDates.length >= MAX_HISTORY_DATES) return;
    setHistoryDates([...historyDates, '']);
  };

  const removeHistoryDate = (index: number) => {
    if (historyDates.length <= 1) return;
    const next = historyDates.filter((_, i) => i !== index);
    setHistoryDates(next);
  };

  // 计算当前日期选择器的初始值
  const currentPickerValue = useMemo(() => {
    if (datePickerIndex === null) return '';
    if (datePickerIndex === -1) return lastPeriodDate;
    return historyDates[datePickerIndex] || '';
  }, [datePickerIndex, lastPeriodDate, historyDates]);

  const handleSubmit = () => {
    if (!canSubmit) {
      setShowErrors(true);
      setErrorBounceKey((k) => k + 1);
      toast.error('请填写必填项');

      // 滚动到第一个未填写的必填项
      const firstInvalidId = !isLastPeriodValid
        ? 'field-last-period'
        : !isRegularityValid
        ? 'field-regularity'
        : 'field-dysmenorrhea';
      setTimeout(() => {
        const el = document.getElementById(firstInvalidId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    // 过滤掉空的历史日期
    const validHistoryDates = historyDates.filter(Boolean);

    const survey: IOnboardingSurvey = {
      lastPeriodDate,
      historyDates: validHistoryDates,
      cycleRegularity: cycleRegularity as CycleRegularity,
      dysmenorrhea: dysmenorrhea as DysmenorrheaLevel,
      otherInfo,
      completed: true,
    };

    completeOnboarding(survey);
    toast.success('✅ 数据已同步至日历预测引擎');
    navigate('/calendar', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-pink-50 to-white px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* 顶部标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-300 to-cyan-200 shadow-sm">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            欢迎使用
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            花一分钟填写，让我们更了解你的周期
          </p>
        </motion.div>

        {/* 问卷卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-6 rounded-3xl bg-white/80 p-6 shadow-sm backdrop-blur-sm"
        >
          {/* 1. 最近一次月经开始日 */}
          <div id="field-last-period" className="space-y-2">
            <label className="flex items-center text-sm font-medium text-foreground">
              最近一次月经开始日
              <span className="ml-1 text-pink-500">*</span>
            </label>
            <button
              onClick={openLastPeriodPicker}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                lastPeriodDate
                  ? 'border-pink-200 bg-pink-50/50 text-foreground'
                  : 'border-border bg-white text-muted-foreground'
              } ${showErrors && !isLastPeriodValid ? 'border-red-300' : ''}`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-pink-400" />
                {lastPeriodDate || '请选择日期'}
              </span>
              <span className="text-xs text-muted-foreground">选择 →</span>
            </button>
            <p className="text-xs text-muted-foreground">
              请选择你最近一次月经来潮的第一天
            </p>
            {showErrors && !isLastPeriodValid && (
              <motion.p
                key={`last-period-${errorBounceKey}`}
                initial={{ y: 0 }}
                animate={{ y: [0, -4, 0, -4, 0] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="text-xs text-red-400"
              >
                请选择日期
              </motion.p>
            )}
          </div>

          {/* 2. 历史月经开始日 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              历史月经开始日
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                （选填，建议填写）
              </span>
            </label>
            <div className="space-y-2">
              {historyDates.map((date, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    onClick={() => openHistoryPicker(index)}
                    className={`flex flex-1 items-center justify-between rounded-xl border px-4 py-2.5 text-left transition-all ${
                      date
                        ? 'border-cyan-100 bg-cyan-50/50 text-foreground'
                        : 'border-border bg-white text-muted-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-cyan-400" />
                      {date || `第 ${index + 1} 次`}
                    </span>
                    <span className="text-xs text-muted-foreground">选择 →</span>
                  </button>
                  {historyDates.length > 1 && (
                    <button
                      onClick={() => removeHistoryDate(index)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50 hover:text-pink-500"
                      aria-label="删除"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {historyDates.length < MAX_HISTORY_DATES && (
              <button
                onClick={addHistoryDate}
                className="flex items-center gap-1.5 text-sm text-pink-400 transition-colors hover:text-pink-500"
              >
                <Plus className="h-4 w-4" />
                添加
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              填写更多历史日期能让预测更准确，最多可填 {MAX_HISTORY_DATES} 次
            </p>
          </div>

          {/* 3. 月经周期是否规律 */}
          <div id="field-regularity" className="space-y-2">
            <label className="flex items-center text-sm font-medium text-foreground">
              你的月经周期规律吗？
              <span className="ml-1 text-pink-500">*</span>
            </label>
            <div className="space-y-2">
              {REGULARITY_OPTIONS.map((opt) => {
                const isActive = cycleRegularity === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setCycleRegularity(opt.value)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-pink-300 bg-pink-50'
                        : 'border-border bg-white hover:border-pink-100 hover:bg-pink-50/30'
                    } ${showErrors && !isRegularityValid ? 'border-red-300' : ''}`}
                  >
                    <div>
                      <p className={`text-sm font-medium ${isActive ? 'text-pink-600' : 'text-foreground'}`}>
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                    {isActive && (
                      <div className="h-4 w-4 rounded-full bg-pink-400 ring-2 ring-pink-200" />
                    )}
                  </button>
                );
              })}
            </div>
            {showErrors && !isRegularityValid && (
              <motion.p
                key={`regularity-${errorBounceKey}`}
                initial={{ y: 0 }}
                animate={{ y: [0, -4, 0, -4, 0] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="text-xs text-red-400"
              >
                请选择一项
              </motion.p>
            )}
          </div>

          {/* 4. 痛经情况 */}
          <div id="field-dysmenorrhea" className="space-y-2">
            <label className="flex items-center text-sm font-medium text-foreground">
              痛经情况
              <span className="ml-1 text-pink-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DYSMENORRHEA_OPTIONS.map((opt) => {
                const isActive = dysmenorrhea === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDysmenorrhea(opt.value)}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'border-pink-300 bg-pink-50'
                        : 'border-border bg-white hover:border-pink-100 hover:bg-pink-50/30'
                    } ${showErrors && !isDysmenorrheaValid ? 'border-red-300' : ''}`}
                  >
                    <p className={`text-sm font-medium ${isActive ? 'text-pink-600' : 'text-foreground'}`}>
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            {showErrors && !isDysmenorrheaValid && (
              <motion.p
                key={`dysmenorrhea-${errorBounceKey}`}
                initial={{ y: 0 }}
                animate={{ y: [0, -4, 0, -4, 0] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="text-xs text-red-400"
              >
                请选择一项
              </motion.p>
            )}
          </div>

          {/* 5. 其他信息 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              其他想补充的信息
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                （选填）
              </span>
            </label>
            <textarea
              value={otherInfo}
              onChange={(e) => setOtherInfo(e.target.value)}
              placeholder="有什么想记录的都可以写在这里..."
              className="h-24 w-full resize-none rounded-xl border border-border bg-white p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-100"
              maxLength={300}
            />
            <div className="text-right text-xs text-muted-foreground">
              {otherInfo.length}/300
            </div>
          </div>
        </motion.div>

        {/* 底部按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8"
        >
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-400 to-pink-300 py-4 text-base font-medium text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:shadow-none"
          >
            <Sparkles className="h-5 w-5" />
            开始使用
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground/60">
            数据仅保存在本地，不会上传到服务器
          </p>
        </motion.div>
      </div>

      {/* 日期选择器 */}
      <DatePickerSheet
        open={datePickerIndex !== null}
        value={currentPickerValue}
        title={datePickerIndex === -1 ? '最近一次月经开始日' : `第 ${(datePickerIndex ?? 0) + 1} 次月经开始日`}
        maxDate={todayStr}
        onConfirm={handleDateConfirm}
        onClose={closePicker}
      />
    </div>
  );
}
