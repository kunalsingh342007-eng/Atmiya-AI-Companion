import React from 'react';
import { ActiveNavTab } from '../../types/companion';
import { Brain, Gamepad2, Home, Moon, Palette, Settings, Sun } from 'lucide-react';

interface GameShellProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  memoriesCount: number;
  theme: 'dark' | 'light';
  userName?: string;
  xp?: number;
  onToggleTheme: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  id: ActiveNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'home', label: 'Companion', icon: Home },
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'memories', label: 'Memories', icon: Brain },
  { id: 'wardrobe', label: 'Customize', icon: Palette },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const GameShell: React.FC<GameShellProps> = ({
  activeTab,
  onSelectTab,
  memoriesCount,
  theme,
  userName = '',
  xp = 0,
  onToggleTheme,
  children,
}) => {
  const isDark = theme !== 'light';
  const displayUser = userName.trim() || 'You';
  const userInitial = displayUser.charAt(0).toUpperCase();
  const level = 1 + Math.floor(Math.max(0, xp) / 100);

  return (
    <div className="relative flex flex-col lg:flex-row h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#050a14] dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Desktop Deep Navy Left Navigation Sidebar (lg+) */}
      <aside
        aria-label="Primary companion navigation"
        className="hidden lg:flex flex-col justify-between shrink-0 w-20 xl:w-56 bg-white/95 dark:bg-[#070e1d] border-r border-slate-200 dark:border-slate-800/80 z-30 py-4 px-2.5 xl:px-3.5"
      >
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center justify-center xl:justify-start gap-2.5 px-1.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f2347] via-blue-700 to-sky-600 text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm ring-1 ring-sky-400/25 shrink-0">
              आ
            </div>
            <div className="hidden xl:block min-w-0">
              <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                Ātmiya
              </div>
              <div className="text-[11px] text-slate-500 dark:text-sky-300/75 truncate">
                आत्मीय Companion
              </div>
            </div>
          </div>

          {/* 5 Core Navigation Destinations */}
          <nav className="space-y-1" aria-label="Main sections">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={
                    item.id === 'memories' ? `Memories (${memoriesCount})` : item.label
                  }
                  title={item.label}
                  className={`w-full min-h-[42px] px-2.5 xl:px-3 py-2 rounded-xl flex items-center justify-center xl:justify-start gap-3 text-[13px] font-medium transition cursor-pointer whitespace-nowrap border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-sky-500/12 border-blue-200 dark:border-sky-400/25 text-blue-700 dark:text-sky-100 font-semibold shadow-xs'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-blue-600 dark:text-sky-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden xl:inline truncate">{item.label}</span>
                  {item.id === 'memories' && memoriesCount > 0 && (
                    <span
                      className={`hidden xl:inline ml-auto text-[11px] tabular-nums ${
                        isActive
                          ? 'text-blue-600 dark:text-sky-300'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {memoriesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Theme Switcher & User Profile */}
        <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark navy theme'}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Navy'}
            className="w-full min-h-[40px] px-2.5 xl:px-3 py-1.5 rounded-xl flex items-center justify-center xl:justify-start gap-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="hidden xl:inline truncate">
              {isDark ? 'Light Theme' : 'Dark Navy'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            aria-label={`User profile: ${displayUser}, Level ${level}`}
            title={`${displayUser} · Level ${level} (${xp} XP)`}
            className="w-full px-2 xl:px-2.5 py-2 rounded-xl bg-slate-100/80 dark:bg-[#0b152a] hover:bg-slate-200/70 dark:hover:bg-[#101e3a] border border-slate-200/80 dark:border-slate-800/90 flex items-center justify-center xl:justify-start gap-2.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {userInitial}
            </div>
            <div className="hidden xl:block min-w-0 text-left">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {displayUser}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                Lv {level} · {xp} XP
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Active Screen Content */}
      <div className="flex-1 min-h-0 min-w-0 w-full relative overflow-hidden">
        {children}
      </div>

      {/* Mobile & Tablet Compact Bottom Navigation (< lg) */}
      <nav
        aria-label="Mobile companion navigation"
        className="lg:hidden relative z-30 shrink-0 w-full bg-white/95 dark:bg-[#070e1d]/95 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-xl px-2 py-1.5"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-5 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={
                  item.id === 'memories' ? `Memories (${memoriesCount})` : item.label
                }
                className={`min-h-[44px] px-1 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-sky-500/15 text-blue-700 dark:text-sky-100'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-blue-600 dark:text-sky-300'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                <span className="truncate max-w-full">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
