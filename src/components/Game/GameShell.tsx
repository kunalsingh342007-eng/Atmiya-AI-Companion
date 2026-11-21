import React from 'react';
import { ActiveNavTab } from '../../types/companion';
import { Brain, Gamepad2, Home, Moon, Palette, Settings, Sun } from 'lucide-react';

interface GameShellProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  memoriesCount: number;
  theme: 'dark' | 'light';
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
  { id: 'wardrobe', label: 'Wardrobe', icon: Palette },
  { id: 'memories', label: 'Memories', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const GameShell: React.FC<GameShellProps> = ({
  activeTab,
  onSelectTab,
  memoriesCount,
  theme,
  onToggleTheme,
  children,
}) => {
  const isDark = theme !== 'light';

  return (
    <div className="relative flex flex-col lg:flex-row h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#070d1a] dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Desktop Compact Left Navigation Rail (lg+) */}
      <aside
        aria-label="Primary companion navigation"
        className="hidden lg:flex flex-col justify-between shrink-0 w-20 xl:w-52 bg-white/95 dark:bg-[#0a1326]/95 border-r border-slate-200 dark:border-slate-800/80 z-30 py-4 px-2.5 xl:px-3.5"
      >
        <div className="space-y-6">
          {/* Brand Identity */}
          <div className="flex items-center justify-center xl:justify-start gap-2.5 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f2347] to-blue-600 text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm shrink-0">
              आ
            </div>
            <div className="hidden xl:block min-w-0">
              <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                Ātmiya
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                आत्मीय Companion
              </div>
            </div>
          </div>

          {/* 5 Primary Destinations */}
          <nav className="space-y-1.5" aria-label="Main sections">
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
                  className={`w-full min-h-[44px] px-2.5 xl:px-3.5 py-2 rounded-xl flex items-center justify-center xl:justify-start gap-3 text-[13px] font-semibold transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden xl:inline truncate">{item.label}</span>
                  {item.id === 'memories' && memoriesCount > 0 && (
                    <span
                      className={`hidden xl:inline ml-auto text-[11px] tabular-nums ${
                        isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
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

        {/* Bottom Theme Switcher & Keyboard Hint */}
        <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark navy theme'}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="w-full min-h-[44px] px-2.5 xl:px-3.5 py-2 rounded-xl flex items-center justify-center xl:justify-start gap-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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

          <div className="hidden xl:flex items-center justify-between px-3 text-[11px] text-slate-400 dark:text-slate-500">
            <span>Voice shortcut</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
              T
            </kbd>
          </div>
        </div>
      </aside>

      {/* Main Active Screen Content */}
      <div className="flex-1 min-h-0 min-w-0 w-full relative overflow-hidden">
        {children}
      </div>

      {/* Mobile & Tablet Compact Bottom Navigation (< lg) */}
      <nav
        aria-label="Mobile companion navigation"
        className="lg:hidden relative z-30 shrink-0 w-full bg-white/95 dark:bg-[#091224]/95 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-xl px-2 py-1.5"
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
                className={`min-h-[44px] px-1 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
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
