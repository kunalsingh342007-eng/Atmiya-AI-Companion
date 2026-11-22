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
  const displayName = personaName.trim() || 'Ātmiya';
  const isMicUnsupported = micPermission === 'unsupported';
  const isMicDenied = micPermission === 'denied';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed || isThinking) return;
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
    isSpeaking ||
    Boolean(chatError) ||
    Boolean(voiceError) ||
    isMicDenied;

  return (
    <section
      aria-label="Voice and text input bar"
      className="relative z-20 w-full shrink-0 bg-white/95 dark:bg-[#060d1b]/95 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-xl px-3 sm:px-5 py-2.5"
    >
      <div className="max-w-5xl mx-auto space-y-2">
        {/* Visible State & Recovery Strip */}
        {showStatusStrip && (
          <div
            role="status"
            aria-live="polite"
            className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs ${
              chatError
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-500/35'
                : voiceError || isMicDenied
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-500/35'
                : 'bg-slate-100/90 dark:bg-[#0b162d] border-slate-200/80 dark:border-sky-400/20'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300 shrink-0" />
                  <span className="text-sky-700 dark:text-sky-200 font-medium truncate">
                    {userTranscript
                      ? `Listening: “${userTranscript}”`
                      : 'Listening — speak in Hindi, Hinglish, or English...'}
                  </span>
                </>
              ) : isThinking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 animate-spin shrink-0" />
                  <span className="text-amber-700 dark:text-amber-200 font-medium truncate">
                    {displayName} is thinking...
                  </span>
                </>
              ) : isSpeaking ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
                    {displayName} is speaking...
                  </span>
                </>
              ) : chatError ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300 shrink-0" />
                  <span className="text-rose-700 dark:text-rose-200 font-medium truncate">
                    {chatError}
                  </span>
                </>
              ) : voiceError ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-200 font-medium truncate">
                    {voiceError}
                  </span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-200 font-medium truncate">
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
                  className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
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
                  className="h-7 w-7 rounded-lg hover:bg-rose-200/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-200 inline-flex items-center justify-center cursor-pointer"
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
                      className="h-7 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Mic</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    className="h-7 px-2 rounded-lg bg-white dark:bg-[#10203d] border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-100 text-[11px] font-medium cursor-pointer whitespace-nowrap"
                  >
                    Type Instead
                  </button>
                  {voiceError && onDismissVoiceError && (
                    <button
                      type="button"
                      onClick={onDismissVoiceError}
                      aria-label="Dismiss voice notice"
                      className="h-7 w-7 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 inline-flex items-center justify-center cursor-pointer"
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
                  className="h-7 px-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
              )}

              {isSpeaking && (
                <button
                  type="button"
                  onClick={onInterrupt}
                  className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Prominent Unified Voice + Text Bar (Single Prominent Microphone Control) */}
        <div className="flex items-center gap-2 rounded-2xl bg-slate-100/90 dark:bg-[#0b162d] border border-slate-200 dark:border-sky-400/20 focus-within:border-blue-500 dark:focus-within:border-sky-400/50 p-1.5 shadow-sm transition-colors">
          {isSpeaking ? (
            <button
              type="button"
              onClick={onInterrupt}
              aria-label="Stop speaking"
              title="Stop response speech"
              className="h-11 px-3.5 sm:px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleListen}
              disabled={isThinking || isMicUnsupported}
              aria-pressed={isListening}
              aria-label={
                isMicUnsupported
                  ? 'Microphone voice recognition unsupported in this browser'
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
                  : 'Speak with microphone'
              }
              className={`h-11 px-3.5 sm:px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isListening
                  ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sm ring-2 ring-sky-300/60'
                  : isMicDenied || isMicMuted
                  ? 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300/80 dark:border-amber-500/40 text-amber-800 dark:text-amber-200'
                  : 'bg-white dark:bg-[#10203d] hover:bg-blue-50 dark:hover:bg-[#162b52] border border-slate-200 dark:border-sky-400/25 text-blue-700 dark:text-sky-200 shadow-xs'
              }`}
            >
              {isMicMuted || isMicDenied || isMicUnsupported ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isListening
                  ? 'Send Voice'
                  : isMicDenied
                  ? 'Mic Blocked'
                  : isMicMuted
                  ? 'Muted'
                  : 'Speak'}
              </span>
            </button>
          )}

          {/* Main Text Input + Send Button */}
          <form onSubmit={handleSubmit} className="flex-1 min-w-0 flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={`Message ${displayName} in Hindi, Hinglish, or English...`}
              disabled={isThinking}
              aria-label={`Message ${displayName}`}
              className="flex-1 min-w-0 h-11 px-3 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400/80 focus:outline-none disabled:opacity-60"
            />

            {/* Mobile Language Quick Switch (< md) */}
            <button
              type="button"
              onClick={cycleLanguage}
              aria-label={`Response language: ${LANGUAGE_LABELS[language]}`}
              title="Switch response language"
              className="md:hidden h-10 px-2.5 rounded-xl bg-white dark:bg-[#10203d] border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span className="hidden xs:inline">{LANGUAGE_LABELS[language]}</span>
            </button>

            {/* Mobile Chat Drawer Trigger (< lg) */}
            <button
              type="button"
              onClick={onToggleChatDrawer}
              aria-label="Open conversation history"
              title="Open conversation"
              className={`lg:hidden h-10 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                isChatDrawerOpen
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-white dark:bg-[#10203d] border-slate-200 dark:border-slate-700/70 text-slate-800 dark:text-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="text-[11px] text-blue-600 dark:text-sky-300 tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Clear / Reset Active Turn when active */}
            {(isListening || isSpeaking || isThinking || Boolean(aiSpokenText)) && (
              <button
                type="button"
                onClick={onEndCall}
                aria-label="Reset current turn"
                title="Reset turn"
                className="hidden sm:flex h-10 w-10 rounded-xl bg-white dark:bg-[#10203d] hover:bg-rose-50 dark:hover:bg-rose-950/70 border border-slate-200 dark:border-slate-700/70 hover:border-rose-300 dark:hover:border-rose-500/40 text-slate-500 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-200 items-center justify-center transition cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={!draftText.trim() || isThinking}
              aria-label={isThinking ? 'Sending message' : 'Send message'}
              title={isThinking ? 'Waiting for reply' : 'Send message'}
              className="h-11 px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {isThinking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Thinking</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
