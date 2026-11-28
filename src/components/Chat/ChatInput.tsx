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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] text-xs">
            <Mic className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>{recordingStatus}</span>
          </div>
        </div>
      )}

      <div className="relative rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] focus-within:border-[var(--accent-primary)] transition-colors">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={4000}
          placeholder="Message Ātmiya in Hindi, Hinglish, or English..."
          rows={2}
          aria-label="Message Ātmiya"
          className="w-full bg-transparent px-3.5 pt-3 pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none resize-none leading-relaxed"
        />

        <div className="px-3 pb-2.5 pt-1.5 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <select
              aria-label="Response language"
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as CompanionLanguage)}
              className="h-9 bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[11px] font-medium text-[var(--text-primary)] rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
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
                  : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
              title={isRecording ? 'Stop recording' : 'Record voice'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isThinking}
              className="h-10 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
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
