import React, { Suspense, lazy } from 'react';
import { CompanionSettings } from '../../types/companion';
import { AvatarControllerActions, AvatarControllerState } from './AvatarController';
import { CompanionAvatar } from './CompanionAvatar';

const AtmiyaThreeAvatar = lazy(() =>
  import('./AtmiyaThreeAvatar').then((m) => ({ default: m.AtmiyaThreeAvatar }))
);

const RealisticAvatar = lazy(() =>
  import('./RealisticAvatar').then((m) => ({ default: m.RealisticAvatar }))
);

interface AvatarStageProps {
  settings: CompanionSettings;
  controller: AvatarControllerState;
  actions: AvatarControllerActions;
  onOpenCustomize?: () => void;
}

export const AvatarStage: React.FC<AvatarStageProps> = ({
  settings,
  controller,
  actions,
  onOpenCustomize,
}) => {
  const avatarType = settings.avatarConfig.avatarType ?? 'three-ws';
  const activeEmotion = controller.previewEmotion ?? controller.emotion;

  const fallback2D = (
    <CompanionAvatar
      stageVariant="immersive"
      state={controller.avatarState}
      emotion={activeEmotion}
      emotionIntensity={controller.emotionIntensity}
      audioLevel={controller.audioLevel}
      config={settings.avatarConfig}
      onInterrupt={actions.onInterrupt}
      onTapAvatar={actions.onTapAvatar}
    />
  );

  return (
    <main className="flex-1 min-h-0 w-full flex items-center justify-center px-4 pt-1 pb-2 overflow-hidden">
      {avatarType === 'three-ws' ? (
        <Suspense fallback={fallback2D}>
          <AtmiyaThreeAvatar
            stageVariant="immersive"
            state={controller.avatarState}
            emotion={activeEmotion}
            emotionIntensity={controller.emotionIntensity}
            audioLevel={controller.audioLevel}
            config={settings.avatarConfig}
            onInterrupt={actions.onInterrupt}
            onTapAvatar={actions.onTapAvatar}
          />
        </Suspense>
      ) : avatarType === '3d-glb' ? (
        <Suspense fallback={fallback2D}>
          <RealisticAvatar
            stageVariant="immersive"
            state={controller.avatarState}
            emotion={controller.emotion}
            emotionIntensity={controller.emotionIntensity}
            previewEmotion={controller.previewEmotion}
            onSelectPreviewEmotion={actions.onSelectPreviewEmotion}
            audioLevel={controller.audioLevel}
            config={settings.avatarConfig}
            onInterrupt={actions.onInterrupt}
            onTapAvatar={actions.onTapAvatar}
            onInspectionComplete={actions.onInspectionComplete}
            onOpenCustomize={onOpenCustomize}
          />
        </Suspense>
      ) : (
        fallback2D
      )}
    </main>
  );
};
