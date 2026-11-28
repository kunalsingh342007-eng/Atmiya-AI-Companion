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
            className="my-2.5 max-w-full rounded-xl overflow-hidden bg-[#0c1220] border border-slate-700/80 text-xs font-mono"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#121a2d] border-b border-slate-700/80 text-slate-300">
              <span className="flex items-center gap-1.5 min-w-0 text-[11px] font-sans font-semibold">
                <Terminal className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span className="truncate">{language || 'code'}</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeKey, code)}
                aria-label={isCodeCopied ? 'Copied code block' : 'Copy code block'}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-800 transition cursor-pointer shrink-0"
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
            <pre className="p-3 max-w-full overflow-x-auto text-indigo-100 leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div
          key={index}
          className={`whitespace-pre-wrap [overflow-wrap:anywhere] break-words leading-[1.58] ${
            isUser ? 'text-white' : 'text-[var(--text-primary)]'
          }`}
        >
          {part}
        </div>
      );
    });
  };

  return (
    <div className="space-y-4 pb-2 min-w-0">
      {/* Message Items */}
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isMsgSpeaking = activeSpeakingId === msg.id;

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 min-w-0 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar icon */}
            <div
              aria-hidden="true"
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold mt-0.5 ${
                isUser
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)]'
              }`}
            >
              {isUser ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <span className="font-display text-xs">आ</span>
              )}
            </div>

            {/* Message Bubble Container */}
            <div
              className={`max-w-[88%] sm:max-w-[85%] min-w-0 rounded-2xl px-3.5 py-2.5 text-[13px] sm:text-sm transition-colors ${
                isUser
                  ? 'bg-[var(--accent-primary)] text-white rounded-tr-sm shadow-xs'
                  : 'atmiya-card-subtle text-[var(--text-primary)] rounded-tl-sm'
              }`}
            >
              {/* Unboxed Message Meta */}
              <div
                className={`flex items-center justify-between gap-3 mb-1.5 text-[11px] min-w-0 ${
                  isUser ? 'text-white/85' : 'text-[var(--text-muted)]'
                }`}
              >
                <span className="font-semibold truncate min-w-0">
                  {isUser ? settings.userName || 'You' : settings.avatarConfig.personaName || 'Ātmiya'}
                </span>
                <span className="tabular-nums shrink-0">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Message Text Content */}
              <div className="text-[13px] sm:text-sm font-normal min-w-0">
                {renderMessageContent(msg.id, msg.content, isUser)}
              </div>

              {/* Actions for Model Messages */}
              {!isUser && (
                <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    disabled={isThinking && !isMsgSpeaking}
                    onClick={() => handleSpeak(msg)}
                    aria-pressed={isMsgSpeaking}
                    aria-label={isMsgSpeaking ? 'Stop speaking reply' : 'Listen to reply'}
                    className={`min-h-[32px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isMsgSpeaking
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-surface)] hover:bg-[var(--accent-soft)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                        <Volume2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>Speak</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="min-h-[32px] min-w-[32px] px-2 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer rounded-lg hover:bg-[var(--bg-surface)] inline-flex items-center justify-center"
                    title="Copy message"
                    aria-label={copiedId === msg.id ? 'Message copied' : 'Copy message'}
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
          <div className="w-7 h-7 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center font-display text-xs">
            आ
          </div>
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm atmiya-card-subtle text-[var(--text-secondary)] text-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-warm)] animate-spin" />
            <span>{settings.avatarConfig.personaName || 'Ātmiya'} is thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
};
