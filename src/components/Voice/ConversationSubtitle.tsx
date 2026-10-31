import React from 'react';
import { AvatarState } from '../../types/companion';
import { Volume2, Mic } from 'lucide-react';

interface ConversationSubtitleProps {
  state: AvatarState;
  userTranscript: string;
  aiSpokenText: string;
  className?: string;
}

export const ConversationSubtitle: React.FC<ConversationSubtitleProps> = ({
  state,
  userTranscript,
  aiSpokenText,
  className = '',
}) => {
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';

  if (!userTranscript && !aiSpokenText) {
    return (
      <div className={`text-center py-2 px-4 text-xs text-slate-500 italic ${className}`}>
        Tap the microphone or say something in Hindi, Hinglish, or English...
      </div>
    );
  }

  return (
    <div className={`w-full max-w-lg mx-auto px-4 ${className}`}>
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md shadow-xl text-center text-xs leading-relaxed animate-fadeIn">
        {isSpeaking ? (
          <div className="text-violet-200">
            <span className="font-semibold text-violet-400 mr-1.5 inline-flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 inline" /> Ātmiya:
            </span>
            <span>{aiSpokenText.slice(0, 180) + (aiSpokenText.length > 180 ? '...' : '')}</span>
          </div>
        ) : isListening && userTranscript ? (
          <div className="text-cyan-200">
            <span className="font-semibold text-cyan-400 mr-1.5 inline-flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 inline" /> You:
            </span>
            <span>{userTranscript}</span>
          </div>
        ) : aiSpokenText ? (
          <div className="text-slate-300">
            <span className="font-semibold text-violet-400 mr-1.5">Ātmiya:</span>
            <span>{aiSpokenText.slice(0, 160) + (aiSpokenText.length > 160 ? '...' : '')}</span>
          </div>
        ) : (
          <div className="text-slate-400">
            <span className="font-semibold text-cyan-400 mr-1.5">You:</span>
            <span>{userTranscript}</span>
          </div>
        )}
      </div>
    </div>
  );
};
