import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, CompanionSettings } from '../../types/companion';
import { MessageList } from '../Chat/MessageList';
import { QuickStarters } from '../Chat/QuickStarters';
import { AlertCircle, Plus, RefreshCw, Sparkles, X } from 'lucide-react';

interface ConversationPanelProps {
  sessionTitle: string;
  messages: ChatMessage[];
  settings: CompanionSettings;
  chatError: string | null;
  isThinking: boolean;
  suggestedMemory: string | null;
  onNewChat: () => void;
  onSendMessage: (text: string) => void;
  onRetryLastMessage: () => void;
  onDismissChatError?: () => void;
  onSaveSuggestedMemory: (memoryText: string) => void;
  onDismissMemorySuggestion: () => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  sessionTitle,
  messages,
  settings,
  chatError,
  isThinking,
  suggestedMemory,
  onNewChat,
  onSendMessage,
  onRetryLastMessage,
  onDismissChatError,
  onSaveSuggestedMemory,
  onDismissMemorySuggestion,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  const companionName = settings.avatarConfig.personaName?.trim() || 'Ātmiya';
  const userName = settings.userName?.trim();

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

  return (
    <aside
      aria-label="Conversation panel"
      className="hidden lg:flex lg:w-[312px] xl:w-[356px] shrink-0 h-full min-h-0 flex-col bg-white/95 dark:bg-[#070f20]/95 border-l border-slate-200 dark:border-slate-800/80 z-20"
    >
      {/* Compact Conversation Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-[#091326]">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
            {sessionTitle || 'Conversation'}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {messages.length} message{messages.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSuggestionsDismissed(false);
            onNewChat();
          }}
          aria-label="Start new conversation"
          title="New conversation"
          className="h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-[#0f1d38] hover:bg-blue-50 dark:hover:bg-sky-500/15 border border-slate-200 dark:border-sky-400/20 text-slate-700 dark:text-sky-100 text-xs font-medium inline-flex items-center gap-1 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300" />
          <span>New</span>
        </button>
      </div>

      {/* Scrollable Chat History / Greeting + Max 3 Dismissible Suggestions */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3.5 space-y-4"
      >
        {messages.length === 0 && !isThinking ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0b162d] border border-slate-200/80 dark:border-sky-400/15 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-sky-300">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{userName ? `Namaste, ${userName}` : 'Namaste!'}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                I&apos;m {companionName}. Talk with your microphone or type below to get started.
              </p>
            </div>

            {!suggestionsDismissed ? (
              <QuickStarters
                compact
                onSelectPrompt={onSendMessage}
                onDismiss={() => setSuggestionsDismissed(true)}
              />
            ) : (
              <div className="flex items-center justify-end px-0.5">
                <button
                  type="button"
                  onClick={() => setSuggestionsDismissed(false)}
                  className="text-[11px] font-medium text-blue-600 dark:text-sky-300 hover:underline cursor-pointer"
                >
                  Show suggestions
                </button>
              </div>
            )}
          </div>
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
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onRetryLastMessage}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              {onDismissChatError && (
                <button
                  type="button"
                  onClick={onDismissChatError}
                  aria-label="Dismiss error"
                  className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </aside>
  );
};
