import {
  alignTimeToVoicedSegments,
  buildVoicedCueTimeline,
  describeTimingCapabilities,
  type NormalizedSpeechSyncFrame,
  pickVoicedLexicalCue,
  segmentAudioVoiceSpans,
  type TimingProviderCapabilities,
  type VoiceBurstSegment,
} from './speechSyncAdapter';

export const VERIFIED_GLB_VISEMES = [
  'viseme_sil',
  'viseme_PP',
  'viseme_FF',
  'viseme_TH',
  'viseme_DD',
  'viseme_kk',
  'viseme_CH',
  'viseme_SS',
  'viseme_nn',
  'viseme_RR',
  'viseme_aa',
  'viseme_E',
  'viseme_I',
  'viseme_O',
  'viseme_U',
] as const;

export type LipSyncVisemeName = (typeof VERIFIED_GLB_VISEMES)[number];

export type LipSyncMode = 'idle' | 'audio-analyser' | 'speech-synthesis';

export interface SpeechVisemeCue {
  viseme: LipSyncVisemeName;
  startRatio: number;
  endRatio: number;
  charStart: number;
  charEnd: number;
  energy: number;
  jawScale: number;
  isSilence: boolean;
  isBilabial: boolean;
  isLabiodental: boolean;
}

export interface SpeechCueTimeline {
  text: string;
  cues: SpeechVisemeCue[];
  estimatedDurationSec: number;
  charLength: number;
}

export interface AudioEnvelopeSummary {
  hopSec: number;
  rms: Float32Array;
  zcr: Float32Array;
  noiseFloor: number;
  speechPeak: number;
  durationSec: number;
  firstVoicedSec: number;
  lastVoicedSec: number;
}

export interface LipSyncMorphWeights {
  isActive: boolean;
  mode: LipSyncMode;
  overallLevel: number;
  isVoiced: boolean;
  activeViseme: LipSyncVisemeName;
  jawOpen: number;
  mouthFunnel: number;
  mouthPucker: number;
  mouthClose: number;
  mouthPress: number;
  mouthStretch: number;
  mouthRollLower: number;
  mouthUpperUp: number;
  mouthLowerDown: number;
  roundingAttenuation: number;
  visemes: Record<LipSyncVisemeName, number>;
}

const clamp01 = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * clamp01(t);

export function createNeutralLipSyncWeights(): LipSyncMorphWeights {
  return {
    isActive: false,
    mode: 'idle',
    overallLevel: 0,
    isVoiced: false,
    activeViseme: 'viseme_sil',
    jawOpen: 0,
    mouthFunnel: 0,
    mouthPucker: 0,
    mouthClose: 0,
    mouthPress: 0,
    mouthStretch: 0,
    mouthRollLower: 0,
    mouthUpperUp: 0,
    mouthLowerDown: 0,
    roundingAttenuation: 0,
    visemes: {
      viseme_sil: 0,
      viseme_PP: 0,
      viseme_FF: 0,
      viseme_TH: 0,
      viseme_DD: 0,
      viseme_kk: 0,
      viseme_CH: 0,
      viseme_SS: 0,
      viseme_nn: 0,
      viseme_RR: 0,
      viseme_aa: 0,
      viseme_E: 0,
      viseme_I: 0,
      viseme_O: 0,
      viseme_U: 0,
    },
  };
}

function resetWeightsInPlace(target: LipSyncMorphWeights, mode: LipSyncMode = 'idle'): void {
  target.isActive = false;
  target.mode = mode;
  target.overallLevel = 0;
  target.isVoiced = false;
  target.activeViseme = 'viseme_sil';
  target.jawOpen = 0;
  target.mouthFunnel = 0;
  target.mouthPucker = 0;
  target.mouthClose = 0;
  target.mouthPress = 0;
  target.mouthStretch = 0;
  target.mouthRollLower = 0;
  target.mouthUpperUp = 0;
  target.mouthLowerDown = 0;
  target.roundingAttenuation = 0;
  for (let i = 0; i < VERIFIED_GLB_VISEMES.length; i += 1) {
    target.visemes[VERIFIED_GLB_VISEMES[i]] = 0;
  }
}

interface RawCueToken {
  viseme: LipSyncVisemeName;
  weight: number;
  charStart: number;
  charEnd: number;
  energy: number;
  jawScale: number;
  isSilence: boolean;
  isBilabial: boolean;
  isLabiodental: boolean;
}

const DEVANAGARI_CONSONANT_VISEME: Record<string, LipSyncVisemeName> = {
  // Velars
  'क': 'viseme_kk',
  'ख': 'viseme_kk',
  'ग': 'viseme_kk',
  'घ': 'viseme_kk',
  'ङ': 'viseme_nn',
  'क़': 'viseme_kk',
  'ख़': 'viseme_kk',
  'ग़': 'viseme_kk',
  // Palatals / Affricates
  'च': 'viseme_CH',
  'छ': 'viseme_CH',
  'ज': 'viseme_CH',
  'झ': 'viseme_CH',
  'ञ': 'viseme_nn',
  'ज़': 'viseme_SS',
  'य': 'viseme_I',
  'श': 'viseme_CH',
  'ष': 'viseme_CH',
  // Retroflex & Dental stops/nasals
  'ट': 'viseme_DD',
  'ठ': 'viseme_DD',
  'ड': 'viseme_DD',
  'ढ': 'viseme_DD',
  'ण': 'viseme_nn',
  'ड़': 'viseme_RR',
  'ढ़': 'viseme_RR',
  'त': 'viseme_TH',
  'थ': 'viseme_TH',
  'द': 'viseme_TH',
  'ध': 'viseme_TH',
  'न': 'viseme_nn',
  'ल': 'viseme_nn',
  'ळ': 'viseme_nn',
  // Bilabials
  'प': 'viseme_PP',
  'फ': 'viseme_PP',
  'ब': 'viseme_PP',
  'भ': 'viseme_PP',
  'म': 'viseme_PP',
  // Labiodental & Fricative / Approximant
  'फ़': 'viseme_FF',
  'व': 'viseme_FF',
  'र': 'viseme_RR',
  'स': 'viseme_SS',
  'ह': 'viseme_aa',
};

const DEVANAGARI_VOWEL_VISEME: Record<string, { viseme: LipSyncVisemeName; jaw: number; weight: number }> = {
  'अ': { viseme: 'viseme_aa', jaw: 0.56, weight: 1.0 },
  'आ': { viseme: 'viseme_aa', jaw: 0.92, weight: 1.45 },
  'इ': { viseme: 'viseme_I', jaw: 0.34, weight: 1.0 },
  'ई': { viseme: 'viseme_I', jaw: 0.38, weight: 1.35 },
  'उ': { viseme: 'viseme_U', jaw: 0.32, weight: 1.0 },
  'ऊ': { viseme: 'viseme_U', jaw: 0.34, weight: 1.35 },
  'ऋ': { viseme: 'viseme_RR', jaw: 0.42, weight: 1.0 },
  'ए': { viseme: 'viseme_E', jaw: 0.54, weight: 1.25 },
  'ऐ': { viseme: 'viseme_E', jaw: 0.68, weight: 1.35 },
  'ओ': { viseme: 'viseme_O', jaw: 0.62, weight: 1.35 },
  'औ': { viseme: 'viseme_O', jaw: 0.72, weight: 1.45 },
  // Matras
  'ा': { viseme: 'viseme_aa', jaw: 0.9, weight: 1.4 },
  'ि': { viseme: 'viseme_I', jaw: 0.34, weight: 0.95 },
  'ी': { viseme: 'viseme_I', jaw: 0.38, weight: 1.3 },
  'ु': { viseme: 'viseme_U', jaw: 0.32, weight: 0.95 },
  'ू': { viseme: 'viseme_U', jaw: 0.34, weight: 1.3 },
  'ृ': { viseme: 'viseme_RR', jaw: 0.42, weight: 0.95 },
  'े': { viseme: 'viseme_E', jaw: 0.54, weight: 1.25 },
  'ै': { viseme: 'viseme_E', jaw: 0.68, weight: 1.35 },
  'ो': { viseme: 'viseme_O', jaw: 0.62, weight: 1.35 },
  'ौ': { viseme: 'viseme_O', jaw: 0.72, weight: 1.4 },
};

const isDevanagariChar = (ch: string): boolean => {
  const code = ch.charCodeAt(0);
  return code >= 0x0900 && code <= 0x097f;
};

const getConsonantSpecs = (
  viseme: LipSyncVisemeName
): { jawScale: number; energy: number; weight: number } => {
  switch (viseme) {
    case 'viseme_PP':
      return { jawScale: 0.04, energy: 0.45, weight: 0.78 };
    case 'viseme_FF':
      return { jawScale: 0.16, energy: 0.68, weight: 0.85 };
    case 'viseme_TH':
      return { jawScale: 0.24, energy: 0.66, weight: 0.78 };
    case 'viseme_SS':
      return { jawScale: 0.22, energy: 0.72, weight: 0.88 };
    case 'viseme_CH':
      return { jawScale: 0.34, energy: 0.78, weight: 0.92 };
    case 'viseme_DD':
      return { jawScale: 0.28, energy: 0.65, weight: 0.75 };
    case 'viseme_kk':
      return { jawScale: 0.34, energy: 0.68, weight: 0.75 };
    case 'viseme_nn':
      return { jawScale: 0.26, energy: 0.66, weight: 0.74 };
    case 'viseme_RR':
      return { jawScale: 0.32, energy: 0.72, weight: 0.82 };
    default:
      return { jawScale: 0.45, energy: 0.75, weight: 0.9 };
  }
};

/**
 * Builds an approximate, clock-paced multilingual viseme timeline for English, Hindi (Devanagari),
 * and Hinglish text. Used strictly as co-articulation / fallback cadence guidance — never
 * represented as server phoneme timestamps.
 */
export function buildSpeechCueTimeline(text: string, speechRate = 1.0): SpeechCueTimeline {
  const cleaned = text.trim();
  if (!cleaned) {
    return {
      text: '',
      cues: [],
      estimatedDurationSec: 0,
      charLength: 0,
    };
  }

  const tokens: RawCueToken[] = [];
  const lower = cleaned.toLowerCase();
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];
    const chLower = lower[i];

    // Whitespace -> brief inter-word dip (not full closure)
    if (/\s/.test(ch)) {
      let end = i + 1;
      while (end < cleaned.length && /\s/.test(cleaned[end])) end += 1;
      tokens.push({
        viseme: 'viseme_sil',
        weight: 0.26,
        charStart: i,
        charEnd: end,
        energy: 0.08,
        jawScale: 0,
        isSilence: true,
        isBilabial: false,
        isLabiodental: false,
      });
      i = end;
      continue;
    }

    // Sentence / clause punctuation -> audible pause
    if (/[.,!?;:—–\-\n।|]/.test(ch)) {
      const isMajor = /[.!?।\n]/.test(ch);
      let end = i + 1;
      while (end < cleaned.length && /[.,!?;:—–\-\s।|]/.test(cleaned[end])) end += 1;
      tokens.push({
        viseme: 'viseme_sil',
        weight: isMajor ? 2.1 : 1.15,
        charStart: i,
        charEnd: end,
        energy: 0,
        jawScale: 0,
        isSilence: true,
        isBilabial: false,
        isLabiodental: false,
      });
      i = end;
      continue;
    }

    // Devanagari script handling
    if (isDevanagariChar(ch)) {
      const twoChar = cleaned.slice(i, i + 2);
      const nuktaConsonant = DEVANAGARI_CONSONANT_VISEME[twoChar];
      const baseConsonant = nuktaConsonant ?? DEVANAGARI_CONSONANT_VISEME[ch];

      if (baseConsonant) {
        const step = nuktaConsonant ? 2 : 1;
        const specs = getConsonantSpecs(baseConsonant);
        tokens.push({
          viseme: baseConsonant,
          weight: specs.weight,
          charStart: i,
          charEnd: i + step,
          energy: specs.energy,
          jawScale: specs.jawScale,
          isSilence: false,
          isBilabial: baseConsonant === 'viseme_PP',
          isLabiodental: baseConsonant === 'viseme_FF',
        });

        const nextCh = cleaned[i + step] || '';
        const nextVowel = DEVANAGARI_VOWEL_VISEME[nextCh];
        if (nextCh === '्') {
          // Virama suppresses inherent schwa
          i += step + 1;
          continue;
        } else if (nextVowel) {
          tokens.push({
            viseme: nextVowel.viseme,
            weight: nextVowel.weight,
            charStart: i + step,
            charEnd: i + step + 1,
            energy: 0.96,
            jawScale: nextVowel.jaw,
            isSilence: false,
            isBilabial: false,
            isLabiodental: false,
          });
          i += step + 1;
          continue;
        } else {
          // Inherent Hindi schwa if not end-of-word (word-final schwa deletion is common in Hindi/Hinglish)
          const isWordEnd = !nextCh || !isDevanagariChar(nextCh) || nextCh === '।';
          if (!isWordEnd) {
            tokens.push({
              viseme: 'viseme_aa',
              weight: 0.72,
              charStart: i,
              charEnd: i + step,
              energy: 0.85,
              jawScale: 0.52,
              isSilence: false,
              isBilabial: false,
              isLabiodental: false,
            });
          }
          i += step;
          continue;
        }
      }

      const indepVowel = DEVANAGARI_VOWEL_VISEME[ch];
      if (indepVowel) {
        tokens.push({
          viseme: indepVowel.viseme,
          weight: indepVowel.weight,
          charStart: i,
          charEnd: i + 1,
          energy: 0.95,
          jawScale: indepVowel.jaw,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        i += 1;
        continue;
      }

      if (ch === 'ं' || ch === 'ँ') {
        tokens.push({
          viseme: 'viseme_nn',
          weight: 0.55,
          charStart: i,
          charEnd: i + 1,
          energy: 0.55,
          jawScale: 0.2,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
      }
      i += 1;
      continue;
    }

    // Latin (English & Hinglish) digraphs and phonemes
    const pair = lower.slice(i, i + 2);
    const tri = lower.slice(i, i + 3);

    // Common Hinglish / English digraphs
    if (tri === 'eau' || pair === 'oo' || pair === 'ou' || pair === 'ow') {
      const isOw = pair === 'ow' || pair === 'ou';
      tokens.push({
        viseme: isOw ? 'viseme_O' : 'viseme_U',
        weight: 1.3,
        charStart: i,
        charEnd: i + (tri === 'eau' ? 3 : 2),
        energy: 0.94,
        jawScale: isOw ? 0.64 : 0.36,
        isSilence: false,
        isBilabial: false,
        isLabiodental: false,
      });
      i += tri === 'eau' ? 3 : 2;
      continue;
    }

    if (pair === 'aa') {
      tokens.push({
        viseme: 'viseme_aa',
        weight: 1.4,
        charStart: i,
        charEnd: i + 2,
        energy: 0.98,
        jawScale: 0.9,
        isSilence: false,
        isBilabial: false,
        isLabiodental: false,
      });
      i += 2;
      continue;
    }

    if (pair === 'ee' || pair === 'ea' || pair === 'ie' || pair === 'ii') {
      tokens.push({
        viseme: 'viseme_I',
        weight: 1.25,
        charStart: i,
        charEnd: i + 2,
        energy: 0.9,
        jawScale: 0.38,
        isSilence: false,
        isBilabial: false,
        isLabiodental: false,
      });
      i += 2;
      continue;
    }

    if (pair === 'ai' || pair === 'ay' || pair === 'ae' || pair === 'ei' || pair === 'ey') {
      tokens.push({
        viseme: 'viseme_E',
        weight: 1.3,
        charStart: i,
        charEnd: i + 2,
        energy: 0.94,
        jawScale: 0.62,
        isSilence: false,
        isBilabial: false,
        isLabiodental: false,
      });
      i += 2;
      continue;
    }

    if (pair === 'au' || pair === 'aw' || pair === 'oa') {
      tokens.push({
        viseme: 'viseme_O',
        weight: 1.35,
        charStart: i,
        charEnd: i + 2,
        energy: 0.95,
        jawScale: 0.68,
        isSilence: false,
        isBilabial: false,
        isLabiodental: false,
      });
      i += 2;
      continue;
    }

    if (pair === 'ch' || pair === 'sh' || pair === 'zh') {
      tokens.push({
        viseme: 'viseme_CH',
        weight: 0.92,
        charStart: i,
        charEnd: i + 2,
        energy: 0.78,
        jawScale: 0.32,
        isSilence: false,
        isBilabial: false,
        isLabiodental: false,
      });
      i += 2;
      continue;
    }

    if (pair === 'th' || pair === 'dh') {
      tokens.push({
        viseme: 'viseme_TH',
        weight: 0.85,
        charStart: i,
        charEnd: i + 2,
        energy: 0.68,
        jawScale: 0.25,
        isSilence: false,
        isBilabial: false,
        isLabiodental: false,
      });
      i += 2;
      continue;
    }

    if (pair === 'ph') {
      tokens.push({
        viseme: 'viseme_FF',
        weight: 0.88,
        charStart: i,
        charEnd: i + 2,
        energy: 0.72,
        jawScale: 0.18,
        isSilence: false,
        isBilabial: false,
        isLabiodental: true,
      });
      i += 2;
      continue;
    }

    if (pair === 'bh') {
      tokens.push({
        viseme: 'viseme_PP',
        weight: 0.82,
        charStart: i,
        charEnd: i + 2,
        energy: 0.52,
        jawScale: 0.06,
        isSilence: false,
        isBilabial: true,
        isLabiodental: false,
      });
      i += 2;
      continue;
    }

    if (pair === 'kh' || pair === 'gh') {
      tokens.push({
        viseme: 'viseme_kk',
        weight: 0.82,
        charStart: i,
        charEnd: i + 2,
        energy: 0.7,
        jawScale: 0.36,
        isSilence: false,
        isBilabial: false,
        isLabiodental: false,
      });
      i += 2;
      continue;
    }

    if (pair === 'ng') {
      tokens.push({
        viseme: 'viseme_nn',
        weight: 0.8,
        charStart: i,
        charEnd: i + 2,
        energy: 0.66,
        jawScale: 0.28,
        isSilence: false,
        isBilabial: false,
        isLabiodental: false,
      });
      i += 2;
      continue;
    }

    // Single Latin vowels & consonants
    const nextAlpha = lower[i + 1] || '';
    const isWordFinal = !nextAlpha || !/[a-z]/.test(nextAlpha);

    // Silent trailing 'e' on multi-letter English words (e.g., "time", "make", "smile")
    if (
      chLower === 'e' &&
      isWordFinal &&
      i >= 2 &&
      /[a-z]/.test(lower[i - 1] || '') &&
      /[aeiouy]/.test(lower[i - 2] || '')
    ) {
      i += 1;
      continue;
    }

    // Collapse double identical consonants (e.g., "ll", "tt", "pp")
    const step = pair.length === 2 && pair[0] === pair[1] && /[bcdfgklmnprstvz]/.test(chLower) ? 2 : 1;

    switch (chLower) {
      case 'a':
        tokens.push({
          viseme: 'viseme_aa',
          weight: 1.15,
          charStart: i,
          charEnd: i + step,
          energy: 0.96,
          jawScale: 0.82,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'e':
        tokens.push({
          viseme: 'viseme_E',
          weight: 1.08,
          charStart: i,
          charEnd: i + step,
          energy: 0.9,
          jawScale: 0.56,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'i':
      case 'y':
        tokens.push({
          viseme: 'viseme_I',
          weight: 1.05,
          charStart: i,
          charEnd: i + step,
          energy: 0.88,
          jawScale: 0.36,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'o':
        tokens.push({
          viseme: 'viseme_O',
          weight: 1.15,
          charStart: i,
          charEnd: i + step,
          energy: 0.93,
          jawScale: 0.64,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'u':
      case 'w':
        tokens.push({
          viseme: 'viseme_U',
          weight: 1.08,
          charStart: i,
          charEnd: i + step,
          energy: 0.88,
          jawScale: 0.34,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'p':
      case 'b':
      case 'm':
        tokens.push({
          viseme: 'viseme_PP',
          weight: 0.78,
          charStart: i,
          charEnd: i + step,
          energy: 0.45,
          jawScale: 0.04,
          isSilence: false,
          isBilabial: true,
          isLabiodental: false,
        });
        break;
      case 'f':
      case 'v':
        tokens.push({
          viseme: 'viseme_FF',
          weight: 0.85,
          charStart: i,
          charEnd: i + step,
          energy: 0.68,
          jawScale: 0.16,
          isSilence: false,
          isBilabial: false,
          isLabiodental: true,
        });
        break;
      case 't':
      case 'd':
        tokens.push({
          viseme: 'viseme_DD',
          weight: 0.75,
          charStart: i,
          charEnd: i + step,
          energy: 0.64,
          jawScale: 0.28,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'k':
      case 'g':
      case 'q':
      case 'c':
        tokens.push({
          viseme: pair === 'ce' || pair === 'ci' ? 'viseme_SS' : 'viseme_kk',
          weight: 0.76,
          charStart: i,
          charEnd: i + step,
          energy: 0.68,
          jawScale: 0.34,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'j':
        tokens.push({
          viseme: 'viseme_CH',
          weight: 0.84,
          charStart: i,
          charEnd: i + step,
          energy: 0.74,
          jawScale: 0.32,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 's':
      case 'z':
      case 'x':
        tokens.push({
          viseme: 'viseme_SS',
          weight: 0.86,
          charStart: i,
          charEnd: i + step,
          energy: 0.72,
          jawScale: 0.22,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'n':
      case 'l':
        tokens.push({
          viseme: 'viseme_nn',
          weight: 0.74,
          charStart: i,
          charEnd: i + step,
          energy: 0.66,
          jawScale: 0.26,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'r':
        tokens.push({
          viseme: 'viseme_RR',
          weight: 0.8,
          charStart: i,
          charEnd: i + step,
          energy: 0.72,
          jawScale: 0.32,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      case 'h':
        tokens.push({
          viseme: 'viseme_aa',
          weight: 0.68,
          charStart: i,
          charEnd: i + step,
          energy: 0.64,
          jawScale: 0.42,
          isSilence: false,
          isBilabial: false,
          isLabiodental: false,
        });
        break;
      default:
        if (/[0-9]/.test(chLower)) {
          tokens.push({
            viseme: 'viseme_aa',
            weight: 1.35,
            charStart: i,
            charEnd: i + 1,
            energy: 0.85,
            jawScale: 0.55,
            isSilence: false,
            isBilabial: false,
            isLabiodental: false,
          });
        }
        break;
    }

    i += step;
  }

  if (tokens.length === 0) {
    return {
      text: cleaned,
      cues: [],
      estimatedDurationSec: 0,
      charLength: cleaned.length,
    };
  }

  let totalWeight = 0;
  for (let k = 0; k < tokens.length; k += 1) {
    totalWeight += tokens[k].weight;
  }
  totalWeight = Math.max(0.001, totalWeight);

  const cues: SpeechVisemeCue[] = [];
  let cursor = 0;
  for (let k = 0; k < tokens.length; k += 1) {
    const t = tokens[k];
    const span = t.weight / totalWeight;
    cues.push({
      viseme: t.viseme,
      startRatio: cursor,
      endRatio: cursor + span,
      charStart: t.charStart,
      charEnd: t.charEnd,
      energy: t.energy,
      jawScale: t.jawScale,
      isSilence: t.isSilence,
      isBilabial: t.isBilabial,
      isLabiodental: t.isLabiodental,
    });
    cursor += span;
  }
  cues[cues.length - 1].endRatio = 1;

  // Approximate duration (used only as initial rate guess before AudioBuffer/onboundary anchors)
  const clampedRate = Math.max(0.65, Math.min(1.5, speechRate || 1.0));
  const estimatedDurationSec = Math.max(0.45, (totalWeight * 0.088) / clampedRate);

  return {
    text: cleaned,
    cues,
    estimatedDurationSec,
    charLength: cleaned.length,
  };
}

export function findCueAtRatio(timeline: SpeechCueTimeline, ratio: number): SpeechVisemeCue | null {
  const { cues } = timeline;
  if (cues.length === 0) return null;
  const r = clamp01(ratio);
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid];
    if (r < cue.startRatio) {
      hi = mid - 1;
    } else if (r > cue.endRatio) {
      lo = mid + 1;
    } else {
      return cue;
    }
  }
  return cues[Math.min(cues.length - 1, Math.max(0, lo))];
}

export function findCueRatioByCharIndex(
  timeline: SpeechCueTimeline,
  charIndex: number
): number | null {
  const { cues } = timeline;
  if (cues.length === 0 || timeline.charLength === 0) return null;
  const clampedChar = Math.max(0, Math.min(timeline.charLength, charIndex));
  for (let i = 0; i < cues.length; i += 1) {
    if (cues[i].charEnd >= clampedChar) {
      return cues[i].startRatio;
    }
  }
  return cues[cues.length - 1].startRatio;
}

/**
 * Fast one-shot PCM envelope scan (~1-2ms) on decoded AudioBuffer.
 * Produces calibrated noise floor, speech peak, and voiced start/end bounds
 * so real silence/pauses close the mouth cleanly without lag or drift.
 */
export function analyzeAudioBufferEnvelope(buffer: AudioBuffer): AudioEnvelopeSummary {
  const hopSec = 0.01; // 10ms frames
  const sampleRate = Math.max(8000, buffer.sampleRate || 24000);
  const totalSamples = buffer.length;
  const hopSamples = Math.max(64, Math.round(sampleRate * hopSec));
  const frameCount = Math.max(1, Math.ceil(totalSamples / hopSamples));
  const channels = Math.max(1, buffer.numberOfChannels);

  const channelArrays: Float32Array[] = [];
  for (let c = 0; c < channels; c += 1) {
    channelArrays.push(buffer.getChannelData(c));
  }

  const rms = new Float32Array(frameCount);
  const zcr = new Float32Array(frameCount);

  for (let f = 0; f < frameCount; f += 1) {
    const start = f * hopSamples;
    const end = Math.min(totalSamples, start + hopSamples);
    const len = Math.max(1, end - start);

    let sumSq = 0;
    let crossings = 0;
    let prevSign = 0;

    for (let s = start; s < end; s += 1) {
      let sample = 0;
      for (let c = 0; c < channels; c += 1) {
        sample += channelArrays[c][s];
      }
      sample /= channels;
      sumSq += sample * sample;

      const sign = sample > 0.002 ? 1 : sample < -0.002 ? -1 : 0;
      if (sign !== 0) {
        if (prevSign !== 0 && sign !== prevSign) {
          crossings += 1;
        }
        prevSign = sign;
      }
    }

    rms[f] = Math.sqrt(sumSq / len);
    zcr[f] = crossings / len;
  }

  // Percentile calibration (sort a shallow copy to avoid allocating huge structs)
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const p15 = sorted[Math.floor(sorted.length * 0.15)] ?? 0;
  const p94 = sorted[Math.floor(sorted.length * 0.94)] ?? 0.1;

  const noiseFloor = Math.max(0.004, Math.min(0.04, p15 * 1.65));
  const speechPeak = Math.max(noiseFloor + 0.045, p94);

  const voiceThresh = noiseFloor + (speechPeak - noiseFloor) * 0.1;
  let firstVoicedIdx = -1;
  let lastVoicedIdx = -1;
  for (let f = 0; f < frameCount; f += 1) {
    if (rms[f] > voiceThresh) {
      if (firstVoicedIdx === -1) firstVoicedIdx = f;
      lastVoicedIdx = f;
    }
  }

  const durationSec = buffer.duration || totalSamples / sampleRate;
  const firstVoicedSec = firstVoicedIdx >= 0 ? firstVoicedIdx * hopSec : 0;
  const lastVoicedSec =
    lastVoicedIdx >= 0 ? Math.min(durationSec, (lastVoicedIdx + 1) * hopSec) : durationSec;

  return {
    hopSec,
    rms,
    zcr,
    noiseFloor,
    speechPeak,
    durationSec,
    firstVoicedSec,
    lastVoicedSec,
  };
}

function sampleEnvelopeAt(envelope: AudioEnvelopeSummary, timeSec: number): { normRms: number; zcr: number } {
  const { rms, zcr, hopSec, noiseFloor, speechPeak } = envelope;
  if (rms.length === 0) return { normRms: 0, zcr: 0 };
  const idxFloat = Math.max(0, Math.min(rms.length - 1, timeSec / hopSec));
  const i0 = Math.floor(idxFloat);
  const i1 = Math.min(rms.length - 1, i0 + 1);
  const frac = idxFloat - i0;

  const rawRms = rms[i0] + (rms[i1] - rms[i0]) * frac;
  const rawZcr = zcr[i0] + (zcr[i1] - zcr[i0]) * frac;
  const denom = Math.max(0.03, speechPeak - noiseFloor);
  const normRms = clamp01((rawRms - noiseFloor) / denom);
  return { normRms, zcr: rawZcr };
}

interface ActiveAudioAnalyserSource {
  kind: 'audio-analyser';
  token: number;
  ctx: AudioContext;
  analyser: AnalyserNode;
  startCtxTime: number;
  durationSec: number;
  isStreaming: boolean;
  streamEnded: boolean;
  envelope: AudioEnvelopeSummary | null;
  voiceSegments: VoiceBurstSegment[];
  liveNoiseFloor: number;
  liveSpeechPeak: number;
  timeline: SpeechCueTimeline | null;
  voicedTimeline: SpeechCueTimeline | null;
  timeDomainBuf: Float32Array<ArrayBuffer>;
  freqBuf: Uint8Array<ArrayBuffer>;
  binHz: number;
  prevSmoothedRms: number;
}

interface ActiveSynthesisSource {
  kind: 'speech-synthesis';
  token: number;
  timeline: SpeechCueTimeline;
  speechRate: number;
  startedAtPerfMs: number | null;
  pausedAtPerfMs: number | null;
  accumulatedPauseMs: number;
  anchoredProgress: number;
  anchoredAtPerfMs: number;
  effectiveDurationSec: number;
  lastSamplePerfMs: number;
}

type ActiveLipSyncSource = ActiveAudioAnalyserSource | ActiveSynthesisSource;

export class LipSyncEngine {
  private source: ActiveLipSyncSource | null = null;
  private targetWeights: LipSyncMorphWeights = createNeutralLipSyncWeights();
  private smoothedWeights: LipSyncMorphWeights = createNeutralLipSyncWeights();
  private lastSamplePerfMs = 0;
  private lastEvaluatedPerfMs = -Infinity;
  private lastVoicedProgress = 0;

  public startAudioAnalyserSession(params: {
    token: number;
    ctx: AudioContext;
    analyser: AnalyserNode;
    startCtxTime: number;
    durationSec: number;
    envelope: AudioEnvelopeSummary;
    text?: string;
    rate?: number;
  }): void {
    const timeline =
      params.text && params.text.trim()
        ? buildSpeechCueTimeline(params.text, params.rate ?? 1.0)
        : null;
    const voicedTimeline = buildVoicedCueTimeline(timeline);
    const voiceSegments = segmentAudioVoiceSpans(params.envelope);

    this.source = {
      kind: 'audio-analyser',
      token: params.token,
      ctx: params.ctx,
      analyser: params.analyser,
      startCtxTime: params.startCtxTime,
      durationSec: Math.max(0.05, params.durationSec),
      isStreaming: false,
      streamEnded: true,
      envelope: params.envelope,
      voiceSegments,
      liveNoiseFloor: params.envelope.noiseFloor,
      liveSpeechPeak: params.envelope.speechPeak,
      timeline,
      voicedTimeline,
      timeDomainBuf: new Float32Array(params.analyser.fftSize),
      freqBuf: new Uint8Array(params.analyser.frequencyBinCount),
      binHz: (params.ctx.sampleRate || 48000) / params.analyser.fftSize,
      prevSmoothedRms: 0,
    };
    this.lastVoicedProgress = 0;
    this.lastSamplePerfMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lastEvaluatedPerfMs = -Infinity;
  }

  public startPcmStreamSession(params: {
    token: number;
    ctx: AudioContext;
    analyser: AnalyserNode;
    startCtxTime: number;
    text?: string;
    rate?: number;
  }): void {
    const timeline =
      params.text && params.text.trim()
        ? buildSpeechCueTimeline(params.text, params.rate ?? 1.0)
        : null;
    const voicedTimeline = buildVoicedCueTimeline(timeline);

    this.source = {
      kind: 'audio-analyser',
      token: params.token,
      ctx: params.ctx,
      analyser: params.analyser,
      startCtxTime: params.startCtxTime,
      durationSec: Math.max(0.6, timeline?.estimatedDurationSec ?? 1.5),
      isStreaming: true,
      streamEnded: false,
      envelope: null,
      voiceSegments: [],
      liveNoiseFloor: 0.008,
      liveSpeechPeak: 0.16,
      timeline,
      voicedTimeline,
      timeDomainBuf: new Float32Array(params.analyser.fftSize),
      freqBuf: new Uint8Array(params.analyser.frequencyBinCount),
      binHz: (params.ctx.sampleRate || 48000) / params.analyser.fftSize,
      prevSmoothedRms: 0,
    };
    this.lastVoicedProgress = 0;
    this.lastSamplePerfMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lastEvaluatedPerfMs = -Infinity;
  }

  public updatePcmStreamDuration(token: number, scheduledTotalSec: number, ended = false): void {
    if (!this.source || this.source.kind !== 'audio-analyser' || this.source.token !== token) {
      return;
    }
    this.source.durationSec = Math.max(0.1, scheduledTotalSec);
    if (ended) {
      this.source.streamEnded = true;
    }
  }

  public startSpeechSynthesisSession(params: {
    token: number;
    text: string;
    rate: number;
  }): void {
    const timeline = buildSpeechCueTimeline(params.text, params.rate);
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.source = {
      kind: 'speech-synthesis',
      token: params.token,
      timeline,
      speechRate: Math.max(0.65, Math.min(1.5, params.rate || 1.0)),
      startedAtPerfMs: null, // Strictly wait until utterance.onstart fires
      pausedAtPerfMs: null,
      accumulatedPauseMs: 0,
      anchoredProgress: 0,
      anchoredAtPerfMs: nowMs,
      effectiveDurationSec: Math.max(0.4, timeline.estimatedDurationSec),
      lastSamplePerfMs: nowMs,
    };
    this.lastEvaluatedPerfMs = -Infinity;
    resetWeightsInPlace(this.targetWeights, 'speech-synthesis');
  }

  public markSynthesisStarted(token: number, nowMs = this.now()): void {
    if (!this.source || this.source.kind !== 'speech-synthesis' || this.source.token !== token) {
      return;
    }
    this.source.startedAtPerfMs = nowMs;
    this.source.anchoredAtPerfMs = nowMs;
    this.source.pausedAtPerfMs = null;
    this.source.accumulatedPauseMs = 0;
  }

  public markSynthesisPaused(token: number, nowMs = this.now()): void {
    if (!this.source || this.source.kind !== 'speech-synthesis' || this.source.token !== token) {
      return;
    }
    if (this.source.pausedAtPerfMs === null) {
      this.source.pausedAtPerfMs = nowMs;
    }
  }

  public markSynthesisResumed(token: number, nowMs = this.now()): void {
    if (!this.source || this.source.kind !== 'speech-synthesis' || this.source.token !== token) {
      return;
    }
    if (this.source.pausedAtPerfMs !== null) {
      this.source.accumulatedPauseMs += Math.max(0, nowMs - this.source.pausedAtPerfMs);
      this.source.pausedAtPerfMs = null;
      this.source.anchoredAtPerfMs = nowMs;
    }
  }

  public updateSynthesisBoundary(
    token: number,
    charIndex: number,
    elapsedSec?: number,
    nowMs = this.now()
  ): void {
    if (!this.source || this.source.kind !== 'speech-synthesis' || this.source.token !== token) {
      return;
    }
    if (this.source.startedAtPerfMs === null) {
      this.source.startedAtPerfMs = nowMs;
    }
    const targetRatio = findCueRatioByCharIndex(this.source.timeline, charIndex);
    if (targetRatio === null) return;

    this.source.anchoredProgress = targetRatio;
    this.source.anchoredAtPerfMs = nowMs;

    const realElapsed =
      typeof elapsedSec === 'number' && elapsedSec > 0.15
        ? elapsedSec
        : Math.max(0, (nowMs - this.source.startedAtPerfMs - this.source.accumulatedPauseMs) / 1000);
    if (realElapsed > 0.2 && targetRatio > 0.08 && targetRatio < 0.96) {
      const observedDuration = realElapsed / targetRatio;
      this.source.effectiveDurationSec = Math.max(
        0.5,
        Math.min(90, lerp(this.source.effectiveDurationSec, observedDuration, 0.45))
      );
    }
  }

  public stop(expectedToken?: number): void {
    if (typeof expectedToken === 'number' && this.source && this.source.token !== expectedToken) {
      return;
    }
    this.source = null;
    this.lastEvaluatedPerfMs = -Infinity;
    resetWeightsInPlace(this.targetWeights, 'idle');
    resetWeightsInPlace(this.smoothedWeights, 'idle');
  }

  public isActive(): boolean {
    return this.source !== null;
  }

  public getCurrentToken(): number | null {
    return this.source ? this.source.token : null;
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  /**
   * Computes current target weights and smooths them toward the current frame.
   * Allocation-free on the hot path so R3F `useFrame` can call this at 60-120fps.
   */
  public sampleFrame(nowMs = this.now()): LipSyncMorphWeights {
    if (Math.abs(nowMs - this.lastEvaluatedPerfMs) < 2) {
      return this.smoothedWeights;
    }
    this.lastEvaluatedPerfMs = nowMs;

    const dt = Math.min(0.08, Math.max(0.001, (nowMs - (this.lastSamplePerfMs || nowMs)) / 1000));
    this.lastSamplePerfMs = nowMs;

    if (!this.source) {
      resetWeightsInPlace(this.targetWeights, 'idle');
      this.dampTowardsTarget(dt);
      this.smoothedWeights.isActive = false;
      this.smoothedWeights.mode = 'idle';
      return this.smoothedWeights;
    }

    if (this.source.kind === 'audio-analyser') {
      this.evaluateAudioAnalyserSource(this.source);
    } else {
      this.evaluateSynthesisSource(this.source, nowMs);
    }

    this.dampTowardsTarget(dt);
    this.smoothedWeights.isActive = this.targetWeights.isActive;
    this.smoothedWeights.mode = this.targetWeights.mode;
    this.smoothedWeights.isVoiced = this.targetWeights.isVoiced;
    this.smoothedWeights.activeViseme = this.targetWeights.activeViseme;
    return this.smoothedWeights;
  }

  public getTimingCapabilities(): TimingProviderCapabilities {
    const mode: LipSyncMode = this.source ? this.source.kind : 'idle';
    const hasText = Boolean(this.source?.timeline && this.source.timeline.cues.length > 0);
    return describeTimingCapabilities(mode, hasText);
  }

  public getNormalizedSyncFrame(nowMs = this.now()): NormalizedSpeechSyncFrame {
    const weights = this.sampleFrame(nowMs);
    const caps = this.getTimingCapabilities();
    const confidence =
      !this.source
        ? 0
        : this.source.kind === 'audio-analyser'
        ? this.source.isStreaming
          ? 0.72
          : 0.85
        : 0.55;
    return {
      weights,
      providerKind: caps.providerKind,
      timingConfidence: confidence,
      voicedProgress: this.lastVoicedProgress,
    };
  }

  private evaluateAudioAnalyserSource(src: ActiveAudioAnalyserSource): void {
    resetWeightsInPlace(this.targetWeights, 'audio-analyser');

    const elapsedSec = Math.max(0, src.ctx.currentTime - src.startCtxTime);
    if (src.streamEnded && elapsedSec > src.durationSec + 0.08) {
      return;
    }

    // 1. Live Web Audio time-domain RMS & ZCR
    src.analyser.getFloatTimeDomainData(src.timeDomainBuf);
    let sumSq = 0;
    let crossings = 0;
    let prevSign = 0;
    const tdLen = src.timeDomainBuf.length;
    for (let i = 0; i < tdLen; i += 1) {
      const sample = src.timeDomainBuf[i];
      sumSq += sample * sample;
      const sign = sample > 0.002 ? 1 : sample < -0.002 ? -1 : 0;
      if (sign !== 0) {
        if (prevSign !== 0 && sign !== prevSign) crossings += 1;
        prevSign = sign;
      }
    }
    const liveRawRms = Math.sqrt(sumSq / Math.max(1, tdLen));
    const liveZcr = crossings / Math.max(1, tdLen);

    let combinedNormRms = 0;
    let effectiveZcr = liveZcr;

    if (src.envelope) {
      const envDenom = Math.max(0.03, src.envelope.speechPeak - src.envelope.noiseFloor);
      const liveNormRms = clamp01((liveRawRms - src.envelope.noiseFloor) / envDenom);

      // 2. Calibrated envelope + 24ms lookahead to compensate for morph smoothing latency
      const envNow = sampleEnvelopeAt(src.envelope, elapsedSec);
      const envAhead = sampleEnvelopeAt(src.envelope, Math.min(src.durationSec, elapsedSec + 0.024));
      combinedNormRms = clamp01(
        liveNormRms * 0.48 + envNow.normRms * 0.24 + envAhead.normRms * 0.28
      );
      effectiveZcr = liveZcr * 0.65 + envNow.zcr * 0.35;
    } else {
      // Adaptive running peak calibration for streaming raw PCM chunks before full duration is known
      if (liveRawRms > src.liveSpeechPeak) {
        src.liveSpeechPeak = lerp(src.liveSpeechPeak, liveRawRms, 0.35);
      } else {
        src.liveSpeechPeak = Math.max(0.08, src.liveSpeechPeak * 0.996);
      }
      if (liveRawRms > 0.001 && liveRawRms < src.liveNoiseFloor * 1.4) {
        src.liveNoiseFloor = clamp01(lerp(src.liveNoiseFloor, liveRawRms * 1.35, 0.12));
      }
      const denom = Math.max(0.04, src.liveSpeechPeak - src.liveNoiseFloor);
      combinedNormRms = clamp01((liveRawRms - src.liveNoiseFloor) / denom);
    }

    src.prevSmoothedRms = lerp(src.prevSmoothedRms, combinedNormRms, 0.55);

    this.targetWeights.isActive = true;
    this.targetWeights.mode = 'audio-analyser';
    this.targetWeights.overallLevel = combinedNormRms;

    // 3. Silence / inter-word pause gating — strictly closes mouth during real pauses
    if (combinedNormRms < 0.035) {
      this.targetWeights.isVoiced = false;
      this.targetWeights.activeViseme = 'viseme_sil';
      this.targetWeights.visemes.viseme_sil = 0.28;
      this.targetWeights.mouthClose = 0.14;
      return;
    }

    this.targetWeights.isVoiced = true;

    // 4. Formant spectral band analysis from live AnalyserNode FFT
    src.analyser.getByteFrequencyData(src.freqBuf);
    const avgBand = (minHz: number, maxHz: number): number => {
      const iStart = Math.max(1, Math.floor(minHz / src.binHz));
      const iEnd = Math.min(src.freqBuf.length - 1, Math.ceil(maxHz / src.binHz));
      if (iEnd <= iStart) return 0;
      let sum = 0;
      for (let i = iStart; i <= iEnd; i += 1) {
        sum += src.freqBuf[i];
      }
      return sum / ((iEnd - iStart + 1) * 255);
    };

    const f0 = avgBand(85, 320); // Fundamental voicing
    const f1 = avgBand(320, 880); // Open vowel energy (A/O)
    const f2Back = avgBand(880, 1400); // Mid/back vowels
    const f2Front = avgBand(1400, 2600); // Front/spread vowels (E/I)
    const highSib = avgBand(2800, 6800); // Sibilance / fricatives (S/SH/F/TH)

    const totalSpec = Math.max(0.01, f0 + f1 + f2Back + f2Front + highSib);
    const openRatio = clamp01((f1 * 1.35 + f2Back * 0.45) / totalSpec);
    const frontRatio = clamp01((f2Front * 1.45) / totalSpec);
    const backRoundRatio = clamp01(((f0 * 0.9 + f1 * 0.45) - f2Front * 0.6) / totalSpec);
    const fricativeRatio = clamp01((highSib * 1.7) / totalSpec + Math.max(0, effectiveZcr - 0.14) * 1.8);

    // Acoustic baseline viseme candidates
    let wAA = clamp01(openRatio * 1.25 - fricativeRatio * 0.4) * combinedNormRms;
    let wE = clamp01(frontRatio * 0.95 * (0.4 + openRatio * 0.8)) * combinedNormRms;
    let wI = clamp01(frontRatio * 1.15 * (1 - openRatio * 0.45)) * combinedNormRms;
    let wO = clamp01(backRoundRatio * 1.2 * (0.35 + openRatio * 0.7)) * combinedNormRms;
    let wU = clamp01(backRoundRatio * 1.3 * (1 - openRatio * 0.55)) * combinedNormRms;
    let wSS = clamp01(fricativeRatio * 1.05 * (1 - f0 * 0.8)) * combinedNormRms;
    let wCH = clamp01(fricativeRatio * 0.8 * f2Front * 1.8) * combinedNormRms;
    let wFF = 0;
    let wTH = 0;
    let wPP = 0;
    let wDD = 0;
    let wKK = 0;
    let wNN = 0;
    let wRR = 0;

    // 5. Co-articulate cleanly using voiced-burst aligned lexical cue (skipping uniform drift over pauses)
    const voicedTl = src.voicedTimeline ?? src.timeline;
    let cueJawGuide = 0.55;
    if (voicedTl && voicedTl.cues.length > 0) {
      let progress: number;
      if (src.envelope && src.voiceSegments.length > 0) {
        progress = alignTimeToVoicedSegments(src.envelope, src.voiceSegments, elapsedSec);
      } else {
        const expectedSpan = Math.max(0.45, src.timeline?.estimatedDurationSec || src.durationSec);
        progress = clamp01(elapsedSec / expectedSpan);
      }
      this.lastVoicedProgress = progress;

      const cue = pickVoicedLexicalCue(voicedTl, progress, findCueAtRatio);
      if (cue) {
        cueJawGuide = cue.jawScale;
        const guideStrength = 0.44 * combinedNormRms;
        switch (cue.viseme) {
          case 'viseme_PP':
            wPP += guideStrength * 1.15;
            wAA *= 0.35;
            break;
          case 'viseme_FF':
            wFF += guideStrength * 1.1;
            wAA *= 0.45;
            break;
          case 'viseme_TH':
            wTH += guideStrength * 0.95;
            break;
          case 'viseme_DD':
            wDD += guideStrength * 0.85;
            break;
          case 'viseme_kk':
            wKK += guideStrength * 0.85;
            break;
          case 'viseme_CH':
            wCH += guideStrength * 0.95;
            break;
          case 'viseme_SS':
            wSS += guideStrength * 0.95;
            break;
          case 'viseme_nn':
            wNN += guideStrength * 0.85;
            break;
          case 'viseme_RR':
            wRR += guideStrength * 0.85;
            break;
          case 'viseme_aa':
            wAA += guideStrength * 0.85;
            break;
          case 'viseme_E':
            wE += guideStrength * 0.85;
            break;
          case 'viseme_I':
            wI += guideStrength * 0.85;
            break;
          case 'viseme_O':
            wO += guideStrength * 0.9;
            break;
          case 'viseme_U':
            wU += guideStrength * 0.9;
            break;
          default:
            break;
        }
      }
    }

    // Also boost bilabial closure briefly on sharp RMS onset drops inside speech
    if (src.prevSmoothedRms - combinedNormRms > 0.22 && combinedNormRms < 0.24) {
      wPP = Math.max(wPP, 0.36);
    }

    // Populate visemes (clamped to realistic range so mesh never tears/clips)
    const vis = this.targetWeights.visemes;
    vis.viseme_aa = clamp01(wAA * 0.72);
    vis.viseme_E = clamp01(wE * 0.62);
    vis.viseme_I = clamp01(wI * 0.56);
    vis.viseme_O = clamp01(wO * 0.66);
    vis.viseme_U = clamp01(wU * 0.64);
    vis.viseme_SS = clamp01(wSS * 0.54);
    vis.viseme_CH = clamp01(wCH * 0.54);
    vis.viseme_FF = clamp01(wFF * 0.68);
    vis.viseme_TH = clamp01(wTH * 0.55);
    vis.viseme_PP = clamp01(wPP * 0.78);
    vis.viseme_DD = clamp01(wDD * 0.52);
    vis.viseme_kk = clamp01(wKK * 0.5);
    vis.viseme_nn = clamp01(wNN * 0.5);
    vis.viseme_RR = clamp01(wRR * 0.5);

    this.targetWeights.activeViseme = this.pickDominantViseme(vis);

    // Jaw opening combines F1 openness + RMS amplitude + consonant constriction
    const closureSuppressor = clamp01(1 - vis.viseme_PP * 1.15 - vis.viseme_FF * 0.45);
    const rawJaw =
      combinedNormRms *
      (0.32 + openRatio * 0.42 + cueJawGuide * 0.26) *
      closureSuppressor;
    this.targetWeights.jawOpen = clamp01(Math.min(0.62, rawJaw * 0.78));

    // Supporting ARKit mouth shaping
    const roundAmount = clamp01(vis.viseme_O * 0.7 + vis.viseme_U * 0.95);
    const spreadAmount = clamp01(vis.viseme_E * 0.75 + vis.viseme_I * 0.9);

    this.targetWeights.mouthFunnel = clamp01(vis.viseme_O * 0.48 + vis.viseme_CH * 0.32);
    this.targetWeights.mouthPucker = clamp01(vis.viseme_U * 0.58 + vis.viseme_O * 0.2);
    this.targetWeights.mouthStretch = clamp01(spreadAmount * 0.36 * (1 - roundAmount));
    this.targetWeights.mouthClose = clamp01(vis.viseme_PP * 0.65);
    this.targetWeights.mouthPress = clamp01(vis.viseme_PP * 0.48);
    this.targetWeights.mouthRollLower = clamp01(vis.viseme_FF * 0.55);
    this.targetWeights.mouthUpperUp = clamp01(
      (vis.viseme_FF * 0.28 + vis.viseme_SS * 0.24 + vis.viseme_aa * 0.14) * closureSuppressor
    );
    this.targetWeights.mouthLowerDown = clamp01(this.targetWeights.jawOpen * 0.26);
    this.targetWeights.roundingAttenuation = clamp01(
      roundAmount * 0.85 + vis.viseme_PP * 0.9 + vis.viseme_FF * 0.5
    );
  }

  private evaluateSynthesisSource(src: ActiveSynthesisSource, nowMs: number): void {
    resetWeightsInPlace(this.targetWeights, 'speech-synthesis');

    // Do NOT animate until SpeechSynthesisUtterance.onstart actually fires!
    if (src.startedAtPerfMs === null) {
      return;
    }

    this.targetWeights.isActive = true;
    this.targetWeights.mode = 'speech-synthesis';

    // Freeze neatly when utterance is paused
    const effectiveNowMs = src.pausedAtPerfMs !== null ? src.pausedAtPerfMs : nowMs;
    const elapsedSinceAnchorSec = Math.max(0, (effectiveNowMs - src.anchoredAtPerfMs) / 1000);
    const progress = clamp01(
      src.anchoredProgress + elapsedSinceAnchorSec / Math.max(0.4, src.effectiveDurationSec)
    );

    const cue = findCueAtRatio(src.timeline, progress);
    if (!cue || cue.isSilence || src.pausedAtPerfMs !== null) {
      this.targetWeights.isVoiced = false;
      this.targetWeights.overallLevel = 0;
      this.targetWeights.activeViseme = 'viseme_sil';
      this.targetWeights.visemes.viseme_sil = 0.3;
      this.targetWeights.mouthClose = 0.12;
      return;
    }

    // Smooth syllable envelope across cue span (peaks in middle of phoneme/vowel, eases at edges)
    const span = Math.max(0.0001, cue.endRatio - cue.startRatio);
    const localU = clamp01((progress - cue.startRatio) / span);
    const syllableCurve = 0.55 + 0.45 * Math.sin(localU * Math.PI);
    const level = clamp01(cue.energy * syllableCurve);

    this.targetWeights.isVoiced = true;
    this.targetWeights.overallLevel = level;
    this.targetWeights.activeViseme = cue.viseme;

    const vis = this.targetWeights.visemes;
    vis[cue.viseme] = clamp01(level * (cue.isBilabial ? 0.78 : 0.72));

    // Co-articulate smoothly with adjacent cue
    const nextCue = findCueAtRatio(src.timeline, Math.min(1, cue.endRatio + 0.001));
    if (nextCue && !nextCue.isSilence && nextCue !== cue && localU > 0.65) {
      const coWeight = ((localU - 0.65) / 0.35) * 0.28 * nextCue.energy;
      vis[nextCue.viseme] = Math.max(vis[nextCue.viseme], clamp01(coWeight));
    }

    const closureSuppressor = cue.isBilabial ? 0.05 : cue.isLabiodental ? 0.45 : 1;
    this.targetWeights.jawOpen = clamp01(cue.jawScale * syllableCurve * 0.58 * closureSuppressor);
    this.targetWeights.mouthFunnel = clamp01(vis.viseme_O * 0.48 + vis.viseme_CH * 0.3);
    this.targetWeights.mouthPucker = clamp01(vis.viseme_U * 0.58 + vis.viseme_O * 0.22);
    this.targetWeights.mouthStretch = clamp01((vis.viseme_E * 0.75 + vis.viseme_I * 0.85) * 0.34);
    this.targetWeights.mouthClose = clamp01(vis.viseme_PP * 0.68);
    this.targetWeights.mouthPress = clamp01(vis.viseme_PP * 0.48);
    this.targetWeights.mouthRollLower = clamp01(vis.viseme_FF * 0.55);
    this.targetWeights.mouthUpperUp = clamp01(
      (vis.viseme_FF * 0.26 + vis.viseme_SS * 0.22 + vis.viseme_aa * 0.12) * closureSuppressor
    );
    this.targetWeights.mouthLowerDown = clamp01(this.targetWeights.jawOpen * 0.25);
    this.targetWeights.roundingAttenuation = clamp01(
      (vis.viseme_O * 0.7 + vis.viseme_U * 0.95) * 0.85 + vis.viseme_PP * 0.9
    );
  }

  private pickDominantViseme(vis: Record<LipSyncVisemeName, number>): LipSyncVisemeName {
    let best: LipSyncVisemeName = 'viseme_sil';
    let bestVal = 0.04;
    for (let i = 0; i < VERIFIED_GLB_VISEMES.length; i += 1) {
      const name = VERIFIED_GLB_VISEMES[i];
      if (name === 'viseme_sil') continue;
      if (vis[name] > bestVal) {
        bestVal = vis[name];
        best = name;
      }
    }
    return best;
  }

  private dampTowardsTarget(dt: number): void {
    const smoothScalar = (curr: number, target: number, attackSpeed: number, releaseSpeed: number) => {
      const speed = target >= curr ? attackSpeed : releaseSpeed;
      const alpha = 1 - Math.exp(-speed * dt);
      const next = curr + (target - curr) * alpha;
      return next < 0.002 ? 0 : clamp01(next);
    };

    const s = this.smoothedWeights;
    const t = this.targetWeights;

    s.overallLevel = smoothScalar(s.overallLevel, t.overallLevel, 28, 20);
    s.jawOpen = smoothScalar(s.jawOpen, t.jawOpen, 30, 22);
    s.mouthFunnel = smoothScalar(s.mouthFunnel, t.mouthFunnel, 26, 20);
    s.mouthPucker = smoothScalar(s.mouthPucker, t.mouthPucker, 26, 20);
    s.mouthClose = smoothScalar(s.mouthClose, t.mouthClose, 32, 24);
    s.mouthPress = smoothScalar(s.mouthPress, t.mouthPress, 30, 22);
    s.mouthStretch = smoothScalar(s.mouthStretch, t.mouthStretch, 26, 20);
    s.mouthRollLower = smoothScalar(s.mouthRollLower, t.mouthRollLower, 28, 22);
    s.mouthUpperUp = smoothScalar(s.mouthUpperUp, t.mouthUpperUp, 26, 20);
    s.mouthLowerDown = smoothScalar(s.mouthLowerDown, t.mouthLowerDown, 26, 20);
    s.roundingAttenuation = smoothScalar(s.roundingAttenuation, t.roundingAttenuation, 24, 18);

    for (let i = 0; i < VERIFIED_GLB_VISEMES.length; i += 1) {
      const k = VERIFIED_GLB_VISEMES[i];
      s.visemes[k] = smoothScalar(s.visemes[k], t.visemes[k], 32, 24);
    }
  }
}
