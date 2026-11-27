import React, { useState } from 'react';
import { ActiveNavTab, UserProfile } from '../../types/companion';
import { ProfileAvatar } from '../Profile/ProfileAvatar';
import {
  ChevronRight,
  Gamepad2,
  History,
  Home,
  Settings,
} from 'lucide-react';

interface GameShellProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  profile: UserProfile;
  userName?: string;
  children: React.ReactNode;
}

interface SidebarNavItem {
  id: ActiveNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'history', label: 'History', icon: History },
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const FallbackLotusMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <defs>
      <linearGradient id="atmiya-fallback-lotus" x1="10" y1="12" x2="54" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ec4899" />
        <stop offset="55%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <path
      d="M32 10C37.5 18.5 39.5 28 32 41C24.5 28 26.5 18.5 32 10Z"
      stroke="url(#atmiya-fallback-lotus)"
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <path
      d="M28.5 41C19 36 14 27 16.5 17.5C22.5 21 26.5 29.5 28.5 41Z"
      stroke="url(#atmiya-fallback-lotus)"
      strokeWidth="2.1"
      strokeLinejoin="round"
    />
    <path
      d="M35.5 41C45 36 50 27 47.5 17.5C41.5 21 37.5 29.5 35.5 41Z"
      stroke="url(#atmiya-fallback-lotus)"
      strokeWidth="2.1"
      strokeLinejoin="round"
    />
    <path
      d="M26 44C15.5 43.5 9.5 37 8 28.5C15 29 21 34 26 44Z"
      stroke="url(#atmiya-fallback-lotus)"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    <path
      d="M38 44C48.5 43.5 54.5 37 56 28.5C49 29 43 34 38 44Z"
      stroke="url(#atmiya-fallback-lotus)"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
  </svg>
);

export const GameShell: React.FC<GameShellProps> = ({
  activeTab,
  onSelectTab,
  profile,
  userName = '',
  children,
}) => {
  const [logoImgFailed, setLogoImgFailed] = useState(false);
  const [footerImgFailed, setFooterImgFailed] = useState(false);

  const displayUser = profile.displayName?.trim() || userName.trim() || 'Guest';
  const profileSubtitle = profile.bio?.trim() || 'Local profile';

  return (
    <div className="relative flex flex-col md:flex-row h-dvh w-full overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans transition-colors duration-200">
      {/* Desktop & Tablet Left Navigation Sidebar (md+) */}
      <aside
        aria-label="Primary companion navigation"
        className="hidden md:flex flex-col justify-between shrink-0 w-[78px] lg:w-[232px] bg-[var(--bg-surface)] dark:bg-[#070d22] border-r border-slate-200 dark:border-slate-800/80 z-30 py-3.5 px-2.5 lg:px-3.5 transition-colors duration-200"
      >
        <div className="space-y-4 min-h-0 flex-1 flex flex-col">
          {/* Ātmiya Brand Logo — adaptive Light & Dark/Night presentation */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            aria-label="Ātmiya Home"
            className="w-full rounded-2xl bg-indigo-50/75 dark:bg-[#060c23] border border-indigo-200/80 dark:border-indigo-400/20 p-2 lg:px-3 lg:py-2.5 flex flex-col items-center justify-center transition hover:border-indigo-300 dark:hover:border-indigo-400/40 cursor-pointer shrink-0"
          >
            {/* Light mode clean brand lockup */}
            <div className="flex dark:hidden flex-col items-center py-1 text-center">
              <FallbackLotusMark className="w-8 h-8 lg:w-9 lg:h-9" />
              <span className="hidden lg:block text-base font-bold text-slate-900 mt-1 leading-tight">
                Ātmiya
              </span>
              <span className="hidden lg:block text-[10px] font-medium text-slate-500">
                Your AI Companion
              </span>
            </div>

            {/* Dark / Night mode brand artwork */}
            <div className="hidden dark:flex flex-col items-center">
              {!logoImgFailed ? (
                <>
                  <img
                    src="/assets/branding/atmiya-logo.png"
                    alt="Ātmiya — Your AI Companion"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoImgFailed(true)}
                    className="hidden lg:block w-28 h-auto object-contain rounded-lg select-none"
                  />
                  <FallbackLotusMark className="lg:hidden w-8 h-8" />
                </>
              ) : (
                <div className="flex flex-col items-center py-1 text-center">
                  <FallbackLotusMark className="w-8 h-8 lg:w-9 lg:h-9" />
                  <span className="hidden lg:block text-base font-bold text-white mt-1 leading-tight">
                    Ātmiya
                  </span>
                  <span className="hidden lg:block text-[10px] text-slate-300">
                    Your AI Companion
                  </span>
                </div>
              )}
            </div>
          </button>

          {/* Strictly 4 Primary Navigation Sections: Home, History, Play, Settings */}
          <nav className="space-y-1 flex-1 overflow-y-auto pr-0.5" aria-label="Main sections">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeTab;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className={`w-full min-h-[42px] px-2.5 lg:px-3 py-2 rounded-xl flex items-center justify-center lg:justify-start gap-3 text-[13px] transition cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-sm'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] font-medium'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden lg:inline truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile + Adaptive Lotus Footer */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            aria-label={`Profile: ${displayUser}`}
            title={`${displayUser} — Open Profile & Settings`}
            className="w-full px-2 lg:px-2.5 py-2 rounded-xl bg-slate-100/80 dark:bg-[#0d1633] hover:bg-slate-200/80 dark:hover:bg-[#131f47] border border-slate-200/80 dark:border-slate-800 flex items-center justify-center lg:justify-start gap-2.5 transition cursor-pointer"
          >
            <ProfileAvatar
              displayName={displayUser}
              avatarDataUrl={profile.avatarDataUrl}
              size="sm"
            />
            <div className="hidden lg:block min-w-0 flex-1 text-left">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {displayUser}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {profileSubtitle}
              </div>
            </div>
            <ChevronRight className="hidden lg:block w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Adaptive Lotus Footer */}
          <div className="hidden lg:block rounded-xl overflow-hidden bg-indigo-50/70 dark:bg-[#040818] border border-indigo-200/75 dark:border-indigo-400/15 p-1.5">
            {/* Light mode lotus footer */}
            <div className="py-2.5 px-2 flex dark:hidden flex-col items-center justify-center text-center gap-1">
              <FallbackLotusMark className="w-7 h-7" />
              <span className="text-[11px] font-medium text-slate-600">
                Always here for you
              </span>
            </div>

            {/* Dark / Night mode lotus footer artwork */}
            <div className="hidden dark:block">
              {!footerImgFailed ? (
                <img
                  src="/assets/branding/lotus-footer.png"
                  alt="Glowing lotus artwork — Always here for you"
                  referrerPolicy="no-referrer"
                  onError={() => setFooterImgFailed(true)}
                  className="w-full max-w-[178px] h-auto mx-auto object-contain rounded-lg select-none"
                />
              ) : (
                <div className="py-3 px-2 flex flex-col items-center justify-center text-center gap-1">
                  <FallbackLotusMark className="w-7 h-7" />
                  <span className="text-[11px] font-medium text-slate-200">
                    Always here for you
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Active Screen Content */}
      <div className="flex-1 min-h-0 min-w-0 w-full relative overflow-hidden">
        {children}
      </div>

      {/* Mobile Only Compact Bottom Navigation (< md / 768px) */}
      <nav
        aria-label="Mobile companion navigation"
        className="md:hidden relative z-30 shrink-0 w-full bg-[var(--bg-surface)]/95 dark:bg-[#070d22]/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-xl px-2 py-1.5"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-4 gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`min-h-[44px] px-1 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/25 text-indigo-700 dark:text-indigo-200'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-300'
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
