import React, { useRef, useState } from 'react';
import {
  AvatarState,
  CompanionLanguage,
  MicPermissionStatus,
} from '../../types/companion';
import {
  AlertCircle,
  Globe,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  Send,
  Volume2,
  X,
} from 'lucide-react';

interface DialoguePanelProps {
  avatarState: AvatarState;
  personaName: string;
  userTranscript: string;
  aiSpokenText: string;
  voiceError: string | null;
  chatError?: string | null;
  micPermission: MicPermissionStatus;
  isMicMuted: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isChatDrawerOpen: boolean;
  unreadCount: number;
  language: CompanionLanguage;
  audioLevel?: number;
  onSendMessage: (text: string) => void;
  onRetryLastMessage?: () => void;
  onDismissChatError?: () => void;
  onDismissVoiceError?: () => void;
  onToggleListen: () => void;
  onInterrupt: () => void;
  onEndCall: () => void;
  onRetryMic: () => void;
  onToggleChatDrawer: () => void;
  onChangeLanguage: (lang: CompanionLanguage) => void;
  draftText?: string;
  onDraftChange?: (text: string) => void;
}

const LANGUAGE_ORDER: CompanionLanguage[] = ['auto', 'hi', 'hinglish', 'en'];
const LANGUAGE_LABELS: Record<CompanionLanguage, string> = {
  auto: 'Auto',
  hi: 'हिन्दी',
  hinglish: 'Hinglish',
  en: 'EN',
};

const AudioLevelBars: React.FC<{ level: number; toneClass: string }> = ({ level, toneClass }) => {
  const normalized = Math.max(0.12, Math.min(1, level));
  const heights = [
    Math.round(6 + normalized * 8),
    Math.round(8 + normalized * 12),
    Math.round(5 + normalized * 9),
  ];

  return (
    <span aria-hidden="true" className="inline-flex items-end gap-0.5 h-4 shrink-0">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-0.5 rounded-full transition-[height] duration-100 ${toneClass}`}
          style={{ height: `${h}px` }}
        />
      ))}
    </span>
  );
};

export const DialoguePanel: React.FC<DialoguePanelProps> = ({
  avatarState,
  personaName,
  userTranscript,
  aiSpokenText,
  voiceError,
  chatError,
  micPermission,
  isMicMuted,
  isThinking,
  isSpeaking,
  isChatDrawerOpen,
  unreadCount,
  language,
  audioLevel = 0,
  onSendMessage,
  onRetryLastMessage,
  onDismissChatError,
  onDismissVoiceError,
  onToggleListen,
  onInterrupt,
  onEndCall,
  onRetryMic,
  onToggleChatDrawer,
  onChangeLanguage,
  draftText: controlledDraft,
  onDraftChange,
}) => {
  const [localDraft, setLocalDraft] = useState('');
  const draftText = controlledDraft !== undefined ? controlledDraft : localDraft;
  const setDraftText = (next: string) => {
    if (onDraftChange) {
      onDraftChange(next);
    }
    if (controlledDraft === undefined) {
      setLocalDraft(next);
    }
  };
  const inputRef = useRef<HTMLInputElement>(null);

  const isListening = avatarState === 'listening';
  const isPreparingAudio = avatarState === 'preparing_audio';
  const displayName = personaName.trim() || 'Ātmiya';
  const isMicUnsupported = micPermission === 'unsupported';
  const isMicDenied = micPermission === 'denied';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed || isThinking || isPreparingAudio) return;
    onSendMessage(trimmed);
    setDraftText('');
  };

  const cycleLanguage = () => {
    const idx = LANGUAGE_ORDER.indexOf(language);
    const next = LANGUAGE_ORDER[(idx + 1) % LANGUAGE_ORDER.length];
    onChangeLanguage(next);
  };

  const showStatusStrip =
    isListening ||
    isThinking ||
    isPreparingAudio ||
    isSpeaking ||
    Boolean(chatError) ||
    Boolean(voiceError) ||
    isMicDenied;

  return (
    <section
      aria-label="Voice and text input bar"
      className="relative z-20 w-full shrink-0 bg-transparent px-3 sm:px-6 pb-2.5 sm:pb-3.5 pt-1 pointer-events-auto"
    >
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Visible State & Recovery Strip */}
        {showStatusStrip && (
          <div
            role={chatError || voiceError || isMicDenied ? 'alert' : 'status'}
            aria-live="polite"
            className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-2xl text-xs atmiya-blur-fade ${
              chatError
                ? 'bg-rose-50/95 dark:bg-rose-950/75 border border-rose-200 dark:border-rose-500/35 shadow-sm'
                : voiceError || isMicDenied
                ? 'bg-amber-50/95 dark:bg-amber-950/65 border border-amber-200 dark:border-amber-500/35 shadow-sm'
                : 'atmiya-glass-strong'
            }`}
          >
            <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-300 shrink-0 mt-0.5 sm:mt-0" />
                  <AudioLevelBars level={Math.max(0.2, audioLevel)} toneClass="bg-cyan-600 dark:bg-cyan-300" />
                  <span className="text-[var(--text-primary)] font-medium break-words leading-snug">
                    {userTranscript
                      ? `Listening: “${userTranscript}”`
                      : 'Listening — speak in Hindi, Hinglish, or English...'}
                  </span>
                </>
              ) : isThinking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-[var(--accent-warm)] animate-spin shrink-0 mt-0.5 sm:mt-0" />
                  <span className="text-[var(--text-primary)] font-medium truncate">
                    {displayName} is thinking...
                  </span>
                </>
              ) : isPreparingAudio ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-[var(--accent-primary)] animate-spin shrink-0 mt-0.5 sm:mt-0" />
                  <span className="text-[var(--text-primary)] font-medium truncate">
                    Preparing voice response...
                  </span>
                </>
              ) : isSpeaking ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0 mt-0.5 sm:mt-0" />
                  <AudioLevelBars level={audioLevel} toneClass="bg-[var(--accent-primary)]" />
                  <span className="text-[var(--text-primary)] font-medium truncate">
                    {displayName} is speaking...
                  </span>
                </>
              ) : chatError ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="text-rose-700 dark:text-rose-200 font-medium break-words leading-snug">
                    {chatError}
                  </span>
                </>
              ) : voiceError ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="text-amber-800 dark:text-amber-200 font-medium break-words leading-snug">
                    {voiceError}
                  </span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="text-amber-800 dark:text-amber-200 font-medium break-words leading-snug">
                    Microphone permission denied — allow mic access or type below.
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {chatError && onRetryLastMessage && (
                <button
                  type="button"
                  onClick={onRetryLastMessage}
                  className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}

              {chatError && onDismissChatError && (
                <button
                  type="button"
                  onClick={onDismissChatError}
                  aria-label="Dismiss chat error"
                  className="h-8 w-8 rounded-lg hover:bg-rose-200/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-200 inline-flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {(voiceError || isMicDenied) && !chatError && (
                <>
                  {!isMicUnsupported && (
                    <button
                      type="button"
                      onClick={onRetryMic}
                      className="h-8 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Mic</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    className="h-8 px-2.5 rounded-lg bg-[var(--bg-surface)] border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-100 text-[11px] font-medium cursor-pointer whitespace-nowrap"
                  >
                    Type Instead
                  </button>
                  {voiceError && onDismissVoiceError && (
                    <button
                      type="button"
                      onClick={onDismissVoiceError}
                      aria-label="Dismiss voice notice"
                      className="h-8 w-8 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 inline-flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}

              {isListening && (
                <button
                  type="button"
                  onClick={onEndCall}
                  className="h-8 px-2.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-hairline)] text-[var(--text-primary)] text-[11px] font-medium cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
              )}

              {(isSpeaking || isPreparingAudio) && (
                <button
                  type="button"
                  onClick={onInterrupt}
                  className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Voice + Text Composer Bar */}
        <div className="flex items-center gap-2 rounded-full atmiya-glass-strong focus-within:border-[var(--accent-primary)] p-1.5 transition-colors">
          {isSpeaking || isPreparingAudio ? (
            <button
              type="button"
              onClick={onInterrupt}
              aria-label={isPreparingAudio ? 'Cancel voice response' : 'Stop speaking'}
              title={isPreparingAudio ? 'Cancel voice response' : 'Stop response speech'}
              className="h-11 w-11 rounded-full bg-rose-600 hover:bg-rose-500 text-white inline-flex items-center justify-center transition cursor-pointer shrink-0 shadow-sm"
            >
              <PauseCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleListen}
              disabled={isThinking || isPreparingAudio}
              aria-pressed={isListening}
              aria-label={
                isMicUnsupported
                  ? 'Microphone voice recognition unsupported in this browser — tap for details'
                  : isListening
                  ? 'Send or stop voice input'
                  : isMicMuted
                  ? 'Unmute and start voice input'
                  : 'Start voice input'
              }
              title={
                isMicUnsupported
                  ? 'Voice input is not supported in this browser — please type instead'
                  : isListening
                  ? 'Tap to send captured speech'
                  : isMicMuted
                  ? 'Microphone muted — tap to unmute & speak'
                  : 'Tap to speak with microphone'
              }
              className={`h-11 w-11 rounded-full inline-flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md ring-2 ring-cyan-400/55'
                  : isMicDenied || isMicMuted || isMicUnsupported
                  ? 'bg-amber-50 dark:bg-amber-950/75 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-500/45 text-amber-700 dark:text-amber-200'
                  : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-sm'
              }`}
            >
              {isMicMuted || isMicDenied || isMicUnsupported ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Main Text Input + Send Button */}
          <form onSubmit={handleSubmit} className="flex-1 min-w-0 flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              maxLength={4000}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Tap mic or type a message..."
              disabled={isThinking || isPreparingAudio}
              aria-label={`Message ${displayName}`}
              className="flex-1 min-w-[96px] h-11 px-2 sm:px-3 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-60"
            />

            {/* Mobile Language Quick Switch (< md) */}
            <button
              type="button"
              onClick={cycleLanguage}
              aria-label={`Response language: ${LANGUAGE_LABELS[language]}`}
              title="Switch response language"
              className="md:hidden h-10 px-2.5 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-hairline)] text-[var(--text-primary)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span className="hidden sm:inline">{LANGUAGE_LABELS[language]}</span>
            </button>

            {/* Mobile & Tablet Chat Drawer Trigger (< lg) */}
            <button
              type="button"
              onClick={onToggleChatDrawer}
              aria-label={isChatDrawerOpen ? 'Close conversation history' : 'Open conversation history'}
              aria-expanded={isChatDrawerOpen}
              title="Open conversation"
              className={`lg:hidden h-10 px-3 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                isChatDrawerOpen
                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border-[var(--border-hairline)] text-[var(--text-primary)]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">Chat</span>
              {unreadCount > 0 && (
                <span
                  className={`text-[11px] tabular-nums ${
                    isChatDrawerOpen ? 'text-white/90' : 'text-[var(--accent-ink)]'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Clear / Reset Active Turn when active */}
            {(isListening || isSpeaking || isPreparingAudio || isThinking || Boolean(aiSpokenText)) && (
              <button
                type="button"
                onClick={onEndCall}
                aria-label="Reset current turn"
                title="Reset turn"
                className="hidden sm:flex h-10 w-10 rounded-full bg-[var(--bg-subtle)] hover:bg-rose-50 dark:hover:bg-rose-950/70 border border-[var(--border-hairline)] hover:border-rose-300 dark:hover:border-rose-500/40 text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-200 items-center justify-center transition cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              disabled={!draftText.trim() || isThinking || isPreparingAudio}
              aria-label={isThinking || isPreparingAudio ? 'Processing message' : 'Send message'}
              title={isThinking || isPreparingAudio ? 'Waiting for reply' : 'Send message'}
              className="h-11 w-11 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] text-white inline-flex items-center justify-center transition cursor-pointer shrink-0 shadow-sm disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isThinking || isPreparingAudio ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
