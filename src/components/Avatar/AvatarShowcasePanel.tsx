import React, { Suspense, lazy } from 'react';
import { AvatarAppearanceConfig, AvatarEmotion } from '../../types/companion';
import { CompanionAvatar } from './CompanionAvatar';
import eveningRoomImg from '../../assets/images/cozy_companion_room_evening_1795280662566.jpg';

const RealisticAvatar = lazy(() =>
  import('./RealisticAvatar').then((m) => ({ default: m.RealisticAvatar }))
);

interface AvatarShowcasePanelProps {
  config: AvatarAppearanceConfig;
  emotion: AvatarEmotion;
  expressionsEnabled?: boolean;
  cameraPreset?: 'close-up' | 'upper-body';
  caption?: string;
  onTapAvatar?: () => void;
}

/**
 * Shared left-column character stage used in Learning and Play Games.
 * Reuses the real loaded 3D GLB avatar (atmiya-avatar.glb) over a soft,
 * softly blurred room backdrop so the character stays visually consistent
 * with the Companion Home screen.
 */
export const AvatarShowcasePanel: React.FC<AvatarShowcasePanelProps> = ({
  config,
  emotion,
  expressionsEnabled = true,
  cameraPreset = 'close-up',
  caption,
  onTapAvatar,
}) => {
  const effectiveEmotion: AvatarEmotion = expressionsEnabled ? emotion : 'neutral';

  const fallbackPortrait = (
    <CompanionAvatar
      stageVariant="immersive"
      state="idle"
      emotion={effectiveEmotion}
      emotionIntensity={expressionsEnabled ? 0.8 : 0}
      config={config}
      compactPreview
    />
  );

  return (
    <div className="relative w-full h-[300px] sm:h-[360px] lg:h-[480px] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-indigo-400/22 bg-slate-900/5 dark:bg-[#070f28]/60 shadow-sm dark:shadow-[0_24px_60px_rgba(3,7,22,0.65)]">
      {/* Subtle Blurred Cozy Study Room Ambiance */}
      <img
        src={eveningRoomImg}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-25 dark:opacity-35 blur-[2px] brightness-[0.88] dark:brightness-[0.55] select-none pointer-events-none"
      />

      {/* Atmospheric Dark Navy Vignette Blending Seamlessly */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-100/85 via-transparent to-slate-100/30 dark:from-[#050b21] dark:via-[#070f28]/35 dark:to-[#050b21]/55"
      />
      <div
        aria-hidden="true"
        className="hidden dark:block absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 44%, rgba(56, 189, 248, 0.16), rgba(99, 102, 241, 0.1) 42%, transparent 72%)',
        }}
      />

      {/* Live 3D Avatar */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {(config.avatarType ?? '3d-glb') === '3d-glb' ? (
          <Suspense fallback={fallbackPortrait}>
            <RealisticAvatar
              stageVariant="immersive"
              state="idle"
              unifiedState={effectiveEmotion === 'happy' || effectiveEmotion === 'excited' ? 'happy' : 'idle'}
              emotion={effectiveEmotion}
              emotionIntensity={expressionsEnabled ? 0.82 : 0}
              config={config}
              cameraPreset={cameraPreset}
              expressionsEnabled={expressionsEnabled}
              hideStageChrome
              onTapAvatar={onTapAvatar}
              className="w-full h-full"
            />
          </Suspense>
        ) : (
          fallbackPortrait
        )}
      </div>

      {/* Optional Minimal Caption */}
      {caption && (
        <div className="absolute bottom-3 inset-x-3 z-20 flex justify-center pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#09122e]/85 border border-slate-200 dark:border-indigo-400/28 text-[11px] font-medium text-slate-700 dark:text-sky-100 backdrop-blur-md shadow-md text-center truncate max-w-full">
            {caption}
          </div>
        </div>
      )}
    </div>
  );
};
