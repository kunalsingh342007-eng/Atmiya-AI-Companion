import React, { useState } from 'react';
import { ChatMessage, CompanionSettings, UserMemory } from '../../types/companion';
import { 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  User, 
  Clock, 
  Brain, 
  Terminal,
  AlertCircle
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

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = async (id: string, text: string) => {
    if (speakingMessageId === id) {
      speechService.stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    speechService.stopSpeaking();
    setSpeakingMessageId(id);

    const onFinish = () => {
      setSpeakingMessageId(null);
    };

    if (settings.voiceEngine === 'gemini-native') {
      try {
        const res = await api.generateTTS({
          text,
          voice: settings.selectedVoice || 'Kore',
        });
        if (res.audioBase64) {
          await speechService.playWavAudio(res.audioBase64, onFinish, () => {
            speechService.speakWithBrowserTTS(text, settings.language, settings.speechRate, onFinish);
          });
          return;
        }
      } catch (e) {
        console.warn('TTS playback error:', e);
      }
    }

    speechService.speakWithBrowserTTS(
      text,
      settings.language === 'hi' ? 'hi-IN' : 'en-IN',
      settings.speechRate,
      onFinish
    );
  };

  // Helper to render text with markdown code blocks nicely
  const renderMessageContent = (content: string) => {
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
            className="my-3 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 text-xs font-mono"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5 text-[11px] font-sans font-semibold">
                <Terminal className="w-3.5 h-3.5 text-violet-400" />
                {language || 'code'}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 py-0.5 px-2 rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-emerald-300/90 leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Format inline bolding and linebreaks
      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Memory Suggestion Banner if detected in turn */}
      {suggestedMemory && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/80 to-indigo-950/80 border border-violet-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-violet-200 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <Brain className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">
                Ātmiya detected a personal preference/fact:
              </span>
              <span className="text-slate-300 italic">"{suggestedMemory}"</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => onSaveSuggestedMemory?.(suggestedMemory)}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition cursor-pointer shadow-md shadow-violet-900/40"
            >
              Save to Memory (स्मृति में जोड़ें)
            </button>
            <button
              onClick={onDismissMemorySuggestion}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Message Items */}
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isSpeaking = speakingMessageId === msg.id;

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold shadow-md ${
                isUser
                  ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white'
                  : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white'
              }`}
            >
              {isUser ? (
                <User className="w-4 h-4" />
              ) : (
                <span className="font-serif">आ</span>
              )}
            </div>

            {/* Message Bubble Container */}
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm shadow-md transition-all ${
                isUser
                  ? 'bg-blue-600/90 text-white rounded-tr-none'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-none backdrop-blur-sm'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-3 pb-1 mb-1 border-b border-white/10 text-[10px] text-slate-300">
                <span className="font-semibold tracking-wide">
                  {isUser ? (settings.userName || 'You') : (settings.avatarConfig.personaName || 'Ātmiya')}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Message Text Content */}
              <div className="text-sm font-normal text-slate-100">
                {renderMessageContent(msg.content)}
              </div>

              {/* Bottom Actions for Model Messages */}
              {!isUser && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    {/* Speak / Pause Audio */}
                    <button
                      onClick={() => handleSpeak(msg.id, msg.content)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                        isSpeaking
                          ? 'bg-violet-600 text-white font-medium shadow-md shadow-violet-900/40 animate-pulse'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                      }`}
                      title={isSpeaking ? 'Stop speaking' : 'Listen to Ātmiya speak this'}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                          <span>Speak</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer rounded hover:bg-slate-800"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
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
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-serif text-xs">
            आ
          </div>
          <div className="p-4 rounded-2xl rounded-tl-none bg-slate-900/80 border border-slate-800 text-slate-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400 animate-spin" />
            <span>Ātmiya is thinking (आत्मीय सोच रही है)...</span>
          </div>
        </div>
      )}
    </div>
  );
};
