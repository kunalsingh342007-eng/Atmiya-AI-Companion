import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  PauseCircle, 
  Globe, 
  Sparkles,
  Paperclip
} from 'lucide-react';
import { CompanionLanguage } from '../../types/companion';
import { speechService } from '../../services/speech';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  isSpeaking: boolean;
  onInterrupt: () => void;
  language: CompanionLanguage;
  onChangeLanguage: (lang: CompanionLanguage) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isThinking,
  isSpeaking,
  onInterrupt,
  language,
  onChangeLanguage,
}) => {
  const [inputText, setInputText] = useState('');
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

    let langLocale: any = 'en-IN';
    if (language === 'hi') langLocale = 'hi-IN';
    else if (language === 'en') langLocale = 'en-IN';
    else langLocale = 'en-IN';

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
        setRecordingStatus('Microphone error: ' + err);
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
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Recording status pill if active */}
      {recordingStatus && (
        <div className="mb-2 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs shadow-md animate-pulse">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>{recordingStatus}</span>
          </div>
        </div>
      )}

      {/* Main Input Box */}
      <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-violet-500/60 shadow-xl backdrop-blur-md transition-all">
        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Ātmiya in Hindi, Hinglish, or English (e.g. 'Aaj thodi baat karo' or 'Help me plan my day')..."
          rows={2}
          className="w-full bg-transparent p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
        />

        {/* Input Bar Footer Controls */}
        <div className="px-3 pb-2.5 pt-1 flex items-center justify-between border-t border-slate-800/60 text-xs">
          {/* Left accessories: Language badge & speech interrupt */}
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as CompanionLanguage)}
              className="bg-slate-950 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="auto">🌐 Auto Language</option>
              <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
              <option value="hinglish">✨ Hinglish</option>
              <option value="en">🇬🇧 English</option>
            </select>

            {/* Quick Interrupt button when companion is speaking */}
            {isSpeaking && (
              <button
                onClick={onInterrupt}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-semibold transition shadow cursor-pointer animate-pulse"
                title="Interrupt Ātmiya immediately"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Interrupt (रोकें)</span>
              </button>
            )}
          </div>

          {/* Right actions: Mic & Send */}
          <div className="flex items-center gap-2">
            {/* Microphone button */}
            <button
              onClick={toggleRecording}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50 animate-bounce'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isRecording ? 'Stop recording voice' : 'Record voice in Hindi/English'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isThinking}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-violet-950/50 disabled:opacity-40 disabled:pointer-events-none transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-[11px] text-slate-500">
        Ātmiya is an empathetic AI companion. For emergencies, please seek qualified human professional care.
      </div>
    </div>
  );
};
