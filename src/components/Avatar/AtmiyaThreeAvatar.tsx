import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, useAvatar } from '@three-ws/avatar/react';
import {
  AvatarAppearanceConfig,
  AvatarEmotion,
  AvatarState,
} from '../../types/companion';
import { CompanionAvatar } from './CompanionAvatar';
import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Verified model identity resolved from the supplied three.ws agent page:
 * Agent URL: https://three.ws/agents/b11adbba-dea7-40ff-acc0-443d9bb961bb
 * Agent API: https://three.ws/api/agents/b11adbba-dea7-40ff-acc0-443d9bb961bb
 *   -> avatar_id: 7f2a722a-ce89-4f13-adba-443f9d962c47
 * Avatar API: https://three.ws/api/avatars/7f2a722a-ce89-4f13-adba-443f9d962c47
 *   -> model_url: https://three.ws/cdn/u/32cbe0d2-f178-4ef7-8d82-a29f6c6a18cb/wren-9c74a4/mwqqnhw6.glb
 */
export const THREE_WS_AGENT_ID = 'b11adbba-dea7-40ff-acc0-443d9bb961bb';
export const THREE_WS_AVATAR_ID = '7f2a722a-ce89-4f13-adba-443f9d962c47';
export const THREE_WS_MODEL_URL =
  'https://three.ws/cdn/u/32cbe0d2-f178-4ef7-8d82-a29f6c6a18cb/wren-9c74a4/mwqqnhw6.glb';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ThreeWsErrorBoundary extends Component<
  { children: React.ReactNode; onError: (msg: string) => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || '3D viewer crashed' };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error?.message || 'Failed to mount three.ws 3D viewer');
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export interface AtmiyaThreeAvatarProps {
  stageVariant?: 'circle' | 'immersive';
  state: AvatarState;
  emotion?: AvatarEmotion;
  emotionIntensity?: number;
  audioLevel?: number;
  config?: AvatarAppearanceConfig;
  onInterrupt?: () => void;
  onTapAvatar?: () => void;
  className?: string;
}

function hasWebGLSupport(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export const AtmiyaThreeAvatar: React.FC<AtmiyaThreeAvatarProps> = ({
  stageVariant = 'immersive',
  state,
  emotion = 'neutral',
  emotionIntensity = 0.7,
  audioLevel = 0,
  config,
  onInterrupt,
  onTapAvatar,
  className = '',
}) => {
  const directModelUrl = config?.threeWsModelUrl?.trim() || THREE_WS_MODEL_URL;
  const avatarIdToResolve = directModelUrl
    ? null
    : config?.threeWsAvatarId?.trim() || THREE_WS_AVATAR_ID;

  // Fallback resolution via documented useAvatar hook only if direct GLB URL is absent
  const {
    avatar: resolvedRecord,
    loading: resolvingRecord,
    error: resolveError,
  } = useAvatar<{ model_url?: string; url?: string }>(avatarIdToResolve, {
    apiOrigin: 'https://three.ws',
  });

  const modelUrl =
    directModelUrl || resolvedRecord?.model_url || resolvedRecord?.url || '';

  const [isLoaded, setIsLoaded] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const webglSupported = useMemo(() => hasWebGLSupport(), []);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  // Reset loaded state when modelUrl or retryKey changes
  useEffect(() => {
    setIsLoaded(false);
    setViewerError(null);
  }, [modelUrl, retryKey]);

  const handleLoad = useCallback(() => {
    if (!isMountedRef.current) return;
    setIsLoaded(true);
    setViewerError(null);
  }, []);

  const handleError = useCallback((detail: { url?: string; error?: Error }) => {
    if (!isMountedRef.current) return;
    setIsLoaded(false);
    setViewerError(detail?.error?.message || 'Unable to load 3D avatar model.');
  }, []);

  const handleRetry = () => {
    setViewerError(null);
    setIsLoaded(false);
    setRetryKey((k) => k + 1);
  };

  // Preserve drag-to-orbit on <three-ws-viewer> while allowing clean tap-to-greet
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onTapAvatar || !pointerDownPosRef.current) return;
    const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
    pointerDownPosRef.current = null;
    if (dx < 6 && dy < 6) {
      onTapAvatar();
    }
  };

  const isImmersive = stageVariant === 'immersive';
  const effectiveError = !webglSupported
    ? 'WebGL is unavailable in this browser.'
    : resolveError?.message || viewerError;

  // Fallback cleanly to the 2D CompanionAvatar if WebGL is unsupported or GLB fails
  if (effectiveError) {
    return (
      <div className={`relative flex flex-col items-center ${className}`}>
        <CompanionAvatar
          stageVariant={stageVariant}
          state={state}
          emotion={emotion}
          emotionIntensity={emotionIntensity}
          audioLevel={audioLevel}
          config={config}
          onInterrupt={onInterrupt}
          onTapAvatar={onTapAvatar}
        />
        <div className="mt-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-950/70 border border-slate-200 dark:border-white/15 backdrop-blur-md text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <span>2D Fallback ({effectiveError})</span>
          <button
            type="button"
            onClick={handleRetry}
            className="text-indigo-600 dark:text-amber-200 hover:text-indigo-800 dark:hover:text-white inline-flex items-center gap-1 underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry 3D</span>
          </button>
        </div>
      </div>
    );
  }

  // Subtle conversational state glow around the transparent 3D viewport
  const auraGlow = useMemo(() => {
    if (state === 'speaking') {
      const intensity = Math.min(0.55, 0.25 + audioLevel * 0.35);
      return `radial-gradient(circle at 50% 45%, rgba(139, 92, 246, ${intensity}), transparent 66%)`;
    }
    if (state === 'listening') {
      return 'radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.28), transparent 66%)';
    }
    if (state === 'thinking') {
      return 'radial-gradient(circle at 50% 45%, rgba(251, 191, 36, 0.24), transparent 66%)';
    }
    return 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.14), transparent 68%)';
  }, [state, audioLevel]);

  const containerSize = isImmersive
    ? 'relative w-64 h-72 sm:w-80 sm:h-88 md:w-[24rem] md:h-[25rem]'
    : 'relative w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden border border-white/15';

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <div
        className={`${containerSize} flex items-center justify-center`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onKeyDown={(e) => {
          if (onTapAvatar && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onTapAvatar();
          }
        }}
        aria-label={`${config?.personaName || 'Ātmiya'} 3D visual companion`}
      >
        {/* Subtle State-Aware Ambient Glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300"
          style={{ background: auraGlow }}
        />

        {/* Loading Overlay while fetching metadata or downloading GLB */}
        {(resolvingRecord || !isLoaded) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Loader2
              className={`w-7 h-7 text-indigo-600 dark:text-amber-200 ${prefersReducedMotion ? '' : 'animate-spin'}`}
            />
            <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-950/75 border border-slate-200 dark:border-white/15 text-[11px] font-medium text-slate-800 dark:text-slate-100 backdrop-blur-md">
              Loading 3D Companion...
            </span>
          </div>
        )}

        {modelUrl && (
          <ThreeWsErrorBoundary
            key={retryKey}
            onError={(msg) => setViewerError(msg)}
          >
            <Avatar
              src={modelUrl}
              alt=""
              background="transparent"
              onLoad={handleLoad}
              onError={handleError}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '260px',
                background: 'transparent',
                display: 'block',
              }}
              className="w-full h-full"
            />
          </ThreeWsErrorBoundary>
        )}
      </div>

      {/* Grounded contact shadow in immersive mode */}
      {isImmersive && (
        <div
          aria-hidden="true"
          className="w-36 sm:w-48 h-3 rounded-full bg-slate-950/45 blur-md pointer-events-none -mt-2"
        />
      )}
    </div>
  );
};
