import React, { useEffect, useRef, useState } from 'react';
import { AvatarEmotion, AvatarState } from '../../types/companion';
import type { CameraPreset } from '../Avatar/AvatarController';
import type { AvatarGesture } from '../Avatar/expressionRig';
import {
  Camera,
  ChevronDown,
  Gamepad2,
  Hand,
  Heart,
  LayoutGrid,
  MessageSquare,
  Mic,
  MicOff,
  Palette,
  RotateCcw,
  Smile,
  Sparkles,
} from 'lucide-react';

interface InteractionBarProps {
  avatarState: AvatarState;
  isMicMuted?: boolean;
  cameraPreset?: CameraPreset;
  isExpressionsOpen?: boolean;
  onTalk: () => void;
  onToggleMute?: () => void;
  onOpenChat: () => void;
  onNavigatePlay: () => void;
  onNavigateWardrobe: () => void;
  onChangeCameraPreset?: (preset: CameraPreset) => void;
  onResetCamera?: () => void;
  onToggleExpressions?: () => void;
  onQuickReaction: (
    emotion: AvatarEmotion,
    label: string,
    line: string,
    gesture?: AvatarGesture
  ) => void;
}

export const InteractionBar: React.FC<InteractionBarProps> = ({
  avatarState,
  isMicMuted = false,
  cameraPreset = 'close-up',
  isExpressionsOpen = false,
  onTalk,
  onToggleMute,
  onOpenChat,
  onNavigatePlay,
  onNavigateWardrobe,
  onChangeCameraPreset,
  onResetCamera,
  onToggleExpressions,
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

  const secondaryPill =
    'h-10 px-3.5 sm:px-5 rounded-full bg-white/92 dark:bg-[#0d1636]/86 hover:bg-white dark:hover:bg-[#152252] border border-slate-200/90 dark:border-indigo-400/30 hover:dark:border-sky-400/45 backdrop-blur-lg text-slate-800 dark:text-slate-100 text-xs sm:text-[13px] font-medium inline-flex items-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap shrink-0 shadow-md disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';

  return (
    <div className="relative z-20 w-full max-w-3xl mx-auto px-3 sm:px-5 pb-2 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pointer-events-auto shrink-0">
      {/* Talk */}
      <button
        type="button"
        onClick={onTalk}
        disabled={isBusy}
        aria-pressed={isListening}
        className={`h-10 px-4 sm:px-6 rounded-full text-xs sm:text-[13px] font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
          isListening
            ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-md ring-2 ring-sky-300/60'
            : 'bg-blue-600 hover:bg-blue-500 text-white border border-sky-300/35 shadow-md'
        }`}
      >
        <Mic className="w-4 h-4" />
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
        className={secondaryPill}
      >
        <Hand className="w-4 h-4 text-amber-500 dark:text-amber-300" />
        <span>Wave</span>
      </button>

      {/* Play */}
      <button
        type="button"
        onClick={onNavigatePlay}
        className={secondaryPill}
      >
        <Gamepad2 className="w-4 h-4 text-blue-600 dark:text-violet-300" />
        <span>Play</span>
      </button>

      {/* More Popover (Houses Secondary Avatar Camera, Expressions, Mic Mute & Wardrobe Actions) */}
      <div ref={moreContainerRef} className="relative">
        <button
          type="button"
          aria-expanded={isMoreOpen}
          aria-haspopup="menu"
          onClick={() => setIsMoreOpen((v) => !v)}
          className={`${secondaryPill} ${
            isMoreOpen
              ? 'ring-2 ring-sky-400/50 dark:bg-[#152252]'
              : ''
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-slate-600 dark:text-slate-200" />
          <span>More</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-300 transition-transform ${
              isMoreOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isMoreOpen && (
          <div
            role="menu"
            aria-label="Secondary avatar and companion actions"
            className="absolute bottom-full right-0 mb-2.5 w-56 p-2 rounded-2xl bg-white/98 dark:bg-[#09142c]/98 border border-slate-200 dark:border-indigo-400/25 shadow-2xl space-y-1.5 animate-fadeIn z-40"
          >
              {/* Secondary Camera View Presets */}
              {onChangeCameraPreset && (
                <div className="pb-1.5 border-b border-slate-200/80 dark:border-slate-800/90 space-y-1">
                  <div className="px-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      Camera
                    </span>
                    {onResetCamera && (
                      <button
                        type="button"
                        onClick={() => {
                          onResetCamera();
                          setIsMoreOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-sky-300 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div
                    role="group"
                    aria-label="Camera framing presets"
                    className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-[#0d1930] p-0.5"
                  >
                    {(
                      [
                        { id: 'close-up', label: 'Close-Up' },
                        { id: 'upper-body', label: 'Upper' },
                        { id: 'full-body', label: 'Full' },
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onChangeCameraPreset(preset.id);
                          setIsMoreOpen(false);
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                          cameraPreset === preset.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {onToggleExpressions && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMoreOpen(false);
                    onToggleExpressions();
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between gap-2 transition cursor-pointer ${
                    isExpressionsOpen
                      ? 'bg-blue-50 dark:bg-blue-600/25 text-blue-700 dark:text-sky-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.07]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Smile className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300 shrink-0" />
                    <span>Expressions &amp; Rig</span>
                  </span>
                </button>
              )}

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

              {onToggleMute && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMoreOpen(false);
                    onToggleMute();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.07] flex items-center gap-2 transition cursor-pointer"
                >
                  {isMicMuted ? (
                    <Mic className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-rose-500 dark:text-rose-300 shrink-0" />
                  )}
                  <span>{isMicMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                </button>
              )}

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
                className="md:hidden w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.07] flex items-center gap-2 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                <span>Open Chat</span>
              </button>
          </div>
        )}
      </div>
    </div>
  );
};
