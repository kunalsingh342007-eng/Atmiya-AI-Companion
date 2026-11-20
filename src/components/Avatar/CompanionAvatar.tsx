import React, { useEffect, useState, useMemo } from 'react';
import { AvatarState, AvatarAppearanceConfig } from '../../types/companion';
import { Volume2, Mic, Sparkles, AlertCircle, Heart, Radio } from 'lucide-react';

export type CompanionEmotion = 'neutral' | 'happy' | 'empathetic' | 'surprised';

interface CompanionAvatarProps {
  state: AvatarState;
  emotion?: CompanionEmotion;
  audioLevel?: number; // 0.0 to 1.0 from AnalyserNode
  config?: AvatarAppearanceConfig;
  onInterrupt?: () => void;
  onTapAvatar?: () => void;
  className?: string;
}

export const CompanionAvatar: React.FC<CompanionAvatarProps> = ({
  state,
  emotion = 'neutral',
  audioLevel = 0,
  config = {
    genderVibe: 'female',
    personaName: 'Ātmiya',
    accentColor: '#8b5cf6',
    clothingStyle: 'modern-casual',
    avatarType: 'custom-image',
    customImagePath: '/avatars/atmiya.png',
  },
  onInterrupt,
  onTapAvatar,
  className = '',
}) => {
  const [headTilt, setHeadTilt] = useState(0);
  const [headShiftY, setHeadShiftY] = useState(0);
  const [tapReaction, setTapReaction] = useState<string | null>(null);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check user preference for reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Level A: Subtle breathing micro-motion & natural idle cadence
  useEffect(() => {
    if (prefersReducedMotion) return;

    let step = 0;
    const interval = setInterval(() => {
      step += 0.05;
      if (state !== 'speaking') {
        // Calm floating breathing motion
        setHeadShiftY(Math.sin(step) * 2.2);
      } else {
        // Acoustic cadence when speaking
        setHeadShiftY(Math.sin(step * 2) * 1.2 + (audioLevel * 3));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [state, audioLevel, prefersReducedMotion]);

  // Head tilt & posture based on conversational state & emotion
  useEffect(() => {
    if (state === 'listening') {
      setHeadTilt(3.2); // Attentive tilt toward the user
    } else if (state === 'thinking') {
      setHeadTilt(-2.8); // Inquisitive upward tilt
    } else if (emotion === 'happy') {
      setHeadTilt(2.0); // Cheerful nod
    } else if (emotion === 'empathetic') {
      setHeadTilt(-2.2); // Sympathetic gentle tilt
    } else if (emotion === 'surprised') {
      setHeadTilt(0);
    } else {
      setHeadTilt(0);
    }
  }, [state, emotion]);

  // Handle user tapping the character (Talking Tom inspired interaction)
  const handleTap = () => {
    setTapReaction('smile');
    if (onTapAvatar) {
      onTapAvatar();
    }
    setTimeout(() => setTapReaction(null), 2000);
  };

  // State & Emotion-driven ambient aura styles
  const auraStyles = useMemo(() => {
    switch (state) {
      case 'listening':
        return 'from-cyan-500/40 via-teal-500/30 to-blue-600/25 shadow-cyan-500/30';
      case 'thinking':
        return 'from-amber-400/35 via-violet-500/30 to-purple-600/25 shadow-amber-500/25';
      case 'speaking':
        return 'from-violet-500/50 via-purple-500/40 to-indigo-600/30 shadow-violet-500/35';
      case 'interrupted':
        return 'from-amber-500/35 via-rose-500/30 to-transparent';
      case 'error':
        return 'from-rose-600/35 via-rose-950/30 to-transparent';
      default:
        if (emotion === 'happy') {
          return 'from-pink-500/35 via-violet-500/30 to-amber-500/20';
        }
        if (emotion === 'empathetic') {
          return 'from-indigo-600/35 via-violet-800/30 to-slate-900/20';
        }
        return 'from-violet-600/30 via-indigo-900/20 to-transparent';
    }
  }, [state, emotion]);

  // Frame acoustic pulse scale based on real audio level
  const acousticFrameScale = useMemo(() => {
    if (state === 'speaking') {
      return 1 + Math.min(0.04, audioLevel * 0.05);
    }
    return 1;
  }, [state, audioLevel]);

  const avatarSrc = config.customImagePath || '/avatars/atmiya.png';
  const showCustomImage = config.avatarType !== 'vector' && !imgLoadFailed;

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none cursor-pointer group ${className}`}
      onClick={handleTap}
      title="Tap Ātmiya to interact"
    >
      {/* 1. Ambient Energy Aura (Video Call Lighting) */}
      <div
        className={`absolute rounded-full filter blur-3xl transition-all duration-500 pointer-events-none bg-gradient-to-tr ${auraStyles}`}
        style={{
          width: '90%',
          height: '90%',
          transform: `scale(${1 + (state === 'speaking' ? audioLevel * 0.4 : state === 'listening' ? 0.22 : 0.05)})`,
          opacity: state === 'speaking' || state === 'listening' ? 0.85 : 0.45,
        }}
      />

      {/* 2. Interactive Hearts / Greeting Popup on Tap */}
      {tapReaction && (
        <div className="absolute -top-3 z-30 pointer-events-none flex items-center gap-1.5 animate-bounce">
          <div className="px-3.5 py-1.5 rounded-full bg-violet-600/95 text-white text-xs font-semibold shadow-xl shadow-violet-900/60 border border-violet-300/40 flex items-center gap-2 backdrop-blur-md">
            <Heart className="w-3.5 h-3.5 text-pink-300 fill-pink-300 animate-pulse" />
            <span>"मैं यहाँ हूँ! (Always listening)"</span>
          </div>
        </div>
      )}

      {/* 3. Outer Glowing Video-Call Frame Ring */}
      <div
        className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full p-2.5 transition-all duration-300 bg-gradient-to-b from-white/20 via-white/8 to-white/0 border border-white/20 shadow-2xl backdrop-blur-md"
        style={{
          transform: `scale(${acousticFrameScale})`,
          boxShadow:
            state === 'speaking'
              ? `0 0 ${25 + audioLevel * 45}px rgba(168, 85, 247, ${0.5 + audioLevel * 0.4})`
              : state === 'listening'
              ? '0 0 35px rgba(6, 182, 212, 0.45)'
              : state === 'thinking'
              ? '0 0 30px rgba(245, 158, 11, 0.35)'
              : '0 20px 50px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* Inner Video Stream Mask */}
        <div
          className="w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 flex items-center justify-center transition-transform duration-300 relative"
          style={{
            transform: prefersReducedMotion
              ? 'none'
              : `rotate(${headTilt}deg) translateY(${headShiftY}px)`,
          }}
        >
          {showCustomImage ? (
            /* Custom 3D Avatar Image (/avatars/atmiya.png) */
            <div className="relative w-full h-full">
              <img
                src={avatarSrc}
                alt="Ātmiya AI Human Companion"
                className="w-full h-full object-cover object-[center_20%] select-none transition-transform duration-300"
                style={{
                  transform:
                    state === 'speaking'
                      ? `scale(${1.02 + audioLevel * 0.02})`
                      : state === 'listening'
                      ? 'scale(1.02)'
                      : 'scale(1.0)',
                }}
                onError={() => {
                  console.warn(`Failed to load avatar from ${avatarSrc}, falling back to vector portrait`);
                  setImgLoadFailed(true);
                }}
              />

              {/* Gentle Video Vignette & Lighting Depth Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  background:
                    state === 'speaking'
                      ? `radial-gradient(circle, transparent 60%, rgba(139, 92, 246, ${0.15 + audioLevel * 0.2}) 100%)`
                      : state === 'listening'
                      ? 'radial-gradient(circle, transparent 65%, rgba(6, 182, 212, 0.25) 100%)'
                      : 'transparent',
                }}
              />
            </div>
          ) : (
            /* Graceful Fallback: Stylized Vector Character */
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
              <img
                src="/public/assets/aistudio/Friendly_3D_Avatar_Portrait_37d63c9f.png"
                alt="Ātmiya"
                className="w-full h-full object-cover"
                onError={() => setImgLoadFailed(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Real-time Status & Audio Waveform Pill */}
      <div className="mt-4 flex items-center justify-center">
        {state === 'listening' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/85 border border-cyan-500/50 text-cyan-200 text-xs font-medium shadow-lg shadow-cyan-950/50 backdrop-blur-md animate-pulse">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Listening to you (सुन रही हूँ)...</span>
            {/* Live Audio activity bars */}
            <div className="flex items-center gap-0.5 ml-1">
              <span className="w-1 h-3 rounded-full bg-cyan-400 animate-bounce" />
              <span className="w-1 h-4 rounded-full bg-cyan-400 animate-bounce delay-100" />
              <span className="w-1 h-2 rounded-full bg-cyan-400 animate-bounce delay-200" />
            </div>
          </div>
        ) : state === 'thinking' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/85 border border-amber-500/50 text-amber-200 text-xs font-medium shadow-lg shadow-amber-950/50 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Ātmiya is thinking (सोच रही हूँ)...</span>
          </div>
        ) : state === 'speaking' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/85 border border-violet-500/50 text-violet-200 text-xs font-medium shadow-lg shadow-violet-950/50 backdrop-blur-md">
            <Volume2 className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>Ātmiya is speaking (बोल रही हूँ)...</span>
            {/* Real-time Web Audio level bars */}
            <div className="flex items-center gap-1 ml-1.5">
              <span
                className="w-1 rounded-full bg-violet-400 transition-all duration-75"
                style={{ height: `${Math.max(4, audioLevel * 18)}px` }}
              />
              <span
                className="w-1 rounded-full bg-violet-300 transition-all duration-75"
                style={{ height: `${Math.max(6, audioLevel * 24)}px` }}
              />
              <span
                className="w-1 rounded-full bg-violet-400 transition-all duration-75"
                style={{ height: `${Math.max(4, audioLevel * 16)}px` }}
              />
            </div>
          </div>
        ) : state === 'interrupted' ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-medium backdrop-blur-md">
            <span>Interrupted (रूक गई)</span>
          </div>
        ) : state === 'error' ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium backdrop-blur-md">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Needs attention</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Online with you (साथ में)</span>
          </div>
        )}
      </div>
    </div>
  );
};
