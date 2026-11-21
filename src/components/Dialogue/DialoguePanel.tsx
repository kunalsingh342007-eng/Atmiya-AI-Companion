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
  PhoneOff,
  RefreshCw,
  Send,
  Volume2,
} from 'lucide-react';

interface DialoguePanelProps {
  avatarState: AvatarState;
  personaName: string;
  userTranscript: string;
  aiSpokenText: string;
  voiceError: string | null;
  micPermission: MicPermissionStatus;
  isMicMuted: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isChatDrawerOpen: boolean;
  unreadCount: number;
  language: CompanionLanguage;
  onSendMessage: (text: string) => void;
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
  micPermission,
  isMicMuted,
  isThinking,
  isSpeaking,
  isChatDrawerOpen,
  unreadCount,
  language,
  onSendMessage,
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

  // Determine active speaker and readable message
  let speakerLabel = displayName;
  let messageBody =
    'Namaste! Main aapki baat sunne ke liye yahin hoon. Type a note or tap Talk to start.';
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
    messageBody = 'Listening for your voice in Hindi, Hinglish, or English...';
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
      className="w-full max-w-3xl mx-auto px-3 sm:px-5 pb-2.5 sm:pb-3 pt-1 shrink-0"
    >
      <div className="rounded-3xl bg-slate-950/80 border border-indigo-200/20 backdrop-blur-xl shadow-2xl p-3 sm:p-4 space-y-2.5">
        {/* Top Row: Speaker Name, Live Voice State & Interrupt / Error Retry */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-amber-200 tracking-wide">
              {speakerLabel}
            </span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            {isListening ? (
              <span className="inline-flex items-center gap-1.5 text-cyan-300 font-medium">
                <Mic className="w-3.5 h-3.5" />
                Listening
              </span>
            ) : isThinking ? (
              <span className="text-amber-300 font-medium">Thinking...</span>
            ) : isSpeaking ? (
              <span className="inline-flex items-center gap-1.5 text-violet-300 font-medium">
                <Volume2 className="w-3.5 h-3.5" />
                Speaking
              </span>
            ) : avatarState === 'interrupted' ? (
              <span className="text-amber-300 font-medium">Playback stopped</span>
            ) : avatarState === 'error' || voiceError ? (
              <span className="inline-flex items-center gap-1 text-rose-300 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {voiceError || 'Voice unavailable'}
              </span>
            ) : micPermission === 'denied' ? (
              <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                <MicOff className="w-3.5 h-3.5" />
                Mic permission denied
              </span>
            ) : (
              <span className="text-slate-400">Ready</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(voiceError || avatarState === 'error' || micPermission === 'denied') && (
              <button
                type="button"
                onClick={onRetryMic}
                className="h-8 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Mic</span>
              </button>
            )}

            {isSpeaking && (
              <button
                type="button"
                onClick={onInterrupt}
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md transition cursor-pointer whitespace-nowrap"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Stop Speaking</span>
              </button>
            )}
          </div>
        </div>

        {/* Middle Row: Dialogue Copy or Typing/Thinking Indicator */}
        <div className="min-h-[2.75rem] max-h-24 overflow-y-auto pr-1">
          {isThinking ? (
            <div className="flex items-center gap-2 py-1.5 text-sm text-slate-200">
              <span>{displayName} is thinking</span>
              <span className="inline-flex items-center gap-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce [animation-delay:240ms]" />
              </span>
            </div>
          ) : (
            <p
              className={`text-sm sm:text-[15px] leading-relaxed ${
                isPlaceholderPrompt ? 'text-slate-300/85' : 'text-slate-100'
              }`}
            >
              {messageBody}
            </p>
          )}
        </div>

        {/* Bottom Row: Compact Text Input + Voice & Chat Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1 border-t border-white/10">
          <form onSubmit={handleSubmit} className="flex-1 min-w-[200px] flex items-center gap-1.5">
            <input
              type="text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Write to Ātmiya (Hindi, Hinglish, English)..."
              disabled={isThinking}
              aria-label="Message Ātmiya"
              className="flex-1 min-w-0 h-11 sm:h-10 px-3.5 rounded-xl bg-slate-900/85 border border-white/15 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 transition disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!draftText.trim() || isThinking}
              aria-label="Send message"
              title="Send message"
              className="h-11 w-11 sm:h-10 sm:w-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500 text-white flex items-center justify-center transition cursor-pointer shrink-0 disabled:cursor-not-allowed"
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
              className="md:hidden h-11 px-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-white/15 text-slate-200 text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-violet-300" />
              <span>{LANGUAGE_LABELS[language]}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`h-11 w-11 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0 ${
                isMicMuted
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                  : 'bg-slate-900/85 hover:bg-slate-800 border-white/15 text-slate-200'
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
                    ? 'bg-cyan-600 hover:bg-cyan-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
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
              className={`h-11 sm:h-10 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                isChatDrawerOpen
                  ? 'bg-violet-600 border-violet-400 text-white'
                  : 'bg-slate-900/85 hover:bg-slate-800 border-white/15 text-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
              {unreadCount > 0 && (
                <span className="text-[11px] text-violet-300 tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {(isListening || isSpeaking || isThinking || Boolean(aiSpokenText)) && (
              <button
                type="button"
                onClick={onEndCall}
                aria-label="Reset current turn"
                title="Reset call"
                className="h-11 w-11 sm:h-10 sm:w-10 rounded-xl bg-slate-900/85 hover:bg-rose-950/80 border border-white/15 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
