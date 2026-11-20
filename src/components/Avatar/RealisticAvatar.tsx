import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AvatarAppearanceConfig, AvatarState } from '../../types/companion';
import { CompanionAvatar, CompanionEmotion } from './CompanionAvatar';
import { AlertCircle, Loader2, Mic, RefreshCw, Sparkles, Volume2 } from 'lucide-react';

export interface GlbInspectionReport {
  modelUrl: string;
  meshes: string[];
  materials: string[];
  bones: string[];
  animations: { name: string; duration: number }[];
  morphTargets: string[];
  activeIdleClip: string | null;
  activeSpeechMorphs: string[];
  hasFacialControls: boolean;
  boundingSize: [number, number, number];
}

interface RealisticAvatarProps {
  state: AvatarState;
  emotion?: CompanionEmotion;
  audioLevel?: number;
  config?: AvatarAppearanceConfig;
  onInterrupt?: () => void;
  onTapAvatar?: () => void;
  onInspectionComplete?: (report: GlbInspectionReport) => void;
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

// ErrorBoundary to catch Three.js / GLTFLoader / WebGL errors cleanly
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

// Known speech-related morph target names checked ONLY against actual morphTargetDictionary keys
const CANDIDATE_SPEECH_MORPHS = [
  'jawOpen',
  'mouthOpen',
  'viseme_aa',
  'viseme_O',
  'viseme_E',
  'viseme_PP',
  'A',
  'O',
  'mouth_open',
  'JawOpen',
];

interface GlbModelSceneProps {
  modelUrl: string;
  state: AvatarState;
  audioLevel: number;
  prefersReducedMotion: boolean;
  onInspected: (report: GlbInspectionReport) => void;
  onFramingReady: (targetY: number, cameraZ: number, cameraY: number) => void;
}

const GlbModelScene: React.FC<GlbModelSceneProps> = ({
  modelUrl,
  state,
  audioLevel,
  prefersReducedMotion,
  onInspected,
  onFramingReady,
}) => {
  const gltf = useGLTF(modelUrl);
  const rootRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  const morphMeshesRef = useRef<{ mesh: THREE.Mesh; indices: number[] }[]>([]);
  const smoothedTiltX = useRef(0);
  const smoothedTiltZ = useRef(0);

  // Measure actual GLB bounding box, inspect bones/clips/morphs, and calibrate framing
  const modelMetrics = useMemo(() => {
    const sceneRoot = gltf.scene;
    sceneRoot.updateMatrixWorld(true);

    const meshes: string[] = [];
    const materialsSet = new Set<string>();
    const bonesSet = new Set<string>();
    const morphTargetsSet = new Set<string>();
    const detectedMorphMeshes: { mesh: THREE.Mesh; indices: number[] }[] = [];

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

        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          const keys = Object.keys(mesh.morphTargetDictionary);
          const matchedIndices: number[] = [];
          keys.forEach((k) => {
            morphTargetsSet.add(k);
            if (CANDIDATE_SPEECH_MORPHS.includes(k)) {
              const idx = mesh.morphTargetDictionary![k];
              if (typeof idx === 'number') matchedIndices.push(idx);
            }
          });
          if (matchedIndices.length > 0) {
            detectedMorphMeshes.push({ mesh, indices: matchedIndices });
          }
        }
      }
    });

    // Compute raw bounding box without assuming units or orientation
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

    // Offset so normalized model sits centered horizontally at x=0, z=0 and bottom at y=-1
    const offsetX = -rawCenter.x * normScale;
    const offsetY = -rawBox.min.y * normScale - normHeight / 2;
    const offsetZ = -rawCenter.z * normScale;

    // Frame portrait for video-call view:
    // Tall full-body humanoid -> frame upper chest & head; bust/head -> frame center
    const isFullBody = aspectRatio > 1.8;
    const targetY = isFullBody ? normHeight * 0.28 : 0.0;
    const cameraY = isFullBody ? normHeight * 0.30 : 0.05;
    const cameraZ = isFullBody ? 1.15 : 1.75;

    const clips = gltf.animations || [];
    const idleClip =
      clips.find((c) => /idle|breath|stand/i.test(c.name)) ||
      (clips.length > 0 ? clips[0] : null);

    const speechMorphNames = Array.from(morphTargetsSet).filter((k) =>
      CANDIDATE_SPEECH_MORPHS.includes(k)
    );

    const report: GlbInspectionReport = {
      modelUrl,
      meshes,
      materials: Array.from(materialsSet),
      bones: Array.from(bonesSet),
      animations: clips.map((c) => ({ name: c.name || 'UnnamedClip', duration: c.duration })),
      morphTargets: Array.from(morphTargetsSet),
      activeIdleClip: idleClip ? idleClip.name || 'Clip[0]' : null,
      activeSpeechMorphs: speechMorphNames,
      hasFacialControls: speechMorphNames.length > 0,
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
      detectedMorphMeshes,
      idleClip,
      report,
    };
  }, [gltf, modelUrl]);

  useEffect(() => {
    morphMeshesRef.current = modelMetrics.detectedMorphMeshes;
    onInspected(modelMetrics.report);
    onFramingReady(modelMetrics.targetY, modelMetrics.cameraZ, modelMetrics.cameraY);
  }, [modelMetrics, onInspected, onFramingReady]);

  // Setup AnimationMixer ONLY if actual clips exist in the GLB
  useEffect(() => {
    const sceneRoot = gltf.scene;
    if (!modelMetrics.idleClip) {
      mixerRef.current = null;
      idleActionRef.current = null;
      return;
    }

    const mixer = new THREE.AnimationMixer(sceneRoot);
    const action = mixer.clipAction(modelMetrics.idleClip);
    action.setEffectiveTimeScale(0.85);
    action.play();

    mixerRef.current = mixer;
    idleActionRef.current = action;

    return () => {
      action.stop();
      mixer.stopAllAction();
      mixer.uncacheRoot(sceneRoot);
      mixerRef.current = null;
      idleActionRef.current = null;
    };
  }, [gltf.scene, modelMetrics.idleClip]);

  // Immediately clear speaking morph targets when interrupted or leaving speaking state
  useEffect(() => {
    if (state !== 'speaking') {
      morphMeshesRef.current.forEach(({ mesh, indices }) => {
        if (!mesh.morphTargetInfluences) return;
        indices.forEach((idx) => {
          mesh.morphTargetInfluences![idx] = 0;
        });
      });
    }
  }, [state]);

  // Per-frame update: mixer + gentle damped posture + real morph targets (if GLB has them)
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);

    if (mixerRef.current && !prefersReducedMotion) {
      mixerRef.current.update(delta);
    }

    // Drive ONLY actually detected morph targets when speaking
    if (morphMeshesRef.current.length > 0) {
      const targetWeight = state === 'speaking' ? Math.min(0.85, audioLevel * 1.1) : 0;
      morphMeshesRef.current.forEach(({ mesh, indices }) => {
        if (!mesh.morphTargetInfluences) return;
        indices.forEach((idx) => {
          mesh.morphTargetInfluences![idx] = THREE.MathUtils.damp(
            mesh.morphTargetInfluences![idx] || 0,
            targetWeight,
            14,
            delta
          );
        });
      });
    }

    // Subtle damped posture feedback for listening/thinking/idle without shaking the face
    if (rootRef.current && !prefersReducedMotion) {
      const desiredTiltZ = state === 'listening' ? 0.03 : 0;
      const desiredTiltX = state === 'thinking' ? -0.035 : 0;
      smoothedTiltZ.current = THREE.MathUtils.damp(smoothedTiltZ.current, desiredTiltZ, 6, delta);
      smoothedTiltX.current = THREE.MathUtils.damp(smoothedTiltX.current, desiredTiltX, 6, delta);
      rootRef.current.rotation.z = smoothedTiltZ.current;
      rootRef.current.rotation.x = smoothedTiltX.current;
    }
  });

  // Dispose geometries/materials/textures cleanly on full unmount
  useEffect(() => {
    return () => {
      gltf.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m?.dispose());
        }
      });
    };
  }, [gltf.scene]);

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

const CameraRig: React.FC<{ targetY: number; cameraZ: number; cameraY: number }> = ({
  targetY,
  cameraZ,
  cameraY,
}) => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, cameraY, cameraZ);
    camera.lookAt(0, targetY, 0);
    camera.updateProjectionMatrix();
  }, [camera, targetY, cameraZ, cameraY]);

  return (
    <OrbitControls
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

export const RealisticAvatar: React.FC<RealisticAvatarProps> = ({
  state,
  emotion = 'neutral',
  audioLevel = 0,
  config,
  onInterrupt,
  onTapAvatar,
  onInspectionComplete,
  className = '',
}) => {
  const modelUrl = config?.glbModelPath || '/models/atmiya-avatar.glb';

  const [assetStatus, setAssetStatus] = useState<'checking' | 'ready' | 'missing' | 'error'>('checking');
  const [errorReason, setErrorReason] = useState<string>('');
  const [inspection, setInspection] = useState<GlbInspectionReport | null>(null);
  const [framing, setFraming] = useState({ targetY: 0.45, cameraZ: 1.25, cameraY: 0.48 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
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
            `3D model not found at ${modelUrl}. Place your GLB file at public${modelUrl} to enable the 3D avatar.`
          );
          return;
        }
        // Verify binary glTF magic header ("glTF") when partial/full bytes returned
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

  // Fallback to existing portrait avatar cleanly when GLB is missing or errors
  if (assetStatus === 'missing' || assetStatus === 'error') {
    return (
      <div className={`relative flex flex-col items-center ${className}`}>
        <CompanionAvatar
          state={state}
          emotion={emotion}
          audioLevel={audioLevel}
          config={config}
          onInterrupt={onInterrupt}
          onTapAvatar={onTapAvatar}
        />
        <div className="mt-3 max-w-md px-3.5 py-2 rounded-xl bg-slate-900/90 border border-amber-500/40 text-[11px] text-amber-200 flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="flex-1 text-left">
            {errorReason} Using 2D portrait fallback.
          </span>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-100 font-medium transition cursor-pointer shrink-0"
            title="Retry loading 3D GLB model"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Video-Call 3D Stage Container */}
      <div
        className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full overflow-hidden border border-white/15 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 shadow-2xl transition-shadow duration-300"
        style={{
          boxShadow:
            state === 'speaking'
              ? `0 0 ${24 + audioLevel * 38}px rgba(168, 85, 247, ${0.45 + audioLevel * 0.35})`
              : state === 'listening'
              ? '0 0 32px rgba(6, 182, 212, 0.45)'
              : state === 'thinking'
              ? '0 0 28px rgba(245, 158, 11, 0.35)'
              : '0 20px 50px rgba(0, 0, 0, 0.75)',
        }}
      >
        {assetStatus === 'checking' ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
            <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
            <span className="text-xs">Loading 3D Avatar...</span>
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
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                  <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
                  <span className="text-xs">Preparing 3D Scene...</span>
                </div>
              }
            >
              <Canvas
                dpr={isSoftwareGl ? 1 : [1, 2]}
                shadows={!isSoftwareGl}
                camera={{ fov: 35, near: 0.1, far: 50, position: [0, framing.cameraY, framing.cameraZ] }}
                gl={{
                  antialias: !isSoftwareGl,
                  powerPreference: 'high-performance',
                  toneMapping: THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 1.05,
                }}
                className="w-full h-full"
              >
                <StudioEnvironment />
                <hemisphereLight args={['#dbeafe', '#1e1b4b', 0.55]} />
                <directionalLight
                  position={[2.5, 3.5, 3]}
                  intensity={1.5}
                  color="#fff5eb"
                  castShadow={!isSoftwareGl}
                />
                <directionalLight position={[-2.5, 2, 2]} intensity={0.6} color="#93c5fd" />
                <directionalLight position={[0, 2.5, -2.5]} intensity={1.1} color={rimLightColor} />

                <GlbModelScene
                  modelUrl={modelUrl}
                  state={state}
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
                />
              </Canvas>
            </Suspense>
          </AvatarErrorBoundary>
        )}
      </div>

      {/* Status Pill below Avatar */}
      <div className="mt-4 flex flex-col items-center gap-1.5">
        {state === 'listening' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/85 border border-cyan-500/50 text-cyan-200 text-xs font-medium shadow-lg">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Listening to you (सुन रही हूँ)...</span>
          </div>
        ) : state === 'thinking' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/85 border border-amber-500/50 text-amber-200 text-xs font-medium shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Ātmiya is thinking (सोच रही हूँ)...</span>
          </div>
        ) : state === 'speaking' ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/85 border border-violet-500/50 text-violet-200 text-xs font-medium shadow-lg">
            <Volume2 className="w-3.5 h-3.5 text-violet-400" />
            <span>
              {inspection?.hasFacialControls
                ? 'Ātmiya is speaking...'
                : 'Speaking (audio active)...'}
            </span>
          </div>
        ) : state === 'interrupted' ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-medium">
            <span>Interrupted (रूक गई)</span>
          </div>
        ) : state === 'error' ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Needs attention</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>3D Avatar Ready</span>
          </div>
        )}
      </div>
    </div>
  );
};
