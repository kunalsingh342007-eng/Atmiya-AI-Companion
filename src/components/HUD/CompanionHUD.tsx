import React, { useEffect, useRef, useState } from 'react';
import {
  AvatarEmotion,
  AvatarState,
  CompanionLanguage,
  CompanionSettings,
  MicPermissionStatus,
  UnifiedAnimationState,
  UserProfile,
} from '../../types/companion';
import { getCompanionMoodLabel } from '../Avatar/AvatarController';
import { ProfileAvatar } from '../Profile/ProfileAvatar';
import {
  AlertCircle,
  ChevronDown,
  Globe,
  History,
  KeyRound,
  Loader2,
  Mic,
  MicOff,
  Moon,
  RotateCcw,
  Settings,
  Sun,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface CompanionHUDProps {
  settings: CompanionSettings;
  profile: UserProfile;
  avatarState: AvatarState;
  unifiedState?: UnifiedAnimationState;
  emotion: AvatarEmotion;
  micPermission: MicPermissionStatus;
  isMicMuted?: boolean;
  isKeyConfigured: boolean;
  onToggleSidebar: () => void;
  onOpenHistoryTab: () => void;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onChangeLanguage: (lang: CompanionLanguage) => void;
  onOpenSettings: () => void;
  onRevisitOnboarding?: () => void;
}

function getContextualGreeting(name: string): string {
  const hour = new Date().getHours();
  const base =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${base}, ${name}` : base;
}

export const CompanionHUD: React.FC<CompanionHUDProps> = ({
  settings,
  profile,
  avatarState,
  unifiedState,
  emotion,
  micPermission,
  isMicMuted = false,
  isKeyConfigured,
  onToggleSidebar,
  onOpenHistoryTab,
  onToggleSound,
  onToggleTheme,
  onChangeLanguage,
  onOpenSettings,
  onRevisitOnboarding,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const isSoundEnabled = settings.voiceEngine !== 'none' && settings.autoSpeakResponse;
  const isDark =
    settings.theme === 'auto'
      ? typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
      : settings.theme !== 'light';
  const moodText = getCompanionMoodLabel(avatarState, emotion, unifiedState);
  const showActiveMood = avatarState !== 'idle' || micPermission === 'denied' || isMicMuted;
  const displayName = profile.displayName?.trim() || settings.userName?.trim() || '';
  const greetingText = getContextualGreeting(displayName);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isProfileMenuOpen]);

  const controlSurface =
    'atmiya-glass-interactive text-[var(--text-primary)] cursor-pointer shrink-0';

  return (
    <header className="relative z-20 w-full px-3 sm:px-5 pt-3 pb-1 flex items-center justify-between gap-2 shrink-0">
      {/* Top-Left: Contextual Greeting + Active Companion State */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="atmiya-glass px-3.5 py-1.5 rounded-full min-w-0 max-w-[46vw] sm:max-w-[240px]">
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate block">
            {greetingText}
          </span>
        </div>

        {showActiveMood && (
          <div
            role="status"
            aria-live="polite"
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md text-[11px] font-medium truncate shadow-xs border ${
              avatarState === 'error'
                ? 'bg-rose-50/95 dark:bg-rose-950/85 border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-200'
                : micPermission === 'denied' || isMicMuted
                ? 'bg-amber-50/95 dark:bg-amber-950/80 border-amber-200 dark:border-amber-500/35 text-amber-800 dark:text-amber-200'
                : 'atmiya-glass text-[var(--accent-ink)]'
            }`}
          >
            {avatarState === 'listening' && (
              <Mic className="w-3 h-3 text-sky-600 dark:text-sky-300 shrink-0" aria-hidden="true" />
            )}
            {avatarState === 'speaking' && (
              <Volume2 className="w-3 h-3 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
            )}
            {(avatarState === 'thinking' || avatarState === 'preparing_audio') && (
              <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-warm)] shrink-0" aria-hidden="true" />
            )}
            {avatarState === 'error' && (
              <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-300 shrink-0" aria-hidden="true" />
            )}
            {avatarState === 'idle' && (isMicMuted || micPermission === 'denied') && (
              <MicOff className="w-3 h-3 text-amber-600 dark:text-amber-300 shrink-0" aria-hidden="true" />
            )}
            <span>{avatarState === 'idle' && isMicMuted ? 'Mic muted' : moodText}</span>
            {micPermission === 'denied' && (
              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                · Mic blocked
              </span>
            )}
          </div>
        )}
      </div>

      {/* Top-Right Compact Controls: API Warning (if needed), Sessions, Language, Audio, Theme, Profile Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
        {!isKeyConfigured && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-amber-50/95 dark:bg-amber-950/85 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-100 text-xs font-semibold backdrop-blur-md transition cursor-pointer whitespace-nowrap shrink-0"
            title="Configure Gemini API key on server"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
            <span>API Key Needed</span>
          </button>
        )}

        {/* Quick Sessions Drawer */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open conversation sessions"
          title="Sessions"
          className={`h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium ${controlSurface}`}
        >
          <History className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
          <span className="hidden sm:inline">Sessions</span>
        </button>

        {/* Language */}
        <div className="relative hidden md:block">
          <Globe className="w-3.5 h-3.5 text-[var(--accent-primary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            aria-label="Select companion language"
            value={settings.language}
            onChange={(e) => onChangeLanguage(e.target.value as CompanionLanguage)}
            className={`appearance-none h-9 rounded-full pl-8 pr-7 text-xs font-medium ${controlSurface}`}
          >
            <option value="auto" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
              Auto
            </option>
            <option value="hi" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
              हिन्दी
            </option>
            <option value="hinglish" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
              Hinglish
            </option>
            <option value="en" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
              English
            </option>
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]"
          />
        </div>

        {/* Audio Output */}
        <button
          type="button"
          onClick={onToggleSound}
          aria-label={isSoundEnabled ? 'Mute voice output' : 'Enable voice output'}
          title={isSoundEnabled ? 'Audio On — Click to mute' : 'Audio Muted — Click to enable'}
          className={`h-9 w-9 rounded-full inline-flex items-center justify-center ${
            isSoundEnabled
              ? controlSurface
              : 'bg-rose-50/95 dark:bg-rose-950/85 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-100 backdrop-blur-md shadow-sm transition cursor-pointer shrink-0'
          }`}
        >
          {isSoundEnabled ? (
            <Volume2 className="w-4 h-4 text-[var(--accent-primary)]" />
          ) : (
            <VolumeX className="w-4 h-4 text-rose-600 dark:text-rose-300" />
          )}
        </button>

        {/* Theme */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className={`h-9 w-9 rounded-full inline-flex items-center justify-center ${controlSurface}`}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--accent-primary)]" />
          )}
        </button>

        {/* Compact Profile Menu */}
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((v) => !v)}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
            aria-label="Open profile and settings menu"
            className={`h-9 pl-1.5 pr-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium ${controlSurface}`}
          >
            <ProfileAvatar
              displayName={displayName || 'You'}
              avatarDataUrl={profile.avatarDataUrl}
              size="xs"
            />
            <span className="hidden sm:inline max-w-[92px] truncate">
              {displayName || 'Profile'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>

          {isProfileMenuOpen && (
            <div
              role="menu"
              aria-label="Profile menu"
              className="absolute right-0 mt-2 w-56 rounded-2xl atmiya-glass-strong p-1.5 space-y-1 z-40 atmiya-blur-fade"
            >
              <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
                <ProfileAvatar
                  displayName={displayName || 'You'}
                  avatarDataUrl={profile.avatarDataUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {displayName || 'Guest'}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    {profile.bio?.trim() || 'Local profile'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer transition"
              >
                <User className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenHistoryTab();
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer transition"
              >
                <History className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Conversation History</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer transition"
              >
                <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Settings</span>
              </button>

              {onRevisitOnboarding && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onRevisitOnboarding();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Setup &amp; Welcome</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
