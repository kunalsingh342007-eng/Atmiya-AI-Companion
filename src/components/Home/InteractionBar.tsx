import React, { useEffect, useRef, useState } from 'react';
import { AvatarEmotion, AvatarState } from '../../types/companion';
import type { AvatarGesture } from '../Avatar/expressionRig';
import {
  Gamepad2,
  Hand,
  Heart,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Palette,
  Sparkles,
} from 'lucide-react';

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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreContainerRef = useRef<HTMLDivElement>(null);

  const isListening = avatarState === 'listening';
  const isBusy = avatarState === 'thinking';
  const isSpeaking = avatarState === 'speaking';

  useEffect(() => {
    if (!isMoreOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (
        moreContainerRef.current &&
        !moreContainerRef.current.contains(e.target as Node)
      ) {
        setIsMoreOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreOpen]);

  return (
    <div className="relative z-20 w-full max-w-3xl mx-auto px-3 sm:px-5 pb-2.5 flex items-center justify-center pointer-events-auto shrink-0">
      <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-white/90 dark:bg-[#081226]/80 border border-slate-200/85 dark:border-sky-400/20 backdrop-blur-xl shadow-lg">
        {/* Talk */}
        <button
          type="button"
          onClick={onTalk}
          disabled={isBusy}
          className={`h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isListening
              ? 'bg-sky-500 text-white shadow-sm'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{isListening ? 'Send Voice' : 'Talk'}</span>
        </button>

        {/* Wave */}
        <button
          type="button"
          disabled={isBusy || isSpeaking}
          onClick={() =>
            onQuickReaction(
              'happy',
              'Waved hello to Ātmiya',
              'Namaste! Great to see you. How is your energy today?',
              'wave'
            )
          }
          className="h-9 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.07] text-slate-800 dark:text-slate-100 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <Hand className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
          <span>Wave</span>
        </button>

        {/* Play */}
        <button
          type="button"
          onClick={onNavigatePlay}
          className="h-9 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.07] text-slate-800 dark:text-slate-100 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300" />
          <span>Play</span>
        </button>

        {/* More Popover */}
        <div ref={moreContainerRef} className="relative">
          <button
            type="button"
            aria-expanded={isMoreOpen}
            aria-haspopup="menu"
            onClick={() => setIsMoreOpen((v) => !v)}
            className={`h-9 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              isMoreOpen
                ? 'bg-slate-100 dark:bg-white/10 text-slate-950 dark:text-white'
                : 'hover:bg-slate-100 dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
            <span>More</span>
          </button>

          {isMoreOpen && (
            <div
              role="menu"
              aria-label="More avatar actions"
              className="absolute bottom-full right-0 mb-2 w-44 p-1.5 rounded-2xl bg-white/95 dark:bg-[#091428]/95 border border-slate-200 dark:border-sky-400/20 backdrop-blur-xl shadow-2xl space-y-1 animate-fadeIn z-40"
            >
              <button
                type="button"
                role="menuitem"
                disabled={isBusy || isSpeaking}
                onClick={() => {
                  setIsMoreOpen(false);
                  onQuickReaction(
                    'excited',
                    'Shared a cheer with Ātmiya',
                    'Wah! Keep going — one thoughtful step at a time!',
                    'nod'
                  );
                }}
                className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.07] flex items-center gap-2 transition cursor-pointer disabled:opacity-45"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-300 shrink-0" />
                <span>Cheer</span>
              </button>

              <button
                type="button"
                role="menuitem"
                disabled={isBusy || isSpeaking}
                onClick={() => {
                  setIsMoreOpen(false);
                  onQuickReaction(
                    'empathetic',
                    'Checked in with Ātmiya',
                    'I am right here whenever you want to chat, take a breather, or play a quick game.',
                    'nod'
                  );
                }}
                className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.07] flex items-center gap-2 transition cursor-pointer disabled:opacity-45"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-300 shrink-0" />
                <span>Check-in</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMoreOpen(false);
                  onNavigateWardrobe();
                }}
                className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.07] flex items-center gap-2 transition cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                <span>Customize</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenChat();
                }}
                className="lg:hidden w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.07] flex items-center gap-2 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                <span>Open Chat</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
