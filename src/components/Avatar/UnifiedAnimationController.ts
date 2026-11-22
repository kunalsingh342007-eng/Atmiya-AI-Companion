import {
  AvatarAnimationRequest,
  AvatarEmotion,
  AvatarState,
  CoreCompanionEmotion,
  UnifiedAnimationState,
} from '../../types/companion';
import {
  AvatarGesture,
  mapToCoreEmotion,
  normalizeAvatarEmotion,
} from './expressionRig';

export const UNIFIED_STATE_PRIORITY: Record<UnifiedAnimationState, number> = {
  idle: 0,
  happy: 1,
  concerned: 1,
  listening: 2,
  thinking: 3,
  speaking: 4,
  greeting: 5,
  goodbye: 5,
};

export interface UnifiedControllerSnapshot {
  unifiedState: UnifiedAnimationState;
  avatarState: AvatarState;
  emotion: AvatarEmotion;
  coreEmotion: CoreCompanionEmotion;
  emotionIntensity: number;
  activeGesture: AvatarGesture;
  gestureNonce: number;
  requestId: number;
  greetingPlayedThisSession: boolean;
  isDisposed: boolean;
}

export interface UnifiedTransitionInput extends AvatarAnimationRequest {
  force?: boolean;
  keepActiveSpeech?: boolean;
  source?: 'app-open' | 'conversation' | 'voice' | 'user-action' | 'system';
}

// Module-level StrictMode-safe session lock for the opening greeting
let sessionOpeningGreetingPlayed = false;

export function hasOpeningGreetingPlayedInSession(): boolean {
  return sessionOpeningGreetingPlayed;
}

export function resetOpeningGreetingSessionForTests(): void {
  sessionOpeningGreetingPlayed = false;
}

export function markOpeningGreetingPlayedInSession(): void {
  sessionOpeningGreetingPlayed = true;
}

export function mapUnifiedStateToAvatarState(
  unifiedState: UnifiedAnimationState
): AvatarState {
  switch (unifiedState) {
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    case 'idle':
    case 'greeting':
    case 'happy':
    case 'concerned':
    case 'goodbye':
    default:
      return 'idle';
  }
}

export function mapAvatarStateToUnifiedState(
  avatarState: AvatarState,
  emotion: AvatarEmotion = 'neutral'
): UnifiedAnimationState {
  switch (avatarState) {
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    default: {
      const core = mapToCoreEmotion(emotion);
      if (core === 'happy') return 'happy';
      if (core === 'concerned') return 'concerned';
      return 'idle';
    }
  }
}

/**
 * Pure, framework-agnostic Unified Animation Controller for Phase 5.
 * Coordinates body state, facial emotion, priority enforcement, obsolete request
 * cancellation, smooth auto-return to idle, and session-once opening greeting.
 */
export class UnifiedAnimationController {
  private snapshot: UnifiedControllerSnapshot = {
    unifiedState: 'idle',
    avatarState: 'idle',
    emotion: 'neutral',
    coreEmotion: 'neutral',
    emotionIntensity: 0.7,
    activeGesture: 'none',
    gestureNonce: 0,
    requestId: 0,
    greetingPlayedThisSession: sessionOpeningGreetingPlayed,
    isDisposed: false,
  };

  private autoReturnTimer: ReturnType<typeof setTimeout> | null = null;
  private gestureReturnTimer: ReturnType<typeof setTimeout> | null = null;
  private greetingPendingTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(snap: UnifiedControllerSnapshot) => void>();

  public getSnapshot(): UnifiedControllerSnapshot {
    return { ...this.snapshot };
  }

  public subscribe(listener: (snap: UnifiedControllerSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    if (this.snapshot.isDisposed) return;
    const copy = this.getSnapshot();
    this.listeners.forEach((fn) => fn(copy));
  }

  private clearAutoReturnTimer(): void {
    if (this.autoReturnTimer) {
      clearTimeout(this.autoReturnTimer);
      this.autoReturnTimer = null;
    }
  }

  private clearGestureReturnTimer(): void {
    if (this.gestureReturnTimer) {
      clearTimeout(this.gestureReturnTimer);
      this.gestureReturnTimer = null;
    }
  }

  private clearGreetingPendingTimer(): void {
    if (this.greetingPendingTimer) {
      clearTimeout(this.greetingPendingTimer);
      this.greetingPendingTimer = null;
    }
  }

  /**
   * Cancels any scheduled auto-return/gesture/greeting timers and advances the
   * requestId so obsolete async callbacks cannot overwrite newer state.
   */
  public cancelPendingRequests(): number {
    this.clearAutoReturnTimer();
    this.clearGestureReturnTimer();
    this.clearGreetingPendingTimer();
    this.snapshot.requestId += 1;
    return this.snapshot.requestId;
  }

  /**
   * Dispatches a unified animation/emotion/gesture request with priority checks
   * and automatic obsolete-request cancellation.
   */
  public dispatch(input: UnifiedTransitionInput): {
    accepted: boolean;
    requestId: number;
    snapshot: UnifiedControllerSnapshot;
  } {
    if (this.snapshot.isDisposed) {
      return { accepted: false, requestId: this.snapshot.requestId, snapshot: this.getSnapshot() };
    }

    const currentState = this.snapshot.unifiedState;
    let nextState: UnifiedAnimationState =
      input.animationState ??
      (input.keepActiveSpeech && currentState === 'speaking'
        ? 'speaking'
        : input.emotion
        ? mapAvatarStateToUnifiedState('idle', input.emotion)
        : currentState);

    if (input.keepActiveSpeech && currentState === 'speaking' && !input.animationState) {
      nextState = 'speaking';
    }

    const currentPriority = UNIFIED_STATE_PRIORITY[currentState];
    const nextPriority = UNIFIED_STATE_PRIORITY[nextState];

    // Enforce priority unless caller explicitly forces a transition (e.g. interrupt/end/reset)
    if (!input.force && nextState !== currentState && nextPriority < currentPriority) {
      // Never let low-priority mood/idle transitions interrupt active speaking/greeting/goodbye
      if (
        currentState === 'speaking' ||
        currentState === 'greeting' ||
        currentState === 'goodbye'
      ) {
        // If only emotion was meant to change while speaking, update facial expression cleanly
        if (input.emotion) {
          this.updateFacialEmotion(input.emotion, input.intensity);
        }
        return {
          accepted: false,
          requestId: this.snapshot.requestId,
          snapshot: this.getSnapshot(),
        };
      }
    }

    const nextEmotion =
      input.emotion !== undefined
        ? normalizeAvatarEmotion(input.emotion)
        : nextState === 'greeting' || nextState === 'happy' || nextState === 'goodbye'
        ? 'happy'
        : nextState === 'concerned'
        ? 'concerned'
        : nextState === 'thinking'
        ? 'thinking'
        : nextState === 'idle' || nextState === 'listening'
        ? 'neutral'
        : this.snapshot.emotion;

    const nextIntensity =
      typeof input.intensity === 'number' && !Number.isNaN(input.intensity)
        ? Math.max(0.2, Math.min(1, input.intensity))
        : this.snapshot.emotionIntensity;

    const gestureExplicitlyTriggered =
      input.gesture !== undefined && input.gesture !== 'none';
    const enteringGestureState =
      input.gesture === undefined &&
      (nextState === 'greeting' || nextState === 'goodbye') &&
      currentState !== nextState;

    const nextGesture: AvatarGesture =
      input.gesture !== undefined
        ? input.gesture
        : nextState === 'greeting' || nextState === 'goodbye'
        ? 'wave'
        : nextState === 'idle'
        ? 'none'
        : this.snapshot.activeGesture;

    const shouldStartNewGesture = gestureExplicitlyTriggered || enteringGestureState;
    let nextGestureNonce = this.snapshot.gestureNonce;
    if (shouldStartNewGesture && nextGesture !== 'none') {
      nextGestureNonce += 1;
    }

    const preserveExistingGestureTimer =
      !shouldStartNewGesture &&
      nextGesture !== 'none' &&
      this.gestureReturnTimer !== null;

    if (!preserveExistingGestureTimer) {
      this.clearGestureReturnTimer();
    }
    this.clearAutoReturnTimer();
    this.clearGreetingPendingTimer();
    this.snapshot.requestId += 1;
    const reqId = this.snapshot.requestId;

    this.snapshot = {
      ...this.snapshot,
      unifiedState: nextState,
      avatarState: mapUnifiedStateToAvatarState(nextState),
      emotion: nextEmotion,
      coreEmotion: mapToCoreEmotion(nextEmotion),
      emotionIntensity: nextIntensity,
      activeGesture: nextGesture,
      gestureNonce: nextGestureNonce,
      requestId: reqId,
    };

    if (shouldStartNewGesture && nextGesture !== 'none') {
      const gestureMs =
        input.durationMs ?? (nextGesture === 'wave' ? 2800 : 1500);
      this.gestureReturnTimer = setTimeout(() => {
        if (this.snapshot.isDisposed) return;
        this.snapshot = {
          ...this.snapshot,
          activeGesture: 'none',
        };
        this.gestureReturnTimer = null;
        this.emit();
      }, gestureMs);
    }

    // Transient non-looping body states auto-return cleanly to idle
    const isAutoReturningState =
      nextState === 'greeting' ||
      nextState === 'goodbye' ||
      nextState === 'happy' ||
      nextState === 'concerned';

    if (isAutoReturningState && typeof input.durationMs === 'number' && input.durationMs > 0) {
      this.autoReturnTimer = setTimeout(() => {
        if (this.snapshot.isDisposed || this.snapshot.requestId !== reqId) return;
        this.returnToIdle(reqId);
      }, input.durationMs);
    }

    this.emit();
    return {
      accepted: true,
      requestId: reqId,
      snapshot: this.getSnapshot(),
    };
  }

  /**
   * Updates ONLY the facial emotion channel (expression + intensity) without altering
   * body state, active speech/lip-sync, or blinking.
   */
  public updateFacialEmotion(emotion: unknown, intensity?: number): void {
    if (this.snapshot.isDisposed) return;
    const normalized = normalizeAvatarEmotion(emotion);
    const nextIntensity =
      typeof intensity === 'number' && !Number.isNaN(intensity)
        ? Math.max(0.2, Math.min(1, intensity))
        : this.snapshot.emotionIntensity;

    this.snapshot = {
      ...this.snapshot,
      emotion: normalized,
      coreEmotion: mapToCoreEmotion(normalized),
      emotionIntensity: nextIntensity,
    };
    this.emit();
  }

  /**
   * Returns cleanly to idle body state & neutral expression only if expectedRequestId matches
   * (or when forced), preventing stale callbacks from overriding a newer interaction.
   */
  public returnToIdle(expectedRequestId?: number): boolean {
    if (this.snapshot.isDisposed) return false;
    if (
      expectedRequestId !== undefined &&
      expectedRequestId !== this.snapshot.requestId
    ) {
      return false;
    }

    this.clearAutoReturnTimer();
    this.clearGestureReturnTimer();
    const nextReqId = this.snapshot.requestId + 1;
    this.snapshot = {
      ...this.snapshot,
      unifiedState: 'idle',
      avatarState: 'idle',
      emotion: 'neutral',
      coreEmotion: 'neutral',
      emotionIntensity: 0.7,
      activeGesture: 'none',
      requestId: nextReqId,
    };
    this.emit();
    return true;
  }

  /**
   * Triggers the automatic App-Open Greeting at most once per intended session.
   * Safe under React StrictMode double-mounts and rerenders because the greeting
   * executes inside a cancelable micro-delay and commits the session lock on fire.
   */
  public scheduleOpeningGreetingOnce(params: {
    delayMs?: number;
    durationMs?: number;
    canStart?: () => boolean;
    onTrigger: (requestId: number) => void;
  }): () => void {
    if (this.snapshot.isDisposed || sessionOpeningGreetingPlayed) {
      return () => {};
    }

    this.clearGreetingPendingTimer();
    const delayMs = params.delayMs ?? 60;
    const durationMs = params.durationMs ?? 3200;

    this.greetingPendingTimer = setTimeout(() => {
      this.greetingPendingTimer = null;
      if (this.snapshot.isDisposed || sessionOpeningGreetingPlayed) return;
      if (params.canStart && !params.canStart()) return;

      sessionOpeningGreetingPlayed = true;
      const res = this.dispatch({
        animationState: 'greeting',
        emotion: 'happy',
        gesture: 'wave',
        intensity: 0.85,
        durationMs,
        force: true,
        source: 'app-open',
      });
      this.snapshot = {
        ...this.snapshot,
        greetingPlayedThisSession: true,
      };
      this.emit();
      params.onTrigger(res.requestId);
    }, delayMs);

    return () => {
      this.clearGreetingPendingTimer();
    };
  }

  public dispose(): void {
    if (this.snapshot.isDisposed) return;
    this.clearAutoReturnTimer();
    this.clearGestureReturnTimer();
    this.clearGreetingPendingTimer();
    this.snapshot = {
      ...this.snapshot,
      unifiedState: 'idle',
      avatarState: 'idle',
      emotion: 'neutral',
      coreEmotion: 'neutral',
      activeGesture: 'none',
      isDisposed: true,
      requestId: this.snapshot.requestId + 1,
    };
    this.listeners.clear();
  }
}
