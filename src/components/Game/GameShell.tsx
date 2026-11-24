import React from 'react';
import { ActiveNavTab } from '../../types/companion';
import {
  BookOpen,
  Brain,
  ChevronDown,
  Dices,
  Gamepad2,
  Home,
  Palette,
  Settings,
} from 'lucide-react';

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

interface SidebarNavItem {
  id: string;
  targetTab?: ActiveNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  implemented: boolean;
}

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: 'home', targetTab: 'home', label: 'Home', icon: Home, implemented: true },
  { id: 'play', targetTab: 'play', label: 'Play', icon: Gamepad2, implemented: true },
  { id: 'memories', targetTab: 'memories', label: 'Memories', icon: Brain, implemented: true },
  { id: 'wardrobe', targetTab: 'wardrobe', label: 'Customize', icon: Palette, implemented: true },
  { id: 'learning', label: 'Learning', icon: BookOpen, implemented: false },
  { id: 'games', targetTab: 'play', label: 'Games', icon: Dices, implemented: true },
  { id: 'settings', targetTab: 'settings', label: 'Settings', icon: Settings, implemented: true },
];

const MOBILE_NAV_ITEMS: {
  id: ActiveNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'memories', label: 'Memories', icon: Brain },
  { id: 'wardrobe', label: 'Customize', icon: Palette },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const AtmiyaLotusLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <defs>
      <linearGradient id="atmiya-lotus-grad" x1="8" y1="12" x2="56" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="52%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
    </defs>
    {/* Center Petal */}
    <path
      d="M32 10C37.5 18.5 39.5 28 32 41C24.5 28 26.5 18.5 32 10Z"
      stroke="url(#atmiya-lotus-grad)"
      strokeWidth="2.4"
      strokeLinejoin="round"
      fill="url(#atmiya-lotus-grad)"
      fillOpacity="0.16"
    />
    {/* Inner Side Petals */}
    <path
      d="M28.5 41C19 36 14 27 16.5 17.5C22.5 21 26.5 29.5 28.5 41Z"
      stroke="url(#atmiya-lotus-grad)"
      strokeWidth="2.2"
      strokeLinejoin="round"
      fill="url(#atmiya-lotus-grad)"
      fillOpacity="0.1"
    />
    <path
      d="M35.5 41C45 36 50 27 47.5 17.5C41.5 21 37.5 29.5 35.5 41Z"
      stroke="url(#atmiya-lotus-grad)"
      strokeWidth="2.2"
      strokeLinejoin="round"
      fill="url(#atmiya-lotus-grad)"
      fillOpacity="0.1"
    />
    {/* Outer Side Petals */}
    <path
      d="M26 44C15.5 43.5 9.5 37 8 28.5C15 29 21 34 26 44Z"
      stroke="url(#atmiya-lotus-grad)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M38 44C48.5 43.5 54.5 37 56 28.5C49 29 43 34 38 44Z"
      stroke="url(#atmiya-lotus-grad)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Base Smile Arc */}
    <path
      d="M19 49C27.5 52.5 36.5 52.5 45 49"
      stroke="#38bdf8"
      strokeOpacity="0.7"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const GameShell: React.FC<GameShellProps> = ({
  activeTab,
  onSelectTab,
  memoriesCount,
  userName = '',
  xp = 0,
  children,
}) => {
  const displayUser = userName.trim() || 'You';
  const userInitial = displayUser.charAt(0).toUpperCase();
  const level = 1 + Math.floor(Math.max(0, xp) / 100);

  return (
    <div className="relative flex flex-col md:flex-row h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#040818] dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Desktop & Tablet Deep Navy Left Navigation Sidebar (md+) */}
      <aside
        aria-label="Primary companion navigation"
        className="hidden md:flex flex-col justify-between shrink-0 w-[76px] lg:w-[216px] bg-white/95 dark:bg-gradient-to-b dark:from-[#070f28] dark:via-[#060c21] dark:to-[#040818] border-r border-slate-200 dark:border-indigo-400/18 z-30 py-4 px-2.5 lg:px-3.5 shadow-[6px_0_32px_rgba(2,6,23,0.45)]"
      >
        <div className="space-y-5">
          {/* Official Ātmiya Lotus Brand Crest */}
          <div className="flex flex-col items-center justify-center pt-1 pb-2.5 border-b border-slate-200/80 dark:border-indigo-400/12">
            <div className="relative flex items-center justify-center">
              <div
                aria-hidden="true"
                className="hidden dark:block absolute inset-0 rounded-full bg-violet-500/30 blur-md"
              />
              <AtmiyaLotusLogo className="relative w-10 h-10 lg:w-11 lg:h-11 drop-shadow-[0_0_12px_rgba(168,85,247,0.55)]" />
            </div>
            <div className="hidden lg:flex flex-col items-center mt-1 text-center">
              <span className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Ātmiya
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300/80 tracking-wide">
                AI Companion
              </span>
            </div>
          </div>

          {/* Compact Vertical Sidebar Navigation */}
          <nav className="space-y-1.5" aria-label="Main sections">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isPrimaryActive =
                item.implemented &&
                item.targetTab === activeTab &&
                item.id !== 'games';

              if (!item.implemented) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="Learning section is not implemented yet"
                    className="w-full min-h-[40px] px-2.5 lg:px-3 py-2 rounded-xl flex items-center justify-center lg:justify-start gap-3 text-[13px] font-medium whitespace-nowrap border border-transparent text-slate-400 dark:text-slate-500/80 opacity-75 cursor-not-allowed"
                  >
                    <Icon className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="hidden lg:inline truncate">{item.label}</span>
                    <span className="hidden lg:inline ml-auto text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      Soon
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.targetTab && onSelectTab(item.targetTab)}
                  aria-current={isPrimaryActive ? 'page' : undefined}
                  aria-label={
                    item.id === 'memories' ? `Memories (${memoriesCount})` : item.label
                  }
                  title={
                    item.id === 'games'
                      ? 'Open mini-games in Play'
                      : item.label
                  }
                  className={`w-full min-h-[40px] px-2.5 lg:px-3 py-2 rounded-xl flex items-center justify-center lg:justify-start gap-3 text-[13px] transition cursor-pointer whitespace-nowrap border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isPrimaryActive
                      ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 border-sky-300/45 text-white font-semibold shadow-[0_6px_24px_rgba(37,99,235,0.6)]'
                      : 'border-transparent text-slate-600 dark:text-slate-300/90 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] font-medium'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isPrimaryActive
                        ? 'text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden lg:inline truncate">{item.label}</span>
                  {item.id === 'memories' && memoriesCount > 0 && (
                    <span
                      className={`hidden lg:inline ml-auto text-[11px] tabular-nums ${
                        isPrimaryActive
                          ? 'text-sky-100'
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

        {/* Bottom Existing User Profile */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-indigo-400/15">
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            aria-label={`User profile: ${displayUser}, Level ${level}`}
            title={`${displayUser} · Level ${level} (${xp} XP)`}
            className="w-full px-2 lg:px-2.5 py-2 rounded-xl bg-slate-100/85 dark:bg-[#0c1636]/90 hover:bg-slate-200/75 dark:hover:bg-[#132252] border border-slate-200/80 dark:border-indigo-400/22 flex items-center justify-center lg:justify-start gap-2.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 text-white flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-white/25">
              {userInitial}
            </div>
            <div className="hidden lg:block min-w-0 flex-1 text-left">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {displayUser}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                Lv {level} · {xp} XP
              </div>
            </div>
            <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main Active Screen Content */}
      <div className="flex-1 min-h-0 min-w-0 w-full relative overflow-hidden">
        {children}
      </div>

      {/* Mobile Only Compact Bottom Navigation (< md / 768px) */}
      <nav
        aria-label="Mobile companion navigation"
        className="md:hidden relative z-30 shrink-0 w-full bg-white/95 dark:bg-[#070f26]/95 border-t border-slate-200 dark:border-indigo-400/18 backdrop-blur-xl px-2 py-1.5"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-5 gap-1">
          {MOBILE_NAV_ITEMS.map((item) => {
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
                    ? 'bg-blue-50 dark:bg-blue-600/25 text-blue-700 dark:text-sky-100'
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

