import React, { useEffect, useState, useMemo } from 'react';
import { AvatarState, AvatarAppearanceConfig } from '../../types/companion';
import { Volume2, Mic, Sparkles, AlertCircle, Radio, PauseCircle } from 'lucide-react';

interface AvatarDisplayProps {
  state: AvatarState;
  audioLevel?: number; // 0.0 to 1.0 from AnalyserNode
  config?: AvatarAppearanceConfig;
  onInterrupt?: () => void;
  compact?: boolean;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  state,
  audioLevel = 0,
  config = {
    genderVibe: 'female',
    personaName: 'Ātmiya',
    accentColor: '#8b5cf6',
    clothingStyle: 'modern-casual',
  },
  onInterrupt,
  compact = false,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [headTilt, setHeadTilt] = useState(0);

  // Natural blinking effect
  useEffect(() => {
    let blinkTimeout: any = null;
    const scheduleBlink = () => {
      const nextBlink = Math.random() * 3500 + 2500; // blink every 2.5 - 6s
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 160);
      }, nextBlink);
    };

    scheduleBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Subtle natural head movement based on state
  useEffect(() => {
    if (state === 'listening') {
      setHeadTilt(2.5); // Attentive slight tilt
    } else if (state === 'thinking') {
      setHeadTilt(-3); // Thoughtful upward tilt
    } else {
      setHeadTilt(0);
    }
  }, [state]);

  // Dynamic mouth height based on audio level
  const mouthOpenAmount = useMemo(() => {
    if (state !== 'speaking') return 0;
    // Map audioLevel (0 to 1) to mouth opening height in SVG units (2 to 24)
    return Math.max(3, Math.min(26, audioLevel * 28));
  }, [state, audioLevel]);

  // Eyebrow vertical offset based on state
  const eyebrowShift = useMemo(() => {
    if (state === 'listening') return -2.5; // Raised, attentive
    if (state === 'thinking') return -1; // Pondering
    if (state === 'speaking') return -1.5;
    return 0;
  }, [state]);

  // Glow aura colors and pulse based on state
  const auraStyles = useMemo(() => {
    switch (state) {
      case 'listening':
        return 'from-cyan-500/30 via-indigo-500/25 to-purple-500/20 shadow-cyan-500/20 animate-pulse';
      case 'thinking':
        return 'from-amber-400/25 via-violet-500/25 to-indigo-600/20 animate-pulse';
      case 'speaking':
        return 'from-violet-500/40 via-fuchsia-500/30 to-cyan-500/25';
      case 'interrupted':
        return 'from-rose-500/30 via-amber-500/20 to-transparent';
      case 'connecting':
        return 'from-blue-500/20 via-slate-500/20 to-transparent animate-pulse';
      case 'error':
        return 'from-rose-600/30 via-rose-900/20 to-transparent';
      default:
        return 'from-violet-600/20 via-indigo-900/15 to-transparent';
    }
  }, [state]);

  // Status badge config
  const statusBadge = useMemo(() => {
    switch (state) {
      case 'listening':
        return {
          icon: <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />,
          label: 'सुन रही हूँ (Listening...)',
          color: 'bg-cyan-950/70 border-cyan-500/40 text-cyan-200',
        };
      case 'thinking':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />,
          label: 'सोच रही हूँ (Thinking...)',
          color: 'bg-amber-950/70 border-amber-500/40 text-amber-200',
        };
      case 'speaking':
        return {
          icon: <Volume2 className="w-3.5 h-3.5 text-violet-300 animate-bounce" />,
          label: 'बोल रही हूँ (Speaking...)',
          color: 'bg-violet-950/70 border-violet-500/40 text-violet-200',
        };
      case 'interrupted':
        return {
          icon: <PauseCircle className="w-3.5 h-3.5 text-amber-400" />,
          label: 'रोका गया (Interrupted)',
          color: 'bg-amber-950/70 border-amber-500/40 text-amber-200',
        };
      case 'connecting':
        return {
          icon: <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />,
          label: 'जोड़ रही हूँ (Connecting...)',
          color: 'bg-blue-950/70 border-blue-500/40 text-blue-200',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
          label: 'त्रुटि (Need Attention)',
          color: 'bg-rose-950/70 border-rose-500/40 text-rose-200',
        };
      default:
        return {
          icon: <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />,
          label: 'तैयार (Here with you)',
          color: 'bg-slate-900/80 border-slate-700/60 text-slate-300',
        };
    }
  }, [state]);

  const sizeClass = compact ? 'w-24 h-24' : 'w-56 h-56 sm:w-64 sm:h-64';

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Background Energy Aura */}
      <div
        className={`absolute rounded-full filter blur-2xl transition-all duration-700 pointer-events-none bg-gradient-to-tr ${auraStyles}`}
        style={{
          width: compact ? '110px' : '280px',
          height: compact ? '110px' : '280px',
          transform: `scale(${1 + (state === 'speaking' ? audioLevel * 0.4 : 0)})`,
          opacity: state === 'speaking' ? 0.75 : 0.45,
        }}
      />

      {/* Outer Halo Ring */}
      <div
        className={`relative ${sizeClass} rounded-full p-1.5 transition-all duration-500 bg-gradient-to-b from-white/15 to-white/5 border border-white/10 shadow-2xl backdrop-blur-md`}
        style={{
          boxShadow:
            state === 'speaking'
              ? `0 0 ${15 + audioLevel * 30}px rgba(168, 85, 247, 0.45)`
              : state === 'listening'
              ? '0 0 25px rgba(6, 182, 212, 0.35)'
              : '0 10px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* SVG Human-Like Expressive Character */}
        <div
          className="w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 flex items-center justify-center transition-transform duration-300"
          style={{
            transform: `rotate(${headTilt}deg)`,
          }}
        >
          <svg
            viewBox="0 0 240 240"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Skin Tone Gradient */}
              <radialGradient id="skinGrad" cx="50%" cy="40%" r="55%">
                <stop offset="0%" stopColor="#fad0b2" />
                <stop offset="70%" stopColor="#e8b18a" />
                <stop offset="100%" stopColor="#c98d63" />
              </radialGradient>

              {/* Shadow on Neck */}
              <linearGradient id="neckGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ab714b" />
                <stop offset="100%" stopColor="#c58a62" />
              </linearGradient>

              {/* Hair Gradient */}
              <linearGradient id="hairGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2a1f26" />
                <stop offset="45%" stopColor="#1a141b" />
                <stop offset="100%" stopColor="#0d0910" />
              </linearGradient>

              {/* Eye Iris Gradient */}
              <radialGradient id="irisGrad" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="60%" stopColor="#4c1d95" />
                <stop offset="100%" stopColor="#2e1065" />
              </radialGradient>

              {/* Cloth Gradient */}
              <linearGradient id="clothGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={config.accentColor || '#6366f1'} />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
            </defs>

            {/* Back Hair Volume */}
            <path
              d="M50 110 C45 60 70 30 120 30 C170 30 195 60 190 110 C185 160 180 195 180 200 L60 200 C60 195 55 160 50 110 Z"
              fill="url(#hairGrad)"
            />

            {/* Shoulders & Clothing */}
            <path
              d="M30 240 C35 200 65 185 95 180 L145 180 C175 185 205 200 210 240 Z"
              fill="url(#clothGrad)"
            />

            {/* Collar/Neckline Accent */}
            <path
              d="M100 180 Q120 195 140 180"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Neck */}
            <path
              d="M104 150 L104 182 C110 185 130 185 136 182 L136 150 Z"
              fill="url(#neckGrad)"
            />

            {/* Face Shape */}
            <path
              d="M80 95 C80 60 95 50 120 50 C145 50 160 60 160 95 C160 135 148 160 120 160 C92 160 80 135 80 95 Z"
              fill="url(#skinGrad)"
              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
            />

            {/* Subtle Blush */}
            <ellipse cx="94" cy="118" rx="8" ry="4.5" fill="#f43f5e" opacity="0.18" />
            <ellipse cx="146" cy="118" rx="8" ry="4.5" fill="#f43f5e" opacity="0.18" />

            {/* Eyebrows */}
            <g style={{ transform: `translateY(${eyebrowShift}px)`, transition: 'transform 0.2s ease' }}>
              <path
                d="M90 85 Q100 81 108 85"
                stroke="#2a1f26"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M132 85 Q140 81 150 85"
                stroke="#2a1f26"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>

            {/* Eyes */}
            {isBlinking ? (
              // Closed eye curves
              <g>
                <path
                  d="M92 97 Q100 102 107 97"
                  stroke="#3e2723"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M133 97 Q140 102 148 97"
                  stroke="#3e2723"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              // Open animated eyes
              <g>
                {/* Left Eye White */}
                <ellipse cx="99" cy="96" rx="8.5" ry="5.5" fill="#ffffff" />
                {/* Left Iris */}
                <circle cx="99" cy="96" r="4.2" fill="url(#irisGrad)" />
                {/* Left Pupil */}
                <circle cx="99" cy="96" r="2.2" fill="#090514" />
                {/* Reflection Highlight */}
                <circle cx="97.8" cy="94.5" r="1.3" fill="#ffffff" />

                {/* Right Eye White */}
                <ellipse cx="141" cy="96" rx="8.5" ry="5.5" fill="#ffffff" />
                {/* Right Iris */}
                <circle cx="141" cy="96" r="4.2" fill="url(#irisGrad)" />
                {/* Right Pupil */}
                <circle cx="141" cy="96" r="2.2" fill="#090514" />
                {/* Reflection Highlight */}
                <circle cx="139.8" cy="94.5" r="1.3" fill="#ffffff" />

                {/* Eyelash details */}
                <path
                  d="M91 94 Q99 90 107 94"
                  stroke="#1f181e"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M133 94 Q141 90 149 94"
                  stroke="#1f181e"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* Nose */}
            <path
              d="M120 102 L118 116 Q120 118 123 116"
              stroke="#b7774c"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Dynamic Mouth */}
            {state === 'speaking' ? (
              <g>
                {/* Animated speaking mouth synced to audioLevel */}
                <path
                  d={`M111 134 Q120 ${134 + mouthOpenAmount} 129 134 Q120 ${134 - mouthOpenAmount * 0.4} 111 134 Z`}
                  fill="#7f1d1d"
                  stroke="#be123c"
                  strokeWidth="1.4"
                />
                {/* Subtle teeth highlight if mouth opens sufficiently */}
                {mouthOpenAmount > 8 && (
                  <path
                    d="M114 134 Q120 136 126 134"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                )}
              </g>
            ) : state === 'thinking' ? (
              // Thoughtful slight purse
              <path
                d="M113 135 Q119 132 127 134"
                stroke="#881337"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              // Friendly calm gentle smile
              <path
                d="M112 133 Q120 139 128 133"
                stroke="#9f1239"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Front Stylish Hair & Bangs */}
            <path
              d="M78 85 C82 50 100 42 120 42 C145 42 162 55 162 85 C162 70 145 52 122 52 C98 52 82 70 78 85 Z"
              fill="url(#hairGrad)"
            />
            {/* Elegant Side Bangs */}
            <path
              d="M80 75 Q95 62 112 70 Q92 78 86 98 Z"
              fill="url(#hairGrad)"
            />
            <path
              d="M160 75 Q145 62 128 70 Q148 78 154 98 Z"
              fill="url(#hairGrad)"
            />

            {/* Traditional Bindi / Subtle forehead jewel accent */}
            <circle cx="120" cy="74" r="1.8" fill="#e11d48" opacity="0.85" />
          </svg>
        </div>
      </div>

      {/* State & Interaction Label */}
      {!compact && (
        <div className="mt-3.5 flex flex-col items-center gap-1.5">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium border shadow-sm backdrop-blur-md transition-all duration-300 ${statusBadge.color}`}
          >
            {statusBadge.icon}
            <span>{statusBadge.label}</span>
          </div>

          {/* Interrupt control when speaking */}
          {state === 'speaking' && onInterrupt && (
            <button
              onClick={onInterrupt}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-600/80 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 border border-rose-400/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Interrupt Ātmiya immediately"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>रूकिए (Stop Speaking / Interrupt)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
