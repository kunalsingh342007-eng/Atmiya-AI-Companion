import React from 'react';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  PauseCircle, 
  MessageSquare, 
  Sparkles, 
  Globe 
} from 'lucide-react';
import { AvatarState, CompanionLanguage } from '../../types/companion';

interface VoiceControlsProps {
  state: AvatarState;
  isMicMuted: boolean;
  onToggleMute: () => void;
  onToggleListen: () => void;
  onInterrupt: () => void;
  onEndCall: () => void;
  onToggleChatDrawer: () => void;
  isChatDrawerOpen: boolean;
  unreadCount?: number;
  language: CompanionLanguage;
  onChangeLanguage: (lang: CompanionLanguage) => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  isMicMuted,
  onToggleMute,
  onToggleListen,
  onInterrupt,
  onEndCall,
  onToggleChatDrawer,
  isChatDrawerOpen,
  unreadCount = 0,
  language,
  onChangeLanguage,
}) => {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';

  return (
    <div className="w-full max-w-xl mx-auto px-4 pb-6 pt-2">
      <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/85 border border-slate-800/90 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 sm:gap-4">
        {/* 1. Mute / Unmute Button */}
        <button
          onClick={onToggleMute}
          className={`p-3.5 sm:p-4 rounded-full border transition-all cursor-pointer ${
            isMicMuted
              ? 'bg-rose-950/80 border-rose-700 text-rose-300'
              : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* 2. Main Large Central Microphone or Action Button */}
        {isSpeaking ? (
          // When Ātmiya is speaking, show prominent Interrupt button
          <button
            onClick={onInterrupt}
            className="flex-1 py-3.5 sm:py-4 px-5 rounded-full bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 hover:from-amber-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-amber-950/60 flex items-center justify-center gap-2 border border-white/20 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer animate-pulse"
            title="Interrupt Ātmiya immediately"
          >
            <PauseCircle className="w-5 h-5" />
            <span>Interrupt (रूकिए)</span>
          </button>
        ) : (
          // Primary Speak / Listen button
          <button
            onClick={onToggleListen}
            disabled={isThinking}
            className={`flex-1 py-3.5 sm:py-4 px-5 rounded-full font-semibold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 border border-white/20 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer ${
              isListening
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-cyan-950/60 animate-pulse'
                : 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-950/60'
            }`}
          >
            {isListening ? (
              <>
                <Mic className="w-5 h-5 animate-bounce" />
                <span>Listening (सुन रही हूँ)...</span>
              </>
            ) : isThinking ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>Tap to Speak (बोलें)</span>
              </>
            )}
          </button>
        )}

        {/* 3. Toggle Chat Drawer Button (Keyboard / Messages) */}
        <button
          onClick={onToggleChatDrawer}
          className={`relative p-3.5 sm:p-4 rounded-full border transition-all cursor-pointer ${
            isChatDrawerOpen
              ? 'bg-violet-600 text-white border-violet-400'
              : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title="Open Text Chat & Code History"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && !isChatDrawerOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* 4. End Call Button */}
        <button
          onClick={onEndCall}
          className="p-3.5 sm:p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/60 transition transform hover:scale-105 active:scale-95 cursor-pointer"
          title="End or Reset Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
