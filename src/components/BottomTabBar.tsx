import { NavLink } from 'react-router-dom';
import { Calendar, BookOpen, User } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/calendar', label: '日历', icon: Calendar },
  { path: '/knowledge', label: '知识库', icon: BookOpen },
  { path: '/profile', label: '我', icon: User },
];

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-pink-100 bg-white/95 shadow-[0_-2px_12px_rgba(0_0_0_0.04)] backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/calendar'}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors ${
                  isActive ? 'text-pink-500' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-pink-400"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px]">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
      {/* 安全区域：iOS 用 env()；Android WebView env() 恒为 0，
          由 @capacitor-community/safe-area 注入的 CSS 变量兜底 */}
      <div className="h-[max(env(safe-area-inset-bottom),var(--safe-area-inset-bottom,0px))]" />
    </nav>
  );
}
