import React, { useState } from 'react';
import {
  AvatarState,
  CompanionLanguage,
  MicPermissionStatus,
} from '../../types/companion';
import {
  AlertCircle,
  Globe,
  MessageSquare,
  Mic,
  MicOff,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  Send,
  Volume2,
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
  onToggleListen: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onEndCall: () => void;
  onRetryMic: () => void;
  onToggleChatDrawer: () => void;
  onChangeLanguage: (lang: CompanionLanguage) => void;
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
  onToggleListen,
  onToggleMute,
  onInterrupt,
  onEndCall,
  onRetryMic,
  onToggleChatDrawer,
  onChangeLanguage,
}) => {
  const [draftText, setDraftText] = useState('');

  const isListening = avatarState === 'listening';
  const displayName = personaName.trim() || 'Ātmiya';

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

  let speakerLabel = displayName;
  let messageBody =
    'Namaste! Tap Speak or type a message in Hindi, Hinglish, or English.';
  let isPlaceholderPrompt = true;

  if (isThinking) {
    speakerLabel = displayName;
    messageBody = '';
    isPlaceholderPrompt = false;
  } else if (isListening && userTranscript) {
    speakerLabel = 'You';
    messageBody = userTranscript;
    isPlaceholderPrompt = false;
  } else if (isListening) {
    speakerLabel = 'You';
    messageBody = 'Listening in Hindi, Hinglish, or English...';
    isPlaceholderPrompt = true;
  } else if (aiSpokenText) {
    speakerLabel = displayName;
    messageBody = aiSpokenText;
    isPlaceholderPrompt = false;
  } else if (userTranscript) {
    speakerLabel = 'You';
    messageBody = userTranscript;
    isPlaceholderPrompt = false;
  }

  return (
    <section
      aria-label="Companion dialogue panel"
      className="lg:hidden w-full max-w-3xl mx-auto px-3 sm:px-5 pb-2.5 pt-1 shrink-0"
    >
      <div className="rounded-2xl bg-white/95 dark:bg-[#091224]/90 border border-slate-200/90 dark:border-slate-700/70 backdrop-blur-xl shadow-xl p-3 sm:p-3.5 space-y-2.5">
        {/* Top Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="font-semibold text-blue-700 dark:text-sky-300 shrink-0">
              {speakerLabel}
            </span>
            <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">·</span>
            {isListening ? (
              <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-300 font-medium">
                <Mic className="w-3.5 h-3.5" />
                Listening
              </span>
            ) : isThinking ? (
              <span className="text-amber-600 dark:text-amber-300 font-medium">Thinking...</span>
            ) : isSpeaking ? (
              <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-sky-300 font-medium">
                <Volume2 className="w-3.5 h-3.5" />
                Speaking
              </span>
            ) : avatarState === 'interrupted' ? (
              <span className="text-amber-600 dark:text-amber-300 font-medium">Stopped</span>
            ) : chatError ? (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300 font-medium truncate">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{chatError}</span>
              </span>
            ) : avatarState === 'error' || voiceError ? (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300 font-medium truncate">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{voiceError || 'Voice unavailable'}</span>
              </span>
            ) : micPermission === 'denied' ? (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                <MicOff className="w-3.5 h-3.5" />
                Mic blocked (text ready)
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">Ready</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
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

            {(voiceError || micPermission === 'denied') && !chatError && (
              <button
                type="button"
                onClick={onRetryMic}
                className="h-8 px-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800/70 text-amber-900 dark:text-amber-100 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Mic</span>
              </button>
            )}

            {isSpeaking && (
              <button
                type="button"
                onClick={onInterrupt}
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Dialogue Copy */}
        <div className="min-h-[2.25rem] max-h-20 overflow-y-auto pr-1">
          {isThinking ? (
            <div className="flex items-center gap-2 py-1 text-sm text-slate-600 dark:text-slate-200">
              <span>{displayName} is thinking...</span>
            </div>
          ) : (
            <p
              className={`text-sm leading-relaxed ${
                isPlaceholderPrompt
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {messageBody}
            </p>
          )}
        </div>

        {/* Input & Voice Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
          <form onSubmit={handleSubmit} className="flex-1 min-w-[180px] flex items-center gap-1.5">
            <input
              type="text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={`Message ${displayName}...`}
              disabled={isThinking}
              aria-label={`Message ${displayName}`}
              className="flex-1 min-w-0 h-11 sm:h-10 px-3 rounded-xl bg-slate-100 dark:bg-[#0d1930] border border-slate-200 dark:border-slate-700/80 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!draftText.trim() || isThinking}
              aria-label="Send message"
              title="Send message"
              className="h-11 w-11 sm:h-10 sm:w-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white flex items-center justify-center transition cursor-pointer shrink-0 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={cycleLanguage}
              aria-label={`Response language: ${LANGUAGE_LABELS[language]}`}
              title="Switch response language"
              className="md:hidden h-11 px-2.5 rounded-xl bg-slate-100 dark:bg-[#0d1930] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>{LANGUAGE_LABELS[language]}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`h-11 w-11 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0 ${
                isMicMuted
                  ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-200'
                  : 'bg-slate-100 dark:bg-[#0d1930] hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200'
              }`}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {isSpeaking ? (
              <button
                type="button"
                onClick={onInterrupt}
                aria-label="Stop speaking"
                className="h-11 sm:h-10 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleListen}
                disabled={isThinking}
                aria-label={isListening ? 'Send voice message' : 'Start speaking'}
                className={`h-11 sm:h-10 px-3.5 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                  isListening
                    ? 'bg-sky-600 hover:bg-sky-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{isListening ? 'Send' : 'Mic'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleChatDrawer}
              aria-label="Open full conversation history"
              title="Open full chat"
              className={`h-11 sm:h-10 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                isChatDrawerOpen
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-[#0d1930] hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
              {unreadCount > 0 && (
                <span className="text-[11px] text-blue-600 dark:text-sky-300 tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {(isListening || isSpeaking || isThinking || Boolean(aiSpokenText)) && (
              <button
                type="button"
                onClick={onEndCall}
                aria-label="Reset current turn"
                title="Reset turn"
                className="h-11 w-11 sm:h-10 sm:w-10 rounded-xl bg-slate-100 dark:bg-[#0d1930] hover:bg-rose-50 dark:hover:bg-rose-950/80 border border-slate-200 dark:border-slate-700/80 hover:border-rose-300 dark:hover:border-rose-500/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-200 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
