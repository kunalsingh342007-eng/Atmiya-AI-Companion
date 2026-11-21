import React from 'react';
import {
  AvatarEmotion,
  AvatarState,
  CompanionLanguage,
  CompanionSettings,
  MicPermissionStatus,
} from '../../types/companion';
import { getCompanionMoodLabel } from '../Avatar/AvatarController';
import { Globe, History, KeyRound, Moon, Settings, Sun, Volume2, VolumeX } from 'lucide-react';

interface CompanionHUDProps {
  settings: CompanionSettings;
  avatarState: AvatarState;
  emotion: AvatarEmotion;
  micPermission: MicPermissionStatus;
  isKeyConfigured: boolean;
  xp: number;
  onToggleSidebar: () => void;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onChangeLanguage: (lang: CompanionLanguage) => void;
  onOpenSettings: () => void;
}

export const CompanionHUD: React.FC<CompanionHUDProps> = ({
  settings,
  avatarState,
  emotion,
  micPermission,
  isKeyConfigured,
  xp,
  onToggleSidebar,
  onToggleSound,
  onToggleTheme,
  onChangeLanguage,
  onOpenSettings,
}) => {
  const isSoundEnabled = settings.voiceEngine !== 'none' && settings.autoSpeakResponse;
  const isDark = settings.theme !== 'light';
  const moodText = getCompanionMoodLabel(avatarState, emotion);
  const companionName = settings.avatarConfig.personaName?.trim() || 'Ātmiya';

  return (
    <header className="relative z-20 w-full px-3 sm:px-5 pt-3 pb-1.5 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
      {/* Left: Sessions History Trigger + Identity & Real Status */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open conversation sessions"
          title="Sessions"
          className="h-11 sm:h-10 px-3 rounded-xl bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/60 backdrop-blur-md text-slate-700 dark:text-slate-100 inline-flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <History className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
          <span className="hidden sm:inline">Sessions</span>
        </button>

        <div className="min-w-0 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-[#0b1528]/80 border border-slate-200/90 dark:border-slate-700/60 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm sm:text-[15px] text-slate-900 dark:text-white tracking-tight truncate">
              {companionName}
            </span>
            <span className="font-serif text-xs sm:text-sm text-blue-700 dark:text-sky-300 shrink-0">
              आत्मीय
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 truncate">
            <span className="truncate">{moodText}</span>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">·</span>
            <span className="text-blue-700 dark:text-sky-300 font-semibold tabular-nums shrink-0">
              {xp} XP
            </span>
            {micPermission === 'denied' && (
              <>
                <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">·</span>
                <span className="text-amber-700 dark:text-amber-300 font-medium shrink-0">
                  Mic blocked
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Key Warning (only if missing), Language, Sound Toggle, Theme (mobile), Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {!isKeyConfigured && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/90 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-100 text-xs font-semibold backdrop-blur-md transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            title="Configure Gemini API key on server"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
            <span>API Key Needed</span>
          </button>
        )}

        <div className="relative hidden md:block">
          <select
            aria-label="Select companion language"
            value={settings.language}
            onChange={(e) => onChangeLanguage(e.target.value as CompanionLanguage)}
            className="appearance-none h-10 bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-xl pl-3 pr-8 backdrop-blur-md shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer transition"
          >
            <option value="auto" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Auto</option>
            <option value="hi" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">हिन्दी</option>
            <option value="hinglish" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Hinglish</option>
            <option value="en" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">English</option>
          </select>
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300 absolute right-2.5 top-3 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={isSoundEnabled ? 'Mute voice replies' : 'Enable voice replies'}
          title={isSoundEnabled ? 'Sound On — Click to mute' : 'Sound Off — Click to enable'}
          className={`h-11 sm:h-10 px-3 rounded-xl border backdrop-blur-md text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isSoundEnabled
              ? 'bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border-slate-200/90 dark:border-slate-700/60 text-slate-800 dark:text-slate-100'
              : 'bg-rose-50 dark:bg-rose-950/85 hover:bg-rose-100 dark:hover:bg-rose-900 border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-100'
          }`}
        >
          {isSoundEnabled ? (
            <Volume2 className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-rose-600 dark:text-rose-300" />
          )}
          <span className="hidden sm:inline">{isSoundEnabled ? 'Voice On' : 'Muted'}</span>
        </button>

        {/* Mobile/Tablet quick theme switch (desktop rail has its own switcher) */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark navy theme'}
          title={isDark ? 'Light theme' : 'Dark navy theme'}
          className="lg:hidden h-11 w-11 sm:h-10 sm:w-10 rounded-xl bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/60 backdrop-blur-md text-slate-700 dark:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className="h-11 w-11 sm:h-10 sm:w-10 rounded-xl bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/60 backdrop-blur-md text-slate-700 dark:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
