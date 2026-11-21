import React from 'react';
import {
  AvatarEmotion,
  AvatarState,
  CompanionLanguage,
  CompanionSettings,
  MicPermissionStatus,
} from '../../types/companion';
import { getCompanionMoodLabel } from '../Avatar/AvatarController';
import { Globe, History, KeyRound, Settings, Volume2, VolumeX } from 'lucide-react';

interface CompanionHUDProps {
  settings: CompanionSettings;
  avatarState: AvatarState;
  emotion: AvatarEmotion;
  micPermission: MicPermissionStatus;
  isKeyConfigured: boolean;
  xp: number;
  onToggleSidebar: () => void;
  onToggleSound: () => void;
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
  onChangeLanguage,
  onOpenSettings,
}) => {
  const isSoundEnabled = settings.voiceEngine !== 'none' && settings.autoSpeakResponse;
  const moodText = getCompanionMoodLabel(avatarState, emotion);
  const companionName = settings.avatarConfig.personaName?.trim() || 'Ātmiya';

  return (
    <header className="relative z-20 w-full px-3 sm:px-5 pt-3 pb-1.5 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
      {/* Left: History Drawer Trigger + Identity, Mood & XP */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open conversation history"
          title="Conversation history"
          className="h-11 w-11 sm:h-10 sm:w-10 rounded-full bg-slate-950/65 hover:bg-slate-900/85 border border-indigo-200/20 backdrop-blur-md text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <History className="w-4 h-4" />
        </button>

        <div className="min-w-0 px-3.5 py-1.5 rounded-2xl bg-slate-950/60 border border-indigo-200/20 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm sm:text-base text-white tracking-tight truncate">
              {companionName}
            </span>
            <span className="font-serif text-xs sm:text-sm text-amber-200/95 shrink-0">
              आत्मीय
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-200/90 truncate">
            <span className="truncate">{moodText}</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="text-sky-200 font-medium tabular-nums shrink-0">{xp} XP</span>
            {micPermission === 'denied' && (
              <>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-amber-300 shrink-0">Mic blocked</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Connection alert (only if API key missing), Language, Sound Toggle, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {!isKeyConfigured && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-amber-950/85 hover:bg-amber-900/90 border border-amber-400/40 text-amber-100 text-xs font-medium backdrop-blur-md transition cursor-pointer whitespace-nowrap shrink-0"
            title="Configure Gemini API key"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-300" />
            <span>API Key Needed</span>
          </button>
        )}

        <div className="relative hidden md:block">
          <select
            aria-label="Select companion language"
            value={settings.language}
            onChange={(e) => onChangeLanguage(e.target.value as CompanionLanguage)}
            className="appearance-none h-10 bg-slate-950/65 hover:bg-slate-900/85 border border-indigo-200/20 text-slate-100 text-xs font-medium rounded-full pl-3.5 pr-8 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer transition"
          >
            <option value="auto" className="bg-slate-900">Auto</option>
            <option value="hi" className="bg-slate-900">हिन्दी</option>
            <option value="hinglish" className="bg-slate-900">Hinglish</option>
            <option value="en" className="bg-slate-900">English</option>
          </select>
          <Globe className="w-3.5 h-3.5 text-sky-200 absolute right-3 top-3 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={isSoundEnabled ? 'Mute sound and voice replies' : 'Enable sound and voice replies'}
          title={isSoundEnabled ? 'Sound On — Click to mute' : 'Sound Off — Click to enable'}
          className={`h-11 px-3.5 sm:h-10 rounded-full border backdrop-blur-md text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            isSoundEnabled
              ? 'bg-slate-950/65 hover:bg-slate-900/85 border-indigo-200/20 text-slate-100'
              : 'bg-rose-950/75 hover:bg-rose-900/85 border-rose-400/35 text-rose-100'
          }`}
        >
          {isSoundEnabled ? <Volume2 className="w-4 h-4 text-sky-300" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
          <span className="hidden sm:inline">{isSoundEnabled ? 'Sound On' : 'Muted'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className="h-11 w-11 sm:h-10 sm:w-10 rounded-full bg-slate-950/65 hover:bg-slate-900/85 border border-indigo-200/20 backdrop-blur-md text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
