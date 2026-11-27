import React, { useEffect, useState, useMemo } from 'react';
import {
  AvatarState,
  AvatarAppearanceConfig,
  AvatarEmotion,
  AVATAR_EMOTION_LABELS,
} from '../../types/companion';
import { Volume2, Mic, Sparkles, AlertCircle, Heart, Loader2 } from 'lucide-react';

export type CompanionEmotion = AvatarEmotion;

interface CompanionAvatarProps {
  stageVariant?: 'circle' | 'immersive';
  state: AvatarState;
  emotion?: AvatarEmotion;
  emotionIntensity?: number;
  audioLevel?: number; // 0.0 to 1.0 from AnalyserNode
  config?: AvatarAppearanceConfig;
  onInterrupt?: () => void;
  onTapAvatar?: () => void;
  compactPreview?: boolean;
  className?: string;
}

export const CompanionAvatar: React.FC<CompanionAvatarProps> = ({
  stageVariant = 'circle',
  state,
  emotion = 'neutral',
  emotionIntensity = 0.7,
  audioLevel = 0,
  config = {
    genderVibe: 'female',
    personaName: 'Ātmiya',
    accentColor: '#6366f1',
    clothingStyle: 'modern-casual',
    outfitColor: '#1e3a5f',
    outfitStyleLabel: 'Navy Classic',
    accessory: 'none',
    avatarType: 'custom-image',
    customImagePath: '',
  },
  onInterrupt: _onInterrupt,
  onTapAvatar,
  compactPreview = false,
  className = '',
}) => {
  const [headTilt, setHeadTilt] = useState(0);
  const [headShiftY, setHeadShiftY] = useState(0);
  const [tapReaction, setTapReaction] = useState<string | null>(null);
  const [tapBounce, setTapBounce] = useState(false);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isImmersive = stageVariant === 'immersive';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Subtle breathing micro-motion & natural idle cadence
  useEffect(() => {
    if (prefersReducedMotion) return;

    let step = 0;
    const interval = setInterval(() => {
      step += 0.05;
      if (state !== 'speaking') {
        setHeadShiftY(Math.sin(step) * (isImmersive ? 1.8 : 2.2));
      } else {
        setHeadShiftY(Math.sin(step * 2) * 1.2 + audioLevel * 3);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [state, audioLevel, prefersReducedMotion, isImmersive]);

  // Head tilt & posture based on conversational state & all 16 emotions
  useEffect(() => {
    const scale = Math.max(0.3, Math.min(1, emotionIntensity));
    if (state === 'listening') {
      setHeadTilt(2.6);
      return;
    }
    if (state === 'thinking' || emotion === 'thinking') {
      setHeadTilt(-2.4 * scale);
      return;
    }

    switch (emotion) {
      case 'happy':
      case 'smile':
      case 'laughing':
      case 'encouraging':
      case 'excited':
      case 'winking':
        setHeadTilt(2.2 * scale);
        break;
      case 'curious':
      case 'confused':
        setHeadTilt(3.0 * scale);
        break;
      case 'empathetic':
      case 'sad':
      case 'worried':
      case 'disappointed':
        setHeadTilt(-2.3 * scale);
        break;
      case 'surprised':
      case 'calm':
      case 'talking':
      default:
        setHeadTilt(0);
        break;
    }
  }, [state, emotion, emotionIntensity]);

  const handleTap = () => {
    if (!onTapAvatar) return;
    setTapReaction('greet');
    if (!prefersReducedMotion) {
      setTapBounce(true);
      setTimeout(() => setTapBounce(false), 300);
    }
    onTapAvatar();
    setTimeout(() => setTapReaction(null), 2000);
  };

  const auraStyles = useMemo(() => {
    switch (state) {
      case 'listening':
        return 'from-sky-400/35 via-indigo-400/25 to-blue-500/20';
      case 'thinking':
        return 'from-amber-300/35 via-indigo-400/25 to-blue-500/20';
      case 'preparing_audio':
        return 'from-sky-400/35 via-blue-400/25 to-indigo-500/20';
      case 'speaking':
        return 'from-blue-400/45 via-indigo-400/35 to-sky-400/25';
      case 'interrupted':
        return 'from-amber-400/30 via-rose-400/20 to-transparent';
      case 'error':
        return 'from-rose-600/30 via-rose-950/20 to-transparent';
      default:
        switch (emotion) {
          case 'happy':
          case 'smile':
          case 'laughing':
          case 'encouraging':
          case 'excited':
          case 'winking':
            return 'from-amber-200/30 via-rose-300/25 to-indigo-400/20';
          case 'sad':
          case 'worried':
          case 'disappointed':
          case 'empathetic':
            return 'from-indigo-400/30 via-slate-500/25 to-transparent';
          default:
            return 'from-indigo-300/25 via-sky-300/20 to-transparent';
        }
    }
  }, [state, emotion]);

  const acousticFrameScale = useMemo(() => {
    if (tapBounce) return 1.03;
    if (state === 'speaking') {
      return 1 + Math.min(0.03, audioLevel * 0.04);
    }
    return 1;
  }, [state, audioLevel, tapBounce]);

  const rawAvatarSrc = config.customImagePath?.trim() || '';
  const avatarSrc = rawAvatarSrc === '/avatars/atmiya.png' ? '' : rawAvatarSrc;

  useEffect(() => {
    setImgLoadFailed(false);
  }, [avatarSrc]);

  const showCustomImage =
    config.avatarType === 'custom-image' && Boolean(avatarSrc) && !imgLoadFailed;
  const outfitBorderColor = config.outfitColor || '#1e3a5f';
  const accessory = config.accessory || 'none';

  const frameSizeClasses = compactPreview
    ? 'w-40 h-48 sm:w-44 sm:h-52 rounded-[2rem] p-1.5'
    : isImmersive
    ? 'w-40 h-48 sm:w-56 sm:h-68 md:w-64 md:h-80 rounded-[2.2rem] p-1.5'
    : 'w-56 h-56 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full p-2.5';

  const innerMaskClasses = compactPreview || isImmersive ? 'rounded-[1.75rem]' : 'rounded-full';

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${
        onTapAvatar ? 'cursor-pointer group' : ''
      } ${className}`}
      onClick={onTapAvatar ? handleTap : undefined}
      role={onTapAvatar ? 'button' : undefined}
      tabIndex={onTapAvatar ? 0 : undefined}
      onKeyDown={
        onTapAvatar
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTap();
              }
            }
          : undefined
      }
      aria-label={onTapAvatar ? `Interact with ${config.personaName || 'Ātmiya'}` : undefined}
      title={onTapAvatar ? 'Click or tap Ātmiya to greet' : undefined}
    >
      {/* Subtle Ambient Lighting Halo */}
      <div
        aria-hidden="true"
        className={`absolute rounded-full filter blur-3xl transition-all duration-500 pointer-events-none bg-gradient-to-tr ${auraStyles}`}
        style={{
          width: isImmersive ? '115%' : '90%',
          height: isImmersive ? '95%' : '90%',
          transform: `scale(${1 + (state === 'speaking' ? audioLevel * 0.25 : state === 'listening' ? 0.14 : 0.04)})`,
          opacity: state === 'speaking' || state === 'listening' ? 0.85 : 0.5,
        }}
      />

      {/* Respectful Interactive Greeting Popup on Tap */}
      {tapReaction && (
        <div className="absolute -top-3 z-30 pointer-events-none flex items-center gap-1.5 animate-fadeIn">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-950/92 text-slate-900 dark:text-amber-100 text-xs font-medium shadow-xl border border-indigo-200 dark:border-indigo-300/30 flex items-center gap-2 backdrop-blur-md">
            <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-300" />
            <span>"Namaste! I'm right here."</span>
          </div>
        </div>
      )}

      {/* Foreground Portrait Stage with Wardrobe Accent Rim */}
      <div
        className={`relative ${frameSizeClasses} transition-all duration-300 border-2 shadow-xl backdrop-blur-sm`}
        style={{
          transform: `scale(${acousticFrameScale})`,
          borderColor: outfitBorderColor,
          background: `linear-gradient(180deg, rgba(255,255,255,0.18) 0%, ${outfitBorderColor}38 100%)`,
          boxShadow:
            state === 'speaking'
              ? `0 16px 38px rgba(15, 23, 42, 0.45), 0 0 ${14 + audioLevel * 18}px rgba(59, 130, 246, ${0.28 + audioLevel * 0.25})`
              : state === 'preparing_audio'
              ? '0 16px 38px rgba(15, 23, 42, 0.45), 0 0 18px rgba(56, 189, 248, 0.28)'
              : state === 'listening'
              ? '0 16px 38px rgba(15, 23, 42, 0.45), 0 0 18px rgba(56, 189, 248, 0.28)'
              : state === 'thinking'
              ? '0 16px 38px rgba(15, 23, 42, 0.45), 0 0 16px rgba(251, 146, 60, 0.24)'
              : '0 18px 42px rgba(15, 23, 42, 0.45)',
        }}
      >
        <div
          className={`w-full h-full ${innerMaskClasses} overflow-hidden bg-gradient-to-b from-slate-800 via-slate-900 to-indigo-950 flex items-center justify-center transition-transform duration-300 relative`}
          style={{
            transform: prefersReducedMotion
              ? 'none'
              : `rotate(${headTilt}deg) translateY(${headShiftY}px)`,
          }}
        >
          {showCustomImage ? (
            <div className="relative w-full h-full">
              <img
                src={avatarSrc}
                alt="Ātmiya AI Companion"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-[center_18%] select-none transition-transform duration-300"
                style={{
                  transform:
                    state === 'speaking'
                      ? `scale(${1.02 + audioLevel * 0.02})`
                      : state === 'listening'
                      ? 'scale(1.02)'
                      : 'scale(1.0)',
                }}
                onError={() => {
                  setImgLoadFailed(true);
                }}
              />
              {/* Subtle Outfit Accent Wash along bottom collar/trim of portrait card */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-14 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, ${outfitBorderColor}88, transparent)`,
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 text-white">
              <span className="font-serif text-6xl font-bold text-amber-200">आ</span>
              <span className="mt-2 text-xs tracking-widest uppercase text-slate-300">
                {config.personaName || 'Ātmiya'}
              </span>
            </div>
          )}

          {/* Optional Portrait Overlay Accessories */}
          {accessory === 'lotus-pin' && (
            <div
              aria-label="Lotus Pin accessory"
              className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-slate-950/75 border border-rose-300/45 backdrop-blur-md flex items-center gap-1 shadow-lg pointer-events-none"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-rose-300" fill="currentColor">
                <path d="M12 3c-1.8 3.1-2.6 5.9-2.2 8.2C7.8 9.9 5.8 9.2 4 9.5c.8 2.8 2.4 5 4.8 6.5-1.7.7-3.4.8-5.1.3 1.9 2.3 4.8 3.7 8.3 3.7s6.4-1.4 8.3-3.7c-1.7.5-3.4.4-5.1-.3 2.4-1.5 4-3.7 4.8-6.5-1.8-.3-3.8.4-5.8 1.7.4-2.3-.4-5.1-2.2-8.2Z" />
              </svg>
            </div>
          )}

          {accessory === 'star-clip' && (
            <div
              aria-label="Starlight Hairclip accessory"
              className="absolute top-3 right-3 px-2 py-1 rounded-full bg-slate-950/75 border border-amber-200/50 backdrop-blur-md flex items-center shadow-lg pointer-events-none"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-amber-200" fill="currentColor">
                <path d="M12 2l2.3 6.7L21 11l-6.7 2.3L12 20l-2.3-6.7L3 11l6.7-2.3L12 2z" />
              </svg>
            </div>
          )}

          {accessory === 'glasses-frame' && (
            <div
              aria-label="Reading Glasses Frame badge"
              className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-slate-950/75 border border-sky-300/45 backdrop-blur-md flex items-center shadow-lg pointer-events-none"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-3.5 text-sky-200" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="12" r="4" />
                <circle cx="17" cy="12" r="4" />
                <path d="M11 12h2" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Grounded room contact shadow in immersive mode */}
      {isImmersive && !compactPreview && (
        <div
          aria-hidden="true"
          className="mt-2 w-36 sm:w-48 h-3.5 rounded-full bg-slate-950/45 blur-md pointer-events-none"
        />
      )}

      {/* Circle-mode status pill only (immersive mode displays status cleanly in HUD + DialoguePanel) */}
      {!isImmersive && !compactPreview && (
        <div className="mt-4 flex flex-col items-center gap-1.5">
          {state === 'listening' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/85 border border-sky-300 dark:border-sky-400/50 text-sky-800 dark:text-sky-200 text-xs font-medium shadow-sm dark:shadow-lg">
              <Mic className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Listening to you...</span>
            </div>
          ) : state === 'thinking' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/85 border border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-200 text-xs font-medium shadow-sm dark:shadow-lg">
              <Sparkles className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${prefersReducedMotion ? '' : 'animate-spin'}`} />
              <span>Ātmiya is thinking...</span>
            </div>
          ) : state === 'preparing_audio' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/85 border border-sky-300 dark:border-sky-400/50 text-sky-800 dark:text-sky-200 text-xs font-medium shadow-sm dark:shadow-lg">
              <Loader2 className={`w-3.5 h-3.5 text-sky-600 dark:text-sky-400 ${prefersReducedMotion ? '' : 'animate-spin'}`} />
              <span>Preparing voice...</span>
            </div>
          ) : state === 'speaking' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/85 border border-blue-300 dark:border-blue-500/50 text-blue-800 dark:text-sky-200 text-xs font-medium shadow-sm dark:shadow-lg">
              <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>Ātmiya is speaking...</span>
            </div>
          ) : state === 'error' ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-200 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Needs attention</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <span>{emotion !== 'neutral' ? AVATAR_EMOTION_LABELS[emotion] : 'Calm & Present'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
