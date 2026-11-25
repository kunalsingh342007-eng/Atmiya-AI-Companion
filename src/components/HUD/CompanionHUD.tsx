import React from 'react';
import {
  AvatarEmotion,
  AvatarState,
  CompanionLanguage,
  CompanionSettings,
  MicPermissionStatus,
  UnifiedAnimationState,
} from '../../types/companion';
import { getCompanionMoodLabel } from '../Avatar/AvatarController';
import {
  ChevronRight,
  Globe,
  History,
  KeyRound,
  Moon,
  Settings,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface CompanionHUDProps {
  settings: CompanionSettings;
  avatarState: AvatarState;
  unifiedState?: UnifiedAnimationState;
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
  unifiedState,
  emotion,
  micPermission,
  isKeyConfigured,
  onToggleSidebar,
  onToggleSound,
  onToggleTheme,
  onChangeLanguage,
  onOpenSettings,
}) => {
  const isSoundEnabled = settings.voiceEngine !== 'none' && settings.autoSpeakResponse;
  const isDark =
    settings.theme === 'auto'
      ? typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
      : settings.theme !== 'light';
  const moodText = getCompanionMoodLabel(avatarState, emotion, unifiedState);
  const showActiveMood = avatarState !== 'idle' || micPermission === 'denied';

  const pillBase =
    'bg-white/88 dark:bg-[#0a1330]/78 hover:bg-white dark:hover:bg-[#111e46] border border-slate-200/85 dark:border-indigo-300/20 backdrop-blur-xl text-slate-700 dark:text-slate-100 shadow-[0_6px_20px_rgba(4,9,26,0.22)] transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';

  return (
    <header className="relative z-20 w-full px-3 sm:px-5 pt-3 pb-1 flex items-center justify-between gap-2 shrink-0">
      {/* Top-Left: Kept open over sunlit window, showing only subtle live status when active */}
      <div className="flex items-center gap-2 min-w-0">
        {showActiveMood && (
          <div className="px-3 py-1.5 rounded-full bg-white/85 dark:bg-[#0a1330]/75 border border-slate-200/80 dark:border-sky-400/25 backdrop-blur-md text-[11px] font-medium text-slate-700 dark:text-sky-100 truncate shadow-sm">
            <span>{moodText}</span>
            {micPermission === 'denied' && (
              <span className="ml-1.5 text-amber-600 dark:text-amber-300 font-semibold">
                · Mic blocked
              </span>
            )}
          </div>
        )}
      </div>

      {/* Top-Right Compact Controls: API Warning (if needed), Sessions, Language, Audio, Theme, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
        {!isKeyConfigured && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-amber-50 dark:bg-amber-950/85 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-100 text-xs font-semibold backdrop-blur-md transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Configure Gemini API key on server"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
            <span>API Key Needed</span>
          </button>
        )}

        {/* Sessions */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open conversation sessions"
          title="Sessions"
          className={`h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium ${pillBase}`}
        >
          <History className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300 shrink-0" />
          <span className="hidden sm:inline">Sessions</span>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-400 dark:text-slate-300/75" />
        </button>

        {/* Language */}
        <div className="relative hidden md:block">
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            aria-label="Select companion language"
            value={settings.language}
            onChange={(e) => onChangeLanguage(e.target.value as CompanionLanguage)}
            className={`appearance-none h-9 rounded-full pl-8 pr-7 text-xs font-medium ${pillBase}`}
          >
            <option value="auto" className="bg-white dark:bg-[#091229] text-slate-900 dark:text-slate-100">
              Auto
            </option>
            <option value="hi" className="bg-white dark:bg-[#091229] text-slate-900 dark:text-slate-100">
              हिन्दी
            </option>
            <option value="hinglish" className="bg-white dark:bg-[#091229] text-slate-900 dark:text-slate-100">
              Hinglish
            </option>
            <option value="en" className="bg-white dark:bg-[#091229] text-slate-900 dark:text-slate-100">
              English
            </option>
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-300"
          >
            ▾
          </span>
        </div>

        {/* Audio Output */}
        <button
          type="button"
          onClick={onToggleSound}
          aria-label={isSoundEnabled ? 'Mute voice output' : 'Enable voice output'}
          title={isSoundEnabled ? 'Audio On — Click to mute' : 'Audio Muted — Click to enable'}
          className={`h-9 w-9 rounded-full inline-flex items-center justify-center ${
            isSoundEnabled
              ? pillBase
              : 'bg-rose-50 dark:bg-rose-950/85 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-100 backdrop-blur-md shadow-sm transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400'
          }`}
        >
          {isSoundEnabled ? (
            <Volume2 className="w-4 h-4 text-blue-600 dark:text-sky-300" />
          ) : (
            <VolumeX className="w-4 h-4 text-rose-600 dark:text-rose-300" />
          )}
        </button>

        {/* Theme */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark navy theme'}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Navy'}
          className={`h-9 w-9 rounded-full inline-flex items-center justify-center ${pillBase}`}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" />
          )}
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className={`h-9 w-9 rounded-full inline-flex items-center justify-center ${pillBase}`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

