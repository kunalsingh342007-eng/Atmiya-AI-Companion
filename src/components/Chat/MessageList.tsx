import React, { useState } from 'react';
import { ChatMessage, CompanionSettings } from '../../types/companion';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Sparkles,
  User,
  Terminal,
} from 'lucide-react';
import { speechService } from '../../services/speech';
import { api } from '../../services/api';

interface MessageListProps {
  messages: ChatMessage[];
  isThinking: boolean;
  settings: CompanionSettings;
  speakingMessageId?: string | null;
  onReplayMessage?: (msg: ChatMessage) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isThinking,
  settings,
  speakingMessageId: controlledSpeakingMessageId,
  onReplayMessage,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [localSpeakingMessageId, setLocalSpeakingMessageId] = useState<string | null>(null);
  const speakRequestIdRef = React.useRef<number>(0);

  const activeSpeakingId =
    onReplayMessage !== undefined ? controlledSpeakingMessageId ?? null : localSpeakingMessageId;

  React.useEffect(() => {
    return () => {
      speakRequestIdRef.current += 1;
    };
  }, []);

  const copyTextSafely = (text: string, onSuccess: () => void) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(onSuccess)
        .catch(() => {});
    }
  };

  const handleCopy = (id: string, text: string) => {
    copyTextSafely(text, () => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000);
    });
  };

  const handleCopyCode = (key: string, code: string) => {
    copyTextSafely(code, () => {
      setCopiedCodeKey(key);
      setTimeout(() => setCopiedCodeKey((curr) => (curr === key ? null : curr)), 2000);
    });
  };

  const handleSpeak = async (msg: ChatMessage) => {
    if (onReplayMessage) {
      onReplayMessage(msg);
      return;
    }

    const { id, content: text } = msg;
    if (localSpeakingMessageId === id) {
      speakRequestIdRef.current += 1;
      speechService.stopSpeaking();
      setLocalSpeakingMessageId(null);
      return;
    }

    const reqId = ++speakRequestIdRef.current;
    speechService.stopSpeaking();
    setLocalSpeakingMessageId(id);

    const onFinish = () => {
      if (speakRequestIdRef.current !== reqId) return;
      setLocalSpeakingMessageId(null);
    };

    if (settings.voiceEngine === 'gemini-native' && !api.isTtsInCooldown()) {
      try {
        const res = await api.generateTTS({
          text,
          voice: settings.selectedVoice || 'Kore',
        });
        if (speakRequestIdRef.current !== reqId) return;
        if (res.audioBase64) {
          await speechService.playWavAudio(
            res.audioBase64,
            onFinish,
            () => {
              if (speakRequestIdRef.current !== reqId) return;
              speechService.speakWithBrowserTTS(
                text,
                settings.language,
                settings.speechRate,
                onFinish
              );
            },
            {
              text,
              lang: settings.language,
              rate: settings.speechRate,
            }
          );
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

  const renderMessageContent = (msgId: string, content: string, isUser: boolean) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const firstLine = lines[0].trim();
        const hasLang = /^[a-zA-Z0-9#+-]+$/.test(firstLine);
        const language = hasLang ? firstLine : '';
        const code = (hasLang ? lines.slice(1) : lines).join('\n');
        const codeKey = `${msgId}:code:${index}`;
        const isCodeCopied = copiedCodeKey === codeKey;

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
                onClick={() => handleCopyCode(codeKey, code)}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 py-0.5 px-2 rounded hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                {isCodeCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
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
      {/* Message Items */}
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isMsgSpeaking = activeSpeakingId === msg.id;

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
                  : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/80 dark:border-blue-500/30 dark:text-sky-200'
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
                {renderMessageContent(msg.id, msg.content, isUser)}
              </div>

              {/* Actions for Model Messages */}
              {!isUser && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    disabled={isThinking && !isMsgSpeaking}
                    onClick={() => handleSpeak(msg)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer rounded-lg hover:bg-white dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/80 dark:border-blue-500/30 dark:text-sky-200 flex items-center justify-center font-serif text-[11px]">
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
