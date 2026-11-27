import {
  AvatarAnimationRequest,
  AvatarEmotion,
  AvatarGestureHint,
  AvatarState,
  CoreCompanionEmotion,
  UnifiedAnimationState,
} from '../../types/companion';
import {
  ArmGestureName,
  AvatarGesture,
  mapToCoreEmotion,
  normalizeAvatarEmotion,
  normalizeAvatarGestureHint,
  normalizeEmotionIntensity,
} from './expressionRig';

export const UNIFIED_STATE_PRIORITY: Record<UnifiedAnimationState, number> = {
  idle: 0,
  happy: 1,
  concerned: 1,
  listening: 2,
  thinking: 3,
  preparing_audio: 4,
  gesturing: 4,
  speaking: 5,
  greeting: 6,
  goodbye: 6,
  interrupted: 7,
  error: 7,
};

export interface UnifiedControllerSnapshot {
  unifiedState: UnifiedAnimationState;
  avatarState: AvatarState;
  emotion: AvatarEmotion;
  coreEmotion: CoreCompanionEmotion;
  emotionIntensity: number;
  activeGesture: AvatarGesture;
  gestureHint: AvatarGestureHint;
  gestureNonce: number;
  requestId: number;
  speechSessionId: number;
  activeSpeechPlan: SpeechGesturePlan | null;
  greetingPlayedThisSession: boolean;
  isDisposed: boolean;
}

export interface UnifiedTransitionInput extends AvatarAnimationRequest {
  force?: boolean;
  keepActiveSpeech?: boolean;
  source?: 'app-open' | 'conversation' | 'voice' | 'user-action' | 'system';
}

export type SpeechUtteranceCategory =
  | 'greeting'
  | 'question'
  | 'confirmation'
  | 'explanation'
  | 'minimal';

export interface SpeechGestureCue {
  id: string;
  atSec: number;
  kind: 'arm' | 'nod' | 'tilt';
  armGesture?: 'conversational' | 'open-palm';
  side?: 'right' | 'left';
  headPose?: 'tilt-left' | 'tilt-right';
  intensity?: number;
  durationSec: number;
}

export interface SpeechGesturePlan {
  sessionId: number;
  requestId: number;
  category: SpeechUtteranceCategory;
  gestureHint: AvatarGestureHint;
  estimatedDurationSec: number;
  cues: SpeechGestureCue[];
}

const CONFIRMATION_RE =
  /^(yes|yeah|yep|sure|of course|certainly|definitely|absolutely|haan|haanji|bilkul|zaroor|theek hai|got it|understood|i agree|sounds good)\b/i;
const GREETING_RE =
  /^(hi|hello|hey|namaste|good morning|good afternoon|good evening|welcome back|goodbye|bye)\b/i;
const EXPLANATION_RE =
  /\b(because|first|second|here's|here is|step|means|explain|for example|let's|notice|remember|basically|actually|kyunki|samjho|chalo)\b/i;

export function classifySpeechUtterance(
  text: string,
  emotion: AvatarEmotion = 'neutral'
): SpeechUtteranceCategory {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'minimal';

  if (GREETING_RE.test(trimmed) && trimmed.length < 95 && !trimmed.includes('?')) {
    return 'greeting';
  }
  if (trimmed.includes('?') || emotion === 'curious' || emotion === 'confused') {
    return 'question';
  }
  if (CONFIRMATION_RE.test(trimmed) || emotion === 'empathetic' || emotion === 'encouraging') {
    return 'confirmation';
  }

  const sentenceCount = trimmed.split(/[.!?\n।]+/).filter((s) => s.trim().length > 0).length;
  if (trimmed.length >= 95 || sentenceCount >= 2 || EXPLANATION_RE.test(trimmed)) {
    return 'explanation';
  }

  return 'minimal';
}

export function planSpeechGestureCues(params: {
  text: string;
  emotion?: AvatarEmotion;
  gestureHint?: AvatarGestureHint;
  unifiedState?: UnifiedAnimationState;
  activeGesture?: AvatarGesture;
  speechRate?: number;
  sessionId: number;
  requestId: number;
}): SpeechGesturePlan {
  const {
    text,
    emotion = 'neutral',
    unifiedState,
    activeGesture = 'none',
    speechRate = 1.0,
    sessionId,
    requestId,
  } = params;

  const gestureHint = normalizeAvatarGestureHint(params.gestureHint);
  const trimmed = (text || '').trim();
  const clampedRate = Math.max(0.7, Math.min(1.4, speechRate || 1.0));
  const estimatedDurationSec = trimmed
    ? Math.max(1.2, trimmed.length / 13.5 / clampedRate)
    : 0;
  let category = classifySpeechUtterance(trimmed, emotion);
  const sentenceCount = trimmed.split(/[.!?\n।]+/).filter((s) => s.trim().length > 0).length;
  if (
    category === 'confirmation' &&
    (trimmed.length >= 110 || sentenceCount >= 2 || EXPLANATION_RE.test(trimmed))
  ) {
    category = 'explanation';
  }

  // Never inject conversational arm/head cues while greeting/goodbye or wave owns the body
  if (
    !trimmed ||
    unifiedState === 'greeting' ||
    unifiedState === 'goodbye' ||
    unifiedState === 'interrupted' ||
    unifiedState === 'error' ||
    activeGesture === 'wave'
  ) {
    return {
      sessionId,
      requestId,
      category,
      gestureHint,
      estimatedDurationSec,
      cues: [],
    };
  }

  const cues: SpeechGestureCue[] = [];

  if (category === 'minimal') {
    if (gestureHint === 'gentle_nod' || gestureHint === 'nod' || emotion === 'encouraging') {
      cues.push({
        id: `${sessionId}:nod-hint`,
        atSec: 0.14,
        kind: 'nod',
        intensity: gestureHint === 'gentle_nod' ? 0.48 : 0.56,
        durationSec: 0.72,
      });
    } else if (gestureHint === 'head_tilt') {
      cues.push({
        id: `${sessionId}:tilt-hint`,
        atSec: 0.16,
        kind: 'tilt',
        headPose: 'tilt-right',
        intensity: 0.46,
        durationSec: Math.min(1.6, Math.max(0.95, estimatedDurationSec * 0.6)),
      });
    } else if (gestureHint === 'open_palm' && estimatedDurationSec >= 1.7) {
      cues.push({
        id: `${sessionId}:arm-hint`,
        atSec: 0.22,
        kind: 'arm',
        armGesture: 'open-palm',
        side: 'right',
        durationSec: 1.75,
      });
    }
    return {
      sessionId,
      requestId,
      category,
      gestureHint,
      estimatedDurationSec,
      cues,
    };
  }

  if (category === 'greeting') {
    // Gentle non-intrusive acknowledgment nod when conversational reply opens with a short greeting
    cues.push({
      id: `${sessionId}:nod-greet`,
      atSec: 0.15,
      kind: 'nod',
      intensity: 0.52,
      durationSec: 0.72,
    });
    return {
      sessionId,
      requestId,
      category,
      gestureHint,
      estimatedDurationSec,
      cues,
    };
  }

  if (category === 'confirmation') {
    cues.push({
      id: `${sessionId}:nod-confirm`,
      atSec: 0.14,
      kind: 'nod',
      intensity: gestureHint === 'gentle_nod' ? 0.5 : 0.58,
      durationSec: 0.74,
    });
    if (
      gestureHint === 'open_palm' ||
      (trimmed.length >= 115 && estimatedDurationSec >= 3.8)
    ) {
      cues.push({
        id: `${sessionId}:arm-confirm`,
        atSec: 1.15,
        kind: 'arm',
        armGesture:
          gestureHint === 'open_palm' || emotion === 'encouraging' || emotion === 'empathetic'
            ? 'open-palm'
            : 'conversational',
        side: 'right',
        durationSec: 1.85,
      });
    }
    return {
      sessionId,
      requestId,
      category,
      gestureHint,
      estimatedDurationSec,
      cues,
    };
  }

  if (category === 'question') {
    const tiltDuration = Math.min(1.85, Math.max(1.1, estimatedDurationSec * 0.55));
    cues.push({
      id: `${sessionId}:tilt-question`,
      atSec: Math.min(0.4, estimatedDurationSec * 0.18),
      kind: 'tilt',
      headPose: emotion === 'confused' ? 'tilt-left' : 'tilt-right',
      intensity: 0.48,
      durationSec: tiltDuration,
    });
    if (
      (gestureHint === 'open_palm' && estimatedDurationSec >= 2.2) ||
      (trimmed.length >= 135 && estimatedDurationSec >= 4.5)
    ) {
      cues.push({
        id: `${sessionId}:arm-question`,
        atSec: Math.max(0.85, estimatedDurationSec * 0.32),
        kind: 'arm',
        armGesture: 'open-palm',
        side: 'right',
        durationSec: 1.9,
      });
    }
    return {
      sessionId,
      requestId,
      category,
      gestureHint,
      estimatedDurationSec,
      cues,
    };
  }

  // Explanation / longer thoughtful response: restrained, well-spaced gestures (min >= 3.5s apart)
  if (
    emotion === 'encouraging' ||
    gestureHint === 'gentle_nod' ||
    gestureHint === 'nod'
  ) {
    cues.push({
      id: `${sessionId}:nod-lead`,
      atSec: 0.16,
      kind: 'nod',
      intensity: 0.52,
      durationSec: 0.72,
    });
  } else if (gestureHint === 'head_tilt') {
    cues.push({
      id: `${sessionId}:tilt-lead`,
      atSec: 0.2,
      kind: 'tilt',
      headPose: 'tilt-right',
      intensity: 0.44,
      durationSec: 1.45,
    });
  }

  cues.push({
    id: `${sessionId}:arm-explain-1`,
    atSec: 0.45,
    kind: 'arm',
    armGesture:
      gestureHint === 'open_palm' || emotion === 'encouraging' ? 'open-palm' : 'conversational',
    side: 'right',
    durationSec: 1.85,
  });

  if (estimatedDurationSec >= 5.2) {
    cues.push({
      id: `${sessionId}:nod-boundary`,
      atSec: 2.65,
      kind: 'nod',
      intensity: 0.48,
      durationSec: 0.68,
    });
    cues.push({
      id: `${sessionId}:arm-explain-2`,
      atSec: 4.7,
      kind: 'arm',
      armGesture:
        emotion === 'happy' ||
        emotion === 'excited' ||
        emotion === 'empathetic' ||
        emotion === 'encouraging'
          ? 'open-palm'
          : 'conversational',
      side: 'left',
      durationSec: 1.9,
    });
  } else if (estimatedDurationSec >= 3.2 && !cues.some((c) => c.kind === 'nod')) {
    cues.push({
      id: `${sessionId}:nod-soft`,
      atSec: Math.max(1.9, estimatedDurationSec * 0.56),
      kind: 'nod',
      intensity: 0.45,
      durationSec: 0.68,
    });
  }

  if (estimatedDurationSec >= 9.6) {
    cues.push({
      id: `${sessionId}:arm-explain-3`,
      atSec: 8.9,
      kind: 'arm',
      armGesture: 'conversational',
      side: 'right',
      durationSec: 1.85,
    });
  }

  return {
    sessionId,
    requestId,
    category,
    gestureHint,
    estimatedDurationSec,
    cues,
  };
}

export interface SpeechGestureRunnerState {
  sessionId: number;
  elapsedSec: number;
  firedIds: Set<string>;
  lastArmCueAtSec: number;
  activeTiltUntilSec: number;
}

export function createSpeechGestureRunner(): SpeechGestureRunnerState {
  return {
    sessionId: 0,
    elapsedSec: 0,
    firedIds: new Set<string>(),
    lastArmCueAtSec: -10,
    activeTiltUntilSec: 0,
  };
}

export function resetSpeechGestureRunner(runner: SpeechGestureRunnerState): void {
  runner.sessionId = 0;
  runner.elapsedSec = 0;
  runner.firedIds.clear();
  runner.lastArmCueAtSec = -10;
  runner.activeTiltUntilSec = 0;
}

export function stepSpeechGesturePlan(params: {
  runner: SpeechGestureRunnerState;
  plan: SpeechGesturePlan | null | undefined;
  delta: number;
  isSpeaking: boolean;
  isVoiced: boolean;
  speechPausedSec: number;
  activeGesture: AvatarGesture;
  runtimeArmGesture: ArmGestureName;
  prefersReducedMotion: boolean;
}): { clearTilt: boolean; cue: SpeechGestureCue | null } {
  const {
    runner,
    plan,
    delta,
    isSpeaking,
    isVoiced,
    speechPausedSec,
    activeGesture,
    runtimeArmGesture,
    prefersReducedMotion,
  } = params;

  if (!plan || !isSpeaking || prefersReducedMotion) {
    const hadSession = runner.sessionId !== 0 || runner.activeTiltUntilSec > 0;
    if (hadSession) {
      resetSpeechGestureRunner(runner);
    }
    return { clearTilt: hadSession, cue: null };
  }

  let clearTilt = false;
  if (runner.sessionId !== plan.sessionId) {
    clearTilt = runner.activeTiltUntilSec > 0;
    runner.sessionId = plan.sessionId;
    runner.elapsedSec = 0;
    runner.firedIds.clear();
    runner.lastArmCueAtSec = -10;
    runner.activeTiltUntilSec = 0;
  }

  runner.elapsedSec += Math.max(0, delta);

  if (runner.activeTiltUntilSec > 0 && runner.elapsedSec >= runner.activeTiltUntilSec) {
    runner.activeTiltUntilSec = 0;
    clearTilt = true;
  }

  // Speaking gestures never interrupt an active greeting or manual wave
  if (activeGesture === 'wave' || runtimeArmGesture === 'wave') {
    return { clearTilt, cue: null };
  }

  // Pause gate: do not fire new gestures during audible speech pauses
  const inSpeechPause = speechPausedSec > 0.28 || (speechPausedSec > 0.14 && !isVoiced);

  for (let i = 0; i < plan.cues.length; i += 1) {
    const cue = plan.cues[i];
    if (runner.firedIds.has(cue.id)) continue;
    if (runner.elapsedSec < cue.atSec) continue;

    // Skip stale cues that expired during a long pause so they don't burst together on resume
    if (runner.elapsedSec - cue.atSec > 1.6) {
      runner.firedIds.add(cue.id);
      continue;
    }

    if (inSpeechPause) {
      break;
    }

    if (cue.kind === 'arm') {
      if (runtimeArmGesture !== 'none' || runner.elapsedSec - runner.lastArmCueAtSec < 3.5) {
        continue;
      }
      runner.firedIds.add(cue.id);
      runner.lastArmCueAtSec = runner.elapsedSec;
      return { clearTilt, cue };
    }

    if (cue.kind === 'nod') {
      runner.firedIds.add(cue.id);
      return { clearTilt, cue };
    }

    if (cue.kind === 'tilt') {
      runner.firedIds.add(cue.id);
      runner.activeTiltUntilSec = runner.elapsedSec + cue.durationSec;
      return { clearTilt: false, cue };
    }
  }

  return { clearTilt, cue: null };
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
    case 'preparing_audio':
      return 'preparing_audio';
    case 'speaking':
      return 'speaking';
    case 'interrupted':
      return 'interrupted';
    case 'error':
      return 'error';
    case 'idle':
    case 'greeting':
    case 'gesturing':
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
    case 'preparing_audio':
      return 'preparing_audio';
    case 'speaking':
      return 'speaking';
    case 'interrupted':
      return 'interrupted';
    case 'error':
      return 'error';
    default: {
      const core = mapToCoreEmotion(emotion);
      if (core === 'happy') return 'happy';
      if (core === 'concerned') return 'concerned';
      return 'idle';
    }
  }
}

/**
 * Pure, framework-agnostic Unified Animation Controller for Milestone 3.
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
    gestureHint: 'none',
    gestureNonce: 0,
    requestId: 0,
    speechSessionId: 0,
    activeSpeechPlan: null,
    greetingPlayedThisSession: sessionOpeningGreetingPlayed,
    isDisposed: false,
  };

  private autoReturnTimer: ReturnType<typeof setTimeout> | null = null;
  private gestureReturnTimer: ReturnType<typeof setTimeout> | null = null;
  private greetingPendingTimer: ReturnType<typeof setTimeout> | null = null;
  private greetingVoiceActive = false;
  private listeners = new Set<(snap: UnifiedControllerSnapshot) => void>();

  public getSnapshot(): UnifiedControllerSnapshot {
    return {
      ...this.snapshot,
      activeSpeechPlan: this.snapshot.activeSpeechPlan
        ? {
            ...this.snapshot.activeSpeechPlan,
            cues: this.snapshot.activeSpeechPlan.cues.map((c) => ({ ...c })),
          }
        : null,
    };
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
    this.greetingVoiceActive = false;
    this.snapshot.requestId += 1;
    if (this.snapshot.activeSpeechPlan) {
      this.snapshot.speechSessionId += 1;
      this.snapshot.activeSpeechPlan = null;
    }
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
    const requestedGestureHint =
      input.gestureHint !== undefined
        ? normalizeAvatarGestureHint(input.gestureHint)
        : undefined;

    const derivedGestureFromHint: AvatarGesture | undefined =
      input.gesture !== undefined
        ? input.gesture
        : requestedGestureHint === 'wave'
        ? 'wave'
        : requestedGestureHint === 'gentle_nod' || requestedGestureHint === 'nod'
        ? 'nod'
        : undefined;

    let nextState: UnifiedAnimationState =
      input.animationState ??
      (input.keepActiveSpeech && currentState === 'speaking'
        ? 'speaking'
        : derivedGestureFromHint && derivedGestureFromHint !== 'none'
        ? 'gesturing'
        : input.emotion
        ? mapAvatarStateToUnifiedState('idle', input.emotion)
        : currentState);

    if (input.keepActiveSpeech && currentState === 'speaking' && !input.animationState) {
      nextState = 'speaking';
    }

    const currentPriority = UNIFIED_STATE_PRIORITY[currentState];
    const nextPriority = UNIFIED_STATE_PRIORITY[nextState];

    // App-open greeting voice must never interrupt or cut short an active opening wave
    if (
      input.source === 'app-open' &&
      input.animationState === 'speaking' &&
      (currentState === 'greeting' || this.snapshot.activeGesture === 'wave')
    ) {
      this.greetingVoiceActive = true;
      this.clearAutoReturnTimer();
      this.snapshot = {
        ...this.snapshot,
        avatarState: 'speaking',
        emotion: input.emotion !== undefined ? normalizeAvatarEmotion(input.emotion) : this.snapshot.emotion,
        coreEmotion:
          input.emotion !== undefined
            ? mapToCoreEmotion(normalizeAvatarEmotion(input.emotion))
            : this.snapshot.coreEmotion,
        emotionIntensity:
          input.intensity !== undefined
            ? normalizeEmotionIntensity(input.intensity, this.snapshot.emotionIntensity)
            : this.snapshot.emotionIntensity,
      };
      this.emit();
      return {
        accepted: true,
        requestId: this.snapshot.requestId,
        snapshot: this.getSnapshot(),
      };
    }

    // Enforce priority unless caller explicitly forces a transition (e.g. interrupt/end/reset)
    if (!input.force && nextState !== currentState && nextPriority < currentPriority) {
      // Never let low-priority mood/idle transitions interrupt active speaking/preparing/greeting/goodbye/interrupted/error
      if (
        currentState === 'preparing_audio' ||
        currentState === 'speaking' ||
        currentState === 'greeting' ||
        currentState === 'goodbye' ||
        currentState === 'interrupted' ||
        currentState === 'error'
      ) {
        // If only emotion was meant to change while speaking, update facial expression cleanly
        if (input.emotion && (currentState === 'speaking' || currentState === 'preparing_audio')) {
          this.updateFacialEmotion(input.emotion, input.intensity);
        }
        return {
          accepted: false,
          requestId: this.snapshot.requestId,
          snapshot: this.getSnapshot(),
        };
      }
    }

    const isNeutralLockState =
      nextState === 'idle' ||
      nextState === 'listening' ||
      nextState === 'interrupted' ||
      nextState === 'error';

    const nextEmotion =
      isNeutralLockState && (nextState === 'interrupted' || nextState === 'error')
        ? 'neutral'
        : input.emotion !== undefined
        ? normalizeAvatarEmotion(input.emotion)
        : nextState === 'greeting' || nextState === 'happy' || nextState === 'goodbye'
        ? 'happy'
        : nextState === 'concerned'
        ? 'concerned'
        : nextState === 'thinking'
        ? 'thinking'
        : isNeutralLockState
        ? 'neutral'
        : this.snapshot.emotion;

    const nextIntensity =
      input.intensity !== undefined
        ? normalizeEmotionIntensity(input.intensity, this.snapshot.emotionIntensity)
        : this.snapshot.emotionIntensity;

    const nextGestureHint: AvatarGestureHint = isNeutralLockState
      ? 'none'
      : requestedGestureHint !== undefined
      ? requestedGestureHint
      : this.snapshot.gestureHint;

    const preserveWaveDuringSpeech =
      input.gesture === undefined &&
      nextState === 'speaking' &&
      this.snapshot.activeGesture === 'wave';

    const nextGesture: AvatarGesture = isNeutralLockState
      ? 'none'
      : input.gesture !== undefined
      ? input.gesture
      : nextState === 'greeting' || nextState === 'goodbye'
      ? 'wave'
      : preserveWaveDuringSpeech
      ? 'wave'
      : nextState !== 'speaking' && derivedGestureFromHint !== undefined
      ? derivedGestureFromHint
      : this.snapshot.activeGesture;

    const gestureExplicitlyTriggered =
      nextGesture !== 'none' &&
      (input.gesture !== undefined ||
        (nextState !== 'speaking' &&
          derivedGestureFromHint !== undefined &&
          derivedGestureFromHint !== 'none'));
    const enteringGestureState =
      input.gesture === undefined &&
      (nextState === 'greeting' || nextState === 'goodbye') &&
      currentState !== nextState;

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
    if (nextState === 'interrupted' || nextState === 'error' || nextState === 'idle') {
      this.greetingVoiceActive = false;
    }
    this.snapshot.requestId += 1;
    const reqId = this.snapshot.requestId;

    const shouldClearSpeechPlan =
      nextState === 'idle' ||
      nextState === 'listening' ||
      nextState === 'thinking' ||
      nextState === 'preparing_audio' ||
      nextState === 'interrupted' ||
      nextState === 'error';
    const nextSpeechSessionId = shouldClearSpeechPlan
      ? this.snapshot.speechSessionId + 1
      : this.snapshot.speechSessionId;
    const nextSpeechPlan = shouldClearSpeechPlan ? null : this.snapshot.activeSpeechPlan;

    this.snapshot = {
      ...this.snapshot,
      unifiedState: nextState,
      avatarState: mapUnifiedStateToAvatarState(nextState),
      emotion: nextEmotion,
      coreEmotion: mapToCoreEmotion(nextEmotion),
      emotionIntensity: nextIntensity,
      activeGesture: nextGesture,
      gestureHint: nextGestureHint,
      gestureNonce: nextGestureNonce,
      requestId: reqId,
      speechSessionId: nextSpeechSessionId,
      activeSpeechPlan: nextSpeechPlan,
    };

    if (shouldStartNewGesture && nextGesture !== 'none') {
      const gestureMs =
        input.durationMs ?? (nextGesture === 'wave' ? 2800 : 1500);
      this.gestureReturnTimer = setTimeout(() => {
        if (this.snapshot.isDisposed) return;
        this.gestureReturnTimer = null;
        this.snapshot = {
          ...this.snapshot,
          activeGesture: 'none',
        };
        this.emit();
        if (
          (this.snapshot.unifiedState === 'greeting' && !this.greetingVoiceActive && !this.autoReturnTimer) ||
          (this.snapshot.unifiedState === 'gesturing' && !this.autoReturnTimer)
        ) {
          this.returnToIdle(this.snapshot.requestId);
        }
      }, gestureMs);
    }

    // Transient non-looping body states auto-return cleanly to idle
    const isAutoReturningState =
      nextState === 'greeting' ||
      nextState === 'goodbye' ||
      nextState === 'gesturing' ||
      nextState === 'happy' ||
      nextState === 'concerned' ||
      nextState === 'interrupted';

    if (isAutoReturningState && typeof input.durationMs === 'number' && input.durationMs > 0) {
      this.autoReturnTimer = setTimeout(() => {
        if (this.snapshot.isDisposed || this.snapshot.requestId !== reqId) return;
        if (nextState === 'greeting' && this.greetingVoiceActive) return;
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
   * Transitions immediately into 'interrupted' (silencing speech & expressions) and
   * optionally auto-recovers back to 'idle' cleanly via controller-owned timer.
   */
  public interrupt(recoverAfterMs = 450): {
    accepted: boolean;
    requestId: number;
    snapshot: UnifiedControllerSnapshot;
  } {
    return this.dispatch({
      animationState: 'interrupted',
      emotion: 'neutral',
      gesture: 'none',
      gestureHint: 'none',
      durationMs: recoverAfterMs > 0 ? recoverAfterMs : undefined,
      force: true,
      source: 'user-action',
    });
  }

  /**
   * Transitions cleanly into 'error' state, clearing active speech and gesture state.
   */
  public setError(): {
    accepted: boolean;
    requestId: number;
    snapshot: UnifiedControllerSnapshot;
  } {
    return this.dispatch({
      animationState: 'error',
      emotion: 'neutral',
      gesture: 'none',
      gestureHint: 'none',
      force: true,
      source: 'system',
    });
  }

  /**
   * Updates ONLY the facial emotion channel (expression + intensity) without altering
   * body state, active speech/lip-sync, or blinking.
   */
  public updateFacialEmotion(emotion: unknown, intensity?: number): void {
    if (this.snapshot.isDisposed) return;
    const normalized = normalizeAvatarEmotion(emotion);
    const nextIntensity =
      intensity !== undefined
        ? normalizeEmotionIntensity(intensity, this.snapshot.emotionIntensity)
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
   * Starts a speech-synchronized gesture plan tied strictly to the active playback turn.
   */
  public beginSpeechSession(params: {
    text: string;
    emotion?: AvatarEmotion;
    gestureHint?: AvatarGestureHint;
    speechRate?: number;
    requestId?: number;
  }): SpeechGesturePlan {
    if (this.snapshot.isDisposed) {
      return {
        sessionId: this.snapshot.speechSessionId,
        requestId: this.snapshot.requestId,
        category: 'minimal',
        gestureHint: 'none',
        estimatedDurationSec: 0,
        cues: [],
      };
    }

    const nextSessionId = this.snapshot.speechSessionId + 1;
    const resolvedHint = normalizeAvatarGestureHint(
      params.gestureHint ?? this.snapshot.gestureHint
    );
    const plan = planSpeechGestureCues({
      text: params.text,
      emotion: params.emotion ?? this.snapshot.emotion,
      gestureHint: resolvedHint,
      unifiedState: this.snapshot.unifiedState,
      activeGesture: this.snapshot.activeGesture,
      speechRate: params.speechRate ?? 1.0,
      sessionId: nextSessionId,
      requestId: params.requestId ?? this.snapshot.requestId,
    });

    this.snapshot = {
      ...this.snapshot,
      gestureHint: resolvedHint,
      speechSessionId: nextSessionId,
      activeSpeechPlan: plan,
    };
    this.emit();
    return plan;
  }

  public endSpeechSession(expectedSessionId?: number): void {
    if (this.snapshot.isDisposed) return;
    if (
      expectedSessionId !== undefined &&
      expectedSessionId !== this.snapshot.speechSessionId
    ) {
      return;
    }
    if (!this.snapshot.activeSpeechPlan) return;
    this.snapshot = {
      ...this.snapshot,
      speechSessionId: this.snapshot.speechSessionId + 1,
      activeSpeechPlan: null,
    };
    this.emit();
  }

  /**
   * Finishes app-open greeting speech without clipping an ongoing opening wave.
   */
  public finishAppOpenSpeech(): void {
    if (this.snapshot.isDisposed) return;
    this.greetingVoiceActive = false;
    if (this.snapshot.unifiedState === 'greeting' && this.snapshot.activeGesture === 'wave' && this.gestureReturnTimer) {
      this.snapshot = {
        ...this.snapshot,
        avatarState: 'idle',
      };
      this.emit();
      return;
    }
    this.returnToIdle();
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
    this.greetingVoiceActive = false;
    const nextReqId = this.snapshot.requestId + 1;
    const nextSpeechSessionId = this.snapshot.activeSpeechPlan
      ? this.snapshot.speechSessionId + 1
      : this.snapshot.speechSessionId;

    this.snapshot = {
      ...this.snapshot,
      unifiedState: 'idle',
      avatarState: 'idle',
      emotion: 'neutral',
      coreEmotion: 'neutral',
      emotionIntensity: 0.7,
      activeGesture: 'none',
      gestureHint: 'none',
      requestId: nextReqId,
      speechSessionId: nextSpeechSessionId,
      activeSpeechPlan: null,
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
    this.greetingVoiceActive = false;
    this.snapshot = {
      ...this.snapshot,
      unifiedState: 'idle',
      avatarState: 'idle',
      emotion: 'neutral',
      coreEmotion: 'neutral',
      activeGesture: 'none',
      isDisposed: true,
      requestId: this.snapshot.requestId + 1,
      speechSessionId: this.snapshot.speechSessionId + 1,
      activeSpeechPlan: null,
    };
    this.listeners.clear();
  }
}
