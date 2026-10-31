import React, { useEffect, useState, useMemo, useRef } from 'react';
import { AvatarState, AvatarAppearanceConfig } from '../../types/companion';
import { Volume2, Mic, Sparkles, AlertCircle, Heart, Smile, Sparkle } from 'lucide-react';

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
  },
  onInterrupt,
  onTapAvatar,
  className = '',
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [headTilt, setHeadTilt] = useState(0);
  const [headShiftY, setHeadShiftY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [tapReaction, setTapReaction] = useState<string | null>(null);

  // Natural blinking effect
  useEffect(() => {
    let blinkTimeout: any = null;
    const scheduleBlink = () => {
      // Natural blink timing: every 2.8 - 5.5 seconds
      const nextBlink = Math.random() * 2700 + 2800;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
      }, nextBlink);
    };

    scheduleBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Subtle natural breathing & head micro-movement
  useEffect(() => {
    let breathingInterval: any = null;
    let step = 0;
    breathingInterval = setInterval(() => {
      step += 0.05;
      // Gentle floating micro-motion
      if (state !== 'speaking') {
        setHeadShiftY(Math.sin(step) * 2.5);
      } else {
        // Subtle rhythmic cadence when speaking
        setHeadShiftY(Math.sin(step * 2) * 1.5 + (audioLevel * 3));
      }
    }, 50);

    return () => clearInterval(breathingInterval);
  }, [state, audioLevel]);

  // Head tilt based on state and emotion
  useEffect(() => {
    if (state === 'listening') {
      setHeadTilt(3.5); // Attentive slight head tilt toward user
    } else if (state === 'thinking') {
      setHeadTilt(-3.0); // Pondering upward tilt
    } else if (emotion === 'happy') {
      setHeadTilt(2.0);
    } else if (emotion === 'empathetic') {
      setHeadTilt(-2.0);
    } else if (emotion === 'surprised') {
      setHeadTilt(0);
    } else {
      setHeadTilt(0);
    }
  }, [state, emotion]);

  // Handle user tapping the character (Talking Tom inspired playful feedback)
  const handleTap = () => {
    setTapReaction('smile');
    if (onTapAvatar) {
      onTapAvatar();
    }
    setTimeout(() => setTapReaction(null), 1800);
  };

  // Mouth opening calculation synced to audio level and phonemes
  const mouthGeometry = useMemo(() => {
    if (state !== 'speaking') {
      if (emotion === 'happy' || tapReaction === 'smile') {
        // Cheerful open smile
        return {
          d: 'M108 132 Q120 144 132 132 Q120 137 108 132 Z',
          fill: '#881337',
          stroke: '#be123c',
          showTeeth: true,
        };
      }
      if (emotion === 'empathetic') {
        // Gentle, soft empathetic curve
        return {
          d: 'M111 135 Q120 137 129 135',
          fill: 'none',
          stroke: '#9f1239',
          showTeeth: false,
        };
      }
      if (emotion === 'surprised') {
        // Small surprised 'O' shape
        return {
          d: 'M115 133 C115 129 125 129 125 133 C125 137 115 137 115 133 Z',
          fill: '#7f1d1d',
          stroke: '#be123c',
          showTeeth: false,
        };
      }
      if (state === 'thinking') {
        // Thoughtful pursed lips
        return {
          d: 'M113 135 Q120 133 127 135',
          fill: 'none',
          stroke: '#881337',
          showTeeth: false,
        };
      }
      // Natural, warm resting smile
      return {
        d: 'M111 133 Q120 139 129 133',
        fill: 'none',
        stroke: '#9f1239',
        showTeeth: false,
      };
    }

    // Dynamic speaking mouth shape
    // audioLevel (0.0 to 1.0) maps to open height
    const openness = Math.max(3, Math.min(24, audioLevel * 28));
    const widthAdjust = Math.min(6, audioLevel * 8);

    return {
      d: `M${111 - widthAdjust / 2} 133 Q120 ${133 + openness} ${129 + widthAdjust / 2} 133 Q120 ${133 - openness * 0.4} ${111 - widthAdjust / 2} 133 Z`,
      fill: '#701a24',
      stroke: '#be123c',
      showTeeth: openness > 7,
    };
  }, [state, audioLevel, emotion, tapReaction]);

  // Eyebrow vertical and rotation offset based on emotion
  const eyebrowStyles = useMemo(() => {
    let leftY = 0;
    let rightY = 0;
    let leftRot = 0;
    let rightRot = 0;

    if (state === 'listening') {
      leftY = -3.5;
      rightY = -3.5; // Raised attentive brows
    } else if (state === 'thinking') {
      leftY = -2;
      rightY = -4; // Inquisitive asymmetric brow
      leftRot = -2;
      rightRot = 4;
    } else if (emotion === 'happy' || tapReaction === 'smile') {
      leftY = -2;
      rightY = -2;
      leftRot = 2;
      rightRot = -2;
    } else if (emotion === 'empathetic') {
      leftY = -3;
      rightY = -3;
      leftRot = 5; // Slanted sympathetic inner brows
      rightRot = -5;
    } else if (emotion === 'surprised') {
      leftY = -6;
      rightY = -6; // High surprised brows
    } else if (state === 'speaking') {
      leftY = -1.5;
      rightY = -1.5;
    }

    return { leftY, rightY, leftRot, rightRot };
  }, [state, emotion, tapReaction]);

  // Glow aura styling
  const auraGlow = useMemo(() => {
    switch (state) {
      case 'listening':
        return 'from-cyan-500/35 via-indigo-500/25 to-blue-600/20 shadow-cyan-500/20';
      case 'thinking':
        return 'from-amber-400/30 via-violet-500/25 to-purple-600/20';
      case 'speaking':
        return 'from-violet-500/40 via-fuchsia-500/30 to-indigo-600/25';
      case 'interrupted':
        return 'from-amber-500/30 via-rose-500/25 to-transparent';
      default:
        return 'from-violet-600/25 via-indigo-900/20 to-transparent';
    }
  }, [state]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none cursor-pointer group ${className}`}
      onClick={handleTap}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Tap Ātmiya to interact"
    >
      {/* Video Call Background Ambient Aura */}
      <div
        className={`absolute rounded-full filter blur-3xl transition-all duration-700 pointer-events-none bg-gradient-to-tr ${auraGlow}`}
        style={{
          width: '85%',
          height: '85%',
          transform: `scale(${1 + (state === 'speaking' ? audioLevel * 0.45 : state === 'listening' ? 0.2 : 0)})`,
          opacity: state === 'speaking' || state === 'listening' ? 0.8 : 0.4,
        }}
      />

      {/* Floating Interactive Hearts / Sparkles on Tap */}
      {tapReaction && (
        <div className="absolute top-4 z-30 pointer-events-none flex items-center gap-1.5 animate-bounce">
          <div className="px-3 py-1 rounded-full bg-violet-600/90 text-white text-xs font-semibold shadow-lg shadow-violet-900/60 border border-violet-400/40 flex items-center gap-1.5 backdrop-blur-md">
            <Heart className="w-3.5 h-3.5 text-pink-300 fill-pink-300" />
            <span>"मैं यहाँ हूँ! (I'm right here with you)"</span>
          </div>
        </div>
      )}

      {/* Video Frame Portrait Container */}
      <div
        className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full p-2 transition-all duration-500 bg-gradient-to-b from-white/15 via-white/5 to-white/0 border border-white/15 shadow-2xl backdrop-blur-lg"
        style={{
          boxShadow:
            state === 'speaking'
              ? `0 0 ${20 + audioLevel * 35}px rgba(168, 85, 247, 0.5)`
              : state === 'listening'
              ? '0 0 35px rgba(6, 182, 212, 0.45)'
              : '0 20px 50px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Inner Video Stream Mask */}
        <div
          className="w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 flex items-center justify-center transition-transform duration-300 relative"
          style={{
            transform: `rotate(${headTilt}deg) translateY(${headShiftY}px)`,
          }}
        >
          {/* Subtle Video Vignette Overlay */}
          <div className="absolute inset-0 bg-radial-vignette pointer-events-none z-10 opacity-30" />

          {/* Realistic SVG Human Character */}
          <svg
            viewBox="0 0 240 240"
            className="w-full h-full transform scale-105"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Photorealistic Skin Shading */}
              <radialGradient id="humanSkinGrad" cx="50%" cy="38%" r="56%">
                <stop offset="0%" stopColor="#fae0cb" />
                <stop offset="45%" stopColor="#f4cbb0" />
                <stop offset="78%" stopColor="#e3a780" />
                <stop offset="100%" stopColor="#c38356" />
              </radialGradient>

              {/* Jaw & Chin Contour Shadow */}
              <linearGradient id="jawShadow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="80%" stopColor="rgba(148, 82, 45, 0.25)" />
                <stop offset="100%" stopColor="rgba(122, 63, 30, 0.5)" />
              </linearGradient>

              {/* Neck Shadow */}
              <linearGradient id="humanNeckGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9a5a33" />
                <stop offset="40%" stopColor="#b5754d" />
                <stop offset="100%" stopColor="#ca8960" />
              </linearGradient>

              {/* Hair Depth & Sheen */}
              <linearGradient id="humanHairGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2e1f26" />
                <stop offset="30%" stopColor="#1e141a" />
                <stop offset="70%" stopColor="#120c10" />
                <stop offset="100%" stopColor="#080407" />
              </linearGradient>
              <linearGradient id="hairHighlight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              {/* Deep Hazel / Violet Iris */}
              <radialGradient id="humanIrisGrad" cx="38%" cy="38%" r="62%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#5b21b6" />
                <stop offset="85%" stopColor="#311042" />
                <stop offset="100%" stopColor="#1a0824" />
              </radialGradient>

              {/* Soft Ambient Cloth */}
              <linearGradient id="humanClothGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={config.accentColor || '#7c3aed'} />
                <stop offset="60%" stopColor="#312e81" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Back Hair Volume */}
            <path
              d="M45 110 C40 50 68 25 120 25 C172 25 200 50 195 110 C190 170 185 200 185 210 L55 210 C55 200 50 170 45 110 Z"
              fill="url(#humanHairGrad)"
            />

            {/* Shoulders & Video Call Attire */}
            <path
              d="M20 240 C25 195 62 182 95 178 L145 178 C178 182 215 195 220 240 Z"
              fill="url(#humanClothGrad)"
            />
            {/* Elegant collar neckline */}
            <path
              d="M98 178 Q120 196 142 178"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Neck */}
            <path
              d="M103 148 L103 182 C110 186 130 186 137 182 L137 148 Z"
              fill="url(#humanNeckGrad)"
            />

            {/* Head / Face Oval Structure */}
            <path
              d="M78 94 C78 55 94 46 120 46 C146 46 162 55 162 94 C162 138 148 162 120 162 C92 162 78 138 78 94 Z"
              fill="url(#humanSkinGrad)"
              filter="drop-shadow(0 6px 8px rgba(0,0,0,0.25))"
            />
            {/* Jaw contour shading */}
            <path
              d="M78 94 C78 138 92 162 120 162 C148 162 162 138 162 94 C162 120 148 156 120 156 C92 156 78 120 78 94 Z"
              fill="url(#jawShadow)"
            />

            {/* Natural Cheek Blush & Warm Glow */}
            <ellipse cx="94" cy="116" rx="9" ry="5" fill="#f43f5e" opacity="0.2" />
            <ellipse cx="146" cy="116" rx="9" ry="5" fill="#f43f5e" opacity="0.2" />

            {/* Eyebrows with Emotion Rigging */}
            <g>
              {/* Left Eyebrow */}
              <g
                style={{
                  transform: `translate(0px, ${eyebrowStyles.leftY}px) rotate(${eyebrowStyles.leftRot}deg)`,
                  transformOrigin: '98px 84px',
                  transition: 'transform 0.25s ease',
                }}
              >
                <path
                  d="M88 85 Q98 79 108 84"
                  stroke="#26171c"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </g>

              {/* Right Eyebrow */}
              <g
                style={{
                  transform: `translate(0px, ${eyebrowStyles.rightY}px) rotate(${eyebrowStyles.rightRot}deg)`,
                  transformOrigin: '142px 84px',
                  transition: 'transform 0.25s ease',
                }}
              >
                <path
                  d="M132 84 Q142 79 152 85"
                  stroke="#26171c"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </g>
            </g>

            {/* Eyes & Blinking Animation */}
            {isBlinking ? (
              // Natural Closed Eye Curves
              <g>
                <path
                  d="M90 97 Q99 103 107 97"
                  stroke="#2d161d"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M133 97 Q141 103 150 97"
                  stroke="#2d161d"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              // Open Human Eyes with Iris Depth & Highlights
              <g>
                {/* Left Eye Sclera */}
                <ellipse cx="99" cy="96" rx="9" ry="5.8" fill="#fbfdff" />
                {/* Left Iris */}
                <circle cx="99" cy="96" r="4.4" fill="url(#humanIrisGrad)" />
                {/* Left Pupil */}
                <circle cx="99" cy="96" r="2.2" fill="#08020a" />
                {/* Specular Light Reflection */}
                <circle cx="97.6" cy="94.2" r="1.4" fill="#ffffff" />
                <circle cx="100.8" cy="97.2" r="0.7" fill="rgba(255,255,255,0.7)" />

                {/* Right Eye Sclera */}
                <ellipse cx="141" cy="96" rx="9" ry="5.8" fill="#fbfdff" />
                {/* Right Iris */}
                <circle cx="141" cy="96" r="4.4" fill="url(#humanIrisGrad)" />
                {/* Right Pupil */}
                <circle cx="141" cy="96" r="2.2" fill="#08020a" />
                {/* Specular Light Reflection */}
                <circle cx="139.6" cy="94.2" r="1.4" fill="#ffffff" />
                <circle cx="142.8" cy="97.2" r="0.7" fill="rgba(255,255,255,0.7)" />

                {/* Eyelash Framing */}
                <path
                  d="M89 94 Q99 89 108 94"
                  stroke="#1c0f14"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M132 94 Q141 89 151 94"
                  stroke="#1c0f14"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* Nose Contour & Tip */}
            <path
              d="M120 98 L117 115 Q120 118 123 115"
              stroke="#af6e42"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Soft Nostril Shadows */}
            <ellipse cx="115" cy="116" rx="1.5" ry="0.8" fill="#995831" opacity="0.6" />
            <ellipse cx="125" cy="116" rx="1.5" ry="0.8" fill="#995831" opacity="0.6" />

            {/* Mouth Synced to Speech & Emotion */}
            <g>
              <path
                d={mouthGeometry.d}
                fill={mouthGeometry.fill}
                stroke={mouthGeometry.stroke}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Upper Teeth Highlight when speaking */}
              {mouthGeometry.showTeeth && (
                <path
                  d="M114 133.5 Q120 135.5 126 133.5"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </g>

            {/* Front Styled Hair & Soft Forehead Bangs */}
            <path
              d="M75 84 C80 48 98 38 120 38 C144 38 164 50 165 84 C165 68 146 48 122 48 C98 48 80 68 75 84 Z"
              fill="url(#humanHairGrad)"
            />
            {/* Elegant Flowing Strands */}
            <path
              d="M77 75 Q94 60 112 68 Q90 76 84 98 Z"
              fill="url(#humanHairGrad)"
            />
            <path
              d="M163 75 Q146 60 128 68 Q150 76 156 98 Z"
              fill="url(#humanHairGrad)"
            />

            {/* Hair Lighting Highlight */}
            <path
              d="M95 44 Q120 40 145 44"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Subtle Traditional Bindi / Forehead jewel */}
            <circle cx="120" cy="72" r="1.8" fill="#e11d48" opacity="0.85" />
          </svg>
        </div>
      </div>

      {/* Floating State Waveform or Badge */}
      <div className="mt-4 flex items-center justify-center">
        {state === 'listening' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs font-medium shadow-lg shadow-cyan-950/50 backdrop-blur-md animate-pulse">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Listening to you (सुन रही हूँ)...</span>
            {/* Subtle audio bars */}
            <div className="flex items-center gap-0.5 ml-1">
              <span className="w-1 h-3 rounded-full bg-cyan-400 animate-bounce" />
              <span className="w-1 h-4 rounded-full bg-cyan-400 animate-bounce delay-100" />
              <span className="w-1 h-2 rounded-full bg-cyan-400 animate-bounce delay-200" />
            </div>
          </div>
        ) : state === 'thinking' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs font-medium shadow-lg shadow-amber-950/50 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Thinking (सोच रही हूँ)...</span>
          </div>
        ) : state === 'speaking' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/80 border border-violet-500/40 text-violet-200 text-xs font-medium shadow-lg shadow-violet-950/50 backdrop-blur-md">
            <Volume2 className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>Ātmiya is speaking...</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/70 border border-slate-800 text-slate-300 text-xs font-medium backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Online with you (साथ में)</span>
          </div>
        )}
      </div>
    </div>
  );
};
