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

export const AvatarStage: React.FC<AvatarStageProps> = React.memo(({
  settings,
  controller,
  actions,
  onOpenCustomize,
}) => {
  const avatarType = settings.avatarConfig.avatarType ?? '3d-glb';
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
    <main className="relative flex-1 min-h-0 w-full h-full flex items-center justify-center px-1.5 sm:px-3 overflow-hidden">
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
            unifiedState={controller.unifiedState}
            emotion={controller.emotion}
            emotionIntensity={controller.emotionIntensity}
            previewEmotion={controller.previewEmotion}
            activeGesture={controller.activeGesture}
            gestureNonce={controller.gestureNonce}
            onSelectPreviewEmotion={actions.onSelectPreviewEmotion}
            onTriggerGesture={actions.onTriggerGesture}
            onResetPose={actions.onResetPose}
            audioLevel={controller.audioLevel}
            config={settings.avatarConfig}
            onInterrupt={actions.onInterrupt}
            onTapAvatar={actions.onTapAvatar}
            onInspectionComplete={actions.onInspectionComplete}
            onOpenCustomize={onOpenCustomize}
            cameraPreset={controller.cameraPreset}
            onChangeCameraPreset={actions.onChangeCameraPreset}
            resetCameraNonce={controller.resetCameraNonce}
            isExpressionsOpen={controller.isExpressionsOpen}
            onSetExpressionsOpen={actions.onSetExpressionsOpen}
          />
        </Suspense>
      ) : (
        fallback2D
      )}
    </main>
  );
});

AvatarStage.displayName = 'AvatarStage';
