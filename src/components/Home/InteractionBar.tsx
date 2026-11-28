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
  const isBusy = avatarState === 'thinking' || avatarState === 'preparing_audio';
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
    'h-10 px-3.5 sm:px-4 rounded-full atmiya-glass-interactive text-[var(--text-primary)] text-xs sm:text-[13px] font-medium inline-flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed';

  return (
    <div className="relative z-20 w-full max-w-3xl mx-auto px-3 sm:px-5 pb-1.5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pointer-events-auto shrink-0">
      {/* Primary Action: Talk */}
      <button
        type="button"
        onClick={onTalk}
        disabled={isBusy}
        aria-pressed={isListening}
        className={`h-10 sm:h-11 px-4.5 sm:px-6 rounded-full text-xs sm:text-[13px] font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-55 disabled:cursor-not-allowed ${
          isListening
            ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg ring-2 ring-sky-300/75'
            : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-md'
        }`}
      >
        <Mic className="w-4 h-4 shrink-0" />
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
        <Gamepad2 className="w-4 h-4 text-[var(--accent-primary)]" />
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
              ? 'ring-2 ring-[var(--accent-border)]'
              : ''
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span>More</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${
              isMoreOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isMoreOpen && (
          <div
            role="menu"
            aria-label="Secondary avatar and companion actions"
            className="absolute bottom-full right-0 mb-2.5 w-56 max-w-[calc(100vw-1.5rem)] p-2 rounded-2xl atmiya-glass-strong space-y-1.5 atmiya-blur-fade z-40"
          >
              {/* Secondary Camera View Presets */}
              {onChangeCameraPreset && (
                <div className="pb-1.5 border-b border-[var(--border-subtle)] space-y-1">
                  <div className="px-1.5 flex items-center justify-between text-[11px] font-medium text-[var(--text-muted)]">
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
                        className="inline-flex items-center gap-1 text-[var(--accent-ink)] hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div
                    role="group"
                    aria-label="Camera framing presets"
                    className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--bg-subtle)] p-0.5 border border-[var(--border-subtle)]"
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
                            ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Smile className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
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
                className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition cursor-pointer disabled:opacity-45"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300 shrink-0" />
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
                className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition cursor-pointer disabled:opacity-45"
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
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition cursor-pointer"
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
                className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                <span>Customize</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenChat();
                }}
                className="lg:hidden w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                <span>Open Chat</span>
              </button>
          </div>
        )}
      </div>
    </div>
  );
};
