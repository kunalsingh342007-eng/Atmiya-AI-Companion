import { useEffect, useState } from 'react';
import {
  AVATAR_EMOTION_LABELS,
  AvatarAppearanceConfig,
  AvatarEmotion,
  AvatarState,
  MicPermissionStatus,
  UnifiedAnimationState,
} from '../../types/companion';
import type { GlbInspectionReport } from './RealisticAvatar';
import type { AvatarGesture } from './expressionRig';
import type { SpeechGesturePlan } from './UnifiedAnimationController';
import { speechService } from '../../services/speech';

export type { AvatarGesture } from './expressionRig';
export type CameraPreset = 'close-up' | 'upper-body' | 'full-body';

export interface AvatarControllerState {
  avatarState: AvatarState;
  unifiedState: UnifiedAnimationState;
  emotion: AvatarEmotion;
  emotionIntensity: number;
  previewEmotion: AvatarEmotion | null;
  activeGesture: AvatarGesture;
  gestureNonce: number;
  speechPlan?: SpeechGesturePlan | null;
  audioLevel: number;
  micPermission: MicPermissionStatus;
  voiceError: string | null;
  glbInspection: GlbInspectionReport | null;
  cameraPreset?: CameraPreset;
  resetCameraNonce?: number;
  isExpressionsOpen?: boolean;
}

export interface AvatarControllerActions {
  onTapAvatar: () => void;
  onInterrupt: () => void;
  onSelectPreviewEmotion: (emotion: AvatarEmotion | null) => void;
  onTriggerGesture: (gesture: AvatarGesture) => void;
  onResetPose: () => void;
  onInspectionComplete: (report: GlbInspectionReport) => void;
  onChangeCameraPreset?: (preset: CameraPreset) => void;
  onResetCamera?: () => void;
  onSetExpressionsOpen?: (open: boolean) => void;
}

export interface AvatarRenderTargetProps {
  controller: AvatarControllerState;
  actions: AvatarControllerActions;
  config: AvatarAppearanceConfig;
}

export function getCompanionMoodLabel(
  state: AvatarState,
  emotion: AvatarEmotion,
  unifiedState?: UnifiedAnimationState
): string {
  if (unifiedState === 'greeting') return 'Greeting';
  if (unifiedState === 'goodbye') return 'Saying Goodbye';
  if (unifiedState === 'interrupted') return 'Paused';
  if (unifiedState === 'error') return 'Needs Attention';
  switch (state) {
    case 'listening':
      return 'Listening';
    case 'thinking':
      return 'Thinking';
    case 'preparing_audio':
      return 'Preparing Voice';
    case 'speaking':
      return 'Speaking';
    case 'interrupted':
      return 'Paused';
    case 'connecting':
      return 'Connecting';
    case 'error':
      return 'Needs Attention';
    default:
      if (unifiedState === 'concerned' && emotion === 'neutral') return 'Concerned';
      if (unifiedState === 'happy' && emotion === 'neutral') return 'Happy';
      if (unifiedState === 'gesturing' && emotion === 'neutral') return 'Responding';
      return emotion === 'neutral' ? 'Calm & Present' : AVATAR_EMOTION_LABELS[emotion];
  }
}

export function useMicrophonePermission(): [
  MicPermissionStatus,
  () => void,
  () => void,
] {
  const [status, setStatus] = useState<MicPermissionStatus>(() => {
    if (typeof window === 'undefined' || !speechService.isRecognitionSupported()) {
      return 'unsupported';
    }
    return 'unknown';
  });

  useEffect(() => {
    let mounted = true;
    let permObj: PermissionStatus | null = null;

    const queryPerm = () => {
      if (typeof window === 'undefined' || !speechService.isRecognitionSupported()) {
        if (mounted) setStatus('unsupported');
        return;
      }
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions
          .query({ name: 'microphone' as PermissionName })
          .then((perm) => {
            if (!mounted) return;
            permObj = perm;
            setStatus(perm.state as MicPermissionStatus);
            perm.onchange = () => {
              if (mounted) setStatus(perm.state as MicPermissionStatus);
            };
          })
          .catch(() => {
            if (mounted) setStatus('prompt');
          });
      } else {
        setStatus('prompt');
      }
    };

    queryPerm();
    return () => {
      mounted = false;
      if (permObj) {
        permObj.onchange = null;
      }
    };
  }, []);

  const refreshPermission = () => {
    if (typeof window === 'undefined' || !speechService.isRecognitionSupported()) {
      setStatus('unsupported');
      return;
    }
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((perm) => {
          setStatus(perm.state as MicPermissionStatus);
        })
        .catch(() => {
          setStatus('prompt');
        });
    } else {
      setStatus('prompt');
    }
  };

  const markDenied = () => {
    setStatus('denied');
  };

  return [status, refreshPermission, markDenied];
}
