import React, { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  AVATAR_EMOTIONS,
  AVATAR_EMOTION_LABELS,
  AvatarAppearanceConfig,
  AvatarEmotion,
  AvatarState,
  UnifiedAnimationState,
} from '../../types/companion';
import { CompanionAvatar } from './CompanionAvatar';
import { speechService } from '../../services/speech';
import {
  applyStaticRelaxedArmPose,
  ArmGestureName,
  AvatarGesture,
  BodyPresentationMode,
  cancelArmGesture,
  clearAllRigMorphs,
  clearSpeechHeadTilt,
  createRigRuntime,
  findAnimationClipsByRole,
  HandPoseTarget,
  HeadPoseTarget,
  IdleMovementIntensity,
  inspectGlbRig,
  resetAllAvatarPoses,
  resetArmPose,
  resetBodyPose,
  resetHeadPose,
  resetSpeechMorphs,
  restoreRigBindPose,
  RigAnimationRuntime,
  RigCapabilities,
  setHandPose,
  setHeadIdleEnabled,
  setIdleMovementIntensity,
  setSpeechHeadTilt,
  startArmGesture,
  tiltHeadLeft,
  tiltHeadRight,
  triggerHeadNod,
  turnHeadLeft,
  turnHeadRight,
  updateArmHandRig,
  updateExpressionRig,
  updateFullBodyAndLowerRig,
  updateHeadNeckRig,
  VerifiedArmHandSummary,
  VerifiedCoreMorphs,
  VerifiedFullBodySummary,
  VerifiedSkeletonMap,
} from './expressionRig';
import {
  createSpeechGestureRunner,
  resetSpeechGestureRunner,
  SpeechGesturePlan,
  stepSpeechGesturePlan,
} from './UnifiedAnimationController';
import {
  AlertCircle,
  Loader2,
  Mic,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Smile,
  Sparkles,
  UserCheck,
  Volume2,
  X,
} from 'lucide-react';

export type CameraPreset = 'close-up' | 'upper-body' | 'full-body';

export interface GlbInspectionReport {
  modelUrl: string;
  meshes: string[];
  materials: string[];
  bones: string[];
  animations: { name: string; duration: number }[];
  morphTargets: string[];
  verifiedCoreMorphs: VerifiedCoreMorphs;
  verifiedSkeleton: VerifiedSkeletonMap;
  verifiedArmHand: VerifiedArmHandSummary;
  verifiedFullBody: VerifiedFullBodySummary;
  skeletonLimitations: string[];
  activeIdleClip: string | null;
  hasGreetingClip: boolean;
  hasGoodbyeClip: boolean;
  usingProceduralWaveFallback: boolean;
  activeSpeechMorphs: string[];
  activeVisemeMorphs: string[];
  activeBlinkMorphs: string[];
  hasFacialControls: boolean;
  capabilities: RigCapabilities;
  supportedExpressions: Record<AvatarEmotion, boolean>;
  boundingSize: [number, number, number];
}

interface RealisticAvatarProps {
  stageVariant?: 'circle' | 'immersive';
  state: AvatarState;
  unifiedState?: UnifiedAnimationState;
  emotion?: AvatarEmotion;
  emotionIntensity?: number;
  previewEmotion?: AvatarEmotion | null;
  activeGesture?: AvatarGesture;
  gestureNonce?: number;
  speechPlan?: SpeechGesturePlan | null;
  expressionsEnabled?: boolean;
  hideStageChrome?: boolean;
  onSelectPreviewEmotion?: (emotion: AvatarEmotion | null) => void;
  onTriggerGesture?: (gesture: AvatarGesture) => void;
  onResetPose?: () => void;
  audioLevel?: number;
  config?: AvatarAppearanceConfig;
  onInterrupt?: () => void;
  onTapAvatar?: () => void;
  onInspectionComplete?: (report: GlbInspectionReport) => void;
  onOpenCustomize?: () => void;
  cameraPreset?: CameraPreset;
  onChangeCameraPreset?: (preset: CameraPreset) => void;
  resetCameraNonce?: number;
  isExpressionsOpen?: boolean;
  onSetExpressionsOpen?: (open: boolean) => void;
  className?: string;
}

// WebGL availability & software WebGL detector so rendering degrades and paces cleanly
const probeWebGLCapabilities = (): { supported: boolean; isSoftware: boolean } => {
  if (typeof document === 'undefined') return { supported: true, isSoftware: false };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftware: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return {
      supported: true,
      isSoftware: /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu),
    };
  } catch {
    return { supported: false, isSoftware: true };
  }
};

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AvatarErrorBoundary extends Component<
  { children: React.ReactNode; onError: (msg: string) => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || '3D rendering error' };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error?.message || 'Failed to render 3D avatar');
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// Zero-dependency procedural studio IBL environment map
const StudioEnvironment: React.FC = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    const previousEnv = scene.environment;
    scene.environment = envTarget.texture;

    return () => {
      scene.environment = previousEnv;
      envTarget.dispose();
      roomEnv.dispose();
      pmremGenerator.dispose();
    };
  }, [gl, scene]);

  return null;
};

export interface CameraFramingBounds {
  targetY: number;
  cameraYOffset: number;
  halfW: number;
  halfH: number;
  halfD: number;
  fov: number;
}

export type CameraPresetBoundsMap = Record<CameraPreset, CameraFramingBounds>;

const DEFAULT_CAMERA_PRESETS: CameraPresetBoundsMap = {
  'close-up': {
    targetY: 0.707,
    cameraYOffset: 0.015,
    halfW: 0.27,
    halfH: 0.366,
    halfD: 0.18,
    fov: 28,
  },
  'upper-body': {
    targetY: 0.56,
    cameraYOffset: 0.02,
    halfW: 0.45,
    halfH: 0.48,
    halfD: 0.22,
    fov: 32,
  },
  'full-body': {
    targetY: 0,
    cameraYOffset: 0.02,
    halfW: 0.5,
    halfH: 1.0,
    halfD: 0.23,
    fov: 35,
  },
};

interface GlbModelSceneProps {
  modelUrl: string;
  state: AvatarState;
  unifiedState?: UnifiedAnimationState;
  emotion: AvatarEmotion;
  emotionIntensity: number;
  expressionsEnabled: boolean;
  audioLevel: number;
  activeGesture: AvatarGesture;
  gestureNonce: number;
  speechPlan?: SpeechGesturePlan | null;
  headActionNonce: number;
  presentationMode: BodyPresentationMode;
  rigRuntimeRef: React.MutableRefObject<RigAnimationRuntime>;
  prefersReducedMotion: boolean;
  onInspected: (report: GlbInspectionReport) => void;
  onPresetsReady: (presets: CameraPresetBoundsMap) => void;
  onArmGestureStateChange?: (gesture: ArmGestureName) => void;
}

const GlbModelScene: React.FC<GlbModelSceneProps> = React.memo(({
  modelUrl,
  state,
  unifiedState,
  emotion,
  emotionIntensity,
  expressionsEnabled,
  audioLevel,
  activeGesture,
  gestureNonce,
  speechPlan = null,
  headActionNonce,
  presentationMode,
  rigRuntimeRef,
  prefersReducedMotion,
  onInspected,
  onPresetsReady,
  onArmGestureStateChange,
}) => {
  const gltf = useGLTF(modelUrl, true, true);
  const { invalidate } = useThree();
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clipActionsRef = useRef<{
    idle: THREE.AnimationAction | null;
    greeting: THREE.AnimationAction | null;
    goodbye: THREE.AnimationAction | null;
  }>({ idle: null, greeting: null, goodbye: null });
  const prevStateRef = useRef<AvatarState>(state);
  const lastHandledGestureNonceRef = useRef<number>(gestureNonce);
  const prevActiveGesturePropRef = useRef<AvatarGesture>(activeGesture);
  const lastReportedArmGestureRef = useRef<ArmGestureName>('none');
  const speechRunnerRef = useRef(createSpeechGestureRunner());
  const speechArmControlledRef = useRef(false);

  // Measure actual GLB bounding box, inspect bones/clips/morphs, and calibrate framing presets
  const modelMetrics = useMemo(() => {
    const sceneRoot = gltf.scene;
    sceneRoot.position.set(0, 0, 0);
    sceneRoot.rotation.set(0, 0, 0);
    sceneRoot.scale.set(1, 1, 1);
    sceneRoot.updateMatrixWorld(true);

    const meshes: string[] = [];
    const materialsSet = new Set<string>();
    const bonesSet = new Set<string>();

    sceneRoot.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        meshes.push(mesh.name || 'UnnamedMesh');
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
          const skinned = mesh as THREE.SkinnedMesh;
          skinned.skeleton?.bones.forEach((b) => {
            if (b.name) bonesSet.add(b.name);
          });
          skinned.skeleton?.update();
          skinned.computeBoundingBox();
          skinned.computeBoundingSphere();
          // Quantized GLB vertex coordinates sit in local [-1, 1] before skinning; prevent false culling
          skinned.frustumCulled = false;
        }

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat) {
            materialsSet.add(mat.name || mat.type);
            if ('envMapIntensity' in mat) {
              (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.56;
            }
          }
        });
      }
    });

    const rig = inspectGlbRig(sceneRoot);
    restoreRigBindPose(rig);
    sceneRoot.updateMatrixWorld(true);

    // Compute raw bounding box over the actual skinned character geometry in canonical bind pose
    const rawBox = new THREE.Box3().setFromObject(sceneRoot);
    const rawSize = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    if (rawBox.isEmpty()) {
      rawSize.set(1.0, 1.75, 0.4);
      rawCenter.set(0, 0.875, 0);
      rawBox.setFromCenterAndSize(rawCenter, rawSize);
    } else {
      rawBox.getSize(rawSize);
      rawBox.getCenter(rawCenter);
    }

    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);
    const normScale = 2.0 / maxDim;
    const normHeight = rawSize.y * normScale;

    // Center normalized model at origin (x=0, y=0, z=0) so complete character spans [-halfH, +halfH]
    const offsetX = -rawCenter.x * normScale;
    const offsetY = -rawBox.min.y * normScale - normHeight / 2;
    const offsetZ = -rawCenter.z * normScale;

    const toNormY = (bone: THREE.Object3D | null): number | null => {
      if (!bone) return null;
      const wp = new THREE.Vector3();
      bone.getWorldPosition(wp);
      return wp.y * normScale + offsetY;
    };

    const hairTopY = rawBox.max.y * normScale + offsetY;
    const headTopBoneY = toNormY(rig.bones.headTop);
    const headBoneY = toNormY(rig.bones.head);
    const neckBoneY = toNormY(rig.bones.neck);
    const spine2Y = toNormY(rig.bones.spine2 ?? rig.bones.spine1 ?? rig.bones.spine);
    const hipsY = toNormY(rig.bones.hips);

    let shoulderHalfW: number | null = null;
    if (rig.bones.leftArm && rig.bones.rightArm) {
      const lPos = new THREE.Vector3();
      const rPos = new THREE.Vector3();
      rig.bones.leftArm.getWorldPosition(lPos);
      rig.bones.rightArm.getWorldPosition(rPos);
      shoulderHalfW = (lPos.distanceTo(rPos) * normScale) / 2 * 1.65;
    }

    const spine1Y = toNormY(rig.bones.spine1 ?? rig.bones.spine);

    const portraitTopY = Math.max(hairTopY, headTopBoneY ?? hairTopY) + 0.05;
    const closeBottomY =
      spine1Y !== null
        ? spine1Y - 0.15
        : spine2Y !== null
        ? spine2Y - 0.28
        : neckBoneY !== null
        ? neckBoneY - 0.40
        : headBoneY !== null
        ? headBoneY - 0.51
        : normHeight * 0.12;

    const upperTopY = Math.max(hairTopY, headTopBoneY ?? hairTopY) + 0.065;
    const upperBottomY = hipsY !== null ? hipsY - 0.06 : normHeight * 0.05;

    const fullHalfH = normHeight / 2;
    const relaxedFullHalfW =
      shoulderHalfW !== null
        ? Math.max(shoulderHalfW * 2.1, 0.48)
        : (rawSize.x * normScale) / 2;

    const presets: CameraPresetBoundsMap = {
      'close-up': {
        targetY: (portraitTopY + closeBottomY) / 2,
        cameraYOffset: 0.015,
        halfW: shoulderHalfW !== null ? Math.max(shoulderHalfW * 0.88, 0.26) : 0.26,
        halfH: Math.max((portraitTopY - closeBottomY) / 2, 0.36),
        halfD: 0.18,
        fov: 28,
      },
      'upper-body': {
        targetY: (upperTopY + upperBottomY) / 2,
        cameraYOffset: 0.02,
        halfW: shoulderHalfW !== null ? Math.max(shoulderHalfW * 1.9, 0.44) : 0.45,
        halfH: Math.max((upperTopY - upperBottomY) / 2, 0.38),
        halfD: 0.22,
        fov: 32,
      },
      'full-body': {
        targetY: 0,
        cameraYOffset: 0.02,
        halfW: relaxedFullHalfW,
        halfH: fullHalfH,
        halfD: (rawSize.z * normScale) / 2,
        fov: 35,
      },
    };

    const clips = gltf.animations || [];
    const clipRoles = findAnimationClipsByRole(clips);
    const idleClip = clipRoles.idle;

    const report: GlbInspectionReport = {
      modelUrl,
      meshes,
      materials: Array.from(materialsSet),
      bones: Array.from(bonesSet),
      animations: clips.map((c) => ({ name: c.name || 'UnnamedClip', duration: c.duration })),
      morphTargets: Array.from(rig.availableMorphKeys),
      verifiedCoreMorphs: rig.verifiedCoreMorphs,
      verifiedSkeleton: rig.verifiedSkeleton,
      verifiedArmHand: rig.verifiedArmHand,
      verifiedFullBody: rig.verifiedFullBody,
      skeletonLimitations: rig.skeletonLimitations,
      activeIdleClip: idleClip ? idleClip.name || 'Clip[0]' : null,
      hasGreetingClip: Boolean(clipRoles.greeting),
      hasGoodbyeClip: Boolean(clipRoles.goodbye),
      usingProceduralWaveFallback: !clipRoles.greeting && rig.capabilities.hasArmBones,
      activeSpeechMorphs: rig.activeSpeechMorphs,
      activeVisemeMorphs: rig.activeVisemeMorphs,
      activeBlinkMorphs: rig.activeBlinkMorphs,
      hasFacialControls: rig.capabilities.hasSpeechMorphs || rig.capabilities.hasExpressionMorphs,
      capabilities: rig.capabilities,
      supportedExpressions: rig.supportedExpressions,
      boundingSize: [
        Number(rawSize.x.toFixed(3)),
        Number(rawSize.y.toFixed(3)),
        Number(rawSize.z.toFixed(3)),
      ],
    };

    return {
      normScale,
      offset: [offsetX, offsetY, offsetZ] as [number, number, number],
      presets,
      rig,
      clipRoles,
      idleClip,
      report,
    };
  }, [gltf, modelUrl]);

  useLayoutEffect(() => {
    applyStaticRelaxedArmPose(modelMetrics.rig);
    if (rigRuntimeRef.current.armDeltaQuats.size === 0 && rigRuntimeRef.current.armGesture === 'none') {
      updateArmHandRig({
        rig: modelMetrics.rig,
        runtime: rigRuntimeRef.current,
        prefersReducedMotion,
        postureMode: 'standing',
        state: 'idle',
        elapsed: 0,
        delta: 10,
      });
    }
    invalidate();
    // Only snap baseline on mount / model rig change; state transitions are smoothed inside useFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelMetrics.rig, rigRuntimeRef, invalidate]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[Ātmiya Rig Inspection]', {
        modelUrl: modelMetrics.report.modelUrl,
        clipsCount: modelMetrics.report.animations.length,
        hasGreetingClip: modelMetrics.report.hasGreetingClip,
        usingProceduralWaveFallback: modelMetrics.report.usingProceduralWaveFallback,
        closeUp: modelMetrics.presets['close-up'],
        torso: modelMetrics.rig.verifiedFullBody.torsoChain,
        limitations: modelMetrics.rig.verifiedFullBody.limitations,
      });
    }
    onInspected(modelMetrics.report);
    onPresetsReady(modelMetrics.presets);
  }, [modelMetrics, onInspected, onPresetsReady]);

  // Setup AnimationMixer ONLY if actual clips exist in the GLB
  useEffect(() => {
    const sceneRoot = gltf.scene;
    const { idle, greeting, goodbye } = modelMetrics.clipRoles;
    if (!idle && !greeting && !goodbye) {
      mixerRef.current = null;
      clipActionsRef.current = { idle: null, greeting: null, goodbye: null };
      return;
    }

    const mixer = new THREE.AnimationMixer(sceneRoot);
    const idleAction = idle ? mixer.clipAction(idle) : null;
    const greetingAction = greeting ? mixer.clipAction(greeting) : null;
    const goodbyeAction = goodbye ? mixer.clipAction(goodbye) : null;

    if (idleAction) {
      idleAction.setEffectiveTimeScale(0.85);
      idleAction.play();
    }
    if (greetingAction) {
      greetingAction.setLoop(THREE.LoopOnce, 1);
      greetingAction.clampWhenFinished = false;
    }
    if (goodbyeAction) {
      goodbyeAction.setLoop(THREE.LoopOnce, 1);
      goodbyeAction.clampWhenFinished = false;
    }

    mixerRef.current = mixer;
    clipActionsRef.current = {
      idle: idleAction,
      greeting: greetingAction,
      goodbye: goodbyeAction,
    };

    return () => {
      idleAction?.stop();
      greetingAction?.stop();
      goodbyeAction?.stop();
      mixer.stopAllAction();
      mixer.uncacheRoot(sceneRoot);
      mixerRef.current = null;
      clipActionsRef.current = { idle: null, greeting: null, goodbye: null };
    };
  }, [gltf.scene, modelMetrics.clipRoles]);

  // Trigger GLB wave clip (if present) or Phase 2/3 procedural nod/wave seamlessly
  useEffect(() => {
    const prevProp = prevActiveGesturePropRef.current;
    prevActiveGesturePropRef.current = activeGesture;

    if (prevProp === 'wave' && activeGesture === 'none' && rigRuntimeRef.current.armGesture === 'wave') {
      cancelArmGesture(rigRuntimeRef.current);
      lastReportedArmGestureRef.current = 'none';
      onArmGestureStateChange?.('none');
      invalidate();
    }

    if (gestureNonce === lastHandledGestureNonceRef.current) return;
    lastHandledGestureNonceRef.current = gestureNonce;
    if (activeGesture === 'nod') {
      triggerHeadNod(rigRuntimeRef.current, { intensity: 0.72, duration: 0.78 });
      invalidate();
    } else if (activeGesture === 'wave') {
      const clipToPlay =
        unifiedState === 'goodbye'
          ? clipActionsRef.current.goodbye
          : clipActionsRef.current.greeting;

      if (clipToPlay && mixerRef.current) {
        clipToPlay.reset().fadeIn(0.25).play();
        if (clipActionsRef.current.idle) {
          clipActionsRef.current.idle.crossFadeTo(clipToPlay, 0.25, false);
        }
        invalidate();
      } else {
        const preferredSide =
          modelMetrics.rig.verifiedArmHand.preferredWaveSide === 'left' ? 'left' : 'right';
        speechArmControlledRef.current = false;
        startArmGesture(rigRuntimeRef.current, 'wave', { side: preferredSide });
        lastReportedArmGestureRef.current = 'wave';
        onArmGestureStateChange?.('wave');
        invalidate();
      }
    }
  }, [
    activeGesture,
    gestureNonce,
    unifiedState,
    modelMetrics.rig.verifiedArmHand.preferredWaveSide,
    rigRuntimeRef,
    invalidate,
    onArmGestureStateChange,
  ]);

  // Wake demand frameloop whenever explicit head or arm test actions occur
  useEffect(() => {
    if (headActionNonce > 0) {
      invalidate();
    }
  }, [headActionNonce, invalidate]);

  // Immediately reset mouth/jaw targets on speech finish/cancel + single gentle nod on listening start + clean speech gesture settle
  useEffect(() => {
    const prevState = prevStateRef.current;
    prevStateRef.current = state;

    if (state === 'interrupted' || state === 'error') {
      resetSpeechMorphs(modelMetrics.rig);
      clearSpeechHeadTilt(rigRuntimeRef.current);
      if (speechArmControlledRef.current) {
        cancelArmGesture(rigRuntimeRef.current);
        speechArmControlledRef.current = false;
      }
      resetSpeechGestureRunner(speechRunnerRef.current);
      invalidate();
    } else if (prevState === 'speaking' && state !== 'speaking') {
      if (prefersReducedMotion) {
        resetSpeechMorphs(modelMetrics.rig);
      }
      clearSpeechHeadTilt(rigRuntimeRef.current);
      if (speechArmControlledRef.current) {
        cancelArmGesture(rigRuntimeRef.current);
        speechArmControlledRef.current = false;
      }
      resetSpeechGestureRunner(speechRunnerRef.current);
      invalidate();
    }

    if (prevState !== 'listening' && state === 'listening' && !prefersReducedMotion) {
      triggerHeadNod(rigRuntimeRef.current, { intensity: 0.45, duration: 0.65 });
      invalidate();
    }
  }, [state, prefersReducedMotion, modelMetrics.rig, rigRuntimeRef, invalidate]);

  // Reset speech tilt/runner immediately if speechPlan clears or changes session
  useEffect(() => {
    if (!speechPlan) {
      clearSpeechHeadTilt(rigRuntimeRef.current);
      if (speechArmControlledRef.current && state !== 'speaking') {
        cancelArmGesture(rigRuntimeRef.current);
        speechArmControlledRef.current = false;
      }
      resetSpeechGestureRunner(speechRunnerRef.current);
      invalidate();
    }
  }, [speechPlan, state, rigRuntimeRef, invalidate]);

  // Single coordinated per-frame loop: Phase 1 face + Phase 2 head/neck + Phase 3 arms/hands + Phase 4 torso/breathing/legs
  useFrame((frameState, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const elapsed = frameState.clock.elapsedTime;

    if (mixerRef.current && !prefersReducedMotion) {
      mixerRef.current.update(delta);
    }

    const lipSyncFrame = speechService.sampleLipSyncFrame();

    const isSpeakingNow = state === 'speaking' || unifiedState === 'speaking';
    const speechStep = stepSpeechGesturePlan({
      runner: speechRunnerRef.current,
      plan: speechPlan,
      delta,
      isSpeaking: isSpeakingNow,
      isVoiced: lipSyncFrame.isActive ? lipSyncFrame.isVoiced : isSpeakingNow,
      speechPausedSec: rigRuntimeRef.current.speechPausedSec,
      activeGesture,
      runtimeArmGesture: rigRuntimeRef.current.armGesture,
      prefersReducedMotion,
    });

    if (speechStep.clearTilt) {
      clearSpeechHeadTilt(rigRuntimeRef.current);
    }

    if (speechStep.cue) {
      const cue = speechStep.cue;
      if (cue.kind === 'arm' && cue.armGesture) {
        const preferredSide =
          cue.side ??
          (modelMetrics.rig.verifiedArmHand.preferredWaveSide === 'left' ? 'left' : 'right');
        startArmGesture(rigRuntimeRef.current, cue.armGesture, {
          side: preferredSide,
          duration: cue.durationSec,
        });
        speechArmControlledRef.current = true;
      } else if (cue.kind === 'nod') {
        triggerHeadNod(rigRuntimeRef.current, {
          intensity: cue.intensity ?? 0.56,
          duration: cue.durationSec,
        });
      } else if (cue.kind === 'tilt' && cue.headPose) {
        setSpeechHeadTilt(rigRuntimeRef.current, cue.headPose, cue.intensity ?? 0.48);
      }
    }

    const exprStatus = updateExpressionRig({
      rig: modelMetrics.rig,
      runtime: rigRuntimeRef.current,
      state,
      unifiedState,
      emotion,
      emotionIntensity,
      expressionsEnabled,
      audioLevel,
      lipSyncFrame,
      prefersReducedMotion,
      elapsed,
      delta,
    });

    const headStatus = updateHeadNeckRig({
      rig: modelMetrics.rig,
      runtime: rigRuntimeRef.current,
      state,
      unifiedState,
      lipSyncFrame,
      prefersReducedMotion,
      elapsed,
      delta,
    });

    const armStatus = updateArmHandRig({
      rig: modelMetrics.rig,
      runtime: rigRuntimeRef.current,
      prefersReducedMotion,
      postureMode: 'standing',
      state,
      unifiedState,
      elapsed,
      delta,
    });

    if (armStatus.activeGesture === 'none') {
      speechArmControlledRef.current = false;
    }

    const bodyStatus = updateFullBodyAndLowerRig({
      rig: modelMetrics.rig,
      runtime: rigRuntimeRef.current,
      state,
      unifiedState,
      presentationMode,
      postureMode: 'standing',
      prefersReducedMotion,
      elapsed,
      delta,
    });

    if (armStatus.activeGesture !== lastReportedArmGestureRef.current) {
      lastReportedArmGestureRef.current = armStatus.activeGesture;
      onArmGestureStateChange?.(armStatus.activeGesture);
    }

    if (
      exprStatus.isAnimating ||
      headStatus.isAnimating ||
      armStatus.isAnimating ||
      bodyStatus.isAnimating
    ) {
      frameState.invalidate();
    }
  });

  // Restore bind pose, clear morphs, and reset runtime/speech runner cleanly on unmount
  // (Keep shared useGLTF cache intact so rapid Home <-> Play transitions never dispose active meshes)
  useEffect(() => {
    const runtime = rigRuntimeRef.current;
    const speechRunner = speechRunnerRef.current;
    return () => {
      resetSpeechGestureRunner(speechRunner);
      speechArmControlledRef.current = false;
      resetAllAvatarPoses(runtime);
      runtime.armDeltaQuats.clear();
      runtime.bodyDeltaQuats.clear();
      runtime.hipsOffset.set(0, 0, 0);
      clearAllRigMorphs(modelMetrics.rig);
      restoreRigBindPose(modelMetrics.rig);
    };
  }, [modelMetrics.rig, rigRuntimeRef]);

  return (
    <group scale={modelMetrics.normScale} position={modelMetrics.offset}>
      <primitive object={gltf.scene} />
    </group>
  );
});

GlbModelScene.displayName = 'GlbModelScene';

const WebGLContextLifecycle: React.FC<{
  onContextLost: () => void;
  onContextRestored: () => void;
}> = ({ onContextLost, onContextRestored }) => {
  const { gl } = useThree();

  useEffect(() => {
    const canvasEl = gl.domElement;
    const handleLost = (ev: Event) => {
      ev.preventDefault();
      onContextLost();
    };
    const handleRestored = () => {
      onContextRestored();
    };

    canvasEl.addEventListener('webglcontextlost', handleLost);
    canvasEl.addEventListener('webglcontextrestored', handleRestored);
    return () => {
      canvasEl.removeEventListener('webglcontextlost', handleLost);
      canvasEl.removeEventListener('webglcontextrestored', handleRestored);
    };
  }, [gl, onContextLost, onContextRestored]);

  return null;
};

const CameraRig: React.FC<{
  bounds: CameraFramingBounds;
  presetKey: CameraPreset;
  resetTrigger: number;
  enableDamping: boolean;
}> = React.memo(({ bounds, presetKey, resetTrigger, enableDamping }) => {
  const { camera, size, invalidate } = useThree();
  const controlsRef = useRef<any>(null);
  const isTransitioningRef = useRef(false);
  const hasMountedRef = useRef(false);
  const lastPresetRef = useRef<CameraPreset>(presetKey);
  const lastResetRef = useRef<number>(resetTrigger);

  const framing = useMemo(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const tanHalfV = Math.tan(THREE.MathUtils.degToRad(bounds.fov / 2));
    const tanHalfH = tanHalfV * Math.max(aspect, 0.25);
    const padding = 1.06;

    const distV = (bounds.halfH * padding) / Math.max(tanHalfV, 0.001);
    const distH = (bounds.halfW * padding) / Math.max(tanHalfH, 0.001);
    const cameraZ = Math.max(distV, distH) + bounds.halfD;

    return {
      targetY: bounds.targetY,
      cameraY: bounds.targetY + bounds.cameraYOffset,
      cameraZ,
      fov: bounds.fov,
    };
  }, [bounds, size.width, size.height]);

  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const isIntentionalPresetChange =
      hasMountedRef.current &&
      (lastPresetRef.current !== presetKey || lastResetRef.current !== resetTrigger);

    lastPresetRef.current = presetKey;
    lastResetRef.current = resetTrigger;

    if (!isIntentionalPresetChange || !enableDamping) {
      hasMountedRef.current = true;
      isTransitioningRef.current = false;
      if (Math.abs(persp.fov - framing.fov) > 0.01) {
        persp.fov = framing.fov;
        persp.updateProjectionMatrix();
      }
      camera.position.set(0, framing.cameraY, framing.cameraZ);
      camera.lookAt(0, framing.targetY, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, framing.targetY, 0);
        controlsRef.current.update();
      }
      invalidate();
      return;
    }

    isTransitioningRef.current = true;
    invalidate();
  }, [
    camera,
    framing.targetY,
    framing.cameraY,
    framing.cameraZ,
    framing.fov,
    presetKey,
    resetTrigger,
    enableDamping,
    invalidate,
  ]);

  useFrame((_, rawDelta) => {
    if (!isTransitioningRef.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const persp = camera as THREE.PerspectiveCamera;
    const lambda = 9;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, lambda, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, framing.cameraY, lambda, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, framing.cameraZ, lambda, delta);

    if (Math.abs(persp.fov - framing.fov) > 0.02) {
      persp.fov = THREE.MathUtils.damp(persp.fov, framing.fov, lambda, delta);
      persp.updateProjectionMatrix();
    }

    if (controlsRef.current) {
      controlsRef.current.target.x = THREE.MathUtils.damp(controlsRef.current.target.x, 0, lambda, delta);
      controlsRef.current.target.y = THREE.MathUtils.damp(
        controlsRef.current.target.y,
        framing.targetY,
        lambda,
        delta
      );
      controlsRef.current.target.z = THREE.MathUtils.damp(controlsRef.current.target.z, 0, lambda, delta);
      controlsRef.current.update();
    }

    const posErr =
      Math.abs(camera.position.x) +
      Math.abs(camera.position.y - framing.cameraY) +
      Math.abs(camera.position.z - framing.cameraZ);
    const targetErr = controlsRef.current
      ? Math.abs(controlsRef.current.target.y - framing.targetY)
      : 0;

    if (posErr < 0.003 && targetErr < 0.003) {
      camera.position.set(0, framing.cameraY, framing.cameraZ);
      if (Math.abs(persp.fov - framing.fov) > 0.001) {
        persp.fov = framing.fov;
        persp.updateProjectionMatrix();
      }
      if (controlsRef.current) {
        controlsRef.current.target.set(0, framing.targetY, 0);
        controlsRef.current.update();
      }
      isTransitioningRef.current = false;
    } else {
      invalidate();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, framing.targetY, 0]}
      enableDamping={enableDamping}
      dampingFactor={0.07}
      enablePan={false}
      enableZoom={true}
      onStart={() => {
        isTransitioningRef.current = false;
      }}
      minDistance={Math.max(0.46, framing.cameraZ * 0.42)}
      maxDistance={Math.max(5.5, framing.cameraZ * 2.4)}
      minPolarAngle={Math.PI * 0.28}
      maxPolarAngle={Math.PI * 0.68}
      minAzimuthAngle={-Math.PI * 0.35}
      maxAzimuthAngle={Math.PI * 0.35}
    />
  );
});

CameraRig.displayName = 'CameraRig';

const StageLoadingPlaceholder: React.FC<{ label: string; sublabel?: string }> = ({
  label,
  sublabel,
}) => (
  <div className="w-full h-full flex flex-col items-center justify-center px-4">
    <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-[#091428]/70 border border-sky-400/20 flex flex-col items-center justify-center gap-2.5 shadow-xl">
      <Loader2 className="w-7 h-7 text-sky-300 animate-spin" />
      <div className="text-center px-3">
        <span className="block text-xs font-semibold text-slate-100">{label}</span>
        {sublabel && (
          <span className="block text-[11px] text-slate-400 mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  </div>
);

interface ExpressionPreviewDrawerProps {
  activeEmotion: AvatarEmotion;
  previewEmotion: AvatarEmotion | null;
  supportedExpressions?: Record<AvatarEmotion, boolean>;
  hasGlbLoaded: boolean;
  verifiedSkeleton?: VerifiedSkeletonMap;
  verifiedArmHand?: VerifiedArmHandSummary;
  verifiedFullBody?: VerifiedFullBodySummary;
  skeletonLimitations?: string[];
  idleMovementEnabled: boolean;
  idleIntensity: IdleMovementIntensity;
  activeHeadPose: HeadPoseTarget;
  activeArmGesture: ArmGestureName;
  activeHandPose: HandPoseTarget;
  onToggleIdleMovement: () => void;
  onChangeIdleIntensity: (intensity: IdleMovementIntensity) => void;
  onTestHeadNod: () => void;
  onTestHeadPose: (pose: HeadPoseTarget) => void;
  onTriggerArmGesture: (gesture: Exclude<ArmGestureName, 'none'>) => void;
  onResetArmPose: () => void;
  onResetFullPose: () => void;
  onSelectHandPose: (pose: HandPoseTarget) => void;
  onSelect: (emotion: AvatarEmotion | null) => void;
  onClose: () => void;
}

const ExpressionPreviewDrawer: React.FC<ExpressionPreviewDrawerProps> = ({
  activeEmotion,
  previewEmotion,
  supportedExpressions,
  hasGlbLoaded,
  verifiedSkeleton,
  verifiedArmHand,
  verifiedFullBody,
  skeletonLimitations = [],
  idleMovementEnabled,
  idleIntensity,
  activeHeadPose,
  activeArmGesture,
  activeHandPose,
  onToggleIdleMovement,
  onChangeIdleIntensity,
  onTestHeadNod,
  onTestHeadPose,
  onTriggerArmGesture,
  onResetArmPose,
  onResetFullPose,
  onSelectHandPose,
  onSelect,
  onClose,
}) => (
  <div className="mt-3 w-full max-w-md max-h-[58vh] overflow-y-auto rounded-2xl bg-white/95 dark:bg-[#0b1528]/96 border border-slate-200 dark:border-slate-700/80 p-3 shadow-2xl text-left">
    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-sky-300">
        <Smile className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
        <span>Expression & Full-Body Rig Controls</span>
      </div>
      <div className="flex items-center gap-2">
        {previewEmotion && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            Auto
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded cursor-pointer"
          aria-label="Close expression preview"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {AVATAR_EMOTIONS.map((expr) => {
        const isActive = (previewEmotion ?? activeEmotion) === expr;
        const isSupportedInGlb = Boolean(hasGlbLoaded && supportedExpressions?.[expr]);
        return (
          <button
            key={expr}
            type="button"
            onClick={() => onSelect(previewEmotion === expr ? null : expr)}
            className={`px-2 py-1.5 rounded-lg border text-[11px] text-left transition cursor-pointer flex items-center justify-between gap-1 ${
              isActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/30 text-blue-800 dark:text-white font-semibold'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020]/80 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
            }`}
            title={
              hasGlbLoaded
                ? isSupportedInGlb
                  ? 'Supported by loaded 3D GLB morph/rig'
                  : 'Not supported by loaded 3D GLB morph targets'
                : 'No 3D GLB loaded yet (previewing fallback state only)'
            }
          >
            <span className="truncate">{AVATAR_EMOTION_LABELS[expr]}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                !hasGlbLoaded
                  ? 'bg-amber-400/70'
                  : isSupportedInGlb
                  ? 'bg-emerald-500 dark:bg-emerald-400'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
            />
          </button>
        );
      })}
    </div>

    {hasGlbLoaded && (
      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            Head & Neck Movement
          </span>
          <button
            type="button"
            onClick={onToggleIdleMovement}
            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold transition cursor-pointer ${
              idleMovementEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Idle: {idleMovementEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onTestHeadNod}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020]/80 hover:border-blue-400 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Head Nod
          </button>
          <button
            type="button"
            onClick={() => onTestHeadPose(activeHeadPose === 'turn-left' ? 'neutral' : 'turn-left')}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
              activeHeadPose === 'turn-left'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/30 text-blue-800 dark:text-white'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020]/80 text-slate-700 dark:text-slate-200 hover:border-blue-400'
            }`}
          >
            Turn Left
          </button>
          <button
            type="button"
            onClick={() => onTestHeadPose(activeHeadPose === 'turn-right' ? 'neutral' : 'turn-right')}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
              activeHeadPose === 'turn-right'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/30 text-blue-800 dark:text-white'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020]/80 text-slate-700 dark:text-slate-200 hover:border-blue-400'
            }`}
          >
            Turn Right
          </button>
          <button
            type="button"
            onClick={() => onTestHeadPose(activeHeadPose === 'tilt-left' ? 'neutral' : 'tilt-left')}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
              activeHeadPose === 'tilt-left'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/30 text-blue-800 dark:text-white'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020]/80 text-slate-700 dark:text-slate-200 hover:border-blue-400'
            }`}
          >
            Tilt Left
          </button>
          <button
            type="button"
            onClick={() => onTestHeadPose(activeHeadPose === 'tilt-right' ? 'neutral' : 'tilt-right')}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
              activeHeadPose === 'tilt-right'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/30 text-blue-800 dark:text-white'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020]/80 text-slate-700 dark:text-slate-200 hover:border-blue-400'
            }`}
          >
            Tilt Right
          </button>
          <button
            type="button"
            onClick={() => onTestHeadPose('neutral')}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 hover:border-amber-400 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Neutral
          </button>
        </div>

        {verifiedSkeleton && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {(['head', 'neck', 'spine', 'spine1', 'spine2'] as const).map((k) => {
              const info = verifiedSkeleton[k];
              return (
                <span
                  key={k}
                  className={`px-1.5 py-0.5 rounded text-[10px] border ${
                    info.detected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                  title={
                    info.detected
                      ? `${info.actualName} (parent: ${info.parentName || 'Root'})`
                      : `${info.expectedName} missing`
                  }
                >
                  {info.expectedName}
                </span>
              );
            })}
          </div>
        )}

        {skeletonLimitations.length > 0 && (
          <p className="text-[10px] text-amber-600 dark:text-amber-300 leading-snug">
            {skeletonLimitations.join(' ')}
          </p>
        )}

        {/* Phase 3: Arms, Hands & Fingers */}
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              Arms, Hands & Fingers
            </span>
            {activeArmGesture !== 'none' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-500/40 text-blue-700 dark:text-sky-300 font-medium">
                Active: {activeArmGesture}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'wave', label: 'Wave' },
                { id: 'open-palm', label: 'Open Palm' },
                { id: 'raise-hand', label: 'Raise Hand' },
                { id: 'conversational', label: 'Converse' },
              ] as const
            ).map((item) => {
              const isActive = activeArmGesture === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTriggerArmGesture(item.id)}
                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/30 text-blue-800 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020]/80 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                  }`}
                  title={isActive ? 'Click again to cancel smoothly' : `Trigger ${item.label} gesture`}
                >
                  {isActive ? `Cancel ${item.label}` : item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onResetArmPose}
              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 hover:border-amber-400 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer col-span-2"
              title="Smoothly return arm, hand, and fingers to relaxed resting baseline"
            >
              Reset Arm Pose
            </button>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
              Hand Pose:
            </span>
            <div className="grid grid-cols-3 gap-1 flex-1">
              {(
                [
                  { id: 'relaxed', label: 'Relaxed' },
                  { id: 'open', label: 'Open' },
                  { id: 'curl', label: 'Curl' },
                ] as const
              ).map((pose) => (
                <button
                  key={pose.id}
                  type="button"
                  onClick={() => onSelectHandPose(pose.id)}
                  className={`px-2 py-1 rounded-md border text-[10px] font-medium transition cursor-pointer ${
                    activeHandPose === pose.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/30 text-blue-800 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020]/80 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  {pose.label}
                </button>
              ))}
            </div>
          </div>

          {verifiedArmHand && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  verifiedArmHand.hasRightArmReady
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                }`}
                title={
                  [
                    verifiedArmHand.rightArmChain.shoulder,
                    verifiedArmHand.rightArmChain.arm,
                    verifiedArmHand.rightArmChain.foreArm,
                    verifiedArmHand.rightArmChain.hand,
                  ]
                    .filter(Boolean)
                    .join(' -> ') || 'Right arm missing'
                }
              >
                Right Arm
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  verifiedArmHand.hasLeftArmReady
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                }`}
                title={
                  [
                    verifiedArmHand.leftArmChain.shoulder,
                    verifiedArmHand.leftArmChain.arm,
                    verifiedArmHand.leftArmChain.foreArm,
                    verifiedArmHand.leftArmChain.hand,
                  ]
                    .filter(Boolean)
                    .join(' -> ') || 'Left arm missing'
                }
              >
                Left Arm
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  verifiedArmHand.hasFingerRig
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                }`}
                title={`Right: ${verifiedArmHand.rightFingerBones.length} bones, Left: ${verifiedArmHand.leftFingerBones.length} bones`}
              >
                Fingers ({verifiedArmHand.rightFingerBones.length + verifiedArmHand.leftFingerBones.length})
              </span>
            </div>
          )}

          {verifiedArmHand && verifiedArmHand.limitations.length > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-300 leading-snug">
              {verifiedArmHand.limitations.join(' ')}
            </p>
          )}
        </div>

        {/* Phase 4: Breathing, Torso & Lower-Body Idle */}
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              Body Breathing & Standing Idle
            </span>
            <button
              type="button"
              onClick={onResetFullPose}
              className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:border-amber-400 text-[10px] font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Reset face preview, head, arms, torso, and legs smoothly back to neutral pose"
            >
              Reset Pose
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
              Idle Intensity:
            </span>
            <div className="grid grid-cols-3 gap-1 flex-1">
              {(
                [
                  { id: 'low', label: 'Low' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'high', label: 'High' },
                ] as const
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  disabled={!idleMovementEnabled}
                  onClick={() => onChangeIdleIntensity(lvl.id)}
                  className={`px-2 py-1 rounded-md border text-[10px] font-medium transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    idleIntensity === lvl.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/30 text-blue-800 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020]/80 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {verifiedFullBody && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {(
                [
                  { key: 'hips', label: 'Hips', ok: verifiedFullBody.hasHips, detail: verifiedFullBody.torsoChain.hips },
                  { key: 'torso', label: 'Torso/Chest', ok: verifiedFullBody.hasTorsoBreathing, detail: verifiedFullBody.torsoChain.spine2 || verifiedFullBody.torsoChain.spine },
                  { key: 'lleg', label: 'Left Leg', ok: verifiedFullBody.hasLeftLeg, detail: [verifiedFullBody.leftLegChain.upLeg, verifiedFullBody.leftLegChain.leg, verifiedFullBody.leftLegChain.foot].filter(Boolean).join(' -> ') },
                  { key: 'rleg', label: 'Right Leg', ok: verifiedFullBody.hasRightLeg, detail: [verifiedFullBody.rightLegChain.upLeg, verifiedFullBody.rightLegChain.leg, verifiedFullBody.rightLegChain.foot].filter(Boolean).join(' -> ') },
                  { key: 'feet', label: 'Feet/Toes', ok: verifiedFullBody.hasFeet, detail: [verifiedFullBody.leftLegChain.foot, verifiedFullBody.leftLegChain.toeBase, verifiedFullBody.rightLegChain.foot, verifiedFullBody.rightLegChain.toeBase].filter(Boolean).join(', ') },
                ] as const
              ).map((item) => (
                <span
                  key={item.key}
                  className={`px-1.5 py-0.5 rounded text-[10px] border ${
                    item.ok
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                  title={item.detail || `${item.label} missing`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          )}

          {verifiedFullBody && verifiedFullBody.limitations.length > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-300 leading-snug">
              {verifiedFullBody.limitations.join(' ')}
            </p>
          )}
        </div>
      </div>
    )}

    <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
      {hasGlbLoaded
        ? 'Green dot = morphs/bones detected on loaded GLB. Gray dot = requires additional blendshapes on the model.'
        : 'Amber dot = no 3D GLB model loaded at /models/atmiya-avatar.glb yet (preview applies 2D aura/posture fallback).'}
    </p>
  </div>
);

export const RealisticAvatar: React.FC<RealisticAvatarProps> = React.memo(({
  stageVariant = 'circle',
  state,
  unifiedState,
  emotion = 'neutral',
  emotionIntensity = 0.7,
  previewEmotion = null,
  activeGesture = 'none',
  gestureNonce = 0,
  speechPlan = null,
  expressionsEnabled = true,
  hideStageChrome = false,
  onSelectPreviewEmotion,
  onTriggerGesture,
  onResetPose,
  audioLevel = 0,
  config,
  onInterrupt,
  onTapAvatar,
  onInspectionComplete,
  onOpenCustomize,
  cameraPreset: controlledCameraPreset,
  onChangeCameraPreset,
  resetCameraNonce: controlledResetCameraNonce,
  isExpressionsOpen: controlledExpressionsOpen,
  onSetExpressionsOpen,
  className = '',
}) => {
  const modelUrl = config?.glbModelPath || '/models/atmiya-avatar.glb';
  const isImmersive = stageVariant === 'immersive';
  const hasExternalStageControls = Boolean(onChangeCameraPreset || onSetExpressionsOpen);

  const [assetStatus, setAssetStatus] = useState<'checking' | 'ready' | 'missing' | 'error'>('checking');
  const [errorReason, setErrorReason] = useState<string>('');
  const [inspection, setInspection] = useState<GlbInspectionReport | null>(null);
  const [internalCameraPreset, setInternalCameraPreset] = useState<CameraPreset>('close-up');
  const [cameraPresetsMap, setCameraPresetsMap] = useState<CameraPresetBoundsMap>(DEFAULT_CAMERA_PRESETS);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);
  const [internalResetCameraTrigger, setInternalResetCameraTrigger] = useState(0);
  const [internalExpressionPanelOpen, setInternalExpressionPanelOpen] = useState(false);
  const [isStageControlsOpen, setIsStageControlsOpen] = useState(false);
  const [idleMovementEnabled, setIdleMovementEnabled] = useState(true);
  const [idleIntensity, setIdleIntensity] = useState<IdleMovementIntensity>('medium');
  const [activeHeadPose, setActiveHeadPose] = useState<HeadPoseTarget>('neutral');
  const [activeArmGesture, setActiveArmGesture] = useState<ArmGestureName>('none');
  const [activeHandPose, setActiveHandPose] = useState<HandPoseTarget>('relaxed');
  const [headActionNonce, setHeadActionNonce] = useState(0);
  const [contextLost, setContextLost] = useState(false);

  const cameraPreset = controlledCameraPreset ?? internalCameraPreset;
  const resetCameraTrigger = controlledResetCameraNonce ?? internalResetCameraTrigger;
  const isExpressionPanelOpen = controlledExpressionsOpen ?? internalExpressionPanelOpen;

  const setCameraPreset = useCallback(
    (next: CameraPreset) => {
      setInternalCameraPreset(next);
      onChangeCameraPreset?.(next);
    },
    [onChangeCameraPreset]
  );

  const triggerResetCamera = useCallback(() => {
    setInternalResetCameraTrigger((n) => n + 1);
  }, []);

  const setIsExpressionPanelOpen = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      const nextVal =
        typeof updater === 'function' ? updater(isExpressionPanelOpen) : updater;
      setInternalExpressionPanelOpen(nextVal);
      onSetExpressionsOpen?.(nextVal);
    },
    [isExpressionPanelOpen, onSetExpressionsOpen]
  );
  const rigRuntimeRef = useRef<RigAnimationRuntime>(createRigRuntime());
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const onInspectionCompleteRef = useRef(onInspectionComplete);
  onInspectionCompleteRef.current = onInspectionComplete;

  const handleToggleIdleMovement = useCallback(() => {
    setIdleMovementEnabled((prev) => {
      const next = !prev;
      setHeadIdleEnabled(rigRuntimeRef.current, next);
      setHeadActionNonce((n) => n + 1);
      return next;
    });
  }, []);

  const handleChangeIdleIntensity = useCallback((intensity: IdleMovementIntensity) => {
    setIdleIntensity(intensity);
    setIdleMovementIntensity(rigRuntimeRef.current, intensity);
    setHeadActionNonce((n) => n + 1);
  }, []);

  const handleTestHeadNod = useCallback(() => {
    triggerHeadNod(rigRuntimeRef.current, { intensity: 0.78, duration: 0.78 });
    setHeadActionNonce((n) => n + 1);
  }, []);

  const handleTestHeadPose = useCallback((pose: HeadPoseTarget) => {
    setActiveHeadPose(pose);
    switch (pose) {
      case 'turn-left':
        turnHeadLeft(rigRuntimeRef.current, 1);
        break;
      case 'turn-right':
        turnHeadRight(rigRuntimeRef.current, 1);
        break;
      case 'tilt-left':
        tiltHeadLeft(rigRuntimeRef.current, 1);
        break;
      case 'tilt-right':
        tiltHeadRight(rigRuntimeRef.current, 1);
        break;
      case 'neutral':
      default:
        resetHeadPose(rigRuntimeRef.current);
        break;
    }
    setHeadActionNonce((n) => n + 1);
  }, []);

  const handleTriggerArmGesture = useCallback(
    (gesture: Exclude<ArmGestureName, 'none'>) => {
      if (rigRuntimeRef.current.armGesture === gesture) {
        cancelArmGesture(rigRuntimeRef.current);
        setActiveArmGesture('none');
      } else {
        const preferredSide =
          inspection?.verifiedArmHand.preferredWaveSide === 'left' ? 'left' : 'right';
        startArmGesture(rigRuntimeRef.current, gesture, { side: preferredSide });
        setActiveArmGesture(gesture);
      }
      setHeadActionNonce((n) => n + 1);
    },
    [inspection?.verifiedArmHand.preferredWaveSide]
  );

  const handleResetArmPose = useCallback(() => {
    resetArmPose(rigRuntimeRef.current);
    setActiveArmGesture('none');
    setActiveHandPose('relaxed');
    setHeadActionNonce((n) => n + 1);
  }, []);

  const handleSelectHandPose = useCallback((pose: HandPoseTarget) => {
    setHandPose(rigRuntimeRef.current, pose);
    setActiveHandPose(pose);
    setHeadActionNonce((n) => n + 1);
  }, []);

  const handleResetFullPose = useCallback(() => {
    resetHeadPose(rigRuntimeRef.current);
    resetArmPose(rigRuntimeRef.current);
    resetBodyPose(rigRuntimeRef.current);
    setActiveHeadPose('neutral');
    setActiveArmGesture('none');
    setActiveHandPose('relaxed');
    onResetPose?.();
    onSelectPreviewEmotion?.(null);
    setHeadActionNonce((n) => n + 1);
  }, [onResetPose, onSelectPreviewEmotion]);

  const handleArmGestureStateChange = useCallback((gesture: ArmGestureName) => {
    setActiveArmGesture(gesture);
  }, []);

  const handleInspected = useCallback((report: GlbInspectionReport) => {
    setInspection(report);
    onInspectionCompleteRef.current?.(report);
  }, []);

  const handlePresetsReady = useCallback((next: CameraPresetBoundsMap) => {
    setCameraPresetsMap((prev) => {
      const sameClose =
        Math.abs(prev['close-up'].targetY - next['close-up'].targetY) < 1e-4 &&
        Math.abs(prev['close-up'].halfH - next['close-up'].halfH) < 1e-4 &&
        Math.abs(prev['full-body'].halfH - next['full-body'].halfH) < 1e-4;
      return sameClose ? prev : next;
    });
  }, []);

  const webglProbe = useMemo(() => probeWebGLCapabilities(), []);
  const isSoftwareGl = webglProbe.isSoftware;
  const effectiveEmotion = expressionsEnabled ? (previewEmotion ?? emotion) : 'neutral';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => setIsTabHidden(document.hidden);
    setIsTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isStageControlsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsStageControlsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isStageControlsOpen]);

  // Preflight check so missing GLB or unavailable WebGL degrades cleanly to 2D portrait fallback
  useEffect(() => {
    let cancelled = false;
    if (!webglProbe.supported) {
      setAssetStatus('error');
      setErrorReason('WebGL 3D acceleration is unavailable in this browser.');
      return;
    }

    setAssetStatus('checking');
    setErrorReason('');

    const abortController = new AbortController();

    fetch(modelUrl, {
      method: 'GET',
      headers: { Range: 'bytes=0-3' },
      signal: abortController.signal,
    })
      .then(async (res) => {
        if (cancelled) return;
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || contentType.includes('text/html')) {
          void res.body?.cancel();
          setAssetStatus('missing');
          setErrorReason(`3D GLB not found at ${modelUrl}.`);
          return;
        }

        let headerBytes: Uint8Array | null = null;
        if (res.body && typeof res.body.getReader === 'function') {
          const reader = res.body.getReader();
          const collected = new Uint8Array(4);
          let offset = 0;
          try {
            while (offset < 4) {
              const { value, done } = await reader.read();
              if (done || !value) break;
              const take = Math.min(4 - offset, value.byteLength);
              collected.set(value.subarray(0, take), offset);
              offset += take;
            }
          } finally {
            void reader.cancel();
          }
          headerBytes = collected.subarray(0, offset);
        } else {
          const buf = await res.arrayBuffer();
          headerBytes = new Uint8Array(buf.slice(0, 4));
        }

        if (cancelled) return;
        const magic = headerBytes ? String.fromCharCode(...headerBytes) : '';
        if (headerBytes && headerBytes.byteLength >= 4 && magic !== 'glTF') {
          setAssetStatus('error');
          setErrorReason(`File at ${modelUrl} is not a valid binary .glb asset.`);
          return;
        }
        setAssetStatus('ready');
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        setAssetStatus('error');
        setErrorReason(err?.message || `Unable to fetch ${modelUrl}`);
      });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [modelUrl, retryCounter, webglProbe.supported]);

  const handleRetry = () => {
    useGLTF.clear(modelUrl);
    setContextLost(false);
    setRetryCounter((c) => c + 1);
  };

  // Rim light color driven by companion state (must be called before any early return)
  const rimLightColor = useMemo(() => {
    switch (state) {
      case 'listening':
        return '#22d3ee';
      case 'thinking':
        return '#fbbf24';
      case 'speaking':
        return '#60a5fa';
      case 'error':
        return '#f43f5e';
      default:
        return config?.accentColor || '#8b5cf6';
    }
  }, [state, config?.accentColor]);

  // Fallback to 2D portrait avatar cleanly when GLB is missing, errors, or WebGL context drops
  if (assetStatus === 'missing' || assetStatus === 'error' || contextLost) {
    return (
      <div className={`relative flex flex-col items-center ${className}`}>
        <CompanionAvatar
          stageVariant={stageVariant}
          state={state}
          emotion={effectiveEmotion}
          emotionIntensity={emotionIntensity}
          audioLevel={audioLevel}
          config={config}
          onInterrupt={onInterrupt}
          onTapAvatar={onTapAvatar}
        />

        {isImmersive ? (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-[#081226]/85 border border-sky-400/20 text-[11px] text-slate-200 flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-xs">
              {contextLost
                ? '3D display paused (using 2D portrait)'
                : errorReason || 'Using 2D portrait fallback'}
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="text-sky-300 hover:text-white font-medium underline cursor-pointer whitespace-nowrap"
              title={errorReason}
            >
              Retry 3D
            </button>
            {onOpenCustomize && (
              <>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="text-slate-300 hover:text-white underline cursor-pointer whitespace-nowrap"
                >
                  Customize
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-3 max-w-md px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-slate-900/90 border border-amber-300 dark:border-amber-500/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="flex-1 text-left">
              {errorReason} Using 2D portrait fallback.
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {onSelectPreviewEmotion && (
                <button
                  type="button"
                  onClick={() => setIsExpressionPanelOpen((v) => !v)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent text-slate-700 dark:text-slate-200 font-medium transition cursor-pointer"
                  title="Preview 16 expressions"
                >
                  <Smile className="w-3 h-3" />
                  Expressions
                </button>
              )}
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 dark:bg-amber-600/30 hover:bg-amber-500/35 dark:hover:bg-amber-600/50 text-amber-900 dark:text-amber-100 font-medium transition cursor-pointer"
                title="Retry loading 3D GLB model"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          </div>
        )}

        {isExpressionPanelOpen && onSelectPreviewEmotion && (
          <ExpressionPreviewDrawer
            activeEmotion={emotion}
            previewEmotion={previewEmotion}
            hasGlbLoaded={false}
            idleMovementEnabled={idleMovementEnabled}
            idleIntensity={idleIntensity}
            activeHeadPose={activeHeadPose}
            activeArmGesture={activeArmGesture}
            activeHandPose={activeHandPose}
            onToggleIdleMovement={handleToggleIdleMovement}
            onChangeIdleIntensity={handleChangeIdleIntensity}
            onTestHeadNod={handleTestHeadNod}
            onTestHeadPose={handleTestHeadPose}
            onTriggerArmGesture={handleTriggerArmGesture}
            onResetArmPose={handleResetArmPose}
            onResetFullPose={handleResetFullPose}
            onSelectHandPose={handleSelectHandPose}
            onSelect={onSelectPreviewEmotion}
            onClose={() => setIsExpressionPanelOpen(false)}
          />
        )}
      </div>
    );
  }

  const pauseContinuousLoop =
    isTabHidden ||
    (prefersReducedMotion &&
      state === 'idle' &&
      (!unifiedState || unifiedState === 'idle') &&
      !previewEmotion &&
      activeHeadPose === 'neutral' &&
      activeArmGesture === 'none');

  const stageContainerClasses = isImmersive
    ? 'relative w-full h-full min-h-[200px]'
    : 'relative w-56 h-56 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full overflow-hidden border border-white/15 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 shadow-2xl transition-shadow duration-300';

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${
        isImmersive ? 'w-full h-full min-h-0' : ''
      } ${className}`}
    >
      {/* Discreet Top-Right Stage Controls Toggle only when external More controls aren't mounted */}
      {isImmersive && !hideStageChrome && !hasExternalStageControls && assetStatus === 'ready' && (
        <div className="absolute top-1 right-1 z-30 flex flex-col items-end">
          <button
            type="button"
            onClick={() => setIsStageControlsOpen((v) => !v)}
            aria-expanded={isStageControlsOpen}
            aria-label="Toggle 3D camera and expression controls"
            title="Camera & Expressions"
            className={`h-8 px-2.5 rounded-xl border text-[11px] font-medium inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              isStageControlsOpen || isExpressionPanelOpen || previewEmotion
                ? 'bg-blue-600/95 border-sky-400/50 text-white'
                : 'bg-white/90 dark:bg-[#081226]/90 hover:bg-white dark:hover:bg-[#0e1c38] border-slate-200/80 dark:border-sky-400/20 text-slate-700 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View</span>
          </button>

          {isStageControlsOpen && (
            <div className="mt-1.5 p-2 rounded-2xl bg-white/95 dark:bg-[#081226]/96 border border-slate-200 dark:border-sky-400/25 shadow-2xl flex flex-col gap-1.5 min-w-[190px] animate-fadeIn">
              <div
                role="group"
                aria-label="Camera framing presets"
                className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-[#0d1930] p-0.5"
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
                      setCameraPreset(preset.id);
                      triggerResetCamera();
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      cameraPreset === preset.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCameraPreset('close-up');
                    triggerResetCamera();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-left text-[11px] font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-500 dark:text-sky-300" />
                  <span>Reset Camera</span>
                </button>

                {onSelectPreviewEmotion && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpressionPanelOpen((v) => !v);
                      setIsStageControlsOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-left text-[11px] font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 transition cursor-pointer"
                  >
                    <Smile className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300" />
                    <span>Expressions &amp; Rig</span>
                  </button>
                )}

                {(onResetPose || onTriggerGesture) && (
                  <button
                    type="button"
                    onClick={() => {
                      handleResetFullPose();
                      setIsStageControlsOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-left text-[11px] font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 transition cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
                    <span>Neutral Pose</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* 3D Stage Container */}
      <div
        className={`${stageContainerClasses} ${onTapAvatar ? 'cursor-pointer' : ''}`}
        onPointerDown={(e) => {
          pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (!onTapAvatar || !pointerDownPosRef.current) return;
          const dx = e.clientX - pointerDownPosRef.current.x;
          const dy = e.clientY - pointerDownPosRef.current.y;
          pointerDownPosRef.current = null;
          if (Math.hypot(dx, dy) < 6) {
            onTapAvatar();
          }
        }}
        style={
          isImmersive
            ? undefined
            : {
                boxShadow:
                  state === 'speaking'
                    ? `0 0 ${24 + audioLevel * 38}px rgba(168, 85, 247, ${0.45 + audioLevel * 0.35})`
                    : state === 'listening'
                    ? '0 0 32px rgba(6, 182, 212, 0.45)'
                    : state === 'thinking'
                    ? '0 0 28px rgba(245, 158, 11, 0.35)'
                    : '0 20px 50px rgba(0, 0, 0, 0.75)',
              }
        }
      >
        {assetStatus === 'checking' ? (
          <StageLoadingPlaceholder label="Loading 3D Companion..." sublabel="Checking avatar model" />
        ) : (
          <AvatarErrorBoundary
            onError={(msg) => {
              setAssetStatus('error');
              setErrorReason(msg);
            }}
          >
            <Suspense
              fallback={
                <StageLoadingPlaceholder label="Preparing 3D Scene..." sublabel="Setting up lighting & rig" />
              }
            >
              <Canvas
                frameloop={pauseContinuousLoop ? 'demand' : 'always'}
                dpr={isSoftwareGl ? 1 : [1, 2]}
                shadows={!isSoftwareGl}
                camera={{ fov: 28, near: 0.08, far: 40, position: [0, 0.722, 1.72] }}
                gl={{
                  alpha: isImmersive,
                  antialias: !isSoftwareGl,
                  powerPreference: 'high-performance',
                  toneMapping: THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 0.94,
                }}
                className="w-full h-full block"
              >
                <WebGLContextLifecycle
                  onContextLost={() => setContextLost(true)}
                  onContextRestored={() => setContextLost(false)}
                />
                <StudioEnvironment />
                <hemisphereLight args={['#dbeafe', '#141d38', 0.48]} />
                <directionalLight
                  position={[2.4, 2.4, 2.8]}
                  intensity={1.15}
                  color="#ffe9d2"
                  castShadow={!isSoftwareGl}
                  shadow-mapSize-width={1024}
                  shadow-mapSize-height={1024}
                  shadow-camera-near={0.5}
                  shadow-camera-far={12}
                  shadow-camera-left={-1.4}
                  shadow-camera-right={1.4}
                  shadow-camera-top={1.6}
                  shadow-camera-bottom={-1.6}
                  shadow-bias={-0.0004}
                  shadow-normalBias={0.02}
                />
                <directionalLight position={[-2.4, 1.7, 2.0]} intensity={0.46} color="#bae6fd" />
                <directionalLight position={[0, 2.2, -2.5]} intensity={0.95} color={rimLightColor} />

                <GlbModelScene
                  modelUrl={modelUrl}
                  state={state}
                  unifiedState={unifiedState}
                  emotion={effectiveEmotion}
                  emotionIntensity={emotionIntensity}
                  expressionsEnabled={expressionsEnabled}
                  audioLevel={audioLevel}
                  activeGesture={activeGesture}
                  gestureNonce={gestureNonce}
                  speechPlan={speechPlan}
                  headActionNonce={headActionNonce}
                  presentationMode={cameraPreset}
                  rigRuntimeRef={rigRuntimeRef}
                  prefersReducedMotion={prefersReducedMotion}
                  onInspected={handleInspected}
                  onPresetsReady={handlePresetsReady}
                  onArmGestureStateChange={handleArmGestureStateChange}
                />
                <CameraRig
                  bounds={cameraPresetsMap[cameraPreset]}
                  presetKey={cameraPreset}
                  resetTrigger={resetCameraTrigger}
                  enableDamping={!isSoftwareGl}
                />
              </Canvas>
            </Suspense>
          </AvatarErrorBoundary>
        )}
      </div>

      {/* Viewer Controls below 3D Avatar (non-immersive / wardrobe preview mode) */}
      <div className={isImmersive ? 'relative' : 'mt-2 flex flex-col items-center gap-2'}>
        {!isImmersive && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {state === 'listening' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/85 border border-cyan-300 dark:border-cyan-500/50 text-cyan-800 dark:text-cyan-200 text-xs font-medium shadow-sm dark:shadow-lg">
                <Mic className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Listening to you...</span>
              </div>
            ) : state === 'thinking' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/85 border border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-200 text-xs font-medium shadow-sm dark:shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
                <span>Ātmiya is thinking...</span>
              </div>
            ) : state === 'speaking' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/85 border border-violet-300 dark:border-violet-500/50 text-violet-800 dark:text-violet-200 text-xs font-medium shadow-sm dark:shadow-lg">
                <Volume2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span>
                  {inspection?.capabilities.hasSpeechMorphs || inspection?.capabilities.hasJawBone
                    ? 'Ātmiya is speaking...'
                    : 'Speaking (audio active)...'}
                </span>
              </div>
            ) : state === 'interrupted' ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-200 text-xs font-medium">
                <span>Interrupted</span>
              </div>
            ) : state === 'error' ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-200 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Needs attention</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                <span>
                  {effectiveEmotion !== 'neutral'
                    ? `3D Avatar · ${AVATAR_EMOTION_LABELS[effectiveEmotion]}`
                    : '3D Avatar Ready'}
                </span>
              </div>
            )}

            {assetStatus === 'ready' && (
              <>
                <div
                  role="group"
                  aria-label="Camera framing presets"
                  className="inline-flex items-center rounded-xl bg-white/90 dark:bg-[#0b1528]/80 border border-slate-200/90 dark:border-slate-700/60 p-0.5 backdrop-blur-md shadow-xs"
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
                        setCameraPreset(preset.id);
                        triggerResetCamera();
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                        cameraPreset === preset.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={`Switch to ${preset.label} camera view`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCameraPreset('close-up');
                    triggerResetCamera();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border border-slate-200/90 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-[11px] font-medium backdrop-blur-md transition cursor-pointer shadow-xs"
                  title="Reset 3D camera to close-up portrait framing"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Camera</span>
                </button>

                {onSelectPreviewEmotion && (
                  <button
                    type="button"
                    onClick={() => setIsExpressionPanelOpen((v) => !v)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-medium backdrop-blur-md transition cursor-pointer shadow-xs ${
                      isExpressionPanelOpen || previewEmotion
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border-slate-200/90 dark:border-slate-700/60 text-slate-700 dark:text-slate-200'
                    }`}
                    title="Test 16 facial expressions & inspect GLB rig support"
                  >
                    <Smile className="w-3 h-3" />
                    <span>Expressions</span>
                  </button>
                )}

                {(onResetPose || onTriggerGesture) && (
                  <button
                    type="button"
                    onClick={handleResetFullPose}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-medium backdrop-blur-md transition cursor-pointer shadow-xs ${
                      activeGesture !== 'none' ||
                      previewEmotion ||
                      activeHeadPose !== 'neutral' ||
                      activeArmGesture !== 'none' ||
                      activeHandPose !== 'relaxed'
                        ? 'bg-amber-500/90 hover:bg-amber-500 border-amber-400 text-white'
                        : 'bg-white/90 dark:bg-[#0b1528]/80 hover:bg-white dark:hover:bg-[#11203b] border-slate-200/90 dark:border-slate-700/60 text-slate-700 dark:text-slate-200'
                    }`}
                    title="Return expression, head, arm, and body smoothly to neutral pose"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Neutral Pose</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {!isImmersive && state === 'speaking' && onInterrupt && (
          <button
            type="button"
            onClick={onInterrupt}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-600/85 hover:bg-rose-500 text-white shadow-lg border border-rose-400/30 transition cursor-pointer"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Interrupt</span>
          </button>
        )}

        {isExpressionPanelOpen && onSelectPreviewEmotion && (
          <div
            className={
              isImmersive
                ? 'fixed top-16 right-4 z-40 w-[min(23rem,calc(100vw-2rem))]'
                : 'w-full flex justify-center'
            }
          >
            <ExpressionPreviewDrawer
              activeEmotion={emotion}
              previewEmotion={previewEmotion}
              supportedExpressions={inspection?.supportedExpressions}
              hasGlbLoaded={assetStatus === 'ready' && Boolean(inspection)}
              verifiedSkeleton={inspection?.verifiedSkeleton}
              verifiedArmHand={inspection?.verifiedArmHand}
              verifiedFullBody={inspection?.verifiedFullBody}
              skeletonLimitations={inspection?.skeletonLimitations}
              idleMovementEnabled={idleMovementEnabled}
              idleIntensity={idleIntensity}
              activeHeadPose={activeHeadPose}
              activeArmGesture={activeArmGesture}
              activeHandPose={activeHandPose}
              onToggleIdleMovement={handleToggleIdleMovement}
              onChangeIdleIntensity={handleChangeIdleIntensity}
              onTestHeadNod={handleTestHeadNod}
              onTestHeadPose={handleTestHeadPose}
              onTriggerArmGesture={handleTriggerArmGesture}
              onResetArmPose={handleResetArmPose}
              onResetFullPose={handleResetFullPose}
              onSelectHandPose={handleSelectHandPose}
              onSelect={onSelectPreviewEmotion}
              onClose={() => setIsExpressionPanelOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
});

RealisticAvatar.displayName = 'RealisticAvatar';
