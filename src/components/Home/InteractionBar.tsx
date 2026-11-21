import React from 'react';
import { AvatarEmotion, AvatarState } from '../../types/companion';
import { Gamepad2, Hand, Heart, MessageSquare, Mic, Palette, Sparkles } from 'lucide-react';

interface InteractionBarProps {
  avatarState: AvatarState;
  onTalk: () => void;
  onOpenChat: () => void;
  onNavigatePlay: () => void;
  onNavigateWardrobe: () => void;
  onQuickReaction: (emotion: AvatarEmotion, label: string, line: string) => void;
}

export const InteractionBar: React.FC<InteractionBarProps> = ({
  avatarState,
  onTalk,
  onOpenChat,
  onNavigatePlay,
  onNavigateWardrobe,
  onQuickReaction,
}) => {
  const isListening = avatarState === 'listening';
  const isBusy = avatarState === 'thinking';

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-5 pb-1 flex flex-col items-center gap-2 pointer-events-auto shrink-0">
      {/* Primary Contextual Pill Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onTalk}
          disabled={isBusy}
          className={`h-11 sm:h-10 px-4 rounded-full border text-xs font-semibold backdrop-blur-md inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
            isListening
              ? 'bg-sky-600 border-sky-300/70 text-white shadow-lg shadow-sky-950/50'
              : 'bg-slate-950/70 hover:bg-indigo-950/85 border-indigo-200/20 text-slate-100'
          }`}
        >
          <Mic className="w-3.5 h-3.5 text-sky-300" />
          <span>{isListening ? 'Send Voice' : 'Talk'}</span>
          <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-slate-200 font-mono">
            T
          </kbd>
        </button>

        <button
          type="button"
          onClick={onOpenChat}
          className="h-11 sm:h-10 px-4 rounded-full bg-slate-950/70 hover:bg-indigo-950/85 border border-indigo-200/20 text-slate-100 text-xs font-semibold backdrop-blur-md inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <MessageSquare className="w-3.5 h-3.5 text-violet-300" />
          <span>Chat</span>
          <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-slate-200 font-mono">
            C
          </kbd>
        </button>

        <button
          type="button"
          onClick={onNavigatePlay}
          className="h-11 sm:h-10 px-4 rounded-full bg-gradient-to-r from-indigo-600/90 to-violet-600/90 hover:from-indigo-500 hover:to-violet-500 border border-indigo-300/40 text-white text-xs font-semibold backdrop-blur-md inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 shadow-lg shadow-indigo-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-amber-200" />
          <span>Play</span>
        </button>

        <button
          type="button"
          onClick={onNavigateWardrobe}
          className="h-11 sm:h-10 px-4 rounded-full bg-slate-950/70 hover:bg-indigo-950/85 border border-indigo-200/20 text-slate-100 text-xs font-semibold backdrop-blur-md inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          <Palette className="w-3.5 h-3.5 text-rose-300" />
          <span>Customize</span>
        </button>
      </div>

      {/* Playful Companion Reaction Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={isBusy || avatarState === 'speaking'}
          onClick={() =>
            onQuickReaction(
              'happy',
              'Waved hello to Ātmiya',
              'Namaste! Great to see you. How is your energy today?'
            )
          }
          className="h-9 px-3 rounded-full bg-slate-950/55 hover:bg-slate-900/80 border border-white/15 text-amber-100 text-[11px] font-medium backdrop-blur-md inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Hand className="w-3 h-3 text-amber-300" />
          <span>Wave</span>
        </button>

        <button
          type="button"
          disabled={isBusy || avatarState === 'speaking'}
          onClick={() =>
            onQuickReaction(
              'excited',
              'Shared a cheer with Ātmiya',
              'Wah! Keep going — one thoughtful step at a time!'
            )
          }
          className="h-9 px-3 rounded-full bg-slate-950/55 hover:bg-slate-900/80 border border-white/15 text-sky-100 text-[11px] font-medium backdrop-blur-md inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3 h-3 text-sky-300" />
          <span>Cheer</span>
        </button>

        <button
          type="button"
          disabled={isBusy || avatarState === 'speaking'}
          onClick={() =>
            onQuickReaction(
              'empathetic',
              'Checked in with Ātmiya',
              'I am right here whenever you want to chat, take a breather, or play a quick game.'
            )
          }
          className="h-9 px-3 rounded-full bg-slate-950/55 hover:bg-slate-900/80 border border-white/15 text-rose-100 text-[11px] font-medium backdrop-blur-md inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Heart className="w-3 h-3 text-rose-300" />
          <span>Check-in</span>
        </button>
      </div>
    </div>
  );
};
