import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
} from '../../types/companion';
import { CompanionAvatar } from './CompanionAvatar';
import {
  clearAllRigMorphs,
  createRigRuntime,
  inspectGlbRig,
  RigCapabilities,
  updateExpressionRig,
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
  Volume2,
  X,
} from 'lucide-react';

export interface GlbInspectionReport {
  modelUrl: string;
  meshes: string[];
  materials: string[];
  bones: string[];
  animations: { name: string; duration: number }[];
  morphTargets: string[];
  activeIdleClip: string | null;
  activeSpeechMorphs: string[];
  activeBlinkMorphs: string[];
  hasFacialControls: boolean;
  capabilities: RigCapabilities;
  supportedExpressions: Record<AvatarEmotion, boolean>;
  boundingSize: [number, number, number];
}

interface RealisticAvatarProps {
  stageVariant?: 'circle' | 'immersive';
  state: AvatarState;
  emotion?: AvatarEmotion;
  emotionIntensity?: number;
  previewEmotion?: AvatarEmotion | null;
  onSelectPreviewEmotion?: (emotion: AvatarEmotion | null) => void;
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

interface GlbModelSceneProps {
  modelUrl: string;
  state: AvatarState;
  emotion: AvatarEmotion;
  emotionIntensity: number;
  audioLevel: number;
  prefersReducedMotion: boolean;
  onInspected: (report: GlbInspectionReport) => void;
  onFramingReady: (targetY: number, cameraZ: number, cameraY: number) => void;
}

const GlbModelScene: React.FC<GlbModelSceneProps> = ({
  modelUrl,
  state,
  emotion,
  emotionIntensity,
  audioLevel,
  prefersReducedMotion,
  onInspected,
  onFramingReady,
}) => {
  const gltf = useGLTF(modelUrl);
  const rootRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const rigRuntimeRef = useRef(createRigRuntime());

  // Measure actual GLB bounding box, inspect bones/clips/morphs, and calibrate framing
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

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat) {
            materialsSet.add(mat.name || mat.type);
            if ('envMapIntensity' in mat) {
              (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.75;
            }
          }
        });

        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh && (mesh as THREE.SkinnedMesh).skeleton) {
          (mesh as THREE.SkinnedMesh).skeleton.bones.forEach((b) => {
            if (b.name) bonesSet.add(b.name);
          });
        }
      }
    });

    const rig = inspectGlbRig(sceneRoot);

    // Compute raw bounding box without assuming units
    const rawBox = new THREE.Box3().setFromObject(sceneRoot);
    const rawSize = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize);
    rawBox.getCenter(rawCenter);

    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);
    const normScale = 2.0 / maxDim;
    const normHeight = rawSize.y * normScale;
    const normWidth = Math.max(rawSize.x, rawSize.z) * normScale;
    const aspectRatio = normHeight / Math.max(normWidth, 0.001);

    // Offset so normalized model sits centered horizontally at x=0, z=0
    const offsetX = -rawCenter.x * normScale;
    const offsetY = -rawBox.min.y * normScale - normHeight / 2;
    const offsetZ = -rawCenter.z * normScale;

    // Frame front-facing head-and-shoulders video-call composition
    const isFullBody = aspectRatio > 1.8;
    const targetY = isFullBody ? normHeight * 0.28 : 0.0;
    const cameraY = isFullBody ? normHeight * 0.30 : 0.05;
    const cameraZ = isFullBody ? 1.15 : 1.75;

    const clips = gltf.animations || [];
    const idleClip =
      clips.find((c) => /idle|breath|stand/i.test(c.name)) ||
      (clips.length > 0 ? clips[0] : null);

    const report: GlbInspectionReport = {
      modelUrl,
      meshes,
      materials: Array.from(materialsSet),
      bones: Array.from(bonesSet),
      animations: clips.map((c) => ({ name: c.name || 'UnnamedClip', duration: c.duration })),
      morphTargets: Array.from(rig.availableMorphKeys),
      activeIdleClip: idleClip ? idleClip.name || 'Clip[0]' : null,
      activeSpeechMorphs: rig.activeSpeechMorphs,
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
      targetY,
      cameraY,
      cameraZ,
      rig,
      idleClip,
      report,
    };
  }, [gltf, modelUrl]);

  useEffect(() => {
    onInspected(modelMetrics.report);
    onFramingReady(modelMetrics.targetY, modelMetrics.cameraZ, modelMetrics.cameraY);
  }, [modelMetrics, onInspected, onFramingReady]);

  // Setup AnimationMixer ONLY if actual clips exist in the GLB
  useEffect(() => {
    const sceneRoot = gltf.scene;
    if (!modelMetrics.idleClip) {
      mixerRef.current = null;
      return;
    }

    const mixer = new THREE.AnimationMixer(sceneRoot);
    const action = mixer.clipAction(modelMetrics.idleClip);
    action.setEffectiveTimeScale(0.85);
    action.play();
    mixerRef.current = mixer;

    return () => {
      action.stop();
      mixer.stopAllAction();
      mixer.uncacheRoot(sceneRoot);
      mixerRef.current = null;
    };
  }, [gltf.scene, modelMetrics.idleClip]);

  // Immediately clear speaking mouth/jaw targets when interrupted or leaving speaking state
  useEffect(() => {
    if (state === 'interrupted' || state === 'error') {
      clearAllRigMorphs(modelMetrics.rig);
    }
  }, [state, modelMetrics.rig]);

  // Per-frame update: mixer + blinking + gaze + breathing + 16-expression morph/bone rig
  useFrame((frameState, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);

    if (mixerRef.current && !prefersReducedMotion) {
      mixerRef.current.update(delta);
    }

    updateExpressionRig({
      rig: modelMetrics.rig,
      runtime: rigRuntimeRef.current,
      rootGroup: rootRef.current,
      state,
      emotion,
      emotionIntensity,
      audioLevel,
      prefersReducedMotion,
      elapsed: frameState.clock.elapsedTime,
      delta,
    });
  });

  // Dispose geometries/materials cleanly and clear useGLTF cache so remounting reloads valid GPU buffers
  useEffect(() => {
    return () => {
      clearAllRigMorphs(modelMetrics.rig);
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
  }, [gltf.scene, modelUrl, modelMetrics.rig]);

  return (
    <group ref={rootRef}>
      <primitive
        object={gltf.scene}
        scale={modelMetrics.normScale}
        position={modelMetrics.offset}
      />
    </group>
  );
};

const CameraRig: React.FC<{
  targetY: number;
  cameraZ: number;
  cameraY: number;
  resetTrigger: number;
}> = ({ targetY, cameraZ, cameraY, resetTrigger }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    camera.position.set(0, cameraY, cameraZ);
    camera.lookAt(0, targetY, 0);
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(0, targetY, 0);
      controlsRef.current.update();
    }
  }, [camera, targetY, cameraZ, cameraY, resetTrigger]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, targetY, 0]}
      enablePan={false}
      enableZoom={true}
      minDistance={0.75}
      maxDistance={3.2}
      minPolarAngle={Math.PI * 0.3}
      maxPolarAngle={Math.PI * 0.65}
      minAzimuthAngle={-Math.PI * 0.25}
      maxAzimuthAngle={Math.PI * 0.25}
    />
  );
};

interface ExpressionPreviewDrawerProps {
  activeEmotion: AvatarEmotion;
  previewEmotion: AvatarEmotion | null;
  supportedExpressions?: Record<AvatarEmotion, boolean>;
  hasGlbLoaded: boolean;
  onSelect: (emotion: AvatarEmotion | null) => void;
  onClose: () => void;
}

const ExpressionPreviewDrawer: React.FC<ExpressionPreviewDrawerProps> = ({
  activeEmotion,
  previewEmotion,
  supportedExpressions,
  hasGlbLoaded,
  onSelect,
  onClose,
}) => (
  <div className="mt-3 w-full max-w-md rounded-2xl bg-slate-900/95 border border-slate-700/80 p-3 shadow-2xl backdrop-blur-md text-left">
    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-200">
        <Smile className="w-3.5 h-3.5 text-violet-400" />
        <span>Expression Preview (16 States)</span>
      </div>
      <div className="flex items-center gap-2">
        {previewEmotion && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            Auto
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
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
                ? 'border-violet-400 bg-violet-600/30 text-white font-semibold'
                : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
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
                  ? 'bg-emerald-400'
                  : 'bg-slate-600'
              }`}
            />
          </button>
        );
      })}
    </div>

    <p className="mt-2 text-[10px] text-slate-400 leading-snug">
      {hasGlbLoaded
        ? 'Green dot = morphs/bones detected on loaded GLB. Gray dot = requires additional blendshapes on the model.'
        : 'Amber dot = no 3D GLB model loaded at /models/atmiya-avatar.glb yet (preview applies 2D aura/posture fallback).'}
    </p>
  </div>
);

export const RealisticAvatar: React.FC<RealisticAvatarProps> = ({
  stageVariant = 'circle',
  state,
  emotion = 'neutral',
  emotionIntensity = 0.7,
  previewEmotion = null,
  onSelectPreviewEmotion,
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
  const [framing, setFraming] = useState({ targetY: 0.45, cameraZ: 1.25, cameraY: 0.48 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);
  const [isExpressionPanelOpen, setIsExpressionPanelOpen] = useState(false);
  const [contextLost, setContextLost] = useState(false);

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
        return '#a855f7';
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
            onSelect={onSelectPreviewEmotion}
            onClose={() => setIsExpressionPanelOpen(false)}
          />
        )}
      </div>
    );
  }

  const pauseContinuousLoop = isTabHidden || (prefersReducedMotion && state === 'idle' && !previewEmotion);

  const stageContainerClasses = isImmersive
    ? 'relative w-60 h-64 sm:w-80 sm:h-96 md:w-[26rem] md:h-[26rem]'
    : 'relative w-56 h-56 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full overflow-hidden border border-white/15 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 shadow-2xl transition-shadow duration-300';

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D Stage Container */}
      <div
        className={stageContainerClasses}
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
                camera={{ fov: 35, near: 0.1, far: 50, position: [0, framing.cameraY, framing.cameraZ] }}
                gl={{
                  alpha: isImmersive,
                  antialias: !isSoftwareGl,
                  powerPreference: 'high-performance',
                  toneMapping: THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 1.05,
                }}
                onCreated={({ gl }) => {
                  const canvasEl = gl.domElement;
                  canvasEl.addEventListener('webglcontextlost', (ev) => {
                    ev.preventDefault();
                    setContextLost(true);
                  });
                  canvasEl.addEventListener('webglcontextrestored', () => {
                    setContextLost(false);
                  });
                }}
                className="w-full h-full"
              >
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
                  emotion={effectiveEmotion}
                  emotionIntensity={emotionIntensity}
                  audioLevel={audioLevel}
                  prefersReducedMotion={prefersReducedMotion}
                  onInspected={(report) => {
                    setInspection(report);
                    onInspectionComplete?.(report);
                  }}
                  onFramingReady={(targetY, cameraZ, cameraY) =>
                    setFraming({ targetY, cameraZ, cameraY })
                  }
                />
                <CameraRig
                  targetY={framing.targetY}
                  cameraZ={framing.cameraZ}
                  cameraY={framing.cameraY}
                  resetTrigger={resetCameraTrigger}
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
              <button
                type="button"
                onClick={() => setResetCameraTrigger((n) => n + 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-white/15 text-slate-200 text-[11px] font-medium backdrop-blur-md transition cursor-pointer"
                title="Reset 3D camera to front-facing portrait"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Camera</span>
              </button>

              {onSelectPreviewEmotion && (
                <button
                  type="button"
                  onClick={() => setIsExpressionPanelOpen((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-medium backdrop-blur-md transition cursor-pointer ${
                    isExpressionPanelOpen || previewEmotion
                      ? 'bg-violet-600/40 border-violet-300/60 text-white'
                      : 'bg-slate-950/70 hover:bg-slate-900 border-white/15 text-slate-200'
                  }`}
                  title="Test 16 facial expressions & inspect GLB rig support"
                >
                  <Smile className="w-3 h-3" />
                  <span>Expressions</span>
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
            onSelect={onSelectPreviewEmotion}
            onClose={() => setIsExpressionPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
