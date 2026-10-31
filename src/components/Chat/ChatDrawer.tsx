import React, { useRef, useEffect } from 'react';
import { ChatMessage, CompanionSettings, UserMemory } from '../../types/companion';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { QuickStarters } from './QuickStarters';
import { X, MessageSquare, Terminal } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isThinking: boolean;
  isSpeaking: boolean;
  onInterrupt: () => void;
  settings: CompanionSettings;
  onSendMessage: (text: string) => void;
  onSaveSuggestedMemory?: (memoryText: string) => void;
  suggestedMemory?: string | null;
  onDismissMemorySuggestion?: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isThinking,
  isSpeaking,
  onInterrupt,
  settings,
  onSendMessage,
  onSaveSuggestedMemory,
  suggestedMemory,
  onDismissMemorySuggestion,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[480px] bg-slate-950/95 border-l border-slate-800/90 shadow-2xl backdrop-blur-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-950/80 border border-violet-500/30 text-violet-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Conversation & Code Notes (चैट और नोट्स)
              </h3>
              <p className="text-[11px] text-slate-400">
                Full message history while maintaining live video call
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="py-6">
              <QuickStarters onSelectPrompt={onSendMessage} />
            </div>
          ) : (
            <>
              <MessageList
                messages={messages}
                isThinking={isThinking}
                settings={settings}
                onSaveSuggestedMemory={onSaveSuggestedMemory}
                suggestedMemory={suggestedMemory}
                onDismissMemorySuggestion={onDismissMemorySuggestion}
              />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Bottom Chat Input */}
        <div className="border-t border-slate-800/80 bg-slate-950 p-2">
          <ChatInput
            onSendMessage={onSendMessage}
            isThinking={isThinking}
            isSpeaking={isSpeaking}
            onInterrupt={onInterrupt}
            language={settings.language}
            onChangeLanguage={(lang) => {
              // language update
            }}
          />
        </div>
      </div>
    </>
  );
};
