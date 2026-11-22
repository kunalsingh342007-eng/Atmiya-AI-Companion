import React, { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  applyStaticRelaxedArmPose,
  ArmGestureName,
  AvatarGesture,
  BodyPresentationMode,
  cancelArmGesture,
  clearAllRigMorphs,
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
  AlertCircle,
  Loader2,
  Mic,
  PauseCircle,
  RefreshCw,
  RotateCcw,
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
  onSelectPreviewEmotion?: (emotion: AvatarEmotion | null) => void;
  onTriggerGesture?: (gesture: AvatarGesture) => void;
  onResetPose?: () => void;
  audioLevel?: number;
  config?: AvatarAppearanceConfig;
  onInterrupt?: () => void;
  onTapAvatar?: () => void;
  onInspectionComplete?: (report: GlbInspectionReport) => void;
  onOpenCustomize?: () => void;
  className?: string;
}

// Software WebGL detector so rendering cost adapts gracefully on CPU renderers
const detectSoftwareWebGL = (): boolean => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
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
    targetY: 0.763,
    cameraYOffset: 0.01,
    halfW: 0.24,
    halfH: 0.298,
    halfD: 0.18,
    fov: 32,
  },
  'upper-body': {
    targetY: 0.62,
    cameraYOffset: 0.02,
    halfW: 0.45,
    halfH: 0.45,
    halfD: 0.22,
    fov: 33,
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
  audioLevel: number;
  activeGesture: AvatarGesture;
  gestureNonce: number;
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
  audioLevel,
  activeGesture,
  gestureNonce,
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

  // Measure actual GLB bounding box, inspect bones/clips/morphs, and calibrate framing presets
  const modelMetrics = useMemo(() => {
    const sceneRoot = gltf.scene;
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
              (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.68;
            }
          }
        });
      }
    });

    const rig = inspectGlbRig(sceneRoot);

    // Compute raw bounding box over the actual skinned character geometry
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

    const portraitTopY = Math.max(hairTopY, headTopBoneY ?? hairTopY) + 0.06;
    const closeBottomY =
      spine2Y !== null
        ? spine2Y - 0.06
        : neckBoneY !== null
        ? neckBoneY - 0.19
        : headBoneY !== null
        ? headBoneY - 0.3
        : normHeight * 0.23;

    const upperTopY = Math.max(hairTopY, headTopBoneY ?? hairTopY) + 0.07;
    const upperBottomY = hipsY !== null ? hipsY - 0.04 : normHeight * 0.07;

    const fullHalfH = normHeight / 2;
    const relaxedFullHalfW =
      shoulderHalfW !== null
        ? Math.max(shoulderHalfW * 2.1, 0.48)
        : (rawSize.x * normScale) / 2;

    const presets: CameraPresetBoundsMap = {
      'close-up': {
        targetY: (portraitTopY + closeBottomY) / 2,
        cameraYOffset: 0.01,
        halfW: shoulderHalfW !== null ? Math.max(shoulderHalfW, 0.235) : 0.24,
        halfH: Math.max((portraitTopY - closeBottomY) / 2, 0.22),
        halfD: 0.18,
        fov: 32,
      },
      'upper-body': {
        targetY: (upperTopY + upperBottomY) / 2,
        cameraYOffset: 0.02,
        halfW: shoulderHalfW !== null ? Math.max(shoulderHalfW * 1.9, 0.44) : 0.45,
        halfH: Math.max((upperTopY - upperBottomY) / 2, 0.35),
        halfD: 0.22,
        fov: 33,
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

  useEffect(() => {
    applyStaticRelaxedArmPose(modelMetrics.rig);
    if (import.meta.env.DEV) {
      console.debug('[Ātmiya Rig Inspection]', {
        modelUrl: modelMetrics.report.modelUrl,
        clipsCount: modelMetrics.report.animations.length,
        hasGreetingClip: modelMetrics.report.hasGreetingClip,
        usingProceduralWaveFallback: modelMetrics.report.usingProceduralWaveFallback,
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

  // Immediately reset mouth/jaw targets on speech finish/cancel + single gentle nod on listening start
  useEffect(() => {
    const prevState = prevStateRef.current;
    prevStateRef.current = state;

    if (state === 'interrupted' || state === 'error') {
      resetSpeechMorphs(modelMetrics.rig);
    } else if (prevState === 'speaking' && state !== 'speaking' && prefersReducedMotion) {
      resetSpeechMorphs(modelMetrics.rig);
    }

    if (prevState !== 'listening' && state === 'listening' && !prefersReducedMotion) {
      triggerHeadNod(rigRuntimeRef.current, { intensity: 0.45, duration: 0.65 });
      invalidate();
    }
  }, [state, prefersReducedMotion, modelMetrics.rig, rigRuntimeRef, invalidate]);

  // Single coordinated per-frame loop: Phase 1 face + Phase 2 head/neck + Phase 3 arms/hands + Phase 4 torso/breathing/legs
  useFrame((frameState, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const elapsed = frameState.clock.elapsedTime;

    if (mixerRef.current && !prefersReducedMotion) {
      mixerRef.current.update(delta);
    }

    updateExpressionRig({
      rig: modelMetrics.rig,
      runtime: rigRuntimeRef.current,
      state,
      unifiedState,
      emotion,
      emotionIntensity,
      audioLevel,
      prefersReducedMotion,
      elapsed,
      delta,
    });

    const headStatus = updateHeadNeckRig({
      rig: modelMetrics.rig,
      runtime: rigRuntimeRef.current,
      state,
      unifiedState,
      prefersReducedMotion,
      elapsed,
      delta,
    });

    const armStatus = updateArmHandRig({
      rig: modelMetrics.rig,
      runtime: rigRuntimeRef.current,
      prefersReducedMotion,
      delta,
    });

    const bodyStatus = updateFullBodyAndLowerRig({
      rig: modelMetrics.rig,
      runtime: rigRuntimeRef.current,
      state,
      unifiedState,
      presentationMode,
      prefersReducedMotion,
      elapsed,
      delta,
    });

    if (armStatus.activeGesture !== lastReportedArmGestureRef.current) {
      lastReportedArmGestureRef.current = armStatus.activeGesture;
      onArmGestureStateChange?.(armStatus.activeGesture);
    }

    if (headStatus.isAnimating || armStatus.isAnimating || bodyStatus.isAnimating) {
      frameState.invalidate();
    }
  });

  // Dispose geometries/materials cleanly and restore bind pose + clear runtime/cache on unmount
  useEffect(() => {
    const runtime = rigRuntimeRef.current;
    return () => {
      resetAllAvatarPoses(runtime);
      runtime.armDeltaQuats.clear();
      runtime.bodyDeltaQuats.clear();
      runtime.hipsOffset.set(0, 0, 0);
      clearAllRigMorphs(modelMetrics.rig);
      restoreRigBindPose(modelMetrics.rig);
      gltf.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m?.dispose());
        }
      });
      useGLTF.clear(modelUrl);
    };
  }, [gltf.scene, modelUrl, modelMetrics.rig, rigRuntimeRef]);

  return (
    <primitive
      object={gltf.scene}
      scale={modelMetrics.normScale}
      position={modelMetrics.offset}
    />
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
  resetTrigger: number;
  enableDamping: boolean;
}> = React.memo(({ bounds, resetTrigger, enableDamping }) => {
  const { camera, size } = useThree();
  const controlsRef = useRef<any>(null);

  const framing = useMemo(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const tanHalfV = Math.tan(THREE.MathUtils.degToRad(bounds.fov / 2));
    const tanHalfH = tanHalfV * Math.max(aspect, 0.2);
    const padding = 1.08;

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
    if (persp.fov !== framing.fov) {
      persp.fov = framing.fov;
    }
    camera.position.set(0, framing.cameraY, framing.cameraZ);
    camera.lookAt(0, framing.targetY, 0);
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(0, framing.targetY, 0);
      controlsRef.current.update();
    }
  }, [camera, framing.targetY, framing.cameraY, framing.cameraZ, framing.fov, resetTrigger]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, framing.targetY, 0]}
      enableDamping={enableDamping}
      enablePan={false}
      enableZoom={true}
      minDistance={Math.max(0.48, framing.cameraZ * 0.4)}
      maxDistance={Math.max(5.5, framing.cameraZ * 2.4)}
      minPolarAngle={Math.PI * 0.28}
      maxPolarAngle={Math.PI * 0.68}
      minAzimuthAngle={-Math.PI * 0.35}
      maxAzimuthAngle={Math.PI * 0.35}
    />
  );
});

CameraRig.displayName = 'CameraRig';

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
  <div className="mt-3 w-full max-w-md max-h-[58vh] overflow-y-auto rounded-2xl bg-white/95 dark:bg-[#0b1528]/95 border border-slate-200 dark:border-slate-700/80 p-3 shadow-2xl backdrop-blur-md text-left">
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
  onSelectPreviewEmotion,
  onTriggerGesture,
  onResetPose,
  audioLevel = 0,
  config,
  onInterrupt,
  onTapAvatar,
  onInspectionComplete,
  onOpenCustomize,
  className = '',
}) => {
  const modelUrl = config?.glbModelPath || '/models/atmiya-avatar.glb';
  const isImmersive = stageVariant === 'immersive';

  const [assetStatus, setAssetStatus] = useState<'checking' | 'ready' | 'missing' | 'error'>('checking');
  const [errorReason, setErrorReason] = useState<string>('');
  const [inspection, setInspection] = useState<GlbInspectionReport | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('close-up');
  const [cameraPresetsMap, setCameraPresetsMap] = useState<CameraPresetBoundsMap>(DEFAULT_CAMERA_PRESETS);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);
  const [isExpressionPanelOpen, setIsExpressionPanelOpen] = useState(false);
  const [idleMovementEnabled, setIdleMovementEnabled] = useState(true);
  const [idleIntensity, setIdleIntensity] = useState<IdleMovementIntensity>('medium');
  const [activeHeadPose, setActiveHeadPose] = useState<HeadPoseTarget>('neutral');
  const [activeArmGesture, setActiveArmGesture] = useState<ArmGestureName>('none');
  const [activeHandPose, setActiveHandPose] = useState<HandPoseTarget>('relaxed');
  const [headActionNonce, setHeadActionNonce] = useState(0);
  const [contextLost, setContextLost] = useState(false);
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

  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const effectiveEmotion = previewEmotion ?? emotion;

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

  // Preflight check so missing /models/atmiya-avatar.glb (or SPA HTML fallback) fails cleanly & immediately
  useEffect(() => {
    let cancelled = false;
    setAssetStatus('checking');
    setErrorReason('');

    fetch(modelUrl, { method: 'GET', headers: { Range: 'bytes=0-3' } })
      .then(async (res) => {
        if (cancelled) return;
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || contentType.includes('text/html')) {
          setAssetStatus('missing');
          setErrorReason(
            `3D GLB not found at ${modelUrl}.`
          );
          return;
        }
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const header = new Uint8Array(buf.slice(0, 4));
        const magic = String.fromCharCode(...header);
        if (buf.byteLength >= 4 && magic !== 'glTF') {
          setAssetStatus('error');
          setErrorReason(`File at ${modelUrl} is not a valid binary .glb asset.`);
          return;
        }
        setAssetStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setAssetStatus('error');
        setErrorReason(err?.message || `Unable to fetch ${modelUrl}`);
      });

    return () => {
      cancelled = true;
    };
  }, [modelUrl, retryCounter]);

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
        return '#3b82f6';
      case 'error':
        return '#f43f5e';
      default:
        return config?.accentColor || '#3b82f6';
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
          <div className="mt-1.5 px-3 py-1 rounded-xl bg-slate-950/60 border border-white/10 backdrop-blur-md text-[11px] text-slate-200/90 flex items-center gap-2">
            <span>2D Portrait Fallback (No GLB)</span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleRetry}
              className="text-amber-200 hover:text-white underline cursor-pointer whitespace-nowrap"
              title={errorReason}
            >
              Retry GLB
            </button>
            {onOpenCustomize && (
              <>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="text-violet-200 hover:text-white underline cursor-pointer whitespace-nowrap"
                >
                  Details
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-3 max-w-md px-3.5 py-2 rounded-xl bg-slate-900/90 border border-amber-500/40 text-[11px] text-amber-200 flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="flex-1 text-left">
              {errorReason} Using 2D portrait fallback.
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {onSelectPreviewEmotion && (
                <button
                  type="button"
                  onClick={() => setIsExpressionPanelOpen((v) => !v)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
                  title="Preview 16 expressions"
                >
                  <Smile className="w-3 h-3" />
                  Expressions
                </button>
              )}
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-100 font-medium transition cursor-pointer"
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
    ? 'relative w-60 h-64 sm:w-80 sm:h-96 md:w-[26rem] md:h-[26rem]'
    : 'relative w-56 h-56 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full overflow-hidden border border-white/15 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 shadow-2xl transition-shadow duration-300';

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
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
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-100 gap-2">
            <Loader2 className="w-7 h-7 text-amber-200 animate-spin" />
            <span className="text-xs px-3 py-1 rounded-lg bg-slate-950/60 backdrop-blur-sm">
              Loading 3D Companion...
            </span>
          </div>
        ) : (
          <AvatarErrorBoundary
            onError={(msg) => {
              setAssetStatus('error');
              setErrorReason(msg);
            }}
          >
            <Suspense
              fallback={
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-100 gap-2">
                  <Loader2 className="w-7 h-7 text-amber-200 animate-spin" />
                  <span className="text-xs px-3 py-1 rounded-lg bg-slate-950/60 backdrop-blur-sm">
                    Preparing 3D Scene...
                  </span>
                </div>
              }
            >
              <Canvas
                frameloop={pauseContinuousLoop ? 'demand' : 'always'}
                dpr={isSoftwareGl ? 1 : [1, 2]}
                shadows={!isSoftwareGl}
                camera={{ fov: 32, near: 0.1, far: 50, position: [0, 0.773, 1.3] }}
                gl={{
                  alpha: isImmersive,
                  antialias: !isSoftwareGl,
                  powerPreference: 'high-performance',
                  toneMapping: THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 1.0,
                }}
                className="w-full h-full"
              >
                <WebGLContextLifecycle
                  onContextLost={() => setContextLost(true)}
                  onContextRestored={() => setContextLost(false)}
                />
                <StudioEnvironment />
                <hemisphereLight args={['#fef3c7', '#1e1b4b', 0.6]} />
                <directionalLight
                  position={[2.5, 3.5, 3]}
                  intensity={1.45}
                  color="#fff5eb"
                  castShadow={!isSoftwareGl}
                />
                <directionalLight position={[-2.5, 2, 2]} intensity={0.65} color="#bfdbfe" />
                <directionalLight position={[0, 2.5, -2.5]} intensity={1.0} color={rimLightColor} />

                <GlbModelScene
                  modelUrl={modelUrl}
                  state={state}
                  unifiedState={unifiedState}
                  emotion={effectiveEmotion}
                  emotionIntensity={emotionIntensity}
                  audioLevel={audioLevel}
                  activeGesture={activeGesture}
                  gestureNonce={gestureNonce}
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
                  resetTrigger={resetCameraTrigger}
                  enableDamping={!isSoftwareGl}
                />
              </Canvas>
            </Suspense>
          </AvatarErrorBoundary>
        )}
      </div>

      {/* Ground shadow in immersive mode */}
      {isImmersive && (
        <div
          aria-hidden="true"
          className="w-40 sm:w-52 h-3.5 rounded-full bg-slate-950/45 blur-md pointer-events-none"
        />
      )}

      {/* Viewer Controls below 3D Avatar */}
      <div className="mt-2 flex flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!isImmersive && (
            state === 'listening' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/85 border border-cyan-500/50 text-cyan-200 text-xs font-medium shadow-lg">
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span>Listening to you...</span>
              </div>
            ) : state === 'thinking' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/85 border border-amber-500/50 text-amber-200 text-xs font-medium shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Ātmiya is thinking...</span>
              </div>
            ) : state === 'speaking' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/85 border border-violet-500/50 text-violet-200 text-xs font-medium shadow-lg">
                <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                <span>
                  {inspection?.capabilities.hasSpeechMorphs || inspection?.capabilities.hasJawBone
                    ? 'Ātmiya is speaking...'
                    : 'Speaking (audio active)...'}
                </span>
              </div>
            ) : state === 'interrupted' ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-medium">
                <span>Interrupted</span>
              </div>
            ) : state === 'error' ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Needs attention</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium">
                <span>
                  {effectiveEmotion !== 'neutral'
                    ? `3D Avatar · ${AVATAR_EMOTION_LABELS[effectiveEmotion]}`
                    : '3D Avatar Ready'}
                </span>
              </div>
            )
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
                      setResetCameraTrigger((n) => n + 1);
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
                  setResetCameraTrigger((n) => n + 1);
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
        )}
      </div>
    </div>
  );
});

RealisticAvatar.displayName = 'RealisticAvatar';
