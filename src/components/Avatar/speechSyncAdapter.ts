import type {
  AudioEnvelopeSummary,
  LipSyncMode,
  LipSyncMorphWeights,
  LipSyncVisemeName,
  SpeechCueTimeline,
  SpeechVisemeCue,
} from './lipSync';

export type TimingProviderKind =
  | 'exact-visemes'
  | 'word-timings'
  | 'speech-synthesis-boundaries'
  | 'acoustic-formant-plus-lexical-alignment'
  | 'amplitude-fallback';

export interface TimingProviderCapabilities {
  providerKind: TimingProviderKind;
  hasExactVisemeTimestamps: boolean;
  hasWordTimestamps: boolean;
  usesAcousticAnalysis: boolean;
  usesLexicalCadenceEstimation: boolean;
  description: string;
}

export interface VoiceBurstSegment {
  startSec: number;
  endSec: number;
  durationSec: number;
  totalEnergy: number;
  startNormRatio: number;
  endNormRatio: number;
}

export interface NormalizedSpeechSyncFrame {
  weights: LipSyncMorphWeights;
  providerKind: TimingProviderKind;
  timingConfidence: number;
  voicedProgress: number;
}

const clamp01 = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v);

export function describeTimingCapabilities(mode: LipSyncMode, hasText: boolean): TimingProviderCapabilities {
  if (mode === 'audio-analyser') {
    return {
      providerKind: hasText ? 'acoustic-formant-plus-lexical-alignment' : 'amplitude-fallback',
      hasExactVisemeTimestamps: false,
      hasWordTimestamps: false,
      usesAcousticAnalysis: true,
      usesLexicalCadenceEstimation: hasText,
      description: hasText
        ? 'Real-time Web Audio FFT formant & envelope lookahead combined with voiced-burst lexical co-articulation (Gemini TTS does not emit phoneme timestamps).'
        : 'Real-time Web Audio FFT formant & RMS amplitude analysis.',
    };
  }

  if (mode === 'speech-synthesis') {
    return {
      providerKind: 'speech-synthesis-boundaries',
      hasExactVisemeTimestamps: false,
      hasWordTimestamps: false,
      usesAcousticAnalysis: false,
      usesLexicalCadenceEstimation: true,
      description:
        'Browser SpeechSynthesis clock progression calibrated dynamically by utterance onboundary character offsets when available.',
    };
  }

  return {
    providerKind: 'amplitude-fallback',
    hasExactVisemeTimestamps: false,
    hasWordTimestamps: false,
    usesAcousticAnalysis: false,
    usesLexicalCadenceEstimation: false,
    description: 'Idle neutral speech sync state.',
  };
}

/**
 * Extracts discrete voiced speech bursts from an AudioEnvelopeSummary by merging
 * short sub-65ms consonant dips while keeping true inter-clause pauses separated.
 * This allows lexical cues to track real spoken phrases rather than drifting
 * across long Gemini TTS pauses.
 */
export function segmentAudioVoiceSpans(envelope: AudioEnvelopeSummary): VoiceBurstSegment[] {
  const { rms, hopSec, noiseFloor, speechPeak, durationSec } = envelope;
  const frameCount = rms.length;
  if (frameCount === 0 || durationSec <= 0) {
    return [];
  }

  const denom = Math.max(0.03, speechPeak - noiseFloor);
  const activeFrames = new Uint8Array(frameCount);
  for (let i = 0; i < frameCount; i += 1) {
    const norm = (rms[i] - noiseFloor) / denom;
    activeFrames[i] = norm >= 0.08 ? 1 : 0;
  }

  // Bridge micro-silences shorter than 70ms (stop consonants like p/t/k inside words)
  const bridgeHops = Math.max(1, Math.round(0.07 / Math.max(0.002, hopSec)));
  let silentRun = 0;
  let lastVoiced = -1;
  for (let i = 0; i < frameCount; i += 1) {
    if (activeFrames[i] === 1) {
      if (lastVoiced >= 0 && silentRun > 0 && silentRun <= bridgeHops) {
        for (let k = lastVoiced + 1; k < i; k += 1) {
          activeFrames[k] = 1;
        }
      }
      lastVoiced = i;
      silentRun = 0;
    } else if (lastVoiced >= 0) {
      silentRun += 1;
    }
  }

  const segments: VoiceBurstSegment[] = [];
  let segStart = -1;
  let segEnergy = 0;

  for (let i = 0; i < frameCount; i += 1) {
    const norm = clamp01((rms[i] - noiseFloor) / denom);
    if (activeFrames[i] === 1) {
      if (segStart === -1) {
        segStart = i;
        segEnergy = 0;
      }
      segEnergy += norm;
    } else if (segStart !== -1) {
      const startSec = segStart * hopSec;
      const endSec = Math.min(durationSec, i * hopSec);
      if (endSec - startSec >= 0.04) {
        segments.push({
          startSec,
          endSec,
          durationSec: endSec - startSec,
          totalEnergy: Math.max(0.01, segEnergy * hopSec),
          startNormRatio: 0,
          endNormRatio: 0,
        });
      }
      segStart = -1;
    }
  }

  if (segStart !== -1) {
    const startSec = segStart * hopSec;
    const endSec = Math.min(durationSec, frameCount * hopSec);
    if (endSec - startSec >= 0.04) {
      segments.push({
        startSec,
        endSec,
        durationSec: endSec - startSec,
        totalEnergy: Math.max(0.01, segEnergy * hopSec),
        startNormRatio: 0,
        endNormRatio: 0,
      });
    }
  }

  if (segments.length === 0) {
    return [
      {
        startSec: envelope.firstVoicedSec,
        endSec: Math.max(envelope.firstVoicedSec + 0.1, envelope.lastVoicedSec),
        durationSec: Math.max(0.1, envelope.lastVoicedSec - envelope.firstVoicedSec),
        totalEnergy: 1,
        startNormRatio: 0,
        endNormRatio: 1,
      },
    ];
  }

  let totalActiveDuration = 0;
  for (let i = 0; i < segments.length; i += 1) {
    totalActiveDuration += segments[i].durationSec;
  }
  totalActiveDuration = Math.max(0.05, totalActiveDuration);

  let cursor = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    const span = seg.durationSec / totalActiveDuration;
    seg.startNormRatio = cursor;
    cursor += span;
    seg.endNormRatio = i === segments.length - 1 ? 1 : cursor;
  }

  return segments;
}

/**
 * Maps playback time onto a normalized [0, 1] active-speech timeline using actual
 * detected acoustic voiced bursts so silent pauses between sentences hold progress cleanly.
 */
export function alignTimeToVoicedSegments(
  envelope: AudioEnvelopeSummary,
  segments: VoiceBurstSegment[],
  elapsedSec: number
): number {
  if (segments.length === 0) {
    const voicedSpan = Math.max(0.25, envelope.lastVoicedSec - envelope.firstVoicedSec);
    return clamp01((elapsedSec - envelope.firstVoicedSec) / voicedSpan);
  }

  if (elapsedSec <= segments[0].startSec) {
    return 0;
  }

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    if (elapsedSec <= seg.startSec) {
      return seg.startNormRatio;
    }
    if (elapsedSec <= seg.endSec) {
      const localT = clamp01((elapsedSec - seg.startSec) / Math.max(0.02, seg.durationSec));
      return seg.startNormRatio + (seg.endNormRatio - seg.startNormRatio) * localT;
    }
  }

  return 1;
}

/**
 * Produces a contiguous sub-timeline of non-silence speech cues so lexical
 * co-articulation aligns directly onto active voiced segments extracted from PCM.
 */
export function buildVoicedCueTimeline(timeline: SpeechCueTimeline | null): SpeechCueTimeline | null {
  if (!timeline || timeline.cues.length === 0) return null;
  const voiced = timeline.cues.filter((c) => !c.isSilence);
  if (voiced.length === 0) return null;

  let totalSpan = 0;
  for (let i = 0; i < voiced.length; i += 1) {
    totalSpan += Math.max(0.0001, voiced[i].endRatio - voiced[i].startRatio);
  }
  totalSpan = Math.max(0.0001, totalSpan);

  let cursor = 0;
  const remapped: SpeechVisemeCue[] = [];
  for (let i = 0; i < voiced.length; i += 1) {
    const c = voiced[i];
    const width = Math.max(0.0001, c.endRatio - c.startRatio) / totalSpan;
    remapped.push({
      ...c,
      startRatio: cursor,
      endRatio: i === voiced.length - 1 ? 1 : cursor + width,
    });
    cursor += width;
  }

  return {
    text: timeline.text,
    cues: remapped,
    estimatedDurationSec: timeline.estimatedDurationSec,
    charLength: timeline.charLength,
  };
}

/**
 * Selects the active non-silence cue for the current normalized voiced progress [0, 1].
 */
export function pickVoicedLexicalCue(
  voicedTimeline: SpeechCueTimeline | null,
  voicedProgress: number,
  findCueAtRatio: (tl: SpeechCueTimeline, ratio: number) => SpeechVisemeCue | null
): SpeechVisemeCue | null {
  if (!voicedTimeline || voicedTimeline.cues.length === 0) return null;
  const cue = findCueAtRatio(voicedTimeline, clamp01(voicedProgress));
  if (!cue || cue.isSilence) return null;
  return cue;
}

export function clampMorphWeight(value: number, max = 1): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value >= max ? max : value;
}

export function normalizeExternalVisemeMap(
  visemes: Partial<Record<LipSyncVisemeName, number>> | undefined
): Partial<Record<LipSyncVisemeName, number>> {
  if (!visemes) return {};
  const result: Partial<Record<LipSyncVisemeName, number>> = {};
  for (const key in visemes) {
    const k = key as LipSyncVisemeName;
    const raw = visemes[k];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      result[k] = clampMorphWeight(raw, 0.9);
    }
  }
  return result;
}
