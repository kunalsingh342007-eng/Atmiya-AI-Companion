export interface VadConfig {
  /** Sensitivity from 0.1 (strict, noisy rooms) to 1.0 (sensitive, quiet rooms). Default 0.6. */
  sensitivity: number;
  /** Minimum absolute RMS energy required to count as speech above noise floor. */
  minRmsThreshold: number;
  /** Initial silent calibration window in milliseconds to sample ambient noise floor. */
  calibrationMs: number;
  /** Minimum continuous speech duration in ms before confirming user started speaking (rejects clicks/coughs). */
  minSpeechMs: number;
  /** Silence duration in ms after confirmed speech before signaling end-of-turn. */
  silencePauseMs: number;
  /** Safety limit for a single continuous capture turn in ms. */
  maxTurnMs: number;
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  sensitivity: 0.6,
  minRmsThreshold: 0.015,
  calibrationMs: 320,
  minSpeechMs: 240,
  silencePauseMs: 950,
  maxTurnMs: 30000,
};

export interface VadFrameFeatures {
  rms: number;
  zcr: number;
}

export interface VadState {
  startedAtMs: number;
  noiseFloor: number;
  calibrationSamples: number;
  isSpeechCandidate: boolean;
  isSpeechConfirmed: boolean;
  speechCandidateStartedAtMs: number | null;
  speechConfirmedAtMs: number | null;
  lastVoiceDetectedAtMs: number | null;
  ended: boolean;
}

export type VadStepEvent = 'none' | 'speech-start' | 'speech-end' | 'max-duration';

export interface VadStepResult {
  event: VadStepEvent;
  isVoiced: boolean;
  normalizedLevel: number;
  threshold: number;
  speechDurationMs: number;
}

const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);

export function computeRmsAndZcr(samples: Float32Array): VadFrameFeatures {
  const len = samples.length;
  if (len === 0) return { rms: 0, zcr: 0 };

  let sumSq = 0;
  let crossings = 0;
  let prevSign = 0;

  for (let i = 0; i < len; i += 1) {
    const s = samples[i];
    sumSq += s * s;
    const sign = s > 0.002 ? 1 : s < -0.002 ? -1 : 0;
    if (sign !== 0) {
      if (prevSign !== 0 && sign !== prevSign) {
        crossings += 1;
      }
      prevSign = sign;
    }
  }

  return {
    rms: Math.sqrt(sumSq / len),
    zcr: crossings / len,
  };
}

export function resolveVadThreshold(noiseFloor: number, config: VadConfig): number {
  const sens = clamp(config.sensitivity, 0.1, 1.0);
  // Higher sensitivity -> lower multiplier above noise floor (from 3.6 down to 1.8)
  const multiplier = 3.6 - sens * 1.8;
  const floorScaled = noiseFloor * multiplier;
  const minThresh = config.minRmsThreshold * (1.25 - sens * 0.45);
  return Math.max(minThresh, floorScaled);
}

export function createVadState(nowMs: number, initialNoiseFloor = 0.008): VadState {
  return {
    startedAtMs: nowMs,
    noiseFloor: Math.max(0.002, initialNoiseFloor),
    calibrationSamples: 0,
    isSpeechCandidate: false,
    isSpeechConfirmed: false,
    speechCandidateStartedAtMs: null,
    speechConfirmedAtMs: null,
    lastVoiceDetectedAtMs: null,
    ended: false,
  };
}

export function stepVadState(
  state: VadState,
  features: VadFrameFeatures,
  nowMs: number,
  config: VadConfig = DEFAULT_VAD_CONFIG
): VadStepResult {
  if (state.ended) {
    return {
      event: 'none',
      isVoiced: false,
      normalizedLevel: 0,
      threshold: resolveVadThreshold(state.noiseFloor, config),
      speechDurationMs: 0,
    };
  }

  const elapsedSinceStart = Math.max(0, nowMs - state.startedAtMs);

  // Adaptive ambient noise calibration during initial quiet frames or sub-threshold idle frames
  const currentThreshold = resolveVadThreshold(state.noiseFloor, config);
  const isCalibrating = elapsedSinceStart < config.calibrationMs;

  if (isCalibrating) {
    state.calibrationSamples += 1;
    const weight = Math.min(0.25, 1 / state.calibrationSamples);
    // Avoid letting an immediate bump corrupt baseline completely
    const cappedRms = Math.min(features.rms, Math.max(0.04, state.noiseFloor * 4));
    state.noiseFloor = Math.max(0.002, state.noiseFloor * (1 - weight) + cappedRms * weight);
  } else if (!state.isSpeechCandidate && features.rms < currentThreshold * 0.85) {
    state.noiseFloor = Math.max(0.002, state.noiseFloor * 0.94 + features.rms * 0.06);
  }

  const threshold = resolveVadThreshold(state.noiseFloor, config);
  // Human speech spans voiced vowels + moderate fricatives; extreme static hiss (zcr > 0.48) is dampened
  const spectralSpeechOk = features.zcr <= 0.48 || features.rms > threshold * 1.45;
  const isFrameVoiced = features.rms >= threshold && spectralSpeechOk;

  const normalizedLevel = clamp(
    (features.rms - state.noiseFloor) / Math.max(0.04, threshold * 3.5 - state.noiseFloor),
    0,
    1
  );

  let event: VadStepEvent = 'none';

  if (elapsedSinceStart >= config.maxTurnMs) {
    state.ended = true;
    const dur =
      state.speechConfirmedAtMs !== null ? Math.max(0, nowMs - state.speechConfirmedAtMs) : 0;
    return {
      event: 'max-duration',
      isVoiced: false,
      normalizedLevel,
      threshold,
      speechDurationMs: dur,
    };
  }

  if (isFrameVoiced) {
    state.lastVoiceDetectedAtMs = nowMs;
    if (!state.isSpeechCandidate) {
      state.isSpeechCandidate = true;
      state.speechCandidateStartedAtMs = nowMs;
    }

    if (!state.isSpeechConfirmed && state.speechCandidateStartedAtMs !== null) {
      if (nowMs - state.speechCandidateStartedAtMs >= config.minSpeechMs) {
        state.isSpeechConfirmed = true;
        state.speechConfirmedAtMs = state.speechCandidateStartedAtMs;
        event = 'speech-start';
      }
    }
  } else if (state.isSpeechCandidate && state.lastVoiceDetectedAtMs !== null) {
    const silenceMs = Math.max(0, nowMs - state.lastVoiceDetectedAtMs);
    if (!state.isSpeechConfirmed) {
      // Transient click/cough below minSpeechMs — reset candidate cleanly without firing turn end
      if (silenceMs >= Math.min(220, config.silencePauseMs * 0.35)) {
        state.isSpeechCandidate = false;
        state.speechCandidateStartedAtMs = null;
        state.lastVoiceDetectedAtMs = null;
      }
    } else if (silenceMs >= config.silencePauseMs) {
      state.ended = true;
      const speechDurationMs =
        state.speechConfirmedAtMs !== null
          ? Math.max(0, state.lastVoiceDetectedAtMs - state.speechConfirmedAtMs)
          : 0;
      return {
        event: 'speech-end',
        isVoiced: false,
        normalizedLevel,
        threshold,
        speechDurationMs,
      };
    }
  }

  const speechDurationMs =
    state.isSpeechConfirmed && state.speechConfirmedAtMs !== null
      ? Math.max(0, nowMs - state.speechConfirmedAtMs)
      : 0;

  return {
    event,
    isVoiced: isFrameVoiced,
    normalizedLevel,
    threshold,
    speechDurationMs,
  };
}

export interface VoiceActivityDetectorCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: (speechDurationMs: number) => void;
  onMaxDuration?: (speechDurationMs: number) => void;
  onLevel?: (level: number, isVoiced: boolean) => void;
  onError?: (message: string) => void;
}

export class VoiceActivityDetector {
  private config: VadConfig;
  private stream: MediaStream | null = null;
  private ownsStream = true;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timeDomainBuf: Float32Array<ArrayBuffer> | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private state: VadState | null = null;
  private running = false;
  private aborted = false;

  constructor(config: Partial<VadConfig> = {}) {
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
  }

  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') &&
      Boolean(window.AudioContext || (window as any).webkitAudioContext)
    );
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public hasConfirmedSpeech(): boolean {
    return Boolean(this.state?.isSpeechConfirmed);
  }

  public async start(
    callbacks: VoiceActivityDetectorCallbacks,
    existingStream?: MediaStream
  ): Promise<boolean> {
    this.stop();
    this.aborted = false;

    if (!VoiceActivityDetector.isSupported()) {
      callbacks.onError?.('Microphone audio capture is not supported in this browser.');
      return false;
    }

    try {
      const stream =
        existingStream ??
        (await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }));

      if (this.aborted) {
        if (!existingStream) {
          stream.getTracks().forEach((t) => t.stop());
        }
        return false;
      }

      this.stream = stream;
      this.ownsStream = !existingStream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      this.audioCtx = ctx;

      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // Ignore resume blocks if already allowed by mic prompt
        }
      }

      if (this.aborted) {
        this.cleanupAudioGraph();
        return false;
      }

      const sourceNode = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.25;
      sourceNode.connect(analyser);

      this.sourceNode = sourceNode;
      this.analyser = analyser;
      this.timeDomainBuf = new Float32Array(analyser.fftSize);
      this.state = createVadState(this.now());
      this.running = true;

      this.timerId = setInterval(() => {
        if (!this.running || !this.analyser || !this.timeDomainBuf || !this.state) {
          return;
        }
        this.analyser.getFloatTimeDomainData(this.timeDomainBuf);
        const features = computeRmsAndZcr(this.timeDomainBuf);
        const res = stepVadState(this.state, features, this.now(), this.config);
        callbacks.onLevel?.(res.normalizedLevel, res.isVoiced);

        if (res.event === 'speech-start') {
          callbacks.onSpeechStart?.();
        } else if (res.event === 'speech-end') {
          const dur = res.speechDurationMs;
          this.stop();
          callbacks.onSpeechEnd?.(dur);
        } else if (res.event === 'max-duration') {
          const dur = res.speechDurationMs;
          this.stop();
          callbacks.onMaxDuration?.(dur);
        }
      }, 33);

      return true;
    } catch (err: any) {
      this.stop();
      const name = String(err?.name || '');
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        callbacks.onError?.('Microphone permission denied. Please allow microphone access.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        callbacks.onError?.('No microphone was found on this device.');
      } else {
        callbacks.onError?.(err?.message || 'Could not access microphone.');
      }
      return false;
    }
  }

  public stop(): void {
    this.aborted = true;
    this.running = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.cleanupAudioGraph();
    this.state = null;
  }

  private cleanupAudioGraph(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // ignore
      }
      this.analyser = null;
    }
    if (this.stream && this.ownsStream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
    }
    this.stream = null;
    this.timeDomainBuf = null;
    if (this.audioCtx) {
      const ctx = this.audioCtx;
      this.audioCtx = null;
      try {
        if (ctx.state !== 'closed') {
          void ctx.close();
        }
      } catch {
        // ignore
      }
    }
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}
