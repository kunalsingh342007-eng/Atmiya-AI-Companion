import React, { useRef, useEffect } from 'react';
import { CompanionLanguage, ChatMessage, CompanionSettings } from '../../types/companion';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { QuickStarters } from './QuickStarters';
import { AlertCircle, RefreshCw, X, MessageSquare } from 'lucide-react';

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
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestionsDismissed, setSuggestionsDismissed] = React.useState(false);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (messages.length === 0) {
      setSuggestionsDismissed(false);
    }
  }, [messages.length]);

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-950/50 dark:bg-black/60 backdrop-blur-xs"
        />
      )}

      <div
        role="dialog"
        aria-modal={isOpen ? 'true' : undefined}
        aria-hidden={!isOpen}
        aria-label="Conversation history"
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[460px] bg-white dark:bg-[#081020] border-l border-slate-200 dark:border-slate-800/90 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0c162b]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-sky-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Conversation & Notes
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Full message history with {settings.avatarConfig.personaName || 'Ātmiya'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat drawer"
            className="h-9 w-9 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Start typing or speak using the microphone below.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSuggestionsDismissed(false)}
                    className="text-xs font-medium text-blue-600 dark:text-sky-300 hover:underline cursor-pointer"
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
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-500/40 flex items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-200">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">{chatError}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onRetryLastMessage && (
                      <button
                        type="button"
                        onClick={onRetryLastMessage}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
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
                        className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 cursor-pointer"
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

        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091224] p-2">
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
