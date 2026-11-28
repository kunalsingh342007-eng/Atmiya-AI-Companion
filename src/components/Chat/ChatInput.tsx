import React, { useState, useRef } from 'react';
import { Send, Mic, MicOff, PauseCircle } from 'lucide-react';
import { CompanionLanguage } from '../../types/companion';
import { speechService } from '../../services/speech';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  isSpeaking: boolean;
  onInterrupt: () => void;
  language: CompanionLanguage;
  onChangeLanguage: (lang: CompanionLanguage) => void;
  draftText?: string;
  onDraftChange?: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isThinking,
  isSpeaking,
  onInterrupt,
  language,
  onChangeLanguage,
  draftText: controlledDraft,
  onDraftChange,
}) => {
  const [localInputText, setLocalInputText] = useState('');
  const inputText = controlledDraft !== undefined ? controlledDraft : localInputText;
  const setInputText = (next: string) => {
    if (onDraftChange) {
      onDraftChange(next);
    }
    if (controlledDraft === undefined) {
      setLocalInputText(next);
    }
  };
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (isRecording) {
      speechService.stopRecognition();
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      speechService.stopRecognition();
      setIsRecording(false);
      setRecordingStatus(null);
      return;
    }

    const langLocale: 'hi-IN' | 'en-IN' = language === 'hi' ? 'hi-IN' : 'en-IN';

    const started = speechService.startRecognition(langLocale, {
      onStart: () => {
        setIsRecording(true);
        setRecordingStatus('Listening to your voice...');
      },
      onResult: (transcript, isFinal) => {
        setInputText(transcript);
        if (isFinal) {
          setRecordingStatus('Voice captured.');
        }
      },
      onError: (err) => {
        setIsRecording(false);
        setRecordingStatus(err);
        setTimeout(() => setRecordingStatus(null), 3500);
      },
      onEnd: () => {
        setIsRecording(false);
        setRecordingStatus(null);
      },
    });

    if (!started) {
      setRecordingStatus('Voice input not supported in this browser.');
      setTimeout(() => setRecordingStatus(null), 3500);
    }
  };

  return (
    <div className="w-full p-2">
      {recordingStatus && (
        <div className="mb-2 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-500/40 text-sky-800 dark:text-sky-200 text-xs">
            <Mic className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{recordingStatus}</span>
          </div>
        </div>
      )}

      <div className="relative rounded-2xl bg-slate-50 dark:bg-[#0c162b] border border-slate-200 dark:border-slate-700/80 focus-within:border-blue-500 transition-colors">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={4000}
          placeholder="Message Ātmiya in Hindi, Hinglish, or English..."
          rows={2}
          aria-label="Message Ātmiya"
          className="w-full bg-transparent px-3.5 pt-3 pb-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
        />

        <div className="px-3 pb-2.5 pt-1.5 flex items-center justify-between gap-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <select
              aria-label="Response language"
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as CompanionLanguage)}
              className="h-9 bg-white dark:bg-[#081020] border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="auto">Auto Language</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="hinglish">Hinglish</option>
              <option value="en">English</option>
            </select>

            {isSpeaking && (
              <button
                type="button"
                onClick={onInterrupt}
                aria-label="Stop speaking"
                className="h-9 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition cursor-pointer shrink-0"
                title="Stop speaking"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleRecording}
              aria-pressed={isRecording}
              aria-label={isRecording ? 'Stop voice recording' : 'Record voice message'}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={isRecording ? 'Stop recording' : 'Record voice'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isThinking}
              className="h-10 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
