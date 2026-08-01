import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { STORAGE_KEY_ONBOARDING } from '@/data/period';
import BottomTabBar from '@/components/BottomTabBar';

/**
 * 直接从 localStorage 同步读取 onboarding 完成状态，
 * 作为路由守卫与外壳渲染的唯一权威来源。
 * （不能用 usePeriodData 的 React state——多实例 hook 之间不同步，
 * OnboardingPage 提交后 Layout 实例永远拿不到 true，外壳不渲染：
 * 日历页失去 max-w-md 约束铺满全屏、底部导航消失）
 */
function readOnboardingCompleted(): boolean {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY_ONBOARDING);
    if (raw) {
      const data = JSON.parse(raw);
      return !!data.completed;
    }
  } catch {
    // 忽略
  }
  return false;
}

export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [storageCompleted, setStorageCompleted] = useState<boolean>(() =>
    readOnboardingCompleted()
  );

  // onboarding 守卫：每次路径变化时从 localStorage 重读权威状态
  // （completeOnboarding 同步写入 localStorage 后才跳转，此处必然读到最新值）
  useEffect(() => {
    const completed = readOnboardingCompleted();
    setStorageCompleted(completed);
    if (!completed && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    } else if (completed && location.pathname === '/onboarding') {
      navigate('/calendar', { replace: true });
    }
  }, [location.pathname, navigate]);

  const isMainTab =
    location.pathname === '/calendar' ||
    location.pathname === '/knowledge' ||
    location.pathname === '/profile';

  // 未完成 onboarding 时不渲染主界面壳
  if (!storageCompleted) {
    return <Outlet />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-cyan-50 via-pink-50 to-white">
      {/* 内容区：独立滚动，底部留出导航栏空间 */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-md">
          {/*
            只用进入动画，不用 AnimatePresence 退出动画：
            StrictMode + AnimatePresence 的退出动画有概率永不完成，
            页面会永久停在退出态（opacity:0）表现为"卡死"
          */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
      {/* 底部导航栏：fixed 固定在底部，z-index 足够高 */}
      {isMainTab && <BottomTabBar />}
    </div>
  );
};
