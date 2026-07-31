import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  CalendarClock,
  Bell,
  MessageCircleHeart,
  ChevronRight,
} from 'lucide-react';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { Image as UIImage } from '@/components/ui/image';
import { usePeriodData } from '@/hooks/usePeriodData';

const STORAGE_KEY_AVATAR = 'user-avatar';
const STORAGE_KEY_NICKNAME = 'user-nickname';
const DEFAULT_NICKNAME = '小仙女';

const MENU_ITEMS = [
  {
    key: 'settings',
    label: '经期设置',
    icon: CalendarClock,
    path: '/profile/settings',
    subtitle: '周期长度、经期天数',
  },
  {
    key: 'reminders',
    label: '我的提醒',
    icon: Bell,
    path: '/profile/reminders',
    subtitle: '经期提醒、健康提醒',
  },
  {
    key: 'feedback',
    label: '建议与反馈',
    icon: MessageCircleHeart,
    path: '/profile/feedback',
    subtitle: '告诉我们你的想法',
  },
];

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const menuItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { settings } = usePeriodData();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [nickname, setNickname] = useState(DEFAULT_NICKNAME);

  useEffect(() => {
    try {
      setAvatar(scopedStorage.getItem(STORAGE_KEY_AVATAR));
      setNickname(
        scopedStorage.getItem(STORAGE_KEY_NICKNAME) || DEFAULT_NICKNAME
      );
    } catch {
      // 忽略
    }

    const handleStorage = () => {
      try {
        setAvatar(scopedStorage.getItem(STORAGE_KEY_AVATAR));
        setNickname(
          scopedStorage.getItem(STORAGE_KEY_NICKNAME) || DEFAULT_NICKNAME
        );
      } catch {
        // 忽略
      }
    };

    window.addEventListener('storage', handleStorage);
    // 页面聚焦时也刷新
    const handleFocus = () => handleStorage();
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <div className="space-y-5 px-4 pt-8 pb-24">
      {/* 顶部个人信息区（整体可点击） */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onClick={() => navigate('/profile/edit')}
        className="flex w-full items-center gap-4 rounded-2xl bg-white/70 p-5 text-left shadow-sm backdrop-blur-sm transition-all hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-300 to-cyan-200 shadow-sm">
          {avatar ? (
            <UIImage
              src={avatar}
              alt="头像"
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-8 w-8 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">
            {nickname}
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            周期 {settings.cycleLength} 天 · 经期 {settings.periodDays} 天
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
      </motion.button>

      {/* 菜单列表 */}
      <motion.ul
        variants={container}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-2xl bg-white/70 shadow-sm backdrop-blur-sm"
      >
        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === MENU_ITEMS.length - 1;
          return (
            <motion.li key={item.key} variants={menuItem}>
              <button
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-pink-50/50 active:bg-pink-100/50 ${
                  isLast ? '' : 'border-b border-pink-50'
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-cyan-50">
                  <Icon className="h-5 w-5 text-pink-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </button>
            </motion.li>
          );
        })}
      </motion.ul>

      {/* 底部提示 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="pt-4 text-center text-xs text-muted-foreground/60"
      >
        账号功能开发中，数据暂存本地
      </motion.p>
    </div>
  );
}
