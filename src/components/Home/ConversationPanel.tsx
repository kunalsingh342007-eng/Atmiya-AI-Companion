import React, { useEffect, useRef, useState } from 'react';
import {
  AvatarState,
  ChatMessage,
  CompanionSettings,
  MicPermissionStatus,
} from '../../types/companion';
import { MessageList } from '../Chat/MessageList';
import { QuickStarters } from '../Chat/QuickStarters';
import {
  AlertCircle,
  History,
  Mic,
  MicOff,
  PauseCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Volume2,
} from 'lucide-react';

interface ConversationPanelProps {
  sessionTitle: string;
  messages: ChatMessage[];
  settings: CompanionSettings;
  avatarState: AvatarState;
  userTranscript: string;
  voiceError: string | null;
  chatError: string | null;
  micPermission: MicPermissionStatus;
  isMicMuted: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  suggestedMemory: string | null;
  onOpenSessions: () => void;
  onNewChat: () => void;
  onSendMessage: (text: string) => void;
  onRetryLastMessage: () => void;
  onToggleListen: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onResetTurn: () => void;
  onRetryMic: () => void;
  onSaveSuggestedMemory: (memoryText: string) => void;
  onDismissMemorySuggestion: () => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  sessionTitle,
  messages,
  settings,
  avatarState,
  userTranscript,
  voiceError,
  chatError,
  micPermission,
  isMicMuted,
  isThinking,
  isSpeaking,
  suggestedMemory,
  onOpenSessions,
  onNewChat,
  onSendMessage,
  onRetryLastMessage,
  onToggleListen,
  onToggleMute,
  onInterrupt,
  onResetTurn,
  onRetryMic,
  onSaveSuggestedMemory,
  onDismissMemorySuggestion,
}) => {
  const [draftText, setDraftText] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);

  const isListening = avatarState === 'listening';
  const companionName = settings.avatarConfig.personaName?.trim() || 'Ātmiya';

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
  };

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isThinking, suggestedMemory, chatError]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed || isThinking) return;
    shouldStickToBottomRef.current = true;
    onSendMessage(trimmed);
    setDraftText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <aside
      aria-label="Conversation workspace"
      className="hidden lg:flex lg:w-[410px] xl:w-[460px] shrink-0 h-full flex-col bg-white dark:bg-[#081122] border-l border-slate-200 dark:border-slate-800/80 z-20"
    >
      {/* Conversation Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-[#0b152a]">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {sessionTitle || 'New Conversation'}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {messages.length} message{messages.length === 1 ? '' : 's'} · Voice & Text ready
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSessions}
            className="h-9 px-2.5 rounded-lg bg-white dark:bg-[#0f1c36] hover:bg-slate-100 dark:hover:bg-[#152647] border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
            title="Switch or search sessions"
          >
            <History className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            <span>Sessions</span>
          </button>

          <button
            type="button"
            onClick={onNewChat}
            aria-label="Start new conversation"
            title="New conversation"
            className="h-9 w-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Message Thread */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 && !isThinking ? (
          <QuickStarters onSelectPrompt={onSendMessage} compact />
        ) : (
          <MessageList
            messages={messages}
            isThinking={isThinking}
            settings={settings}
            onSaveSuggestedMemory={onSaveSuggestedMemory}
            suggestedMemory={suggestedMemory}
            onDismissMemorySuggestion={onDismissMemorySuggestion}
          />
        )}

        {/* Inline Error Alert with Retry */}
        {chatError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-500/40 flex items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-200 animate-fadeIn">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{chatError}</span>
            </span>
            <button
              type="button"
              onClick={onRetryLastMessage}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice-First Interaction Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#0a1326] space-y-2.5">
        {/* Live Voice Status / Permission Notice */}
        {(isListening || isSpeaking || voiceError || micPermission === 'denied') && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#0f1b33] border border-slate-200 dark:border-slate-700/70 text-xs">
            <div className="min-w-0 flex items-center gap-2">
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="text-sky-700 dark:text-sky-300 font-medium truncate">
                    {userTranscript ? `“${userTranscript}”` : 'Listening for your voice...'}
                  </span>
                </>
              ) : isSpeaking ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
                    {companionName} is speaking...
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-200 truncate">
                    {voiceError || 'Microphone access blocked. Text chat works normally.'}
                  </span>
                </>
              )}
            </div>

            {isSpeaking ? (
              <button
                type="button"
                onClick={onInterrupt}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Stop
              </button>
            ) : (voiceError || micPermission === 'denied') ? (
              <button
                type="button"
                onClick={onRetryMic}
                className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800/70 text-amber-900 dark:text-amber-100 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Retry Mic
              </button>
            ) : null}
          </div>
        )}

        {/* Composer Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white dark:bg-[#0d182e] border border-slate-200 dark:border-slate-700/80 focus-within:border-blue-500 transition-colors p-2.5 space-y-2"
        >
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Talk or write to ${companionName}...`}
            disabled={isThinking}
            rows={2}
            aria-label={`Message ${companionName}`}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed disabled:opacity-60"
          />

          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleListen}
                disabled={isThinking}
                aria-label={isListening ? 'Send voice message' : 'Start speaking with microphone'}
                className={`h-10 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                  isListening
                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                    : 'bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-500/40 text-blue-700 dark:text-sky-200'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{isListening ? 'Send Voice' : 'Speak'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                className={`h-10 w-10 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                  isMicMuted
                    ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-300'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {(isListening || isSpeaking || isThinking) && (
                <button
                  type="button"
                  onClick={onResetTurn}
                  aria-label="Reset current voice turn"
                  title="Reset turn"
                  className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/70 text-slate-500 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 flex items-center justify-center transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!draftText.trim() || isThinking}
              aria-label="Send message"
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
};
