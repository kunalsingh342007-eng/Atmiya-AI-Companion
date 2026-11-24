import React, { useState } from 'react';
import { AvatarState, RoomConfig } from '../../types/companion';
import dayRoomImg from '../../assets/images/cozy_companion_room_day_1795280663394.jpg';
import eveningRoomImg from '../../assets/images/cozy_companion_room_evening_1795280662566.jpg';

interface CompanionRoomProps {
  roomConfig?: RoomConfig;
  avatarState: AvatarState;
  prefersReducedMotion?: boolean;
  children?: React.ReactNode;
}

export const CompanionRoom: React.FC<CompanionRoomProps> = ({
  roomConfig = { environment: 'sunlit-study', lightingMood: 'natural' },
  avatarState,
  prefersReducedMotion = false,
  children,
}) => {
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});

  const envId = roomConfig.environment || 'sunlit-study';
  const isEvening = envId === 'evening-lounge';
  const isIndigoLoft = envId === 'indigo-loft';
  const isCreamSolarium = envId === 'cream-solarium';
  const hasPhotoAsset = envId === 'sunlit-study' || envId === 'evening-lounge';
  const roomSrc = isEvening ? eveningRoomImg : dayRoomImg;
  const currentImgFailed = Boolean(imgFailed[envId]);

  const baseBgColor = isEvening
    ? '#18212d'
    : isIndigoLoft
    ? '#1e1b4b'
    : isCreamSolarium
    ? '#efe4d3'
    : '#c6ceb8';

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none"
      style={{ backgroundColor: baseBgColor }}
    >
      {/* Room Backdrop Layer */}
      {hasPhotoAsset && !currentImgFailed ? (
        <img
          src={roomSrc}
          alt={
            isEvening
              ? 'Cozy sage and muted blue evening study room with warm lamp light'
              : 'Sunlit sage and cream study room with window light, bed, and wooden bookshelf'
          }
          referrerPolicy="no-referrer"
          onError={() => setImgFailed((prev) => ({ ...prev, [envId]: true }))}
          className={`absolute inset-0 w-full h-full object-cover object-center brightness-[0.94] dark:brightness-[0.80] dark:contrast-[1.06] dark:saturate-[1.04] transition-all duration-700 ${
            prefersReducedMotion ? 'scale-[1.0]' : 'scale-[1.01]'
          }`}
        />
      ) : isIndigoLoft ? (
        /* Indigo Twilight Loft (unlocked at 25 XP) */
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 24% 26%, rgba(125, 211, 252, 0.2), transparent 44%), radial-gradient(circle at 78% 28%, rgba(167, 139, 250, 0.2), transparent 46%), radial-gradient(circle at 50% 82%, rgba(251, 113, 133, 0.1), transparent 52%), linear-gradient(165deg, #1e1b4b 0%, #312e81 42%, #0b1428 100%)',
          }}
        >
          {/* Architectural Skylight Window Frame */}
          <svg
            viewBox="0 0 1200 720"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full opacity-35"
          >
            <rect x="85" y="70" width="310" height="390" rx="22" fill="#0f172a" fillOpacity="0.45" stroke="#a5b4fc" strokeOpacity="0.35" strokeWidth="3" />
            <line x1="240" y1="70" x2="240" y2="460" stroke="#a5b4fc" strokeOpacity="0.28" strokeWidth="2.5" />
            <line x1="85" y1="255" x2="395" y2="255" stroke="#a5b4fc" strokeOpacity="0.28" strokeWidth="2.5" />
            <circle cx="165" cy="150" r="24" fill="#fef3c7" fillOpacity="0.7" />
            <circle cx="315" cy="135" r="2.5" fill="#e0f2fe" />
            <circle cx="290" cy="190" r="2" fill="#e0f2fe" />
            <circle cx="145" cy="215" r="2" fill="#e0f2fe" />
            <rect x="820" y="130" width="290" height="440" rx="18" fill="#1e1b4b" fillOpacity="0.4" stroke="#818cf8" strokeOpacity="0.25" strokeWidth="2" />
            <line x1="820" y1="245" x2="1110" y2="245" stroke="#818cf8" strokeOpacity="0.25" strokeWidth="2" />
            <line x1="820" y1="365" x2="1110" y2="365" stroke="#818cf8" strokeOpacity="0.25" strokeWidth="2" />
            <ellipse cx="600" cy="670" rx="460" ry="75" fill="#0f172a" fillOpacity="0.45" />
          </svg>
        </div>
      ) : isCreamSolarium ? (
        /* Warm Cream Solarium (unlocked at 50 XP) */
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 24% 24%, rgba(254, 249, 195, 0.72), transparent 48%), radial-gradient(circle at 80% 30%, rgba(253, 164, 175, 0.24), transparent 46%), linear-gradient(160deg, #f5ebd9 0%, #e5d8c5 48%, #d7c7b6 100%)',
          }}
        >
          <svg
            viewBox="0 0 1200 720"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full opacity-35"
          >
            <path d="M90 480 L90 210 A160 160 0 0 1 410 210 L410 480 Z" fill="#fffaf0" fillOpacity="0.55" stroke="#b49a7e" strokeOpacity="0.45" strokeWidth="3" />
            <line x1="250" y1="50" x2="250" y2="480" stroke="#b49a7e" strokeOpacity="0.35" strokeWidth="2.5" />
            <line x1="90" y1="265" x2="410" y2="265" stroke="#b49a7e" strokeOpacity="0.35" strokeWidth="2.5" />
            <path d="M840 480 L840 210 A140 140 0 0 1 1120 210 L1120 480 Z" fill="#fffaf0" fillOpacity="0.45" stroke="#b49a7e" strokeOpacity="0.35" strokeWidth="3" />
            <ellipse cx="600" cy="670" rx="500" ry="85" fill="#8c745c" fillOpacity="0.22" />
          </svg>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: isEvening
              ? 'radial-gradient(circle at 25% 30%, rgba(251, 191, 36, 0.18), transparent 45%), linear-gradient(160deg, #334155 0%, #4b5d57 45%, #273240 100%)'
              : 'radial-gradient(circle at 22% 28%, rgba(254, 243, 199, 0.55), transparent 50%), linear-gradient(160deg, #dce4cf 0%, #b7c4a9 48%, #d7c7ae 100%)',
          }}
        />
      )}

      {/* Subtle Cool Navy Room Color Grade & Warm Lamp Highlight (dark mode) */}
      <div
        aria-hidden="true"
        className="hidden dark:block absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 76% 64%, rgba(251, 191, 36, 0.14), transparent 36%), radial-gradient(circle at 48% 42%, rgba(56, 189, 248, 0.14) 0%, rgba(99, 102, 241, 0.14) 36%, rgba(6, 12, 34, 0.52) 86%)',
        }}
      />

      {/* Light Mode Gentle Window Vignette */}
      <div
        aria-hidden="true"
        className="dark:hidden absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 22% 28%, rgba(255, 249, 232, 0.2), transparent 48%), radial-gradient(circle at 50% 44%, transparent 45%, rgba(15, 23, 42, 0.18) 100%)',
        }}
      />

      {/* Responsive State Lighting Tint */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background:
            avatarState === 'listening'
              ? 'radial-gradient(circle at 50% 46%, rgba(56, 189, 248, 0.22), transparent 58%)'
              : avatarState === 'speaking'
              ? 'radial-gradient(circle at 50% 46%, rgba(99, 102, 241, 0.2), transparent 58%)'
              : avatarState === 'thinking'
              ? 'radial-gradient(circle at 50% 46%, rgba(251, 146, 60, 0.16), transparent 58%)'
              : 'none',
        }}
      />

      {/* Subtle Top & Bottom Legibility Vignettes (do not wash out room) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-900/15 dark:from-[#040818]/55 to-transparent pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-900/20 dark:from-[#040818]/82 via-transparent to-transparent pointer-events-none"
      />

      {/* Room Foreground Content Layer */}
      <div className="relative z-10 flex flex-col h-full w-full">
        {children}
      </div>
    </div>
  );
};
