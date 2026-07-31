import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Image,
  Pencil,
  ChevronRight,
} from 'lucide-react';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { Image as UIImage } from '@/components/ui/image';

const STORAGE_KEY_AVATAR = 'user-avatar';
const STORAGE_KEY_NICKNAME = 'user-nickname';
const DEFAULT_NICKNAME = '小仙女';

const MENU_ITEMS = [
  {
    key: 'avatar',
    label: '修改头像',
    icon: Image,
    path: '/profile/avatar',
    subtitle: '选择喜欢的头像',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-400',
  },
  {
    key: 'nickname',
    label: '修改昵称',
    icon: Pencil,
    path: '/profile/nickname',
    subtitle: '随机生成或自定义',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-400',
  },
];

export default function ProfileEditPage() {
  const navigate = useNavigate();
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
  }, []);

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
        <h1 className="text-base font-medium text-foreground">个人信息</h1>
      </div>

      {/* 内容区 */}
      <div className="space-y-6 px-4 py-8">
        {/* 头像 + 昵称展示 */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-200 to-cyan-200 shadow-sm">
            {avatar ? (
              <UIImage
                src={avatar}
                alt="头像"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-white" />
            )}
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">{nickname}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            点击下方修改你的个人信息
          </p>
        </motion.div>

        {/* 菜单列表 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="overflow-hidden rounded-2xl bg-white/80 shadow-sm backdrop-blur-sm"
        >
          {MENU_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === MENU_ITEMS.length - 1;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-pink-50/50 active:bg-pink-100/50 ${
                  isLast ? '' : 'border-b border-pink-50'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
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
            );
          })}
        </motion.div>

        <p className="pt-2 text-center text-xs text-muted-foreground/60">
          个人信息保存在本地，不会上传到服务器
        </p>
      </div>
    </div>
  );
}
