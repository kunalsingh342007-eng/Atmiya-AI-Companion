import React, { useRef, useEffect, useState } from 'react';
import { CompanionLanguage, ChatMessage, CompanionSettings } from '../../types/companion';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { QuickStarters } from './QuickStarters';
import { AlertCircle, ArrowDown, RefreshCw, X, MessageSquare } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isThinking: boolean;
  isSpeaking: boolean;
  chatError?: string | null;
  onRetryLastMessage?: () => void;
  onDismissChatError?: () => void;
  onInterrupt: () => void;
  settings: CompanionSettings;
  onSendMessage: (text: string) => void;
  onChangeLanguage: (lang: CompanionLanguage) => void;
  draftText?: string;
  onDraftChange?: (text: string) => void;
  speakingMessageId?: string | null;
  onReplayMessage?: (msg: ChatMessage) => void;
  prefersReducedMotion?: boolean;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isThinking,
  isSpeaking,
  chatError,
  onRetryLastMessage,
  onDismissChatError,
  onInterrupt,
  settings,
  onSendMessage,
  onChangeLanguage,
  draftText,
  onDraftChange,
  speakingMessageId,
  onReplayMessage,
  prefersReducedMotion = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  const scrollToLatest = (behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth') => {
    shouldStickToBottomRef.current = true;
    setIsScrolledUp(false);
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 88;
    shouldStickToBottomRef.current = nearBottom;
    setIsScrolledUp(!nearBottom && el.scrollHeight > el.clientHeight + 40);
  };

  useEffect(() => {
    if (isOpen) {
      shouldStickToBottomRef.current = true;
      setIsScrolledUp(false);
      if (messages.length > 0) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && shouldStickToBottomRef.current && (messages.length > 0 || isThinking || chatError)) {
      messagesEndRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  }, [isOpen, messages.length, isThinking, chatError, prefersReducedMotion]);

  useEffect(() => {
    if (messages.length === 0) {
      setSuggestionsDismissed(false);
      setIsScrolledUp(false);
    }
  }, [messages.length]);

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-stone-950/45 dark:bg-black/60 backdrop-blur-xs"
        />
      )}

      <div
        role="dialog"
        aria-modal={isOpen ? 'true' : undefined}
        aria-hidden={!isOpen}
        aria-label="Conversation history"
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[460px] bg-[var(--bg-surface)] border-l border-[var(--border-hairline)] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="px-4 py-3.5 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2 bg-[var(--bg-subtle)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                Conversation &amp; Notes
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                Full message history with {settings.avatarConfig.personaName || 'Ātmiya'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat drawer"
            className="h-10 w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="space-y-3 py-2">
                {!suggestionsDismissed ? (
                  <QuickStarters
                    compact
                    onSelectPrompt={onSendMessage}
                    onDismiss={() => setSuggestionsDismissed(true)}
                  />
                ) : (
                  <div className="text-center py-4 space-y-1.5">
                    <p className="text-xs text-[var(--text-muted)]">
                      Start typing or speak using the microphone below.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSuggestionsDismissed(false)}
                      className="text-xs font-medium text-[var(--accent-ink)] hover:underline cursor-pointer"
                    >
                      Show suggestions
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <MessageList
                  messages={messages}
                  isThinking={isThinking}
                  settings={settings}
                  speakingMessageId={speakingMessageId}
                  onReplayMessage={onReplayMessage}
                />
                {chatError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-500/40 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-200"
                  >
                    <span className="inline-flex items-start gap-1.5 min-w-0 flex-1">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="break-words leading-snug">{chatError}</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onRetryLastMessage && (
                        <button
                          type="button"
                          onClick={onRetryLastMessage}
                          className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                      {onDismissChatError && (
                        <button
                          type="button"
                          onClick={onDismissChatError}
                          aria-label="Dismiss error"
                          className="h-8 w-8 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 inline-flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {isScrolledUp && messages.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToLatest()}
              aria-label="Scroll to latest message"
              className="absolute bottom-3 right-4 z-10 h-9 px-3.5 rounded-full atmiya-glass-interactive text-xs font-semibold text-[var(--accent-ink)] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Latest</span>
            </button>
          )}
        </div>

        <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0">
          <ChatInput
            onSendMessage={onSendMessage}
            isThinking={isThinking}
            isSpeaking={isSpeaking}
            onInterrupt={onInterrupt}
            language={settings.language}
            onChangeLanguage={onChangeLanguage}
            draftText={draftText}
            onDraftChange={onDraftChange}
          />
        </div>
      </div>
    </>
  );
};
