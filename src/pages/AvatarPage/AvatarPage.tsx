import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Camera, Image, X } from 'lucide-react';
import { toast } from 'sonner';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { Image as UIImage } from '@/components/ui/image';

const STORAGE_KEY_AVATAR = 'user-avatar';

// 预设头像：可爱小物品风格
const PRESET_AVATARS = [
  '/spark/app/app_17aj21y68x5/runtime/api/v1/storage/object/bucket_aadkl4d2nlmhg_static/static%2Faadkmcwclimas_ve_miaoda', // 草莓
  '/spark/app/app_17aj21y68x5/runtime/api/v1/storage/object/bucket_aadkl4d2nlmhg_static/static%2Faadkmdcgyeegw_ve_miaoda', // 苹果
  '/spark/app/app_17aj21y68x5/runtime/api/v1/storage/object/bucket_aadkl4d2nlmhg_static/static%2Faadkmcvj65wlw_ve_miaoda', // 桃子
  '/spark/app/app_17aj21y68x5/runtime/api/v1/storage/object/bucket_aadkl4d2nlmhg_static/static%2Faadkmcrymyusw_ve_miaoda', // 云朵
  '/spark/app/app_17aj21y68x5/runtime/api/v1/storage/object/bucket_aadkl4d2nlmhg_static/static%2Faadkmcwclimbs_ve_miaoda', // 月亮
  '/spark/app/app_17aj21y68x5/runtime/api/v1/storage/object/bucket_aadkl4d2nlmhg_static/static%2Faadkmcrymyutw_ve_miaoda', // 小花
];

function getStoredAvatar(): string | null {
  try {
    return scopedStorage.getItem(STORAGE_KEY_AVATAR);
  } catch {
    return null;
  }
}

export default function AvatarPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(() =>
    getStoredAvatar()
  );
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectPreset = (url: string) => {
    setCurrentAvatar(url);
    try {
      scopedStorage.setItem(STORAGE_KEY_AVATAR, url);
    } catch {
      // 忽略
    }
    toast.success('头像已更换');
    setShowPicker(false);
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error('图片大小不能超过 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCurrentAvatar(result);
        try {
          scopedStorage.setItem(STORAGE_KEY_AVATAR, result);
        } catch {
          toast.warning('存储空间不足，头像可能无法持久保存');
        }
        toast.success('头像已更换');
      };
      reader.onerror = () => {
        toast.error('图片读取失败');
      };
      reader.readAsDataURL(file);

      // 重置 input，允许重复选择同一张图
      e.target.value = '';
    },
    []
  );

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
        <h1 className="text-base font-medium text-foreground">头像</h1>
      </div>

      {/* 内容区 */}
      <div className="space-y-8 px-4 py-10">
        {/* 当前头像预览 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-200 to-cyan-200 shadow-sm">
              {currentAvatar ? (
                <UIImage
                  src={currentAvatar}
                  alt="头像"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-white" />
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">点击下方选择你喜欢的头像</p>
        </motion.div>

        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-3"
        >
          <button
            onClick={() => setShowPicker(true)}
            className="flex w-full items-center gap-4 rounded-2xl bg-white/80 p-4 text-left shadow-sm backdrop-blur-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50">
              <Image className="h-5 w-5 text-pink-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">选择预设头像</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                多款精选头像，一键更换
              </p>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center gap-4 rounded-2xl bg-white/80 p-4 text-left shadow-sm backdrop-blur-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
              <Camera className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">从相册上传</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                选择本地图片作为头像
              </p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </motion.div>

        <p className="pt-4 text-center text-xs text-muted-foreground/60">
          头像数据保存在本地，不会上传到服务器
        </p>
      </div>

      {/* 预设头像选择弹窗 */}
      <AnimatePresence>
        {showPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/30"
              onClick={() => setShowPicker(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white pb-6 shadow-xl"
            >
              <div className="mx-auto mb-3 mt-2 h-1 w-10 rounded-full bg-muted" />
              <div className="flex items-center justify-between px-5 pb-3">
                <h3 className="text-sm font-medium text-foreground">选择头像</h3>
                <button
                  onClick={() => setShowPicker(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 px-6 py-4">
                {PRESET_AVATARS.map((url, i) => {
                  const isSelected = currentAvatar === url;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectPreset(url)}
                      className={`relative aspect-square overflow-hidden rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-pink-400 shadow-md'
                          : 'border-transparent hover:border-pink-200'
                      }`}
                    >
                      <UIImage
                        src={url}
                        alt={`头像 ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
