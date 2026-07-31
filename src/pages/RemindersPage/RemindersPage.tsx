import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Clock,
  Droplets,
  Heart,
  Moon,
  ChevronRight,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { usePeriodData } from '@/hooks/usePeriodData';
import { formatDate, addDays, diffDays } from '@/utils/date';

/** 排卵日 ≈ 下次月经前 14 天（黄体期固定 14 天的常用近似） */
const LUTEAL_PHASE_DAYS = 14;

const STORAGE_KEY_REMINDERS = 'period-reminders';

interface IReminderSettings {
  periodStart: boolean;
  periodStartOffset: number; // 提前几天提醒
  periodStartTime: string; // 提醒时间 HH:mm
  ovulation: boolean;
  ovulationTime: string;
  dailyLog: boolean;
  dailyLogTime: string;
  sleepReminder: boolean;
  sleepTime: string;
}

const DEFAULT_REMINDERS: IReminderSettings = {
  periodStart: true,
  periodStartOffset: 1,
  periodStartTime: '09:00',
  ovulation: false,
  ovulationTime: '09:00',
  dailyLog: false,
  dailyLogTime: '21:00',
  sleepReminder: false,
  sleepTime: '23:00',
};

function loadReminders(): IReminderSettings {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY_REMINDERS);
    if (raw) {
      return { ...DEFAULT_REMINDERS, ...JSON.parse(raw) };
    }
  } catch {
    // 忽略
  }
  return DEFAULT_REMINDERS;
}

function saveReminders(settings: IReminderSettings) {
  try {
    scopedStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(settings));
  } catch {
    // 忽略
  }
}

interface ReminderItemProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  extra?: React.ReactNode;
}

function ReminderItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  desc,
  checked,
  onToggle,
  extra,
}: ReminderItemProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-pink-400"
        />
      </div>
      {checked && extra && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="ml-13 pl-13"
        >
          {extra}
        </motion.div>
      )}
    </div>
  );
}

interface TimePickerRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TimePickerRow({ label, value, onChange }: TimePickerRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-pink-50/50 px-4 py-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-pink-400" />
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-sm font-medium text-pink-500 outline-none"
        />
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
      </div>
    </div>
  );
}

export default function RemindersPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<IReminderSettings>(() =>
    loadReminders()
  );
  // 预测结果（由 records 派生），经期/排卵提醒都基于它计算触发日
  const { prediction } = usePeriodData();
  const lastFiredRef = useRef<Record<string, string>>({}); // key -> date string

  useEffect(() => {
    saveReminders(settings);
  }, [settings]);

  // 申请通知权限
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      toast.info('通知权限已被拒绝，请在浏览器设置中开启');
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }, []);

  // 发送本地通知
  const sendNotification = useCallback((title: string, body: string) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: undefined,
      });
    } catch {
      // 静默失败
    }
  }, []);

  // 检查并触发提醒（每 30 秒轮询一次，同一天同一提醒只触发一次）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkReminders = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hh}:${mm}`;
      // 本地时区的今天（不能用 toISOString，那是 UTC 日期）
      const todayStr = formatDate(now);

      // 经期提醒：仅在「预测经期开始日 - offset」当天的指定时间触发一次
      if (
        settings.periodStart &&
        settings.periodStartTime === currentTime &&
        prediction
      ) {
        const remindDate = addDays(
          prediction.nextStartDate,
          -settings.periodStartOffset
        );
        if (todayStr === remindDate) {
          const key = `period_${todayStr}`;
          if (lastFiredRef.current[key] !== todayStr) {
            lastFiredRef.current[key] = todayStr;
            const remaining = diffDays(todayStr, prediction.nextStartDate);
            const offsetLabel =
              remaining <= 0 ? '预计今天' : `预计还有 ${remaining} 天`;
            sendNotification(
              '经期提醒',
              `月经${offsetLabel}来潮，记得做好准备哦~`
            );
          }
        }
      }

      // 排卵日提醒：仅在预测排卵日当天触发（下次月经前 14 天）
      if (
        settings.ovulation &&
        settings.ovulationTime === currentTime &&
        prediction
      ) {
        const ovulationDate = addDays(
          prediction.nextStartDate,
          -LUTEAL_PHASE_DAYS
        );
        if (todayStr === ovulationDate) {
          const key = `ovulation_${todayStr}`;
          if (lastFiredRef.current[key] !== todayStr) {
            lastFiredRef.current[key] = todayStr;
            sendNotification('排卵日提醒', '今天是预测排卵日，注意身体变化哦~');
          }
        }
      }

      // 每日记录提醒
      if (settings.dailyLog && settings.dailyLogTime === currentTime) {
        const key = `daily_${todayStr}`;
        if (lastFiredRef.current[key] !== todayStr) {
          lastFiredRef.current[key] = todayStr;
          sendNotification('记录提醒', '今天的身体状态记录了吗？来打卡吧~');
        }
      }

      // 睡眠提醒
      if (settings.sleepReminder && settings.sleepTime === currentTime) {
        const key = `sleep_${todayStr}`;
        if (lastFiredRef.current[key] !== todayStr) {
          lastFiredRef.current[key] = todayStr;
          sendNotification('睡眠提醒', '到点啦，放下手机准备睡觉吧~');
        }
      }
    };

    // 立即检查一次，然后每 30 秒检查一次
    checkReminders();
    const timer = window.setInterval(checkReminders, 30 * 1000);
    return () => window.clearInterval(timer);
  }, [settings, prediction, sendNotification]);

  const updateSetting = <K extends keyof IReminderSettings>(
    key: K,
    value: IReminderSettings[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
  };

  type BooleanReminderKey =
    | 'periodStart'
    | 'ovulation'
    | 'dailyLog'
    | 'sleepReminder';

  const handleToggle = async (key: BooleanReminderKey, checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.info('未授权通知权限，提醒可能不会弹出');
      }
    }
    updateSetting(key, checked);
    const labelMap: Record<BooleanReminderKey, string> = {
      periodStart: '经期提醒',
      ovulation: '排卵提醒',
      dailyLog: '记录提醒',
      sleepReminder: '睡眠提醒',
    };
    toast.success(checked ? `已开启${labelMap[key]}` : `已关闭${labelMap[key]}`);
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
        <h1 className="text-base font-medium text-foreground">我的提醒</h1>
      </div>

      {/* 内容区 */}
      <div className="space-y-5 px-4 py-6">
        {/* 顶部说明 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-50 to-cyan-50 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60">
            <Bell className="h-5 w-5 text-pink-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">贴心提醒</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              开启后会在指定时间发送本地通知，记得授权哦~
            </p>
          </div>
        </motion.div>

        {/* 经期提醒 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-4 rounded-2xl bg-white/80 p-5 shadow-sm backdrop-blur-sm"
        >
          <ReminderItem
            icon={Droplets}
            iconBg="bg-pink-50"
            iconColor="text-pink-400"
            title="经期提醒"
            desc="月经来潮前提醒你做好准备"
            checked={settings.periodStart}
            onToggle={(v) => handleToggle('periodStart', v)}
            extra={
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-pink-50/50 px-4 py-3">
                  <span className="text-sm text-foreground">提前天数</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={settings.periodStartOffset}
                      onChange={(e) =>
                        updateSetting(
                          'periodStartOffset',
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="bg-transparent text-sm font-medium text-pink-500 outline-none"
                    >
                      {[0, 1, 2, 3, 5, 7].map((d) => (
                        <option key={d} value={d}>
                          {d === 0 ? '当天' : `提前 ${d} 天`}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </div>
                <TimePickerRow
                  label="提醒时间"
                  value={settings.periodStartTime}
                  onChange={(v) => updateSetting('periodStartTime', v)}
                />
              </div>
            }
          />
        </motion.div>

        {/* 排卵提醒 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4 rounded-2xl bg-white/80 p-5 shadow-sm backdrop-blur-sm"
        >
          <ReminderItem
            icon={Heart}
            iconBg="bg-purple-50"
            iconColor="text-purple-400"
            title="排卵提醒"
            desc="排卵期到来时提醒你"
            checked={settings.ovulation}
            onToggle={(v) => handleToggle('ovulation', v)}
            extra={
              <TimePickerRow
                label="提醒时间"
                value={settings.ovulationTime}
                onChange={(v) => updateSetting('ovulationTime', v)}
              />
            }
          />
        </motion.div>

        {/* 记录提醒 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="space-y-4 rounded-2xl bg-white/80 p-5 shadow-sm backdrop-blur-sm"
        >
          <ReminderItem
            icon={Bell}
            iconBg="bg-cyan-50"
            iconColor="text-cyan-400"
            title="每日记录提醒"
            desc="每天提醒你记录身体状态"
            checked={settings.dailyLog}
            onToggle={(v) => handleToggle('dailyLog', v)}
            extra={
              <TimePickerRow
                label="提醒时间"
                value={settings.dailyLogTime}
                onChange={(v) => updateSetting('dailyLogTime', v)}
              />
            }
          />
        </motion.div>

        {/* 睡眠提醒 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4 rounded-2xl bg-white/80 p-5 shadow-sm backdrop-blur-sm"
        >
          <ReminderItem
            icon={Moon}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-400"
            title="睡眠提醒"
            desc="到点提醒你该睡觉啦"
            checked={settings.sleepReminder}
            onToggle={(v) => handleToggle('sleepReminder', v)}
            extra={
              <TimePickerRow
                label="入睡时间"
                value={settings.sleepTime}
                onChange={(v) => updateSetting('sleepTime', v)}
              />
            }
          />
        </motion.div>

        <p className="pt-2 text-center text-xs text-muted-foreground/60">
          提醒设置保存在本地，数据不会上传
        </p>
      </div>
    </div>
  );
}
