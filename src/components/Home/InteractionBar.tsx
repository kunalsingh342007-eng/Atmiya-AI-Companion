import React from 'react';
import { AvatarEmotion, AvatarState } from '../../types/companion';
import type { AvatarGesture } from '../Avatar/expressionRig';
import { Gamepad2, Hand, Heart, MessageSquare, Mic, Palette, Sparkles } from 'lucide-react';

interface InteractionBarProps {
  avatarState: AvatarState;
  onTalk: () => void;
  onOpenChat: () => void;
  onNavigatePlay: () => void;
  onNavigateWardrobe: () => void;
  onQuickReaction: (
    emotion: AvatarEmotion,
    label: string,
    line: string,
    gesture?: AvatarGesture
  ) => void;
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
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-5 pb-1.5 flex flex-col items-center gap-2 pointer-events-auto shrink-0">
      {/* Contextual Actions: Talk/Chat shown on mobile/tablet (<lg), Play/Customize & Reactions across all screens */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onTalk}
          disabled={isBusy}
          className={`lg:hidden h-10 px-3.5 rounded-xl border text-xs font-semibold backdrop-blur-md inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isListening
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-white/90 dark:bg-[#0b1528]/85 hover:bg-white dark:hover:bg-[#11203b] border-slate-200/90 dark:border-slate-700/70 text-slate-800 dark:text-slate-100'
          }`}
        >
          <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-white' : 'text-blue-600 dark:text-sky-400'}`} />
          <span>{isListening ? 'Send Voice' : 'Talk'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenChat}
          className="lg:hidden h-10 px-3.5 rounded-xl bg-white/90 dark:bg-[#0b1528]/85 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/70 text-slate-800 dark:text-slate-100 text-xs font-semibold backdrop-blur-md inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
          <span>Chat</span>
        </button>

        {/* Playful Companion Reactions */}
        <button
          type="button"
          disabled={isBusy || avatarState === 'speaking'}
          onClick={() =>
            onQuickReaction(
              'happy',
              'Waved hello to Ātmiya',
              'Namaste! Great to see you. How is your energy today?',
              'wave'
            )
          }
          className="h-9 sm:h-10 px-3 rounded-xl bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 text-xs font-medium backdrop-blur-md inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          <Hand className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
          <span>Wave</span>
        </button>

        <button
          type="button"
          disabled={isBusy || avatarState === 'speaking'}
          onClick={() =>
            onQuickReaction(
              'excited',
              'Shared a cheer with Ātmiya',
              'Wah! Keep going — one thoughtful step at a time!',
              'nod'
            )
          }
          className="h-9 sm:h-10 px-3 rounded-xl bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 text-xs font-medium backdrop-blur-md inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300" />
          <span>Cheer</span>
        </button>

        <button
          type="button"
          disabled={isBusy || avatarState === 'speaking'}
          onClick={() =>
            onQuickReaction(
              'empathetic',
              'Checked in with Ātmiya',
              'I am right here whenever you want to chat, take a breather, or play a quick game.',
              'nod'
            )
          }
          className="h-9 sm:h-10 px-3 rounded-xl bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 text-xs font-medium backdrop-blur-md inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-300" />
          <span>Check-in</span>
        </button>

        <button
          type="button"
          onClick={onNavigatePlay}
          className="h-9 sm:h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-blue-100" />
          <span>Play</span>
        </button>

        <button
          type="button"
          onClick={onNavigateWardrobe}
          className="h-9 sm:h-10 px-3 rounded-xl bg-white/90 dark:bg-[#0b1528]/85 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/70 text-slate-800 dark:text-slate-100 text-xs font-semibold backdrop-blur-md inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Palette className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
          <span>Customize</span>
        </button>
      </div>
    </div>
  );
};
