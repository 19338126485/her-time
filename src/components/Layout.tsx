import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { STORAGE_KEY_ONBOARDING } from '@/data/period';
import { usePeriodData } from '@/hooks/usePeriodData';
import BottomTabBar from '@/components/BottomTabBar';

/**
 * 直接从 localStorage 同步读取 onboarding 完成状态，
 * 用于路由守卫的初始判断，避免依赖 React state 异步更新导致的重定向竞态。
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
  const { onboardingCompleted } = usePeriodData();

  // 用 ref 跟踪是否已执行过初始守卫，避免首次渲染时 state 还没初始化导致的跳转抖动
  const hasGuarded = useRef(false);
  // 用本地 state 跟踪 localStorage 的同步值，作为守卫的权威来源
  const [storageCompleted, setStorageCompleted] = useState<boolean>(() =>
    readOnboardingCompleted()
  );

  // 当 React state 的 onboardingCompleted 变化时，同步更新本地守卫状态
  // （React state 变化意味着 completeOnboarding 已经把数据写入了 localStorage）
  useEffect(() => {
    if (onboardingCompleted !== storageCompleted) {
      setStorageCompleted(onboardingCompleted);
    }
  }, [onboardingCompleted, storageCompleted]);

  // onboarding 守卫 —— 只在路径变化时执行一次判断
  useEffect(() => {
    const completed = readOnboardingCompleted();
    if (!completed && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    } else if (completed && location.pathname === '/onboarding') {
      navigate('/calendar', { replace: true });
    }
    hasGuarded.current = true;
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
