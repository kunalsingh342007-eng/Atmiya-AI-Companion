// Speech and Audio synthesis, recognition, VAD recording, and real-time lip-sync service
import {
  analyzeAudioBufferEnvelope,
  LipSyncEngine,
  LipSyncMorphWeights,
} from '../components/Avatar/lipSync';
import type {
  NormalizedSpeechSyncFrame,
  TimingProviderCapabilities,
} from '../components/Avatar/speechSyncAdapter';
import type { TtsStreamChunk } from './api';
import { DEFAULT_VAD_CONFIG, VoiceActivityDetector, type VadConfig } from './vad';

export type SpeechPlaybackOutcome =
  | 'played'
  | 'autoplay-blocked'
  | 'unsupported'
  | 'cancelled'
  | 'error';

export interface SpeechRecognitionHandlers {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export interface WavPlaybackMetadata {
  text?: string;
  lang?: string;
  rate?: number;
  onStart?: () => void;
}

export interface VadRecordingHandlers {
  onRecordingStart: () => void;
  onSpeechDetected?: () => void;
  onLevel?: (level: number, isVoiced: boolean) => void;
  onAudioCaptured: (audioBase64: string, mimeType: string, speechDurationMs: number) => void;
  onSilenceTimeout?: () => void;
  onError: (error: string) => void;
}

/**
 * Decodes little-endian signed 16-bit PCM bytes into normalized [-1, 1] Float32 samples,
 * carrying over any trailing odd byte cleanly across stream chunk boundaries.
 */
export function decodePcm16LeToFloat32(
  bytes: Uint8Array,
  carryByte: number | null = null
): { samples: Float32Array; nextCarryByte: number | null } {
  let merged = bytes;
  if (carryByte !== null) {
    merged = new Uint8Array(bytes.length + 1);
    merged[0] = carryByte;
    merged.set(bytes, 1);
  }

  const hasTrailingOdd = merged.length % 2 === 1;
  const evenByteLen = hasTrailingOdd ? merged.length - 1 : merged.length;
  const nextCarryByte = hasTrailingOdd ? merged[merged.length - 1] : null;
  const sampleCount = evenByteLen / 2;
  const samples = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const lo = merged[i * 2];
    const hi = merged[i * 2 + 1];
    let int16 = (hi << 8) | lo;
    if (int16 >= 0x8000) int16 -= 0x10000;
    samples[i] = int16 / 32768;
  }

  return { samples, nextCarryByte };
}

function resolveSpeechSynthesisLang(lang: string, text: string): 'hi-IN' | 'en-IN' {
  if (lang === 'hi' || lang === 'hi-IN') return 'hi-IN';
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
  return 'en-IN';
}

class SpeechService {
  private recognition: any = null;
  private activeVad: VoiceActivityDetector | null = null;
  private activeRecorder: MediaRecorder | null = null;
  private isListening = false;
  private audioContext: AudioContext | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private scheduledStreamNodes: AudioBufferSourceNode[] = [];
  private currentAudioElement: HTMLAudioElement | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private onAudioLevelCallback: ((level: number) => void) | null = null;
  private lastUiEmitMs = 0;
  private lastUiLevel = -1;
  private isSpeaking = false;
  private playbackToken = 0;
  private hasUserGesture = false;
  private gestureTrackerBound = false;
  private lastRecognitionStartMs = 0;
  private browserTtsSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  private browserTtsStartWatchdog: ReturnType<typeof setTimeout> | null = null;
  private lipSyncEngine = new LipSyncEngine();

  constructor() {
    this.bindUserGestureTracker();
  }

  private bindUserGestureTracker(): void {
    if (typeof window === 'undefined' || this.gestureTrackerBound) return;
    this.gestureTrackerBound = true;
    const markGesture = () => {
      this.hasUserGesture = true;
      window.removeEventListener('pointerdown', markGesture, true);
      window.removeEventListener('keydown', markGesture, true);
      window.removeEventListener('touchstart', markGesture, true);
    };
    window.addEventListener('pointerdown', markGesture, true);
    window.addEventListener('keydown', markGesture, true);
    window.addEventListener('touchstart', markGesture, true);
  }

  public canAutoPlaySpeech(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.hasUserGesture) return true;
    const nav = navigator as Navigator & {
      userActivation?: { hasBeenActive?: boolean; isActive?: boolean };
    };
    if (nav?.userActivation) {
      return Boolean(nav.userActivation.hasBeenActive || nav.userActivation.isActive);
    }
    return Boolean(this.audioContext && this.audioContext.state === 'running');
  }

  public onFirstUserInteraction(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    let triggered = false;
    const handle = () => {
      if (triggered) return;
      triggered = true;
      this.hasUserGesture = true;
      cleanup();
      callback();
    };
    const cleanup = () => {
      window.removeEventListener('pointerdown', handle, true);
      window.removeEventListener('keydown', handle, true);
      window.removeEventListener('touchstart', handle, true);
    };
    window.addEventListener('pointerdown', handle, { capture: true, passive: true });
    window.addEventListener('keydown', handle, { capture: true, passive: true });
    window.addEventListener('touchstart', handle, { capture: true, passive: true });
    return cleanup;
  }

  private async ensureAudioContextRunning(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      try {
        await Promise.race([
          this.audioContext.resume(),
          new Promise<void>((resolve) => setTimeout(resolve, 250)),
        ]);
      } catch {
        // Autoplay resume blocked without user gesture
      }
    }
    return this.audioContext;
  }

  /**
   * Direct high-frequency sampler for R3F `useFrame` (zero React re-renders).
   */
  public sampleLipSyncFrame(nowMs?: number): LipSyncMorphWeights {
    return this.lipSyncEngine.sampleFrame(nowMs);
  }

  public getNormalizedLipSyncFrame(nowMs?: number): NormalizedSpeechSyncFrame {
    return this.lipSyncEngine.getNormalizedSyncFrame(nowMs);
  }

  public getLipSyncCapabilities(): TimingProviderCapabilities {
    return this.lipSyncEngine.getTimingCapabilities();
  }

  /**
   * Check if browser speech recognition OR MediaRecorder + VAD capture is supported
   */
  public isRecognitionSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)
    );
  }

  public isVadCaptureSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof MediaRecorder !== 'undefined' &&
      VoiceActivityDetector.isSupported()
    );
  }

  public isAnyVoiceInputSupported(): boolean {
    return this.isRecognitionSupported() || this.isVadCaptureSupported();
  }

  /**
   * Start speech recognition for voice input
   */
  public startRecognition(
    langCode: 'hi-IN' | 'en-IN' | 'en-US' | 'auto',
    handlers: SpeechRecognitionHandlers
  ): boolean {
    if (!this.isRecognitionSupported()) {
      handlers.onError('Speech recognition is not supported in this browser.');
      return false;
    }

    const now = Date.now();
    if (this.isListening && now - this.lastRecognitionStartMs < 250) {
      return true;
    }

    try {
      this.stopRecognition();
      this.lastRecognitionStartMs = now;

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRec();
      this.recognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;

      let chosenLang = 'en-IN';
      if (langCode === 'hi-IN' || langCode === ('hi' as any)) {
        chosenLang = 'hi-IN';
      } else if (langCode === 'en-US') {
        chosenLang = 'en-US';
      } else {
        chosenLang = 'en-IN';
      }
      recognition.lang = chosenLang;

      recognition.onstart = () => {
        if (this.recognition !== recognition) return;
        this.isListening = true;
        handlers.onStart();
      };

      recognition.onresult = (event: any) => {
        if (this.recognition !== recognition) return;
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const piece = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalTranscript += piece;
          } else {
            interimTranscript += piece;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        if (combined) {
          handlers.onResult(combined, Boolean(finalTranscript && !interimTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        if (this.recognition !== recognition) return;
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          handlers.onError('Microphone permission denied. Please allow microphone access.');
        } else {
          handlers.onError(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (this.recognition !== recognition) return;
        this.isListening = false;
        this.recognition = null;
        handlers.onEnd();
      };

      recognition.start();
      return true;
    } catch (e: any) {
      this.isListening = false;
      this.recognition = null;
      handlers.onError(e.message || 'Could not start microphone');
      return false;
    }
  }

  public async startVadRecordedCapture(
    handlers: VadRecordingHandlers,
    vadConfig?: Partial<VadConfig>
  ): Promise<boolean> {
    if (!this.isVadCaptureSupported()) {
      handlers.onError('Microphone capture is not supported in this browser.');
      return false;
    }

    this.stopRecognition();

    const vad = new VoiceActivityDetector({
      ...DEFAULT_VAD_CONFIG,
      ...vadConfig,
    });
    this.activeVad = vad;

    const chunks: Blob[] = [];
    let recorder: MediaRecorder | null = null;
    let finalDurationMs = 0;
    let finalized = false;

    const cleanupLocal = () => {
      if (this.activeRecorder === recorder) {
        this.activeRecorder = null;
      }
      if (this.activeVad === vad) {
        this.activeVad = null;
      }
      this.isListening = false;
    };

    const started = await vad.start({
      onLevel: handlers.onLevel,
      onSpeechStart: handlers.onSpeechDetected,
      onSpeechEnd: (durMs) => {
        finalDurationMs = durMs;
        if (recorder && recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            cleanupLocal();
          }
        }
      },
      onMaxDuration: (durMs) => {
        finalDurationMs = durMs;
        if (recorder && recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            cleanupLocal();
          }
        }
      },
      onError: (msg) => {
        cleanupLocal();
        handlers.onError(msg);
      },
    });

    if (!started || this.activeVad !== vad) {
      cleanupLocal();
      return false;
    }

    const stream = vad.getStream();
    if (!stream) {
      cleanupLocal();
      handlers.onError('Microphone audio stream could not be opened.');
      return false;
    }

    try {
      const preferredMime =
        typeof MediaRecorder.isTypeSupported === 'function' &&
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder.isTypeSupported === 'function' &&
            MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
      this.activeRecorder = recorder;
      this.isListening = true;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        if (finalized) return;
        finalized = true;
        vad.stop();
        cleanupLocal();

        if (!vad.hasConfirmedSpeech() && finalDurationMs <= 0) {
          handlers.onSilenceTimeout?.();
          return;
        }

        const mimeType = recorder?.mimeType || preferredMime || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 256) {
          handlers.onSilenceTimeout?.();
          return;
        }

        try {
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          const chunkSize = 0x8000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
          }
          const base64 = btoa(binary);
          handlers.onAudioCaptured(base64, mimeType.split(';')[0] || 'audio/webm', finalDurationMs);
        } catch (err: any) {
          handlers.onError(err?.message || 'Failed to encode recorded audio.');
        }
      };

      recorder.onerror = () => {
        if (finalized) return;
        finalized = true;
        vad.stop();
        cleanupLocal();
        handlers.onError('Microphone recording failed unexpectedly.');
      };

      recorder.start(150);
      handlers.onRecordingStart();
      return true;
    } catch (err: any) {
      vad.stop();
      cleanupLocal();
      handlers.onError(err?.message || 'Could not start microphone recorder.');
      return false;
    }
  }

  public stopRecognition(): void {
    const rec = this.recognition;
    this.recognition = null;
    this.isListening = false;

    if (this.activeRecorder) {
      const r = this.activeRecorder;
      this.activeRecorder = null;
      r.ondataavailable = null;
      r.onstop = null;
      r.onerror = null;
      if (r.state !== 'inactive') {
        try {
          r.stop();
        } catch {
          // ignore
        }
      }
    }

    if (this.activeVad) {
      this.activeVad.stop();
      this.activeVad = null;
    }

    if (rec) {
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Set throttled UI callback for 2D aura / state indicators (0.0 to 1.0).
   * Note: 3D avatar lip-sync reads `sampleLipSyncFrame()` directly in `useFrame` at full framerate.
   */
  public setAudioLevelCallback(cb: ((level: number) => void) | null) {
    this.onAudioLevelCallback = cb;
  }

  /**
   * Play base64 WAV audio (from Gemini TTS) with live Web Audio AnalyserNode + envelope lookahead
   */
  public async playWavAudio(
    base64Wav: string,
    onEnd?: () => void,
    onError?: (err: any) => void,
    metadata?: WavPlaybackMetadata
  ): Promise<void> {
    this.stopSpeaking();
    const token = ++this.playbackToken;

    try {
      const ctx = await this.ensureAudioContextRunning();
      if (token !== this.playbackToken) return;

      if (ctx.state !== 'running') {
        throw new Error('AudioContext suspended (awaiting user gesture)');
      }

      if (!base64Wav || typeof base64Wav !== 'string') {
        throw new Error('Empty audio payload');
      }

      const binaryString = atob(base64Wav);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      if (token !== this.playbackToken) {
        return;
      }

      const envelope = analyzeAudioBufferEnvelope(audioBuffer);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.35;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -18;
      this.analyser = analyser;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      this.currentSourceNode = source;
      this.isSpeaking = true;

      const startCtxTime = ctx.currentTime;
      this.lipSyncEngine.startAudioAnalyserSession({
        token,
        ctx,
        analyser,
        startCtxTime,
        durationSec: audioBuffer.duration,
        envelope,
        text: metadata?.text,
        rate: metadata?.rate ?? 1.0,
      });

      source.onended = () => {
        try {
          source.disconnect();
        } catch {
          // ignore
        }
        if (token !== this.playbackToken) return;
        this.currentSourceNode = null;
        this.cleanupPlayback(token);
        onEnd?.();
      };

      source.start(0);
      metadata?.onStart?.();
      this.startUiAudioMeterLoop(token);
    } catch (err: any) {
      if (token !== this.playbackToken) return;
      console.error('Audio playback error:', err);
      this.cleanupPlayback(token);
      onError?.(err);
    }
  }

  /**
   * Play progressive 24kHz L16 raw PCM chunks emitted from /api/tts/stream with
   * gapless Web Audio scheduling, real-time FFT lip-sync, and immediate cancellation support.
   */
  public async playPcmStream(
    chunks: AsyncIterable<TtsStreamChunk>,
    onEnd?: () => void,
    onError?: (err: any) => void,
    metadata?: WavPlaybackMetadata & { onFirstChunk?: () => void }
  ): Promise<void> {
    this.stopSpeaking();
    const token = ++this.playbackToken;

    try {
      const ctx = await this.ensureAudioContextRunning();
      if (token !== this.playbackToken) return;

      if (ctx.state !== 'running') {
        throw new Error('AudioContext suspended (awaiting user gesture)');
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.35;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -18;
      this.analyser = analyser;
      analyser.connect(ctx.destination);

      let started = false;
      let startCtxTime = 0;
      let scheduleCursorCtxTime = 0;
      let totalScheduledDurationSec = 0;
      let carryByte: number | null = null;
      let lastNode: AudioBufferSourceNode | null = null;
      let streamFinished = false;

      const tryFinalize = () => {
        if (token !== this.playbackToken) return;
        if (streamFinished && this.scheduledStreamNodes.length === 0) {
          this.cleanupPlayback(token);
          onEnd?.();
        }
      };

      for await (const chunk of chunks) {
        if (token !== this.playbackToken) return;
        if (!chunk?.audioBase64) continue;

        const binaryString = atob(chunk.audioBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i += 1) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const { samples, nextCarryByte } = decodePcm16LeToFloat32(bytes, carryByte);
        carryByte = nextCarryByte;
        if (samples.length === 0) continue;

        const sampleRate = chunk.sampleRate || 24000;
        const audioBuffer = ctx.createBuffer(1, samples.length, sampleRate);
        audioBuffer.getChannelData(0).set(samples);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);

        if (!started) {
          started = true;
          this.isSpeaking = true;
          startCtxTime = ctx.currentTime + 0.04;
          scheduleCursorCtxTime = startCtxTime;
          metadata?.onFirstChunk?.();
          this.lipSyncEngine.startPcmStreamSession({
            token,
            ctx,
            analyser,
            startCtxTime,
            text: metadata?.text,
            rate: metadata?.rate ?? 1.0,
          });
          metadata?.onStart?.();
          this.startUiAudioMeterLoop(token);
        } else if (scheduleCursorCtxTime < ctx.currentTime) {
          scheduleCursorCtxTime = ctx.currentTime + 0.01;
        }

        const scheduledAt = scheduleCursorCtxTime;
        scheduleCursorCtxTime += audioBuffer.duration;
        totalScheduledDurationSec = Math.max(
          totalScheduledDurationSec + audioBuffer.duration,
          scheduleCursorCtxTime - startCtxTime
        );
        this.lipSyncEngine.updatePcmStreamDuration(token, totalScheduledDurationSec, false);

        this.scheduledStreamNodes.push(source);
        lastNode = source;

        source.onended = () => {
          try {
            source.disconnect();
          } catch {
            // ignore
          }
          const idx = this.scheduledStreamNodes.indexOf(source);
          if (idx !== -1) {
            this.scheduledStreamNodes.splice(idx, 1);
          }
          tryFinalize();
        };

        source.start(scheduledAt);
      }

      if (token !== this.playbackToken) return;

      if (!started || !lastNode) {
        throw new Error('Empty streaming TTS payload');
      }

      streamFinished = true;
      this.lipSyncEngine.updatePcmStreamDuration(token, totalScheduledDurationSec, true);
      tryFinalize();
    } catch (err: any) {
      if (token !== this.playbackToken) return;
      this.cleanupPlayback(token);
      onError?.(err);
    }
  }

  /**
   * Browser SpeechSynthesis fallback synchronized strictly to utterance lifecycle & boundary events
   */
  public speakWithBrowserTTS(
    text: string,
    lang: string,
    rate = 1.0,
    onEnd?: () => void,
    onStart?: () => void
  ): void {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) {
      onEnd?.();
      return;
    }

    this.stopSpeaking();
    const token = ++this.playbackToken;

    const normalizedLang = resolveSpeechSynthesisLang(lang, text);
    const clampedRate = Math.max(0.7, Math.min(1.4, rate));
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = normalizedLang;
    utterance.rate = clampedRate;

    const voices = window.speechSynthesis.getVoices();
    let matchedVoice = null;

    if (normalizedLang === 'hi-IN') {
      matchedVoice = voices.find((v) => v.lang.startsWith('hi'));
    }
    if (!matchedVoice) {
      matchedVoice = voices.find(
        (v) => v.lang.startsWith('en-IN') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')
      );
    }
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    this.isSpeaking = true;
    this.lipSyncEngine.startSpeechSynthesisSession({
      token,
      text,
      rate: clampedRate,
    });

    let startedNotified = false;
    const ensureStarted = () => {
      if (token !== this.playbackToken || startedNotified) return;
      startedNotified = true;
      if (this.browserTtsStartWatchdog) {
        clearTimeout(this.browserTtsStartWatchdog);
        this.browserTtsStartWatchdog = null;
      }
      this.lipSyncEngine.markSynthesisStarted(token);
      onStart?.();
      this.startUiAudioMeterLoop(token);
    };

    const finalize = () => {
      if (token !== this.playbackToken) return;
      this.cleanupPlayback(token);
      onEnd?.();
    };

    utterance.onstart = ensureStarted;
    utterance.onpause = () => {
      if (token !== this.playbackToken) return;
      this.lipSyncEngine.markSynthesisPaused(token);
    };
    utterance.onresume = () => {
      if (token !== this.playbackToken) return;
      this.lipSyncEngine.markSynthesisResumed(token);
    };
    utterance.onboundary = (ev: SpeechSynthesisEvent) => {
      if (token !== this.playbackToken) return;
      ensureStarted();
      if (typeof ev.charIndex === 'number') {
        this.lipSyncEngine.updateSynthesisBoundary(
          token,
          ev.charIndex,
          typeof ev.elapsedTime === 'number' ? ev.elapsedTime : undefined
        );
      }
    };
    utterance.onend = finalize;
    utterance.onerror = finalize;

    // Watchdog in case browser silently drops utterance without firing onstart/onend
    this.browserTtsStartWatchdog = setTimeout(() => {
      if (token !== this.playbackToken || startedNotified) return;
      const synth = window.speechSynthesis;
      if (!synth.speaking && !synth.pending) {
        finalize();
      } else {
        // Browser began audio silently without dispatching onstart
        ensureStarted();
      }
    }, 900);

    const estimatedMaxMs = Math.min(
      45000,
      Math.max(4000, Math.round((text.length * 75) / Math.max(0.7, clampedRate)) + 2500)
    );
    this.browserTtsSafetyTimer = setTimeout(() => {
      if (token !== this.playbackToken) return;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
      finalize();
    }, estimatedMaxMs);

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      finalize();
    }
  }

  /**
   * Speaks text while respecting browser autoplay security restrictions.
   */
  public speakWithAutoplaySupport(
    text: string,
    lang: string,
    rate = 1.0,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onBlocked?: () => void;
    }
  ): Promise<SpeechPlaybackOutcome> {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) {
      return Promise.resolve('unsupported');
    }

    if (!this.canAutoPlaySpeech()) {
      callbacks?.onBlocked?.();
      return Promise.resolve('autoplay-blocked');
    }

    this.stopSpeaking();
    const token = ++this.playbackToken;

    return new Promise((resolve) => {
      const normalizedLang = resolveSpeechSynthesisLang(lang, text);
      const clampedRate = Math.max(0.7, Math.min(1.4, rate));
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = normalizedLang;
      utterance.rate = clampedRate;

      const voices = window.speechSynthesis.getVoices();
      let matchedVoice =
        normalizedLang === 'hi-IN'
          ? voices.find((v) => v.lang.startsWith('hi'))
          : null;
      if (!matchedVoice) {
        matchedVoice = voices.find(
          (v) => v.lang.startsWith('en-IN') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')
        );
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      let settled = false;
      let startedNotified = false;

      const settle = (outcome: SpeechPlaybackOutcome) => {
        if (settled) return;
        settled = true;
        if (token === this.playbackToken) {
          this.cleanupPlayback(token);
        }
        if (outcome === 'autoplay-blocked') {
          callbacks?.onBlocked?.();
        } else if (outcome === 'played' || outcome === 'error') {
          callbacks?.onEnd?.();
        }
        resolve(outcome);
      };

      const ensureStarted = () => {
        if (settled || token !== this.playbackToken || startedNotified) return;
        startedNotified = true;
        if (this.browserTtsStartWatchdog) {
          clearTimeout(this.browserTtsStartWatchdog);
          this.browserTtsStartWatchdog = null;
        }
        this.lipSyncEngine.markSynthesisStarted(token);
        callbacks?.onStart?.();
        this.startUiAudioMeterLoop(token);
      };

      this.isSpeaking = true;
      this.lipSyncEngine.startSpeechSynthesisSession({
        token,
        text,
        rate: clampedRate,
      });

      utterance.onstart = ensureStarted;
      utterance.onpause = () => {
        if (token === this.playbackToken) {
          this.lipSyncEngine.markSynthesisPaused(token);
        }
      };
      utterance.onresume = () => {
        if (token === this.playbackToken) {
          this.lipSyncEngine.markSynthesisResumed(token);
        }
      };
      utterance.onboundary = (ev: SpeechSynthesisEvent) => {
        if (token !== this.playbackToken) return;
        ensureStarted();
        if (typeof ev.charIndex === 'number') {
          this.lipSyncEngine.updateSynthesisBoundary(
            token,
            ev.charIndex,
            typeof ev.elapsedTime === 'number' ? ev.elapsedTime : undefined
          );
        }
      };

      utterance.onend = () => {
        if (token !== this.playbackToken) {
          settle('cancelled');
          return;
        }
        settle('played');
      };

      utterance.onerror = (ev: SpeechSynthesisErrorEvent) => {
        if (token !== this.playbackToken) {
          settle('cancelled');
          return;
        }
        const errCode = (ev as any)?.error;
        if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
          settle('autoplay-blocked');
        } else if (errCode === 'interrupted' || errCode === 'canceled') {
          settle('cancelled');
        } else {
          settle('error');
        }
      };

      this.browserTtsStartWatchdog = setTimeout(() => {
        if (settled || token !== this.playbackToken || startedNotified) return;
        const synth = window.speechSynthesis;
        if (!synth.speaking && !synth.pending) {
          settle('played');
        } else {
          ensureStarted();
        }
      }, 900);

      const estimatedMaxMs = Math.min(
        45000,
        Math.max(4000, Math.round((text.length * 75) / Math.max(0.7, clampedRate)) + 2500)
      );
      this.browserTtsSafetyTimer = setTimeout(() => {
        if (token !== this.playbackToken) return;
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          try {
            window.speechSynthesis.cancel();
          } catch {
            // ignore
          }
        }
        settle('played');
      }, estimatedMaxMs);

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        settle('autoplay-blocked');
      }
    });
  }

  /**
   * Interrupt current speech immediately
   */
  public stopSpeaking(): void {
    const prevToken = this.playbackToken;
    this.playbackToken++;
    this.isSpeaking = false;

    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.onended = null;
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {
        // ignore
      }
      this.currentSourceNode = null;
    }

    if (this.scheduledStreamNodes.length > 0) {
      const nodes = this.scheduledStreamNodes.splice(0, this.scheduledStreamNodes.length);
      for (const node of nodes) {
        try {
          node.onended = null;
          node.stop();
          node.disconnect();
        } catch {
          // ignore
        }
      }
    }

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudioElement = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    this.cleanupPlayback(prevToken);
  }

  private cleanupPlayback(expectedToken?: number): void {
    this.isSpeaking = false;
    this.lipSyncEngine.stop(expectedToken);

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // ignore
      }
      this.analyser = null;
    }

    if (this.browserTtsStartWatchdog) {
      clearTimeout(this.browserTtsStartWatchdog);
      this.browserTtsStartWatchdog = null;
    }
    if (this.browserTtsSafetyTimer) {
      clearTimeout(this.browserTtsSafetyTimer);
      this.browserTtsSafetyTimer = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastUiEmitMs = 0;
    this.lastUiLevel = -1;
    if (this.onAudioLevelCallback) {
      this.onAudioLevelCallback(0);
    }
  }

  /**
   * Throttled (~15Hz) UI meter loop for 2D aura / non-3D fallback displays so React
   * does not re-render 60 times/second while 3D R3F reads `sampleLipSyncFrame()` directly.
   */
  private startUiAudioMeterLoop(token: number): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const tick = () => {
      if (!this.isSpeaking || token !== this.playbackToken) {
        this.animationFrameId = null;
        return;
      }

      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (nowMs - this.lastUiEmitMs >= 66) {
        const frame = this.lipSyncEngine.sampleFrame(nowMs);
        const level = frame.overallLevel;
        if (
          this.onAudioLevelCallback &&
          (Math.abs(level - this.lastUiLevel) >= 0.035 || (level === 0 && this.lastUiLevel !== 0))
        ) {
          this.lastUiLevel = level;
          this.onAudioLevelCallback(level);
        }
        this.lastUiEmitMs = nowMs;
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public resetAudioContextForTests(): void {
    this.stopSpeaking();
    this.audioContext = null;
  }
}

export const speechService = new SpeechService();

