import React, { useState } from 'react';
import { ChatMessage, CompanionSettings } from '../../types/companion';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Sparkles,
  User,
  Brain,
  Terminal,
} from 'lucide-react';
import { speechService } from '../../services/speech';
import { api } from '../../services/api';

interface MessageListProps {
  messages: ChatMessage[];
  isThinking: boolean;
  settings: CompanionSettings;
  onSaveSuggestedMemory?: (memoryText: string) => void;
  suggestedMemory?: string | null;
  onDismissMemorySuggestion?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isThinking,
  settings,
  onSaveSuggestedMemory,
  suggestedMemory,
  onDismissMemorySuggestion,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const speakRequestIdRef = React.useRef<number>(0);

  React.useEffect(() => {
    return () => {
      speakRequestIdRef.current += 1;
    };
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = async (id: string, text: string) => {
    if (speakingMessageId === id) {
      speakRequestIdRef.current += 1;
      speechService.stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    const reqId = ++speakRequestIdRef.current;
    speechService.stopSpeaking();
    setSpeakingMessageId(id);

    const onFinish = () => {
      if (speakRequestIdRef.current !== reqId) return;
      setSpeakingMessageId(null);
    };

    if (settings.voiceEngine === 'gemini-native' && !api.isTtsInCooldown()) {
      try {
        const res = await api.generateTTS({
          text,
          voice: settings.selectedVoice || 'Kore',
        });
        if (speakRequestIdRef.current !== reqId) return;
        if (res.audioBase64) {
          await speechService.playWavAudio(res.audioBase64, onFinish, () => {
            if (speakRequestIdRef.current !== reqId) return;
            speechService.speakWithBrowserTTS(text, settings.language, settings.speechRate, onFinish);
          });
          return;
        }
      } catch (e: any) {
        if (speakRequestIdRef.current !== reqId) return;
        console.warn('TTS playback fallback:', e?.message || e);
      }
    }

    if (speakRequestIdRef.current !== reqId) return;
    speechService.speakWithBrowserTTS(
      text,
      settings.language,
      settings.speechRate,
      onFinish
    );
  };

  const renderMessageContent = (content: string, isUser: boolean) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const firstLine = lines[0].trim();
        const hasLang = /^[a-zA-Z0-9#+-]+$/.test(firstLine);
        const language = hasLang ? firstLine : '';
        const code = (hasLang ? lines.slice(1) : lines).join('\n');

        return (
          <div
            key={index}
            className="my-2.5 rounded-xl overflow-hidden bg-[#081020] border border-slate-700/80 text-xs font-mono"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f1b33] border-b border-slate-700/80 text-slate-300">
              <span className="flex items-center gap-1.5 text-[11px] font-sans font-semibold">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                {language || 'code'}
              </span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 py-0.5 px-2 rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-sky-200 leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div
          key={index}
          className={`whitespace-pre-wrap leading-relaxed ${
            isUser ? 'text-white' : 'text-slate-800 dark:text-slate-100'
          }`}
        >
          {part}
        </div>
      );
    });
  };

  return (
    <div className="space-y-4 pb-2">
      {/* Memory Suggestion Banner */}
      {suggestedMemory && (
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-500/40 flex flex-col gap-2.5 text-xs text-slate-800 dark:text-slate-100 animate-fadeIn">
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">
                Save this personal detail to memory?
              </span>
              <span className="text-slate-600 dark:text-slate-300 italic">"{suggestedMemory}"</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDismissMemorySuggestion}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => onSaveSuggestedMemory?.(suggestedMemory)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer"
            >
              Save Memory
            </button>
          </div>
        </div>
      )}

      {/* Message Items */}
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isMsgSpeaking = speakingMessageId === msg.id;

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar icon */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold mt-0.5 ${
                isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#0f2347] dark:bg-blue-900/80 border border-blue-500/30 text-sky-200'
              }`}
            >
              {isUser ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <span className="font-serif">आ</span>
              )}
            </div>

            {/* Message Bubble Container */}
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] sm:text-sm transition-colors ${
                isUser
                  ? 'bg-blue-600 text-white rounded-tr-sm shadow-xs'
                  : 'bg-slate-100 dark:bg-[#101c36] border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm'
              }`}
            >
              {/* Unboxed Message Meta */}
              <div
                className={`flex items-center justify-between gap-3 mb-1 text-[11px] ${
                  isUser ? 'text-blue-100/90' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="font-semibold">
                  {isUser ? settings.userName || 'You' : settings.avatarConfig.personaName || 'Ātmiya'}
                </span>
                <span className="tabular-nums">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Message Text Content */}
              <div className="text-[13px] sm:text-sm font-normal">
                {renderMessageContent(msg.content, isUser)}
              </div>

              {/* Actions for Model Messages */}
              {!isUser && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleSpeak(msg.id, msg.content)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      isMsgSpeaking
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-[#091224] hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300'
                    }`}
                    title={isMsgSpeaking ? 'Stop speaking' : 'Listen to reply'}
                  >
                    {isMsgSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                        <span>Speak</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer rounded-lg hover:bg-white dark:hover:bg-slate-800"
                    title="Copy message"
                    aria-label="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Thinking Indicator */}
      {isThinking && (
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#0f2347] dark:bg-blue-900/80 border border-blue-500/30 text-sky-200 flex items-center justify-center font-serif text-[11px]">
            आ
          </div>
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-[#101c36] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 animate-spin" />
            <span>{settings.avatarConfig.personaName || 'Ātmiya'} is thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
};
