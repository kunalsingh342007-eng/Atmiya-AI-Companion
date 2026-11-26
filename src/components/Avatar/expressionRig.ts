import * as THREE from 'three';
import {
  AVATAR_EMOTIONS,
  AVATAR_GESTURE_HINTS,
  AvatarEmotion,
  AvatarGestureHint,
  AvatarState,
  CoreCompanionEmotion,
  StructuredEmotionResponse,
  UnifiedAnimationState,
} from '../../types/companion';
import type { LipSyncMorphWeights, LipSyncVisemeName } from './lipSync';

export type AvatarGesture = 'none' | 'wave' | 'nod';

export interface RigMorphEntry {
  mesh: THREE.Mesh;
  dict: Record<string, number>;
}

export interface HandFingerRig {
  thumb: THREE.Object3D[];
  index: THREE.Object3D[];
  middle: THREE.Object3D[];
  ring: THREE.Object3D[];
  pinky: THREE.Object3D[];
}

export interface DetectedRigBones {
  hips: THREE.Object3D | null;
  spine: THREE.Object3D | null;
  spine1: THREE.Object3D | null;
  spine2: THREE.Object3D | null;
  neck: THREE.Object3D | null;
  head: THREE.Object3D | null;
  headTop: THREE.Object3D | null;
  leftEye: THREE.Object3D | null;
  rightEye: THREE.Object3D | null;
  jaw: THREE.Object3D | null;
  leftShoulder: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
  leftForeArm: THREE.Object3D | null;
  leftHand: THREE.Object3D | null;
  rightShoulder: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  rightHand: THREE.Object3D | null;
  leftFingers: HandFingerRig;
  rightFingers: HandFingerRig;
  leftUpLeg: THREE.Object3D | null;
  leftLeg: THREE.Object3D | null;
  leftFoot: THREE.Object3D | null;
  leftToeBase: THREE.Object3D | null;
  rightUpLeg: THREE.Object3D | null;
  rightLeg: THREE.Object3D | null;
  rightFoot: THREE.Object3D | null;
  rightToeBase: THREE.Object3D | null;
}

export interface VerifiedFullBodySummary {
  torsoChain: {
    hips: string | null;
    spine: string | null;
    spine1: string | null;
    spine2: string | null;
  };
  leftLegChain: {
    upLeg: string | null;
    leg: string | null;
    foot: string | null;
    toeBase: string | null;
  };
  rightLegChain: {
    upLeg: string | null;
    leg: string | null;
    foot: string | null;
    toeBase: string | null;
  };
  hasHips: boolean;
  hasTorsoBreathing: boolean;
  hasLeftLeg: boolean;
  hasRightLeg: boolean;
  hasFeet: boolean;
  hasToes: boolean;
  limitations: string[];
}

export interface VerifiedArmHandSummary {
  rightArmChain: {
    shoulder: string | null;
    arm: string | null;
    foreArm: string | null;
    hand: string | null;
  };
  leftArmChain: {
    shoulder: string | null;
    arm: string | null;
    foreArm: string | null;
    hand: string | null;
  };
  rightFingerBones: string[];
  leftFingerBones: string[];
  preferredWaveSide: 'right' | 'left' | 'none';
  hasRightArmReady: boolean;
  hasLeftArmReady: boolean;
  hasFingerRig: boolean;
  limitations: string[];
}

export type VerifiedSkeletonBoneKey = 'head' | 'neck' | 'spine' | 'spine1' | 'spine2';

export interface VerifiedSkeletonBoneInfo {
  key: VerifiedSkeletonBoneKey;
  expectedName: 'Head' | 'Neck' | 'Spine' | 'Spine1' | 'Spine2';
  detected: boolean;
  actualName: string | null;
  parentName: string | null;
  bindRotationDeg: [number, number, number] | null;
}

export type VerifiedSkeletonMap = Record<VerifiedSkeletonBoneKey, VerifiedSkeletonBoneInfo>;

export interface VerifiedCoreMorphs {
  eyeBlinkLeft: boolean;
  eyeBlinkRight: boolean;
  jawOpen: boolean;
  mouthSmileLeft: boolean;
  mouthSmileRight: boolean;
  visemes: string[];
}

export interface RigCapabilities {
  hasBlinking: boolean;
  hasSpeechMorphs: boolean;
  hasVisemeMorphs: boolean;
  hasSmileMorphs: boolean;
  hasJawBone: boolean;
  hasEyeBones: boolean;
  hasHeadNeckBones: boolean;
  hasHeadBone: boolean;
  hasNeckBone: boolean;
  hasSpineChain: boolean;
  hasArmBones: boolean;
  hasHandFingers: boolean;
  hasHipsAndLegs: boolean;
  hasTorsoBreathing: boolean;
  hasExpressionMorphs: boolean;
}

export interface MorphSlotBinding {
  influences: number[];
  index: number;
  morphName: string;
  speed: number;
}

export const SUPPORTED_VISEME_NAMES = [
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

export type VisemeMorphName = (typeof SUPPORTED_VISEME_NAMES)[number];

// Logical facial channels mapped to exact GLB / ARKit / Ready Player Me / VRoid morph names
const CHANNEL_ALIASES = {
  blinkLeft: ['eyeBlinkLeft', 'EyeBlinkLeft', 'blinkLeft', 'Blink_L', 'Fcl_EYE_Close_L', 'Blink'],
  blinkRight: ['eyeBlinkRight', 'EyeBlinkRight', 'blinkRight', 'Blink_R', 'Fcl_EYE_Close_R', 'Blink'],
  smileLeft: ['mouthSmileLeft', 'MouthSmileLeft', 'smileLeft', 'Fcl_MTH_Fun', 'Smile', 'Joy'],
  smileRight: ['mouthSmileRight', 'MouthSmileRight', 'smileRight', 'Fcl_MTH_Fun', 'Smile', 'Joy'],
  frownLeft: ['mouthFrownLeft', 'MouthFrownLeft', 'frownLeft', 'Fcl_MTH_Sorrow', 'Sorrow'],
  frownRight: ['mouthFrownRight', 'MouthFrownRight', 'frownRight', 'Fcl_MTH_Sorrow', 'Sorrow'],
  browInnerUp: ['browInnerUp', 'BrowInnerUp', 'Fcl_BRW_Sorrow'],
  browOuterUpLeft: ['browOuterUpLeft', 'BrowOuterUpLeft', 'Fcl_BRW_Surprised'],
  browOuterUpRight: ['browOuterUpRight', 'BrowOuterUpRight', 'Fcl_BRW_Surprised'],
  browDownLeft: ['browDownLeft', 'BrowDownLeft', 'Fcl_BRW_Angry'],
  browDownRight: ['browDownRight', 'BrowDownRight', 'Fcl_BRW_Angry'],
  eyeWideLeft: ['eyeWideLeft', 'EyeWideLeft', 'Fcl_EYE_Surprised'],
  eyeWideRight: ['eyeWideRight', 'EyeWideRight', 'Fcl_EYE_Surprised'],
  eyeSquintLeft: ['eyeSquintLeft', 'EyeSquintLeft', 'Fcl_EYE_Joy_L'],
  eyeSquintRight: ['eyeSquintRight', 'EyeSquintRight', 'Fcl_EYE_Joy_R'],
  cheekSquintLeft: ['cheekSquintLeft', 'CheekSquintLeft'],
  cheekSquintRight: ['cheekSquintRight', 'CheekSquintRight'],
  jawOpen: ['jawOpen', 'JawOpen', 'mouthOpen', 'A', 'Fcl_MTH_A', 'mouth_open'],
  mouthClose: ['mouthClose', 'MouthClose'],
  mouthFunnel: ['mouthFunnel', 'MouthFunnel', 'O', 'Fcl_MTH_O'],
  mouthPucker: ['mouthPucker', 'MouthPucker', 'U', 'Fcl_MTH_U'],
  mouthStretchLeft: ['mouthStretchLeft', 'MouthStretchLeft', 'E', 'Fcl_MTH_E'],
  mouthStretchRight: ['mouthStretchRight', 'MouthStretchRight'],
  mouthPressLeft: ['mouthPressLeft', 'MouthPressLeft'],
  mouthPressRight: ['mouthPressRight', 'MouthPressRight'],
  mouthRollLower: ['mouthRollLower', 'MouthRollLower'],
  mouthRollUpper: ['mouthRollUpper', 'MouthRollUpper'],
  mouthLowerDownLeft: ['mouthLowerDownLeft', 'MouthLowerDownLeft'],
  mouthLowerDownRight: ['mouthLowerDownRight', 'MouthLowerDownRight'],
  mouthUpperUpLeft: ['mouthUpperUpLeft', 'MouthUpperUpLeft'],
  mouthUpperUpRight: ['mouthUpperUpRight', 'MouthUpperUpRight'],
  eyeLookUpLeft: ['eyeLookUpLeft', 'EyeLookUpLeft'],
  eyeLookUpRight: ['eyeLookUpRight', 'EyeLookUpRight'],
  eyeLookDownLeft: ['eyeLookDownLeft', 'EyeLookDownLeft'],
  eyeLookDownRight: ['eyeLookDownRight', 'EyeLookDownRight'],
  eyeLookInLeft: ['eyeLookInLeft', 'EyeLookInLeft'],
  eyeLookOutLeft: ['eyeLookOutLeft', 'EyeLookOutLeft'],
  eyeLookInRight: ['eyeLookInRight', 'EyeLookInRight'],
  eyeLookOutRight: ['eyeLookOutRight', 'EyeLookOutRight'],
  visemeSil: ['viseme_sil'],
  visemePP: ['viseme_PP'],
  visemeFF: ['viseme_FF'],
  visemeTH: ['viseme_TH'],
  visemeDD: ['viseme_DD'],
  visemeKK: ['viseme_kk'],
  visemeCH: ['viseme_CH'],
  visemeSS: ['viseme_SS'],
  visemeNN: ['viseme_nn'],
  visemeRR: ['viseme_RR'],
  visemeAA: ['viseme_aa'],
  visemeE: ['viseme_E'],
  visemeI: ['viseme_I'],
  visemeO: ['viseme_O'],
  visemeU: ['viseme_U'],
} as const;

export type FacialChannel = keyof typeof CHANNEL_ALIASES;

const ALL_CHANNELS = Object.keys(CHANNEL_ALIASES) as FacialChannel[];

const SPEECH_CHANNELS: FacialChannel[] = [
  'jawOpen',
  'mouthClose',
  'mouthFunnel',
  'mouthPucker',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'visemeSil',
  'visemePP',
  'visemeFF',
  'visemeTH',
  'visemeDD',
  'visemeKK',
  'visemeCH',
  'visemeSS',
  'visemeNN',
  'visemeRR',
  'visemeAA',
  'visemeE',
  'visemeI',
  'visemeO',
  'visemeU',
];

const SPEECH_ARTICULATION_CHANNEL_SET = new Set<FacialChannel>(SPEECH_CHANNELS);

const VISEME_CHANNEL_BY_NAME: Record<VisemeMorphName, FacialChannel> = {
  viseme_sil: 'visemeSil',
  viseme_PP: 'visemePP',
  viseme_FF: 'visemeFF',
  viseme_TH: 'visemeTH',
  viseme_DD: 'visemeDD',
  viseme_kk: 'visemeKK',
  viseme_CH: 'visemeCH',
  viseme_SS: 'visemeSS',
  viseme_nn: 'visemeNN',
  viseme_RR: 'visemeRR',
  viseme_aa: 'visemeAA',
  viseme_E: 'visemeE',
  viseme_I: 'visemeI',
  viseme_O: 'visemeO',
  viseme_U: 'visemeU',
};

export interface ExpressionPreset {
  morphs: Partial<Record<FacialChannel, number>>;
}

export const EXPRESSION_PRESETS: Record<AvatarEmotion, ExpressionPreset> = {
  neutral: {
    morphs: {
      smileLeft: 0.08,
      smileRight: 0.08,
    },
  },
  happy: {
    morphs: {
      smileLeft: 0.72,
      smileRight: 0.72,
      cheekSquintLeft: 0.42,
      cheekSquintRight: 0.42,
      eyeSquintLeft: 0.28,
      eyeSquintRight: 0.28,
      browOuterUpLeft: 0.16,
      browOuterUpRight: 0.16,
    },
  },
  smile: {
    morphs: {
      smileLeft: 0.52,
      smileRight: 0.52,
      cheekSquintLeft: 0.22,
      cheekSquintRight: 0.22,
      eyeSquintLeft: 0.14,
      eyeSquintRight: 0.14,
    },
  },
  laughing: {
    morphs: {
      smileLeft: 0.92,
      smileRight: 0.92,
      cheekSquintLeft: 0.7,
      cheekSquintRight: 0.7,
      eyeSquintLeft: 0.62,
      eyeSquintRight: 0.62,
      jawOpen: 0.34,
      browOuterUpLeft: 0.22,
      browOuterUpRight: 0.22,
    },
  },
  encouraging: {
    morphs: {
      smileLeft: 0.42,
      smileRight: 0.42,
      cheekSquintLeft: 0.24,
      cheekSquintRight: 0.24,
      eyeSquintLeft: 0.14,
      eyeSquintRight: 0.14,
      browOuterUpLeft: 0.18,
      browOuterUpRight: 0.18,
      browInnerUp: 0.14,
    },
  },
  sad: {
    morphs: {
      frownLeft: 0.62,
      frownRight: 0.62,
      browInnerUp: 0.68,
      browDownLeft: 0.25,
      browDownRight: 0.25,
      mouthPressLeft: 0.25,
      mouthPressRight: 0.25,
    },
  },
  thinking: {
    morphs: {
      browInnerUp: 0.34,
      browDownLeft: 0.24,
      eyeSquintLeft: 0.22,
      eyeSquintRight: 0.16,
      mouthPucker: 0.24,
      mouthPressLeft: 0.2,
      eyeLookUpLeft: 0.22,
      eyeLookUpRight: 0.22,
      eyeLookInLeft: 0.14,
      eyeLookOutRight: 0.14,
    },
  },
  confused: {
    morphs: {
      browDownLeft: 0.55,
      browOuterUpRight: 0.52,
      browInnerUp: 0.35,
      frownLeft: 0.28,
      frownRight: 0.22,
      mouthPucker: 0.18,
    },
  },
  surprised: {
    morphs: {
      browInnerUp: 0.78,
      browOuterUpLeft: 0.82,
      browOuterUpRight: 0.82,
      eyeWideLeft: 0.75,
      eyeWideRight: 0.75,
      jawOpen: 0.16,
      mouthFunnel: 0.12,
    },
  },
  curious: {
    morphs: {
      browOuterUpLeft: 0.45,
      browOuterUpRight: 0.2,
      browInnerUp: 0.25,
      eyeWideLeft: 0.3,
      eyeWideRight: 0.25,
      smileLeft: 0.22,
      smileRight: 0.22,
    },
  },
  worried: {
    morphs: {
      browInnerUp: 0.78,
      frownLeft: 0.48,
      frownRight: 0.48,
      eyeWideLeft: 0.24,
      eyeWideRight: 0.24,
      mouthStretchLeft: 0.22,
      mouthStretchRight: 0.22,
    },
  },
  concerned: {
    morphs: {
      browInnerUp: 0.56,
      browDownLeft: 0.22,
      browDownRight: 0.22,
      frownLeft: 0.42,
      frownRight: 0.42,
      mouthPressLeft: 0.16,
      mouthPressRight: 0.16,
      eyeSquintLeft: 0.14,
      eyeSquintRight: 0.14,
    },
  },
  empathetic: {
    morphs: {
      browInnerUp: 0.48,
      smileLeft: 0.24,
      smileRight: 0.24,
      eyeSquintLeft: 0.16,
      eyeSquintRight: 0.16,
    },
  },
  excited: {
    morphs: {
      smileLeft: 0.82,
      smileRight: 0.82,
      browOuterUpLeft: 0.55,
      browOuterUpRight: 0.55,
      browInnerUp: 0.4,
      eyeWideLeft: 0.45,
      eyeWideRight: 0.45,
      cheekSquintLeft: 0.4,
      cheekSquintRight: 0.4,
      jawOpen: 0.16,
    },
  },
  calm: {
    morphs: {
      smileLeft: 0.2,
      smileRight: 0.2,
      eyeSquintLeft: 0.08,
      eyeSquintRight: 0.08,
    },
  },
  disappointed: {
    morphs: {
      frownLeft: 0.54,
      frownRight: 0.54,
      browDownLeft: 0.3,
      browDownRight: 0.3,
      browInnerUp: 0.25,
      mouthPressLeft: 0.35,
      mouthPressRight: 0.35,
    },
  },
  winking: {
    morphs: {
      blinkLeft: 0.95,
      smileLeft: 0.62,
      smileRight: 0.45,
      cheekSquintLeft: 0.5,
      browOuterUpRight: 0.28,
    },
  },
  talking: {
    morphs: {
      smileLeft: 0.18,
      smileRight: 0.18,
      browOuterUpLeft: 0.12,
      browOuterUpRight: 0.12,
    },
  },
};

export interface InspectedRigData {
  morphMeshes: RigMorphEntry[];
  channelBindings: Record<FacialChannel, MorphSlotBinding[]>;
  uniqueMorphSlots: MorphSlotBinding[];
  bones: DetectedRigBones;
  boneInitialRotations: Map<THREE.Object3D, THREE.Euler>;
  boneInitialQuaternions: Map<THREE.Object3D, THREE.Quaternion>;
  boneInitialPositions: Map<THREE.Object3D, THREE.Vector3>;
  verifiedSkeleton: VerifiedSkeletonMap;
  verifiedArmHand: VerifiedArmHandSummary;
  verifiedFullBody: VerifiedFullBodySummary;
  skeletonLimitations: string[];
  availableMorphKeys: Set<string>;
  verifiedCoreMorphs: VerifiedCoreMorphs;
  activeSpeechMorphs: string[];
  activeVisemeMorphs: string[];
  activeBlinkMorphs: string[];
  capabilities: RigCapabilities;
  supportedExpressions: Record<AvatarEmotion, boolean>;
}

function findFirstBone(
  root: THREE.Object3D,
  boundBones: THREE.Object3D[],
  patterns: RegExp[]
): THREE.Object3D | null {
  for (const re of patterns) {
    const boundMatch = boundBones.find((b) => b.name && re.test(b.name));
    if (boundMatch) return boundMatch;
  }
  let found: THREE.Object3D | null = null;
  for (const re of patterns) {
    root.traverse((obj) => {
      if (found) return;
      const isBoneLike = (obj as THREE.Bone).isBone || obj.type === 'Bone' || obj.name.length > 0;
      if (!isBoneLike || !obj.name) return;
      if (re.test(obj.name)) {
        found = obj;
      }
    });
    if (found) break;
  }
  return found;
}

function getMorphDampSpeed(morphName: string): number {
  const lower = morphName.toLowerCase();
  if (lower.includes('blink')) return 28;
  if (
    lower.includes('jaw') ||
    lower.startsWith('viseme_') ||
    lower.includes('mouthfunnel') ||
    lower.includes('mouthpucker') ||
    lower.includes('mouthclose') ||
    lower.includes('mouthroll')
  ) {
    return 26;
  }
  return 9;
}

/**
 * Controlled deterministic normalization of explicit emotion metadata.
 * Never performs arbitrary text keyword matching; defaults safely to 'neutral'.
 */
export function normalizeAvatarEmotion(value: unknown): AvatarEmotion {
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if ((AVATAR_EMOTIONS as readonly string[]).includes(trimmed)) {
      return trimmed as AvatarEmotion;
    }
  }
  return 'neutral';
}

export function normalizeEmotionIntensity(value: unknown, fallback = 0.7): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, Number(value.toFixed(2))));
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(1, Number(parsed.toFixed(2))));
    }
  }
  return fallback;
}

export function normalizeAvatarGestureHint(value: unknown): AvatarGestureHint {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (normalized === 'tilt') return 'head_tilt';
    if (normalized === 'open_hand') return 'open_palm';
    if ((AVATAR_GESTURE_HINTS as readonly string[]).includes(normalized)) {
      return normalized as AvatarGestureHint;
    }
  }
  return 'none';
}

export function normalizeStructuredEmotionPayload(raw: unknown): StructuredEmotionResponse {
  if (typeof raw === 'string') {
    return {
      text: raw.trim(),
      emotion: 'neutral',
      intensity: 0.7,
      gesture: 'none',
    };
  }
  if (!raw || typeof raw !== 'object') {
    return {
      text: '',
      emotion: 'neutral',
      intensity: 0.7,
      gesture: 'none',
    };
  }
  const obj = raw as Record<string, unknown>;
  const rawText =
    typeof obj.text === 'string'
      ? obj.text
      : typeof obj.reply === 'string'
      ? obj.reply
      : '';
  return {
    text: rawText.trim(),
    emotion: normalizeAvatarEmotion(obj.emotion),
    intensity: normalizeEmotionIntensity(obj.intensity, 0.7),
    gesture: normalizeAvatarGestureHint(obj.gesture),
  };
}

/**
 * Maps any supported AvatarEmotion to the 4 canonical Phase 5 core emotions.
 */
export function mapToCoreEmotion(emotion?: AvatarEmotion | string | null): CoreCompanionEmotion {
  const normalized = normalizeAvatarEmotion(emotion);
  switch (normalized) {
    case 'happy':
    case 'smile':
    case 'laughing':
    case 'encouraging':
    case 'excited':
    case 'winking':
      return 'happy';
    case 'thinking':
    case 'curious':
    case 'confused':
      return 'thinking';
    case 'concerned':
    case 'sad':
    case 'worried':
    case 'empathetic':
    case 'disappointed':
      return 'concerned';
    default:
      return 'neutral';
  }
}

export interface InspectedAnimationClipRoles {
  idle: THREE.AnimationClip | null;
  greeting: THREE.AnimationClip | null;
  goodbye: THREE.AnimationClip | null;
  listening: THREE.AnimationClip | null;
  thinking: THREE.AnimationClip | null;
  speaking: THREE.AnimationClip | null;
  happy: THREE.AnimationClip | null;
  concerned: THREE.AnimationClip | null;
}

/**
 * Inspects actual GLB animation clips for semantic state roles without inventing fake clips.
 */
export function findAnimationClipsByRole(
  clips: readonly THREE.AnimationClip[]
): InspectedAnimationClipRoles {
  const match = (re: RegExp) => clips.find((c) => c && re.test(c.name || '')) ?? null;
  const waveOrGreet = match(/greet|wave|welcome|hello|hi/i);
  return {
    idle: match(/idle|breath|stand/i) || (clips.length > 0 ? clips[0] : null),
    greeting: waveOrGreet,
    goodbye: match(/goodbye|farewell|bye/i) || waveOrGreet,
    listening: match(/listen|attentive/i),
    thinking: match(/think|ponder/i),
    speaking: match(/speak|talk/i),
    happy: match(/happy|cheer|joy/i),
    concerned: match(/concern|empath|sad|worry/i),
  };
}

export function inspectGlbRig(sceneRoot: THREE.Object3D): InspectedRigData {
  const morphMeshes: RigMorphEntry[] = [];
  const availableMorphKeys = new Set<string>();
  const boundBonesSet = new Set<THREE.Object3D>();

  sceneRoot.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        morphMeshes.push({ mesh, dict: mesh.morphTargetDictionary });
        Object.keys(mesh.morphTargetDictionary).forEach((key) => availableMorphKeys.add(key));
      }
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh && (mesh as THREE.SkinnedMesh).skeleton) {
        (mesh as THREE.SkinnedMesh).skeleton.bones.forEach((b) => boundBonesSet.add(b));
      }
    }
  });

  const channelBindings = {} as Record<FacialChannel, MorphSlotBinding[]>;
  const slotRegistry = new Map<string, MorphSlotBinding>();

  ALL_CHANNELS.forEach((ch) => {
    const matchedAlias = CHANNEL_ALIASES[ch].find((alias) => availableMorphKeys.has(alias));
    const bindings: MorphSlotBinding[] = [];
    if (matchedAlias) {
      morphMeshes.forEach(({ mesh, dict }, meshIdx) => {
        const influences = mesh.morphTargetInfluences;
        const idx = dict[matchedAlias];
        if (influences && typeof idx === 'number') {
          const slotKey = `${meshIdx}:${idx}`;
          let slot = slotRegistry.get(slotKey);
          if (!slot) {
            slot = {
              influences,
              index: idx,
              morphName: matchedAlias,
              speed: getMorphDampSpeed(matchedAlias),
            };
            slotRegistry.set(slotKey, slot);
          }
          bindings.push(slot);
        }
      });
    }
    channelBindings[ch] = bindings;
  });

  const uniqueMorphSlots = Array.from(slotRegistry.values());

  const boundBones = Array.from(boundBonesSet);
  const hasChannel = (channel: FacialChannel): boolean => channelBindings[channel].length > 0;

  const findFingerChain = (sidePrefix: 'Left' | 'Right', fingerName: string): THREE.Object3D[] => {
    const chain: THREE.Object3D[] = [];
    for (let seg = 1; seg <= 4; seg += 1) {
      const pattern = new RegExp(`(^|[._:-])${sidePrefix}Hand${fingerName}${seg}$`, 'i');
      const bone = findFirstBone(sceneRoot, boundBones, [pattern]);
      if (bone) chain.push(bone);
    }
    return chain;
  };

  const leftFingers: HandFingerRig = {
    thumb: findFingerChain('Left', 'Thumb'),
    index: findFingerChain('Left', 'Index'),
    middle: findFingerChain('Left', 'Middle'),
    ring: findFingerChain('Left', 'Ring'),
    pinky: findFingerChain('Left', 'Pinky'),
  };

  const rightFingers: HandFingerRig = {
    thumb: findFingerChain('Right', 'Thumb'),
    index: findFingerChain('Right', 'Index'),
    middle: findFingerChain('Right', 'Middle'),
    ring: findFingerChain('Right', 'Ring'),
    pinky: findFingerChain('Right', 'Pinky'),
  };

  const bones: DetectedRigBones = {
    hips: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])hips$/i]),
    spine: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])spine$/i, /mixamorig:?spine$/i]),
    spine1: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])spine1$/i, /mixamorig:?spine1$/i]),
    spine2: findFirstBone(sceneRoot, boundBones, [
      /(^|[._:-])spine2$/i,
      /mixamorig:?spine2$/i,
      /upperchest|chest/i,
    ]),
    neck: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])neck$/i, /mixamorig:?neck$/i]),
    head: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])head$/i, /mixamorig:?head$/i, /bip01.*head$/i]),
    headTop: findFirstBone(sceneRoot, boundBones, [/headtop_end/i]),
    leftEye: findFirstBone(sceneRoot, boundBones, [/lefteye|eye_l|eye\.l|l_eye/i]),
    rightEye: findFirstBone(sceneRoot, boundBones, [/righteye|eye_r|eye\.r|r_eye/i]),
    jaw: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])jaw$/i, /chin/i]),
    leftShoulder: findFirstBone(sceneRoot, boundBones, [/^leftshoulder$/i, /clavicle_l|shoulder_l/i]),
    leftArm: findFirstBone(sceneRoot, boundBones, [/^leftarm$/i, /upperarm_l|arm_l/i]),
    leftForeArm: findFirstBone(sceneRoot, boundBones, [/^leftforearm$/i, /forearm_l|lowerarm_l/i]),
    leftHand: findFirstBone(sceneRoot, boundBones, [/^lefthand$/i, /hand_l/i]),
    rightShoulder: findFirstBone(sceneRoot, boundBones, [/^rightshoulder$/i, /clavicle_r|shoulder_r/i]),
    rightArm: findFirstBone(sceneRoot, boundBones, [/^rightarm$/i, /upperarm_r|arm_r/i]),
    rightForeArm: findFirstBone(sceneRoot, boundBones, [/^rightforearm$/i, /forearm_r|lowerarm_r/i]),
    rightHand: findFirstBone(sceneRoot, boundBones, [/^righthand$/i, /hand_r/i]),
    leftFingers,
    rightFingers,
    leftUpLeg: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])leftupleg$/i, /thigh_l|upleg_l/i]),
    leftLeg: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])leftleg$/i, /calf_l|shin_l|knee_l/i]),
    leftFoot: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])leftfoot$/i, /foot_l|ankle_l/i]),
    leftToeBase: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])lefttoebase$/i, /toe_l|ball_l/i]),
    rightUpLeg: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])rightupleg$/i, /thigh_r|upleg_r/i]),
    rightLeg: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])rightleg$/i, /calf_r|shin_r|knee_r/i]),
    rightFoot: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])rightfoot$/i, /foot_r|ankle_r/i]),
    rightToeBase: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])righttoebase$/i, /toe_r|ball_r/i]),
  };

  const boneInitialRotations = new Map<THREE.Object3D, THREE.Euler>();
  const boneInitialQuaternions = new Map<THREE.Object3D, THREE.Quaternion>();
  const boneInitialPositions = new Map<THREE.Object3D, THREE.Vector3>();
  const registerBone = (b: THREE.Object3D | null) => {
    if (!b) return;
    // Preserve original bind pose on userData so cached scene re-inspection never snapshots animated transforms
    if (!b.userData.__atmiyaBindEuler) {
      b.userData.__atmiyaBindEuler = b.rotation.clone();
    }
    if (!b.userData.__atmiyaBindQuat) {
      b.userData.__atmiyaBindQuat = b.quaternion.clone();
    }
    if (!b.userData.__atmiyaBindPos) {
      b.userData.__atmiyaBindPos = b.position.clone();
    }
    if (!boneInitialRotations.has(b)) {
      boneInitialRotations.set(b, (b.userData.__atmiyaBindEuler as THREE.Euler).clone());
    }
    if (!boneInitialQuaternions.has(b)) {
      boneInitialQuaternions.set(b, (b.userData.__atmiyaBindQuat as THREE.Quaternion).clone());
    }
    if (!boneInitialPositions.has(b)) {
      boneInitialPositions.set(b, (b.userData.__atmiyaBindPos as THREE.Vector3).clone());
    }
  };
  registerBone(bones.hips);
  registerBone(bones.spine);
  registerBone(bones.spine1);
  registerBone(bones.spine2);
  registerBone(bones.neck);
  registerBone(bones.head);
  registerBone(bones.headTop);
  registerBone(bones.leftEye);
  registerBone(bones.rightEye);
  registerBone(bones.jaw);
  registerBone(bones.leftShoulder);
  registerBone(bones.leftArm);
  registerBone(bones.leftForeArm);
  registerBone(bones.leftHand);
  registerBone(bones.rightShoulder);
  registerBone(bones.rightArm);
  registerBone(bones.rightForeArm);
  registerBone(bones.rightHand);
  registerBone(bones.leftUpLeg);
  registerBone(bones.leftLeg);
  registerBone(bones.leftFoot);
  registerBone(bones.leftToeBase);
  registerBone(bones.rightUpLeg);
  registerBone(bones.rightLeg);
  registerBone(bones.rightFoot);
  registerBone(bones.rightToeBase);
  [
    ...leftFingers.thumb,
    ...leftFingers.index,
    ...leftFingers.middle,
    ...leftFingers.ring,
    ...leftFingers.pinky,
    ...rightFingers.thumb,
    ...rightFingers.index,
    ...rightFingers.middle,
    ...rightFingers.ring,
    ...rightFingers.pinky,
  ].forEach(registerBone);

  const buildBoneInfo = (
    key: VerifiedSkeletonBoneKey,
    expectedName: VerifiedSkeletonBoneInfo['expectedName'],
    bone: THREE.Object3D | null
  ): VerifiedSkeletonBoneInfo => {
    if (!bone) {
      return {
        key,
        expectedName,
        detected: false,
        actualName: null,
        parentName: null,
        bindRotationDeg: null,
      };
    }
    const initEuler = boneInitialRotations.get(bone) ?? bone.rotation;
    return {
      key,
      expectedName,
      detected: true,
      actualName: bone.name || expectedName,
      parentName: bone.parent?.name || null,
      bindRotationDeg: [
        Number(THREE.MathUtils.radToDeg(initEuler.x).toFixed(1)),
        Number(THREE.MathUtils.radToDeg(initEuler.y).toFixed(1)),
        Number(THREE.MathUtils.radToDeg(initEuler.z).toFixed(1)),
      ],
    };
  };

  const verifiedSkeleton: VerifiedSkeletonMap = {
    head: buildBoneInfo('head', 'Head', bones.head),
    neck: buildBoneInfo('neck', 'Neck', bones.neck),
    spine: buildBoneInfo('spine', 'Spine', bones.spine),
    spine1: buildBoneInfo('spine1', 'Spine1', bones.spine1),
    spine2: buildBoneInfo('spine2', 'Spine2', bones.spine2),
  };

  const collectFingerNames = (handRig: HandFingerRig): string[] =>
    [...handRig.thumb, ...handRig.index, ...handRig.middle, ...handRig.ring, ...handRig.pinky].map(
      (b) => b.name
    );

  const rightFingerBones = collectFingerNames(rightFingers);
  const leftFingerBones = collectFingerNames(leftFingers);
  const hasRightArmReady = Boolean(bones.rightArm && bones.rightForeArm);
  const hasLeftArmReady = Boolean(bones.leftArm && bones.leftForeArm);
  const preferredWaveSide: 'right' | 'left' | 'none' = hasRightArmReady
    ? 'right'
    : hasLeftArmReady
    ? 'left'
    : 'none';
  const hasFingerRig = rightFingerBones.length > 0 || leftFingerBones.length > 0;

  const armHandLimitations: string[] = [];
  if (!hasRightArmReady && !hasLeftArmReady) {
    armHandLimitations.push('Upper arm/forearm bones missing; arm gestures disabled.');
  } else if (!hasRightArmReady) {
    armHandLimitations.push('Right arm chain incomplete; falling back to left arm for gestures.');
  }
  if (!bones.rightHand && !bones.leftHand) {
    armHandLimitations.push('Hand wrist bones missing; wrist wave motion skipped.');
  }
  if (!hasFingerRig) {
    armHandLimitations.push('Finger bones not detected; finger poses skipped.');
  }

  const verifiedArmHand: VerifiedArmHandSummary = {
    rightArmChain: {
      shoulder: bones.rightShoulder?.name || null,
      arm: bones.rightArm?.name || null,
      foreArm: bones.rightForeArm?.name || null,
      hand: bones.rightHand?.name || null,
    },
    leftArmChain: {
      shoulder: bones.leftShoulder?.name || null,
      arm: bones.leftArm?.name || null,
      foreArm: bones.leftForeArm?.name || null,
      hand: bones.leftHand?.name || null,
    },
    rightFingerBones,
    leftFingerBones,
    preferredWaveSide,
    hasRightArmReady,
    hasLeftArmReady,
    hasFingerRig,
    limitations: armHandLimitations,
  };

  const skeletonLimitations: string[] = [];
  if (!bones.head) {
    skeletonLimitations.push('Head bone not detected; head rotations skipped.');
  }
  if (!bones.neck) {
    skeletonLimitations.push('Neck bone not detected; cervical distribution skipped.');
  }
  if (!bones.spine || !bones.spine1 || !bones.spine2) {
    const missingSpine = (['spine', 'spine1', 'spine2'] as const)
      .filter((k) => !bones[k])
      .map((k) => verifiedSkeleton[k].expectedName);
    skeletonLimitations.push(`Missing spine bone(s): ${missingSpine.join(', ')}.`);
  }

  const hasHips = Boolean(bones.hips);
  const hasTorsoBreathing = Boolean(bones.spine2 || bones.spine1 || bones.spine);
  const hasLeftLeg = Boolean(bones.leftUpLeg && bones.leftLeg);
  const hasRightLeg = Boolean(bones.rightUpLeg && bones.rightLeg);
  const hasFeet = Boolean(bones.leftFoot || bones.rightFoot);
  const hasToes = Boolean(bones.leftToeBase || bones.rightToeBase);
  const fullBodyLimitations: string[] = [];
  if (!hasHips) {
    fullBodyLimitations.push('Hips bone missing; torso/hip weight shifts skipped.');
  }
  if (!hasTorsoBreathing) {
    fullBodyLimitations.push('Spine/chest bones missing; breathing motion skipped.');
  }
  if (!hasLeftLeg && !hasRightLeg) {
    fullBodyLimitations.push('Leg bones missing; lower-body standing posture skipped.');
  } else if (!hasLeftLeg || !hasRightLeg) {
    fullBodyLimitations.push('Only partial leg chain found; limiting lower-body motion to available side.');
  }
  if ((hasLeftLeg || hasRightLeg) && !hasFeet) {
    fullBodyLimitations.push('Foot bones missing; ankle counter-balance skipped.');
  }

  const verifiedFullBody: VerifiedFullBodySummary = {
    torsoChain: {
      hips: bones.hips?.name || null,
      spine: bones.spine?.name || null,
      spine1: bones.spine1?.name || null,
      spine2: bones.spine2?.name || null,
    },
    leftLegChain: {
      upLeg: bones.leftUpLeg?.name || null,
      leg: bones.leftLeg?.name || null,
      foot: bones.leftFoot?.name || null,
      toeBase: bones.leftToeBase?.name || null,
    },
    rightLegChain: {
      upLeg: bones.rightUpLeg?.name || null,
      leg: bones.rightLeg?.name || null,
      foot: bones.rightFoot?.name || null,
      toeBase: bones.rightToeBase?.name || null,
    },
    hasHips,
    hasTorsoBreathing,
    hasLeftLeg,
    hasRightLeg,
    hasFeet,
    hasToes,
    limitations: fullBodyLimitations,
  };

  const activeVisemeMorphs = SUPPORTED_VISEME_NAMES.filter((name) =>
    availableMorphKeys.has(name)
  );

  const verifiedCoreMorphs: VerifiedCoreMorphs = {
    eyeBlinkLeft: availableMorphKeys.has('eyeBlinkLeft'),
    eyeBlinkRight: availableMorphKeys.has('eyeBlinkRight'),
    jawOpen: availableMorphKeys.has('jawOpen'),
    mouthSmileLeft: availableMorphKeys.has('mouthSmileLeft'),
    mouthSmileRight: availableMorphKeys.has('mouthSmileRight'),
    visemes: [...activeVisemeMorphs],
  };

  const activeSpeechMorphs = Array.from(availableMorphKeys).filter((k) =>
    (
      [
        ...CHANNEL_ALIASES.jawOpen,
        ...CHANNEL_ALIASES.mouthClose,
        ...CHANNEL_ALIASES.mouthFunnel,
        ...CHANNEL_ALIASES.mouthPucker,
        ...CHANNEL_ALIASES.mouthStretchLeft,
        ...CHANNEL_ALIASES.mouthPressLeft,
        ...CHANNEL_ALIASES.mouthRollLower,
        ...CHANNEL_ALIASES.mouthLowerDownLeft,
        ...CHANNEL_ALIASES.mouthUpperUpLeft,
        ...SUPPORTED_VISEME_NAMES,
      ] as string[]
    ).includes(k)
  );

  const activeBlinkMorphs = Array.from(availableMorphKeys).filter((k) =>
    ([...CHANNEL_ALIASES.blinkLeft, ...CHANNEL_ALIASES.blinkRight] as string[]).includes(k)
  );

  const hasBlinking = activeBlinkMorphs.length > 0;
  const hasSpeechMorphs = activeSpeechMorphs.length > 0;
  const hasVisemeMorphs = activeVisemeMorphs.length > 0;
  const hasSmileMorphs = hasChannel('smileLeft') || hasChannel('smileRight');
  const hasJawBone = Boolean(bones.jaw);
  const hasEyeBones = Boolean(bones.leftEye || bones.rightEye || availableMorphKeys.has('eyeLookUpLeft'));
  const hasHeadBone = Boolean(bones.head);
  const hasNeckBone = Boolean(bones.neck);
  const hasSpineChain = Boolean(bones.spine && bones.spine1 && bones.spine2);
  const hasHeadNeckBones = hasHeadBone || hasNeckBone;
  const hasArmBones = hasRightArmReady || hasLeftArmReady;
  const hasHandFingers = hasFingerRig;
  const hasHipsAndLegs = hasHips && (hasLeftLeg || hasRightLeg);
  const hasExpressionMorphs = ALL_CHANNELS.some(
    (ch) => ch !== 'jawOpen' && !ch.startsWith('viseme') && hasChannel(ch)
  );

  const supportedExpressions = {} as Record<AvatarEmotion, boolean>;
  for (const emotion of AVATAR_EMOTIONS) {
    if (emotion === 'neutral') {
      supportedExpressions[emotion] = true;
      continue;
    }
    if (emotion === 'talking') {
      supportedExpressions[emotion] = hasSpeechMorphs || hasJawBone;
      continue;
    }
    const presetChannels = Object.keys(EXPRESSION_PRESETS[emotion].morphs) as FacialChannel[];
    const matchedMorphs = presetChannels.filter((ch) => hasChannel(ch));
    supportedExpressions[emotion] = matchedMorphs.length > 0;
  }

  return {
    morphMeshes,
    channelBindings,
    uniqueMorphSlots,
    bones,
    boneInitialRotations,
    boneInitialQuaternions,
    boneInitialPositions,
    verifiedSkeleton,
    verifiedArmHand,
    verifiedFullBody,
    skeletonLimitations,
    availableMorphKeys,
    verifiedCoreMorphs,
    activeSpeechMorphs,
    activeVisemeMorphs,
    activeBlinkMorphs,
    capabilities: {
      hasBlinking,
      hasSpeechMorphs,
      hasVisemeMorphs,
      hasSmileMorphs,
      hasJawBone,
      hasEyeBones,
      hasHeadNeckBones,
      hasHeadBone,
      hasNeckBone,
      hasSpineChain,
      hasArmBones,
      hasHandFingers,
      hasHipsAndLegs,
      hasTorsoBreathing,
      hasExpressionMorphs,
    },
    supportedExpressions,
  };
}

const _armStaticEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const _armStaticQuat = new THREE.Quaternion();

export type BodyPostureMode = 'seated' | 'standing';

export const SEATED_HIPS_DROP_Y = -0.398;
export const SEATED_HIPS_OFFSET_Z = -0.02;

/**
 * Applies a baseline natural standing rest pose to the arms & relaxed fingers
 * so Upper/Full camera presets do not display a rigid horizontal T-pose.
 * Uses bind-relative quaternion composition without touching Spine/Neck/Head.
 */
export function applyStaticRelaxedArmPose(rig: InspectedRigData): void {
  const applyDelta = (bone: THREE.Object3D | null, dx: number, dy: number, dz: number) => {
    if (!bone) return;
    const baseQ = rig.boneInitialQuaternions.get(bone);
    if (!baseQ) return;
    _armStaticEuler.set(dx, dy, dz, 'XYZ');
    _armStaticQuat.setFromEuler(_armStaticEuler);
    bone.quaternion.copy(baseQ).multiply(_armStaticQuat);
  };

  applyDelta(rig.bones.leftShoulder, 0, 0, 0);
  applyDelta(rig.bones.leftArm, 1.16, 0, 0.08);
  applyDelta(rig.bones.leftForeArm, 0, 0, 0.18);
  applyDelta(rig.bones.leftHand, 0, 0, 0.04);

  applyDelta(rig.bones.rightShoulder, 0, 0, 0);
  applyDelta(rig.bones.rightArm, 1.16, 0, -0.08);
  applyDelta(rig.bones.rightForeArm, 0, 0, -0.18);
  applyDelta(rig.bones.rightHand, 0, 0, -0.04);

  const applyRelaxedFingers = (fingers: HandFingerRig) => {
    const curls = [0.16, 0.2, 0.12];
    [fingers.index, fingers.middle, fingers.ring, fingers.pinky].forEach((chain) => {
      for (let i = 0; i < Math.min(3, chain.length); i += 1) {
        applyDelta(chain[i], curls[i], 0, 0);
      }
    });
    for (let i = 0; i < Math.min(2, fingers.thumb.length); i += 1) {
      applyDelta(fingers.thumb[i], i === 0 ? 0.08 : 0.1, 0, 0);
    }
  };

  applyRelaxedFingers(rig.bones.leftFingers);
  applyRelaxedFingers(rig.bones.rightFingers);
}

/**
 * Applies the verified natural seated pose on initial load so the character renders
 * immediately seated in the ergonomic chair without a standing/T-pose flash.
 * Verified on public/models/atmiya-avatar.glb (sole Y ≈ 0.008 on rug, hands above armrests).
 */
export function applyStaticSeatedPose(rig: InspectedRigData): void {
  const applyDelta = (bone: THREE.Object3D | null, dx: number, dy: number, dz: number) => {
    if (!bone) return;
    const baseQ = rig.boneInitialQuaternions.get(bone);
    if (!baseQ) return;
    _armStaticEuler.set(dx, dy, dz, 'XYZ');
    _armStaticQuat.setFromEuler(_armStaticEuler);
    bone.quaternion.copy(baseQ).multiply(_armStaticQuat);
  };

  if (rig.bones.hips) {
    const baseHipsPos = rig.boneInitialPositions.get(rig.bones.hips);
    if (baseHipsPos) {
      rig.bones.hips.position.set(
        baseHipsPos.x,
        baseHipsPos.y + SEATED_HIPS_DROP_Y,
        baseHipsPos.z + SEATED_HIPS_OFFSET_Z
      );
    }
    applyDelta(rig.bones.hips, 0.02, 0, 0);
  }

  applyDelta(rig.bones.spine, -0.04, 0, 0);
  applyDelta(rig.bones.spine1, -0.04, 0, 0);
  applyDelta(rig.bones.spine2, 0.02, 0, 0);

  applyDelta(rig.bones.leftUpLeg, 1.46, -0.05, 0.09);
  applyDelta(rig.bones.leftLeg, -1.48, 0, 0);
  applyDelta(rig.bones.leftFoot, 0.06, 0, 0);
  applyDelta(rig.bones.leftToeBase, 0, 0, 0);

  applyDelta(rig.bones.rightUpLeg, 1.46, 0.05, -0.09);
  applyDelta(rig.bones.rightLeg, -1.48, 0, 0);
  applyDelta(rig.bones.rightFoot, 0.06, 0, 0);
  applyDelta(rig.bones.rightToeBase, 0, 0, 0);

  applyDelta(rig.bones.leftShoulder, 0, 0, 0);
  applyDelta(rig.bones.leftArm, 1.12, 0.18, 0.16);
  applyDelta(rig.bones.leftForeArm, -0.05, -0.35, 1.12);
  applyDelta(rig.bones.leftHand, 0.04, -0.08, -0.12);

  applyDelta(rig.bones.rightShoulder, 0, 0, 0);
  applyDelta(rig.bones.rightArm, 1.12, -0.18, -0.16);
  applyDelta(rig.bones.rightForeArm, -0.05, 0.35, -1.12);
  applyDelta(rig.bones.rightHand, 0.04, 0.08, 0.12);

  const applyRelaxedFingers = (fingers: HandFingerRig) => {
    const curls = [0.16, 0.2, 0.12];
    [fingers.index, fingers.middle, fingers.ring, fingers.pinky].forEach((chain) => {
      for (let i = 0; i < Math.min(3, chain.length); i += 1) {
        applyDelta(chain[i], curls[i], 0, 0);
      }
    });
    for (let i = 0; i < Math.min(2, fingers.thumb.length); i += 1) {
      applyDelta(fingers.thumb[i], i === 0 ? 0.08 : 0.1, 0, 0);
    }
  };

  applyRelaxedFingers(rig.bones.leftFingers);
  applyRelaxedFingers(rig.bones.rightFingers);
}

/**
 * Restores all registered bones cleanly back to their original GLB bind pose transforms.
 */
export function restoreRigBindPose(rig: InspectedRigData): void {
  rig.boneInitialQuaternions.forEach((baseQuat, bone) => {
    bone.quaternion.copy(baseQuat);
  });
  rig.boneInitialPositions.forEach((basePos, bone) => {
    bone.position.copy(basePos);
  });
}

export type HeadPoseTarget =
  | 'neutral'
  | 'turn-left'
  | 'turn-right'
  | 'tilt-left'
  | 'tilt-right';

export interface HeadNodOptions {
  intensity?: number;
  duration?: number;
}

export type ArmGestureName =
  | 'none'
  | 'wave'
  | 'open-palm'
  | 'raise-hand'
  | 'conversational';

export type HandPoseTarget = 'relaxed' | 'open' | 'curl';

export interface ArmGestureOptions {
  duration?: number;
  side?: 'right' | 'left';
}

export type IdleMovementIntensity = 'low' | 'medium' | 'high';

export type BodyPresentationMode = 'close-up' | 'upper-body' | 'full-body';

export interface RigAnimationRuntime {
  // Phase 1 facial state
  nextBlinkAt: number;
  blinkProgress: number;
  blinkDuration: number;
  nextGazeShiftAt: number;
  targetGazeX: number;
  targetGazeY: number;
  gazeX: number;
  gazeY: number;
  talkPhase: number;
  // Phase 2 head & neck state
  idleEnabled: boolean;
  idleIntensity: IdleMovementIntensity;
  headPose: HeadPoseTarget;
  headPoseIntensity: number;
  nodActive: boolean;
  nodProgress: number;
  nodDuration: number;
  nodIntensity: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  headIdleBlend: number;
  idlePhaseOffset: number;
  // Phase 3 arm, hand & finger gesture controller state
  armGesture: ArmGestureName;
  armGestureElapsed: number;
  armGestureDuration: number;
  armGestureSide: 'right' | 'left';
  handPose: HandPoseTarget;
  armDeltaQuats: Map<THREE.Object3D, THREE.Quaternion>;
  // Phase 4 torso, breathing & lower-body idle state
  bodyIdleBlend: number;
  hipsOffset: THREE.Vector3;
  bodyDeltaQuats: Map<THREE.Object3D, THREE.Quaternion>;
  // Milestone 2 idle shoulder/arm & speech-pause coordination
  armIdleBlend: number;
  speechPausedSec: number;
  speechPauseDamp: number;
  speechHeadInflectionLevel: number;
  speechControlledHeadPose: boolean;
}

export function createRigRuntime(): RigAnimationRuntime {
  return {
    nextBlinkAt: 2.0 + Math.random() * 2.5,
    blinkProgress: -1,
    blinkDuration: 0.15 + Math.random() * 0.04,
    nextGazeShiftAt: 2.2 + Math.random() * 2.8,
    targetGazeX: 0,
    targetGazeY: 0,
    gazeX: 0,
    gazeY: 0,
    talkPhase: 0,
    idleEnabled: true,
    idleIntensity: 'medium',
    headPose: 'neutral',
    headPoseIntensity: 1,
    nodActive: false,
    nodProgress: 0,
    nodDuration: 0.78,
    nodIntensity: 0.75,
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    headIdleBlend: 1,
    idlePhaseOffset: Math.random() * Math.PI * 2,
    armGesture: 'none',
    armGestureElapsed: 0,
    armGestureDuration: 2.4,
    armGestureSide: 'right',
    handPose: 'relaxed',
    armDeltaQuats: new Map<THREE.Object3D, THREE.Quaternion>(),
    bodyIdleBlend: 1,
    hipsOffset: new THREE.Vector3(),
    bodyDeltaQuats: new Map<THREE.Object3D, THREE.Quaternion>(),
    armIdleBlend: 1,
    speechPausedSec: 0,
    speechPauseDamp: 1,
    speechHeadInflectionLevel: 0,
    speechControlledHeadPose: false,
  };
}

export function setHeadIdleEnabled(runtime: RigAnimationRuntime, enabled: boolean): void {
  runtime.idleEnabled = enabled;
}

export function setIdleMovementIntensity(
  runtime: RigAnimationRuntime,
  intensity: IdleMovementIntensity
): void {
  runtime.idleIntensity = intensity;
}

export function resetBodyPose(runtime: RigAnimationRuntime): void {
  runtime.bodyIdleBlend = 0;
  runtime.armIdleBlend = 1;
  runtime.speechPausedSec = 0;
  runtime.speechPauseDamp = 1;
  runtime.speechHeadInflectionLevel = 0;
  runtime.hipsOffset.set(0, 0, 0);
}

export function resetAllAvatarPoses(runtime: RigAnimationRuntime): void {
  resetHeadPose(runtime);
  resetArmPose(runtime);
  resetBodyPose(runtime);
}

/**
 * Triggers a smooth, non-stacking head nod toward baseline (+X pitch down and back).
 * Returns false if a nod is already mid-motion to prevent fighting/stacking.
 */
export function triggerHeadNod(
  runtime: RigAnimationRuntime,
  options?: HeadNodOptions
): boolean {
  if (runtime.nodActive && runtime.nodProgress < 0.85) {
    return false;
  }
  const intensity = Math.max(0.25, Math.min(1.0, options?.intensity ?? 0.75));
  const duration = Math.max(0.35, Math.min(1.6, options?.duration ?? 0.78));
  runtime.nodActive = true;
  runtime.nodProgress = 0;
  runtime.nodDuration = duration;
  runtime.nodIntensity = intensity;
  return true;
}

export function turnHeadLeft(runtime: RigAnimationRuntime, intensity = 1): void {
  runtime.headPose = 'turn-left';
  runtime.headPoseIntensity = Math.max(0.25, Math.min(1.0, intensity));
  runtime.speechControlledHeadPose = false;
}

export function turnHeadRight(runtime: RigAnimationRuntime, intensity = 1): void {
  runtime.headPose = 'turn-right';
  runtime.headPoseIntensity = Math.max(0.25, Math.min(1.0, intensity));
  runtime.speechControlledHeadPose = false;
}

export function tiltHeadLeft(runtime: RigAnimationRuntime, intensity = 1): void {
  runtime.headPose = 'tilt-left';
  runtime.headPoseIntensity = Math.max(0.25, Math.min(1.0, intensity));
  runtime.speechControlledHeadPose = false;
}

export function tiltHeadRight(runtime: RigAnimationRuntime, intensity = 1): void {
  runtime.headPose = 'tilt-right';
  runtime.headPoseIntensity = Math.max(0.25, Math.min(1.0, intensity));
  runtime.speechControlledHeadPose = false;
}

export function setSpeechHeadTilt(
  runtime: RigAnimationRuntime,
  pose: 'tilt-left' | 'tilt-right',
  intensity = 0.48
): void {
  if (runtime.headPose !== 'neutral' && !runtime.speechControlledHeadPose) {
    return;
  }
  runtime.headPose = pose;
  runtime.headPoseIntensity = Math.max(0.25, Math.min(0.85, intensity));
  runtime.speechControlledHeadPose = true;
}

export function clearSpeechHeadTilt(runtime: RigAnimationRuntime): void {
  if (!runtime.speechControlledHeadPose) return;
  runtime.headPose = 'neutral';
  runtime.headPoseIntensity = 1;
  runtime.speechControlledHeadPose = false;
}

export function resetHeadPose(runtime: RigAnimationRuntime): void {
  runtime.headPose = 'neutral';
  runtime.headPoseIntensity = 1;
  runtime.nodActive = false;
  runtime.nodProgress = 0;
  runtime.speechControlledHeadPose = false;
}

const DEFAULT_GESTURE_DURATIONS: Record<Exclude<ArmGestureName, 'none'>, number> = {
  wave: 2.55,
  'open-palm': 2.45,
  'raise-hand': 2.25,
  conversational: 1.95,
};

/**
 * Starts a named Phase 3 arm gesture with exclusive bone ownership.
 * Safely replaces any previously running gesture without snapping.
 */
export function startArmGesture(
  runtime: RigAnimationRuntime,
  gesture: Exclude<ArmGestureName, 'none'>,
  options?: ArmGestureOptions
): void {
  runtime.armGesture = gesture;
  runtime.armGestureElapsed = 0;
  runtime.armGestureDuration = Math.max(
    1.1,
    Math.min(5.0, options?.duration ?? DEFAULT_GESTURE_DURATIONS[gesture])
  );
  runtime.armGestureSide = options?.side ?? 'right';
}

/**
 * Safely cancels any active arm gesture and interpolates smoothly back to relaxed baseline.
 */
export function cancelArmGesture(runtime: RigAnimationRuntime): void {
  runtime.armGesture = 'none';
  runtime.armGestureElapsed = 0;
}

/**
 * Resets both active arm gesture and explicit hand/finger pose smoothly to relaxed baseline.
 */
export function resetArmPose(runtime: RigAnimationRuntime): void {
  runtime.armGesture = 'none';
  runtime.armGestureElapsed = 0;
  runtime.handPose = 'relaxed';
}

/**
 * Sets the target finger/hand pose ('relaxed' | 'open' | 'curl').
 */
export function setHandPose(runtime: RigAnimationRuntime, pose: HandPoseTarget): void {
  runtime.handPose = pose;
}

export function setMorphTargetWeight(
  rig: InspectedRigData,
  morphName: string,
  weight: number
): void {
  const clamped = Math.max(0, Math.min(1, weight));
  for (let i = 0; i < rig.morphMeshes.length; i += 1) {
    const { mesh, dict } = rig.morphMeshes[i];
    const influences = mesh.morphTargetInfluences;
    if (!influences) continue;
    const idx = dict[morphName];
    if (typeof idx === 'number') {
      influences[idx] = clamped;
    }
  }
}

export function applyBlink(
  rig: InspectedRigData,
  leftWeight: number,
  rightWeight = leftWeight
): void {
  const leftAlias = CHANNEL_ALIASES.blinkLeft.find((k) => rig.availableMorphKeys.has(k));
  const rightAlias = CHANNEL_ALIASES.blinkRight.find((k) => rig.availableMorphKeys.has(k));
  if (leftAlias) setMorphTargetWeight(rig, leftAlias, leftWeight);
  if (rightAlias) setMorphTargetWeight(rig, rightAlias, rightWeight);
}

export function applySmile(rig: InspectedRigData, weight: number): void {
  const leftAlias = CHANNEL_ALIASES.smileLeft.find((k) => rig.availableMorphKeys.has(k));
  const rightAlias = CHANNEL_ALIASES.smileRight.find((k) => rig.availableMorphKeys.has(k));
  if (leftAlias) setMorphTargetWeight(rig, leftAlias, weight);
  if (rightAlias) setMorphTargetWeight(rig, rightAlias, weight);
}

export function applyJawOpen(rig: InspectedRigData, weight: number): void {
  const jawAlias = CHANNEL_ALIASES.jawOpen.find((k) => rig.availableMorphKeys.has(k));
  if (jawAlias) setMorphTargetWeight(rig, jawAlias, weight);
  if (weight > 0.01 && rig.availableMorphKeys.has('mouthClose')) {
    setMorphTargetWeight(rig, 'mouthClose', 0);
  }
}

export function applyViseme(
  rig: InspectedRigData,
  visemeName: VisemeMorphName | null,
  weight = 0.6
): void {
  for (let i = 0; i < SUPPORTED_VISEME_NAMES.length; i += 1) {
    const v = SUPPORTED_VISEME_NAMES[i];
    if (rig.availableMorphKeys.has(v)) {
      setMorphTargetWeight(rig, v, v === visemeName ? weight : 0);
    }
  }
}

export function applyExpressionPreset(
  rig: InspectedRigData,
  emotion: AvatarEmotion,
  intensity = 0.7
): void {
  const clamped = Math.max(0, Math.min(1, intensity));
  const preset = EXPRESSION_PRESETS[emotion] || EXPRESSION_PRESETS.neutral;
  for (let i = 0; i < ALL_CHANNELS.length; i += 1) {
    const ch = ALL_CHANNELS[i];
    const bindings = rig.channelBindings[ch];
    if (bindings.length === 0) continue;
    const base = preset.morphs[ch] ?? 0;
    const weight = Math.max(0, Math.min(1, base * clamped));
    for (let j = 0; j < bindings.length; j += 1) {
      bindings[j].influences[bindings[j].index] = weight;
    }
  }
}

/**
 * Immediately resets speech-related mouth/jaw/viseme morph targets and jaw bone to neutral (0).
 */
export function resetSpeechMorphs(rig: InspectedRigData): void {
  for (let i = 0; i < SPEECH_CHANNELS.length; i += 1) {
    const bindings = rig.channelBindings[SPEECH_CHANNELS[i]];
    for (let j = 0; j < bindings.length; j += 1) {
      bindings[j].influences[bindings[j].index] = 0;
    }
  }
  if (rig.bones.jaw) {
    const initial = rig.boneInitialRotations.get(rig.bones.jaw);
    if (initial) rig.bones.jaw.rotation.copy(initial);
  }
}

export function clearAllRigMorphs(rig: InspectedRigData) {
  for (let i = 0; i < rig.morphMeshes.length; i += 1) {
    const { mesh } = rig.morphMeshes[i];
    if (!mesh.morphTargetInfluences) continue;
    for (let j = 0; j < mesh.morphTargetInfluences.length; j += 1) {
      mesh.morphTargetInfluences[j] = 0;
    }
  }
  if (rig.bones.jaw) {
    const initial = rig.boneInitialRotations.get(rig.bones.jaw);
    if (initial) rig.bones.jaw.rotation.copy(initial);
  }
}

// Reusable per-frame scratch buffers to avoid garbage collection in the render loop
const _desiredChannels: Partial<Record<FacialChannel, number>> = {};
const _slotTargetWeights = new Map<MorphSlotBinding, number>();

export function updateExpressionRig(params: {
  rig: InspectedRigData;
  runtime: RigAnimationRuntime;
  state: AvatarState;
  unifiedState?: UnifiedAnimationState;
  emotion: AvatarEmotion;
  emotionIntensity: number;
  expressionsEnabled?: boolean;
  audioLevel: number;
  lipSyncFrame?: LipSyncMorphWeights;
  prefersReducedMotion: boolean;
  elapsed: number;
  delta: number;
}) {
  const {
    rig,
    runtime,
    state,
    unifiedState,
    emotion,
    emotionIntensity,
    expressionsEnabled = true,
    audioLevel,
    lipSyncFrame,
    prefersReducedMotion,
    elapsed,
    delta,
  } = params;

  const isInterruptedOrError =
    state === 'interrupted' ||
    unifiedState === 'interrupted' ||
    state === 'error' ||
    unifiedState === 'error';

  const clampedIntensity = expressionsEnabled && !isInterruptedOrError
    ? normalizeEmotionIntensity(emotionIntensity, 0.7)
    : 0;
  const safeEmotion = rig.supportedExpressions[emotion] ? emotion : 'neutral';
  const isSpeakingActive =
    !isInterruptedOrError &&
    (state === 'speaking' || unifiedState === 'speaking' || Boolean(lipSyncFrame?.isActive));

  // Effective expression: coordinate unifiedState with explicit emotion without overwriting speech
  let activeEmotion: AvatarEmotion =
    !expressionsEnabled || isInterruptedOrError ? 'neutral' : safeEmotion;
  if (expressionsEnabled && !isInterruptedOrError && safeEmotion === 'neutral') {
    if (unifiedState === 'greeting' || unifiedState === 'happy' || unifiedState === 'goodbye') {
      activeEmotion = rig.supportedExpressions.happy ? 'happy' : 'neutral';
    } else if (unifiedState === 'concerned') {
      activeEmotion = rig.supportedExpressions.concerned ? 'concerned' : 'neutral';
    } else if (state === 'thinking' || unifiedState === 'thinking') {
      activeEmotion = rig.supportedExpressions.thinking ? 'thinking' : 'neutral';
    } else if (isSpeakingActive) {
      activeEmotion = rig.supportedExpressions.talking ? 'talking' : 'neutral';
    }
  }

  const preset = EXPRESSION_PRESETS[activeEmotion] || EXPRESSION_PRESETS.neutral;

  // 1. Natural periodic blinking (2.5 - 6.0s intervals with subtle duration variation)
  let blinkWeight = 0;
  if (!prefersReducedMotion && rig.capabilities.hasBlinking) {
    if (runtime.blinkProgress >= 0) {
      runtime.blinkProgress += delta / Math.max(0.1, runtime.blinkDuration);
      if (runtime.blinkProgress >= 1) {
        runtime.blinkProgress = -1;
        runtime.nextBlinkAt = elapsed + 2.5 + Math.random() * 3.5;
        runtime.blinkDuration = 0.14 + Math.random() * 0.05;
      } else {
        blinkWeight = Math.sin(runtime.blinkProgress * Math.PI);
      }
    } else if (elapsed >= runtime.nextBlinkAt) {
      runtime.blinkProgress = 0;
    }
  }

  // 2. Subtle natural eye gaze via facial eye-look morphs (no head/body movement)
  if (!prefersReducedMotion) {
    if (elapsed >= runtime.nextGazeShiftAt) {
      runtime.nextGazeShiftAt = elapsed + 2.4 + Math.random() * 3.0;
      if (state === 'thinking' || activeEmotion === 'thinking') {
        runtime.targetGazeX = (Math.random() - 0.3) * 0.06;
        runtime.targetGazeY = 0.04 + Math.random() * 0.03;
      } else if (state === 'listening') {
        runtime.targetGazeX = (Math.random() - 0.5) * 0.015;
        runtime.targetGazeY = (Math.random() - 0.5) * 0.012;
      } else {
        runtime.targetGazeX = (Math.random() - 0.5) * 0.035;
        runtime.targetGazeY = (Math.random() - 0.5) * 0.02;
      }
    }
    runtime.gazeX = THREE.MathUtils.damp(runtime.gazeX, runtime.targetGazeX, 6, delta);
    runtime.gazeY = THREE.MathUtils.damp(runtime.gazeY, runtime.targetGazeY, 6, delta);
  }

  // 3. Reset desired channel buffer and populate expression weights
  for (let i = 0; i < ALL_CHANNELS.length; i += 1) {
    _desiredChannels[ALL_CHANNELS[i]] = 0;
  }

  // Speech/lip-sync exclusively owns all mouth/jaw articulation channels during speech, listening, or interruption
  const suppressPresetSpeechChannels =
    isSpeakingActive ||
    isInterruptedOrError ||
    state === 'listening' ||
    unifiedState === 'listening';

  if (expressionsEnabled && !isInterruptedOrError) {
    const presetMorphs = preset.morphs;
    for (const ch in presetMorphs) {
      const channel = ch as FacialChannel;
      if (suppressPresetSpeechChannels && SPEECH_ARTICULATION_CHANNEL_SET.has(channel)) {
        continue;
      }
      const base = presetMorphs[channel] ?? 0;
      _desiredChannels[channel] = Math.min(1, base * clampedIntensity);
    }
  }

  if (blinkWeight > 0) {
    _desiredChannels.blinkLeft = Math.max(_desiredChannels.blinkLeft ?? 0, blinkWeight);
    if (activeEmotion !== 'winking') {
      _desiredChannels.blinkRight = Math.max(_desiredChannels.blinkRight ?? 0, blinkWeight);
    }
  }

  // Subtle eye-look morph reinforcement
  if (!prefersReducedMotion) {
    if (runtime.gazeY > 0.01) {
      _desiredChannels.eyeLookUpLeft = Math.max(
        _desiredChannels.eyeLookUpLeft ?? 0,
        Math.min(0.25, runtime.gazeY * 2.5)
      );
      _desiredChannels.eyeLookUpRight = Math.max(
        _desiredChannels.eyeLookUpRight ?? 0,
        Math.min(0.25, runtime.gazeY * 2.5)
      );
    } else if (runtime.gazeY < -0.01) {
      _desiredChannels.eyeLookDownLeft = Math.max(
        _desiredChannels.eyeLookDownLeft ?? 0,
        Math.min(0.22, -runtime.gazeY * 2.2)
      );
      _desiredChannels.eyeLookDownRight = Math.max(
        _desiredChannels.eyeLookDownRight ?? 0,
        Math.min(0.22, -runtime.gazeY * 2.2)
      );
    }
    if (runtime.gazeX > 0.01) {
      const lookAmt = Math.min(0.18, runtime.gazeX * 2.0);
      _desiredChannels.eyeLookInLeft = Math.max(_desiredChannels.eyeLookInLeft ?? 0, lookAmt);
      _desiredChannels.eyeLookOutRight = Math.max(_desiredChannels.eyeLookOutRight ?? 0, lookAmt);
    } else if (runtime.gazeX < -0.01) {
      const lookAmt = Math.min(0.18, -runtime.gazeX * 2.0);
      _desiredChannels.eyeLookOutLeft = Math.max(_desiredChannels.eyeLookOutLeft ?? 0, lookAmt);
      _desiredChannels.eyeLookInRight = Math.max(_desiredChannels.eyeLookInRight ?? 0, lookAmt);
    }
  }

  // 4. Real-time audio-reactive / clock-paced speech lip-sync (visemes + ARKit jaw/mouth shapes)
  let speechJawWeight = 0;
  let speechFunnelWeight = 0;
  let speechPuckerWeight = 0;
  let speechStretchWeight = 0;
  let speechCloseWeight = 0;
  let speechPressWeight = 0;
  let speechRollLowerWeight = 0;
  let speechUpperUpWeight = 0;
  let speechLowerDownWeight = 0;

  if (!isInterruptedOrError && lipSyncFrame && lipSyncFrame.isActive) {
    const motionScale = prefersReducedMotion ? 0.65 : 1.0;

    if (rig.capabilities.hasVisemeMorphs) {
      for (let i = 0; i < SUPPORTED_VISEME_NAMES.length; i += 1) {
        const vName = SUPPORTED_VISEME_NAMES[i] as LipSyncVisemeName;
        const w = (lipSyncFrame.visemes[vName] ?? 0) * (vName === 'viseme_sil' ? 1 : motionScale);
        if (w > 0) {
          _desiredChannels[VISEME_CHANNEL_BY_NAME[vName]] = Math.min(1, w);
        }
      }
    }

    speechJawWeight = lipSyncFrame.jawOpen * motionScale;
    speechFunnelWeight = lipSyncFrame.mouthFunnel * motionScale;
    speechPuckerWeight = lipSyncFrame.mouthPucker * motionScale;
    speechStretchWeight = lipSyncFrame.mouthStretch * motionScale;
    speechCloseWeight = lipSyncFrame.mouthClose * motionScale;
    speechPressWeight = lipSyncFrame.mouthPress * motionScale;
    speechRollLowerWeight = lipSyncFrame.mouthRollLower * motionScale;
    speechUpperUpWeight = lipSyncFrame.mouthUpperUp * motionScale;
    speechLowerDownWeight = lipSyncFrame.mouthLowerDown * motionScale;

    if (expressionsEnabled && lipSyncFrame.roundingAttenuation > 0.02) {
      const smileKeep = Math.max(0.28, 1 - lipSyncFrame.roundingAttenuation * 0.7);
      _desiredChannels.smileLeft = (_desiredChannels.smileLeft ?? 0) * smileKeep;
      _desiredChannels.smileRight = (_desiredChannels.smileRight ?? 0) * smileKeep;
    }
  } else if (!isInterruptedOrError && isSpeakingActive && state === 'speaking') {
    // Minimal scalar fallback only if external caller passes audioLevel without LipSyncEngine
    const effectiveAudio = Math.max(0, Math.min(1, audioLevel));
    if (effectiveAudio > 0.03) {
      const motionScale = prefersReducedMotion ? 0.65 : 1.0;
      speechJawWeight = Math.min(0.42, effectiveAudio * 0.52 * motionScale);
      if (rig.capabilities.hasVisemeMorphs) {
        _desiredChannels[VISEME_CHANNEL_BY_NAME.viseme_aa] = Math.min(
          0.4,
          effectiveAudio * 0.45 * motionScale
        );
      }
    } else if (rig.capabilities.hasVisemeMorphs) {
      _desiredChannels[VISEME_CHANNEL_BY_NAME.viseme_sil] = 0.25;
    }
  } else {
    runtime.talkPhase = 0;
  }

  _desiredChannels.jawOpen = Math.max(_desiredChannels.jawOpen ?? 0, speechJawWeight);
  if (speechFunnelWeight > 0) {
    _desiredChannels.mouthFunnel = Math.max(_desiredChannels.mouthFunnel ?? 0, speechFunnelWeight);
  }
  if (speechPuckerWeight > 0) {
    _desiredChannels.mouthPucker = Math.max(_desiredChannels.mouthPucker ?? 0, speechPuckerWeight);
  }
  if (speechStretchWeight > 0) {
    _desiredChannels.mouthStretchLeft = Math.max(
      _desiredChannels.mouthStretchLeft ?? 0,
      speechStretchWeight
    );
    _desiredChannels.mouthStretchRight = Math.max(
      _desiredChannels.mouthStretchRight ?? 0,
      speechStretchWeight
    );
  }
  if (speechCloseWeight > 0) {
    _desiredChannels.mouthClose = Math.max(_desiredChannels.mouthClose ?? 0, speechCloseWeight);
  }
  if (speechPressWeight > 0) {
    _desiredChannels.mouthPressLeft = Math.max(
      _desiredChannels.mouthPressLeft ?? 0,
      speechPressWeight
    );
    _desiredChannels.mouthPressRight = Math.max(
      _desiredChannels.mouthPressRight ?? 0,
      speechPressWeight
    );
  }
  if (speechRollLowerWeight > 0) {
    _desiredChannels.mouthRollLower = Math.max(
      _desiredChannels.mouthRollLower ?? 0,
      speechRollLowerWeight
    );
  }
  if (speechUpperUpWeight > 0) {
    _desiredChannels.mouthUpperUpLeft = Math.max(
      _desiredChannels.mouthUpperUpLeft ?? 0,
      speechUpperUpWeight
    );
    _desiredChannels.mouthUpperUpRight = Math.max(
      _desiredChannels.mouthUpperUpRight ?? 0,
      speechUpperUpWeight
    );
  }
  if (speechLowerDownWeight > 0) {
    _desiredChannels.mouthLowerDownLeft = Math.max(
      _desiredChannels.mouthLowerDownLeft ?? 0,
      speechLowerDownWeight
    );
    _desiredChannels.mouthLowerDownRight = Math.max(
      _desiredChannels.mouthLowerDownRight ?? 0,
      speechLowerDownWeight
    );
  }

  // Conflict prevention: suppress lip press/close during wide jaw opening (while permitting bilabial closures), and frown during smile
  if ((_desiredChannels.jawOpen ?? 0) > 0.05) {
    _desiredChannels.mouthClose = 0;
    _desiredChannels.mouthPressLeft = 0;
    _desiredChannels.mouthPressRight = 0;
  }
  if ((_desiredChannels.smileLeft ?? 0) > 0.05 || (_desiredChannels.smileRight ?? 0) > 0.05) {
    _desiredChannels.frownLeft = 0;
    _desiredChannels.frownRight = 0;
  }

  // 5. Single unified damping pass over pre-resolved morph target slots (zero allocations)
  if (rig.uniqueMorphSlots.length > 0) {
    _slotTargetWeights.clear();
    for (let i = 0; i < ALL_CHANNELS.length; i += 1) {
      const ch = ALL_CHANNELS[i];
      const weight = _desiredChannels[ch] ?? 0;
      const bindings = rig.channelBindings[ch];
      for (let j = 0; j < bindings.length; j += 1) {
        const slot = bindings[j];
        const prev = _slotTargetWeights.get(slot) ?? 0;
        if (weight > prev) {
          _slotTargetWeights.set(slot, weight);
        }
      }
    }

    for (let i = 0; i < rig.uniqueMorphSlots.length; i += 1) {
      const slot = rig.uniqueMorphSlots[i];
      const targetWeight = _slotTargetWeights.get(slot) ?? 0;
      slot.influences[slot.index] = THREE.MathUtils.damp(
        slot.influences[slot.index] || 0,
        targetWeight,
        slot.speed,
        delta
      );
    }
  }

  // 6. Jaw bone fallback ONLY when no jawOpen morph target exists
  if (rig.bones.jaw && !rig.capabilities.hasSpeechMorphs) {
    const init = rig.boneInitialRotations.get(rig.bones.jaw);
    if (init) {
      rig.bones.jaw.rotation.x = THREE.MathUtils.damp(
        rig.bones.jaw.rotation.x,
        init.x + speechJawWeight * 0.28,
        16,
        delta
      );
    }
  }
}

// Pre-allocated scratch helpers for zero-GC head/neck quaternion updates
const _deltaEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _deltaQuat = new THREE.Quaternion();

const MAX_HEAD_NOD_RAD = 0.17; // ~9.7 deg peak chin-down nod
const MAX_HEAD_YAW_RAD = 0.22; // ~12.6 deg conservative turn
const MAX_HEAD_ROLL_RAD = 0.13; // ~7.5 deg gentle tilt

/**
 * Phase 2 coordinated procedural controller for Neck & Head bones.
 * - Priority: Reduced Motion > Head Nod > Explicit Turn/Tilt > Subtle Organic Idle.
 * - Applies delta rotations relative to immutable bind quaternions (zero accumulation).
 * - Never writes to Spine/Spine1/Spine2 or morphTargetInfluences.
 */
export function updateHeadNeckRig(params: {
  rig: InspectedRigData;
  runtime: RigAnimationRuntime;
  state: AvatarState;
  unifiedState?: UnifiedAnimationState;
  lipSyncFrame?: LipSyncMorphWeights;
  prefersReducedMotion: boolean;
  elapsed: number;
  delta: number;
}): { isAnimating: boolean } {
  const { rig, runtime, state, unifiedState, lipSyncFrame, prefersReducedMotion, elapsed, delta } =
    params;
  const { head, neck } = rig.bones;

  if (!head && !neck) {
    return { isAnimating: false };
  }

  const isSpeaking = state === 'speaking' || unifiedState === 'speaking';

  // Track speech-pause silence duration cleanly so continuous motion calms during pauses
  if (isSpeaking && lipSyncFrame?.isActive) {
    if (lipSyncFrame.isVoiced) {
      runtime.speechPausedSec = 0;
    } else {
      runtime.speechPausedSec = Math.min(10, runtime.speechPausedSec + delta);
    }
  } else {
    runtime.speechPausedSec = 0;
  }

  const isInSpeechPause = isSpeaking && runtime.speechPausedSec > 0.28;
  const targetPauseDamp = isInSpeechPause ? 0.36 : 1.0;
  runtime.speechPauseDamp = THREE.MathUtils.damp(runtime.speechPauseDamp, targetPauseDamp, 6.0, delta);

  const targetSpeechInflection =
    !prefersReducedMotion && isSpeaking && lipSyncFrame?.isVoiced
      ? Math.max(0, Math.min(1, lipSyncFrame.overallLevel))
      : 0;
  runtime.speechHeadInflectionLevel = THREE.MathUtils.damp(
    runtime.speechHeadInflectionLevel,
    targetSpeechInflection,
    5.5,
    delta
  );

  // 1. Advance explicit head nod action if running (completes smoothly even during speech pause)
  let nodPitch = 0;
  if (runtime.nodActive) {
    runtime.nodProgress += delta / Math.max(0.25, runtime.nodDuration);
    if (runtime.nodProgress >= 1) {
      runtime.nodActive = false;
      runtime.nodProgress = 0;
      nodPitch = 0;
    } else {
      const skewed = Math.pow(Math.max(0, Math.min(1, runtime.nodProgress)), 0.85);
      const envelope = 0.5 * (1 - Math.cos(Math.PI * 2 * skewed));
      nodPitch = envelope * MAX_HEAD_NOD_RAD * runtime.nodIntensity;
    }
  }

  // 2. Explicit head turn / tilt target pose
  let poseYaw = 0;
  let poseRoll = 0;
  switch (runtime.headPose) {
    case 'turn-left':
      poseYaw = -MAX_HEAD_YAW_RAD * runtime.headPoseIntensity;
      break;
    case 'turn-right':
      poseYaw = MAX_HEAD_YAW_RAD * runtime.headPoseIntensity;
      break;
    case 'tilt-left':
      poseRoll = MAX_HEAD_ROLL_RAD * runtime.headPoseIntensity;
      break;
    case 'tilt-right':
      poseRoll = -MAX_HEAD_ROLL_RAD * runtime.headPoseIntensity;
      break;
    case 'neutral':
    default:
      break;
  }

  // 3. Priority-coordinated idle blend (explicit gestures override idle so idle never fights them)
  let targetIdleBlend = 0;
  if (
    !prefersReducedMotion &&
    runtime.idleEnabled &&
    !runtime.nodActive &&
    runtime.headPose === 'neutral'
  ) {
    if (
      state === 'interrupted' ||
      unifiedState === 'interrupted' ||
      state === 'error' ||
      unifiedState === 'error'
    ) {
      targetIdleBlend = 0.25; // Calm, settled posture on interruption/error
    } else if (state === 'listening' || unifiedState === 'listening') {
      targetIdleBlend = 0.4; // Attentive, calm stillness
    } else if (isSpeaking) {
      targetIdleBlend = 0.45 * runtime.speechPauseDamp; // Subtle presence; calm during pauses
    } else if (unifiedState === 'greeting' || unifiedState === 'goodbye') {
      targetIdleBlend = 0.35; // Poised posture during wave/greeting
    } else {
      targetIdleBlend = 1.0;
    }
  }

  runtime.headIdleBlend = THREE.MathUtils.damp(runtime.headIdleBlend, targetIdleBlend, 4.5, delta);

  const idleIntensityScale =
    runtime.idleIntensity === 'low'
      ? 0.55
      : runtime.idleIntensity === 'high'
      ? 1.4
      : 1.0;

  // 4. Organic multi-frequency idle sway + subtle speech phrasing inflection
  let idlePitch = 0;
  let idleYaw = 0;
  let idleRoll = 0;
  if (runtime.headIdleBlend > 0.001) {
    const t = elapsed + runtime.idlePhaseOffset;
    idleYaw =
      (Math.sin(t * 0.43) * 0.6 + Math.sin(t * 0.97 + 1.3) * 0.4) *
      0.036 *
      idleIntensityScale *
      runtime.headIdleBlend;
    idlePitch =
      (Math.sin(t * 0.31 + 0.7) * 0.65 + Math.cos(t * 0.73) * 0.35) *
      0.022 *
      idleIntensityScale *
      runtime.headIdleBlend;
    idleRoll =
      (Math.sin(t * 0.27 + 2.1) * 0.7 + Math.sin(t * 0.61) * 0.3) *
      0.018 *
      idleIntensityScale *
      runtime.headIdleBlend;

    if (isSpeaking && runtime.speechHeadInflectionLevel > 0.01) {
      const speechGain = runtime.speechHeadInflectionLevel * runtime.speechPauseDamp * runtime.headIdleBlend;
      idlePitch += Math.sin(t * 2.05 + 0.4) * 0.015 * speechGain;
      idleYaw += Math.sin(t * 1.32 + 1.1) * 0.017 * speechGain;
    }
  }

  // 5. Smoothly interpolate head/neck angles toward combined target
  const targetPitch = nodPitch + idlePitch;
  const targetYaw = poseYaw + idleYaw;
  const targetRoll = poseRoll + idleRoll;

  const dampSpeed = runtime.nodActive ? 14 : 6.5;
  runtime.headPitch = THREE.MathUtils.damp(runtime.headPitch, targetPitch, dampSpeed, delta);
  runtime.headYaw = THREE.MathUtils.damp(runtime.headYaw, targetYaw, dampSpeed, delta);
  runtime.headRoll = THREE.MathUtils.damp(runtime.headRoll, targetRoll, dampSpeed, delta);

  // Snap microscopic residuals cleanly to exact 0 when resting at neutral
  if (
    targetPitch === 0 &&
    targetYaw === 0 &&
    targetRoll === 0 &&
    Math.abs(runtime.headPitch) < 1e-4 &&
    Math.abs(runtime.headYaw) < 1e-4 &&
    Math.abs(runtime.headRoll) < 1e-4
  ) {
    runtime.headPitch = 0;
    runtime.headYaw = 0;
    runtime.headRoll = 0;
  }

  // 6. Distribute conservatively between Neck and Head based on actual detected bones
  const applyBoneDelta = (
    bone: THREE.Object3D | null,
    pitch: number,
    yaw: number,
    roll: number
  ) => {
    if (!bone) return;
    const baseQuat = rig.boneInitialQuaternions.get(bone);
    if (!baseQuat) return;
    _deltaEuler.set(pitch, yaw, roll, 'YXZ');
    _deltaQuat.setFromEuler(_deltaEuler);
    bone.quaternion.copy(baseQuat).multiply(_deltaQuat);
  };

  if (neck && head) {
    applyBoneDelta(
      neck,
      runtime.headPitch * 0.35,
      runtime.headYaw * 0.35,
      runtime.headRoll * 0.3
    );
    applyBoneDelta(
      head,
      runtime.headPitch * 0.65,
      runtime.headYaw * 0.65,
      runtime.headRoll * 0.7
    );
  } else if (head) {
    applyBoneDelta(
      head,
      runtime.headPitch * 0.75,
      runtime.headYaw * 0.75,
      runtime.headRoll * 0.75
    );
  } else if (neck) {
    applyBoneDelta(
      neck,
      runtime.headPitch * 0.55,
      runtime.headYaw * 0.55,
      runtime.headRoll * 0.55
    );
  }

  const isAnimating =
    runtime.nodActive ||
    Math.abs(runtime.headPitch - targetPitch) > 1e-3 ||
    Math.abs(runtime.headYaw - targetYaw) > 1e-3 ||
    Math.abs(runtime.headRoll - targetRoll) > 1e-3;

  return { isAnimating };
}

// Pre-allocated scratch helpers for zero-GC arm/hand/finger quaternion updates
const _armTargetEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const _armTargetQuat = new THREE.Quaternion();

/**
 * Phase 3 coordinated procedural controller for Shoulder, Arm, ForeArm, Hand, and Finger bones.
 * - Exclusive gesture ownership: only one active ArmGestureName controls arm bones at a time.
 * - Uses slerp interpolation on baseline-relative delta quaternions (no frame drift/accumulation).
 * - Never writes to Head, Neck, Spine, Spine1, Spine2, or facial morph targets.
 */
export function updateArmHandRig(params: {
  rig: InspectedRigData;
  runtime: RigAnimationRuntime;
  prefersReducedMotion: boolean;
  delta: number;
  postureMode?: BodyPostureMode;
  state?: AvatarState;
  unifiedState?: UnifiedAnimationState;
  elapsed?: number;
}): { isAnimating: boolean; activeGesture: ArmGestureName } {
  const {
    rig,
    runtime,
    prefersReducedMotion,
    delta,
    postureMode = 'standing',
    state = 'idle',
    unifiedState,
    elapsed = 0,
  } = params;
  const { bones } = rig;

  if (!bones.rightArm && !bones.leftArm) {
    return { isAnimating: false, activeGesture: 'none' };
  }

  // Determine which arm is driving any active gesture (prefer right arm, fallback to left)
  const activeSide: 'right' | 'left' | null =
    runtime.armGesture === 'none'
      ? null
      : runtime.armGestureSide === 'right' && rig.verifiedArmHand.hasRightArmReady
      ? 'right'
      : rig.verifiedArmHand.hasLeftArmReady
      ? 'left'
      : rig.verifiedArmHand.hasRightArmReady
      ? 'right'
      : null;

  // Advance gesture timeline and auto-complete cleanly back to baseline
  let gestureHoldBlend = 0;
  let waveOscillation = 0;
  let gestureConversePulse = 0;

  if (runtime.armGesture !== 'none' && activeSide) {
    runtime.armGestureElapsed += delta;
    const dur = Math.max(1.0, runtime.armGestureDuration);
    const tNorm = Math.min(1, runtime.armGestureElapsed / dur);

    if (tNorm >= 1) {
      runtime.armGesture = 'none';
      runtime.armGestureElapsed = 0;
      gestureHoldBlend = 0;
    } else {
      const raiseEnd = 0.22;
      const lowerStart = 0.76;

      if (tNorm < raiseEnd) {
        const u = tNorm / raiseEnd;
        gestureHoldBlend = u * u * (3 - 2 * u); // smoothstep 0 -> 1
      } else if (tNorm > lowerStart) {
        const u = (1 - tNorm) / (1 - lowerStart);
        gestureHoldBlend = u * u * (3 - 2 * u); // smoothstep 1 -> 0
      } else {
        gestureHoldBlend = 1;
      }

      if (runtime.armGesture === 'wave' && tNorm > 0.18 && tNorm < 0.8) {
        const waveNorm = (tNorm - 0.18) / (0.8 - 0.18);
        const waveEnv = Math.sin(waveNorm * Math.PI); // zero velocity at start & end of waving
        const cycles = prefersReducedMotion ? 1 : 2.5;
        const amp = prefersReducedMotion ? 0.08 : 0.26;
        waveOscillation = Math.sin(waveNorm * Math.PI * 2 * cycles) * waveEnv * amp;
      } else if (runtime.armGesture === 'conversational') {
        gestureConversePulse = Math.sin(tNorm * Math.PI) * (prefersReducedMotion ? 0.02 : 0.06);
      }
    }
  }

  // Subtle resting shoulder & arm breathing accompaniment (synchronized with torso breath)
  let targetArmIdleBlend = 0;
  if (!prefersReducedMotion && runtime.idleEnabled) {
    if (state === 'listening' || unifiedState === 'listening') {
      targetArmIdleBlend = 0.35;
    } else if (state === 'speaking' || unifiedState === 'speaking') {
      targetArmIdleBlend = 0.55 * runtime.speechPauseDamp;
    } else {
      targetArmIdleBlend = 1.0;
    }
  }
  runtime.armIdleBlend = THREE.MathUtils.damp(runtime.armIdleBlend, targetArmIdleBlend, 4.0, delta);

  const armIntensityScale =
    runtime.idleIntensity === 'low'
      ? 0.55
      : runtime.idleIntensity === 'high'
      ? 1.35
      : 1.0;
  const armIdleWeight = runtime.armIdleBlend * armIntensityScale;
  const t = elapsed + runtime.idlePhaseOffset;
  const armBreath =
    (Math.sin(t * 1.45 - 0.15) * 0.72 + Math.sin(t * 0.72 + 0.45) * 0.28) * armIdleWeight;
  const armSway =
    (Math.sin(t * 0.76 + 0.4) * 0.7 + Math.sin(t * 0.43 + 1.9) * 0.3) * armIdleWeight;

  let stillConverging = runtime.armGesture !== 'none' || runtime.armIdleBlend > 0.002;
  const slerpAlphaArm = 1 - Math.exp(-9.5 * delta);
  const slerpAlphaHand = 1 - Math.exp(-12.0 * delta);

  const driveBone = (
    bone: THREE.Object3D | null,
    tx: number,
    ty: number,
    tz: number,
    alpha: number
  ) => {
    if (!bone) return;
    const baseQ = rig.boneInitialQuaternions.get(bone);
    if (!baseQ) return;

    let currDelta = runtime.armDeltaQuats.get(bone);
    if (!currDelta) {
      currDelta = new THREE.Quaternion().setFromEuler(_armTargetEuler.set(tx, ty, tz, 'XYZ'));
      runtime.armDeltaQuats.set(bone, currDelta);
    }

    _armTargetEuler.set(tx, ty, tz, 'XYZ');
    _armTargetQuat.setFromEuler(_armTargetEuler);
    currDelta.slerp(_armTargetQuat, alpha);

    if (currDelta.angleTo(_armTargetQuat) > 0.004) {
      stillConverging = true;
    }

    bone.quaternion.copy(baseQ).multiply(currDelta);
  };

  // Compute target angles for Left & Right arm chains (Right is canonical; Left mirrors Y and Z)
  const applyArmSide = (side: 'right' | 'left') => {
    const m = side === 'right' ? 1 : -1;
    const shoulder = side === 'right' ? bones.rightShoulder : bones.leftShoulder;
    const arm = side === 'right' ? bones.rightArm : bones.leftArm;
    const foreArm = side === 'right' ? bones.rightForeArm : bones.leftForeArm;
    const hand = side === 'right' ? bones.rightHand : bones.leftHand;

    const sideGestureFade = activeSide === side ? Math.max(0, 1 - gestureHoldBlend) : 1;

    // Seated resting baseline gently aligns hands above chair armrests without clipping
    const isSeated = postureMode === 'seated';
    let shX = 0.008 * armBreath * sideGestureFade;
    let shY = 0;
    let shZ = -0.016 * armBreath * m * sideGestureFade;
    let armX = (isSeated ? 1.12 : 1.16) + 0.011 * armBreath * sideGestureFade;
    let armY = (isSeated ? -0.18 * m : 0) + 0.007 * armSway * m * sideGestureFade;
    let armZ = ((isSeated ? -0.16 : -0.08) - 0.009 * armBreath * sideGestureFade) * m;
    let foreX = isSeated ? -0.05 : 0;
    let foreY = isSeated ? 0.35 * m : 0;
    let foreZ = ((isSeated ? -1.12 : -0.18) - 0.015 * armSway * sideGestureFade) * m;
    let handX = (isSeated ? 0.04 : 0) + 0.008 * armSway * sideGestureFade;
    let handY = isSeated ? 0.08 * m : 0;
    let handZ = (isSeated ? 0.12 : -0.04) * m;

    if (activeSide === side && gestureHoldBlend > 0.001) {
      let gShY = 0;
      let gShZ = 0;
      let gArmX = armX;
      let gArmY = 0;
      let gArmZ = armZ;
      let gForeX = 0;
      let gForeY = 0;
      let gForeZ = foreZ;
      let gHandX = 0;
      let gHandY = 0;
      let gHandZ = handZ;

      switch (runtime.armGesture) {
        case 'wave':
          gShY = 0.14 * m;
          gShZ = -0.1 * m;
          gArmX = 0.92;
          gArmY = 0.72 * m;
          gArmZ = -0.62 * m;
          gForeX = -0.08;
          gForeY = 0.25 * m;
          gForeZ = (-2.02 + waveOscillation * 0.25) * m;
          gHandX = 0.02;
          gHandY = -0.15 * m;
          gHandZ = (-0.05 + waveOscillation) * m;
          break;
        case 'open-palm':
          gShY = 0.12 * m;
          gShZ = -0.08 * m;
          gArmX = 1.02;
          gArmY = 0.42 * m;
          gArmZ = -0.52 * m;
          gForeX = -0.05;
          gForeY = 0.18 * m;
          gForeZ = -1.72 * m;
          gHandX = -0.1;
          gHandY = 0.15 * m;
          gHandZ = 0;
          break;
        case 'raise-hand':
          gShY = 0.14 * m;
          gShZ = -0.12 * m;
          gArmX = 0.72;
          gArmY = 0.88 * m;
          gArmZ = -0.48 * m;
          gForeX = -0.08;
          gForeY = 0.22 * m;
          gForeZ = -1.78 * m;
          gHandX = 0.04;
          gHandY = -0.1 * m;
          gHandZ = 0;
          break;
        case 'conversational':
          gShY = 0.08 * m;
          gShZ = -0.04 * m;
          gArmX = 1.1;
          gArmY = 0.28 * m;
          gArmZ = -0.4 * m;
          gForeX = 0;
          gForeY = 0.1 * m;
          gForeZ = (-1.42 - gestureConversePulse) * m;
          gHandX = -0.08 - gestureConversePulse * 0.5;
          gHandY = 0.12 * m;
          gHandZ = -0.04 * m;
          break;
        default:
          break;
      }

      const w = gestureHoldBlend;
      shY = THREE.MathUtils.lerp(shY, gShY, w);
      shZ = THREE.MathUtils.lerp(shZ, gShZ, w);
      armX = THREE.MathUtils.lerp(armX, gArmX, w);
      armY = THREE.MathUtils.lerp(armY, gArmY, w);
      armZ = THREE.MathUtils.lerp(armZ, gArmZ, w);
      foreX = THREE.MathUtils.lerp(foreX, gForeX, w);
      foreY = THREE.MathUtils.lerp(foreY, gForeY, w);
      foreZ = THREE.MathUtils.lerp(foreZ, gForeZ, w);
      handX = THREE.MathUtils.lerp(handX, gHandX, w);
      handY = THREE.MathUtils.lerp(handY, gHandY, w);
      handZ = THREE.MathUtils.lerp(handZ, gHandZ, w);
    }

    driveBone(shoulder, shX, shY, shZ, slerpAlphaArm);
    driveBone(arm, armX, armY, armZ, slerpAlphaArm);
    driveBone(foreArm, foreX, foreY, foreZ, slerpAlphaArm);
    driveBone(hand, handX, handY, handZ, slerpAlphaHand);
  };

  applyArmSide('right');
  applyArmSide('left');

  // Coordinate finger pose: active open-palm/wave gestures naturally open the gesturing hand;
  // otherwise apply the selected HandPoseTarget ('relaxed' | 'open' | 'curl').
  const applyFingersForSide = (side: 'right' | 'left') => {
    const fingers = side === 'right' ? bones.rightFingers : bones.leftFingers;
    const m = side === 'right' ? 1 : -1;

    const gestureForcesOpen =
      activeSide === side &&
      gestureHoldBlend > 0.2 &&
      (runtime.armGesture === 'wave' ||
        runtime.armGesture === 'open-palm' ||
        runtime.armGesture === 'raise-hand');

    const effectiveHandPose: HandPoseTarget = gestureForcesOpen
      ? 'open'
      : activeSide === side && runtime.armGesture === 'conversational' && gestureHoldBlend > 0.2
      ? 'relaxed'
      : runtime.handPose;

    const driveChain = (
      chain: THREE.Object3D[],
      xAngles: readonly [number, number, number],
      zBase = 0
    ) => {
      for (let i = 0; i < Math.min(3, chain.length); i += 1) {
        driveBone(chain[i], xAngles[i], 0, i === 0 ? zBase : 0, slerpAlphaHand);
      }
    };

    if (effectiveHandPose === 'open') {
      driveChain(fingers.index, [0.05, 0.06, 0.04], -0.05 * m);
      driveChain(fingers.middle, [0.05, 0.06, 0.04], 0);
      driveChain(fingers.ring, [0.06, 0.08, 0.05], 0.04 * m);
      driveChain(fingers.pinky, [0.08, 0.1, 0.06], 0.08 * m);
      for (let i = 0; i < Math.min(2, fingers.thumb.length); i += 1) {
        driveBone(
          fingers.thumb[i],
          i === 0 ? 0.04 : 0.05,
          0,
          i === 0 ? -0.1 * m : 0,
          slerpAlphaHand
        );
      }
    } else if (effectiveHandPose === 'curl') {
      driveChain(fingers.index, [0.55, 0.72, 0.52]);
      driveChain(fingers.middle, [0.6, 0.76, 0.55]);
      driveChain(fingers.ring, [0.62, 0.78, 0.56]);
      driveChain(fingers.pinky, [0.65, 0.8, 0.58]);
      for (let i = 0; i < Math.min(2, fingers.thumb.length); i += 1) {
        driveBone(
          fingers.thumb[i],
          i === 0 ? 0.22 : 0.34,
          0,
          i === 0 ? 0.26 * m : 0.1 * m,
          slerpAlphaHand
        );
      }
    } else {
      // Natural soft relaxed hand
      driveChain(fingers.index, [0.16, 0.2, 0.12]);
      driveChain(fingers.middle, [0.18, 0.22, 0.14]);
      driveChain(fingers.ring, [0.22, 0.26, 0.16]);
      driveChain(fingers.pinky, [0.25, 0.28, 0.18]);
      for (let i = 0; i < Math.min(2, fingers.thumb.length); i += 1) {
        driveBone(fingers.thumb[i], i === 0 ? 0.08 : 0.1, 0, 0, slerpAlphaHand);
      }
    }
  };

  applyFingersForSide('right');
  applyFingersForSide('left');

  return {
    isAnimating: stillConverging,
    activeGesture: runtime.armGesture,
  };
}

// Pre-allocated scratch helpers for zero-GC torso & lower-body quaternion/position updates
const _bodyTargetEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const _bodyTargetQuat = new THREE.Quaternion();
const _hipsTargetOffset = new THREE.Vector3();

/**
 * Phase 4 coordinated procedural controller for Hips, Spine, Spine1, Spine2, and Lower-Body leg/foot/toe chains.
 * - Priority: (1) Safety / Reduced Motion > (2) Active User Gestures > (3) Speech > (4) Subtle Idle.
 * - Respects presentationMode ('close-up' keeps lower-body standing shift settled so face framing stays steady).
 * - Applies strictly bind-relative delta rotations and positions (zero frame-to-frame accumulation).
 * - Never writes to Head, Neck, Shoulder, Arm, ForeArm, Hand, Finger bones, or morphTargetInfluences.
 */
export function updateFullBodyAndLowerRig(params: {
  rig: InspectedRigData;
  runtime: RigAnimationRuntime;
  state: AvatarState;
  unifiedState?: UnifiedAnimationState;
  presentationMode: BodyPresentationMode;
  postureMode?: BodyPostureMode;
  prefersReducedMotion: boolean;
  elapsed: number;
  delta: number;
}): { isAnimating: boolean } {
  const {
    rig,
    runtime,
    state,
    unifiedState,
    presentationMode,
    postureMode = 'standing',
    prefersReducedMotion,
    elapsed,
    delta,
  } = params;
  const { bones } = rig;

  if (!bones.hips && !bones.spine && !bones.spine1 && !bones.spine2 && !bones.leftUpLeg && !bones.rightUpLeg) {
    return { isAnimating: false };
  }

  // 1. Priority-based blend levels (idle breathing vs active gesture/speech override)
  const hasActiveGesture =
    runtime.armGesture !== 'none' ||
    runtime.nodActive ||
    unifiedState === 'greeting' ||
    unifiedState === 'goodbye';
  const isSpeaking = state === 'speaking' || unifiedState === 'speaking';
  const isListening = state === 'listening' || unifiedState === 'listening';

  let targetBodyBlend = 0;
  if (!prefersReducedMotion && runtime.idleEnabled) {
    if (hasActiveGesture) {
      targetBodyBlend = 0.28; // Stabilize torso & stance while arm/nod gesture plays
    } else if (isSpeaking) {
      targetBodyBlend = 0.48 * (0.65 + 0.35 * runtime.speechPauseDamp); // Gentle breathing + calm conversational poise
    } else if (isListening) {
      targetBodyBlend = 0.55; // Attentive stillness
    } else {
      targetBodyBlend = 1.0; // Natural idle
    }
  }

  runtime.bodyIdleBlend = THREE.MathUtils.damp(runtime.bodyIdleBlend, targetBodyBlend, 4.0, delta);

  const intensityScale =
    runtime.idleIntensity === 'low'
      ? 0.55
      : runtime.idleIntensity === 'high'
      ? 1.4
      : 1.0;

  const isSeated = postureMode === 'seated';
  const isLowerBodyVisible = presentationMode !== 'close-up';
  const weightShiftFactor = isLowerBodyVisible ? 1.0 : 0.0;
  const blend = runtime.bodyIdleBlend * intensityScale;
  const speechSwayPauseFactor = isSpeaking ? 0.45 + 0.55 * runtime.speechPauseDamp : 1.0;

  // 2. Smooth multi-frequency time signals (sub-Hz natural breathing ~0.23Hz & slow sway ~0.12Hz)
  const t = elapsed + runtime.idlePhaseOffset;
  const breath = (Math.sin(t * 1.45) * 0.72 + Math.sin(t * 0.72 + 0.6) * 0.28) * blend;
  const sway =
    (Math.sin(t * 0.76 + 0.4) * 0.7 + Math.sin(t * 0.43 + 1.9) * 0.3) *
    blend *
    speechSwayPauseFactor;
  const microPitch = Math.sin(t * 0.53 + 1.1) * blend * speechSwayPauseFactor;

  // 3. Chest breathing (Spine, Spine1, Spine2): seated posture base + subtle inhale expansion
  const seatedSpinePitch = isSeated ? -0.04 : 0;
  const seatedSpine1Pitch = isSeated ? -0.04 : 0;
  const seatedSpine2Pitch = isSeated ? 0.02 : 0;
  const seatedSwayDamp = isSeated ? 0.55 : 1.0;

  const spinePitch = seatedSpinePitch + 0.004 * breath + 0.004 * microPitch * weightShiftFactor;
  const spineRoll = -0.012 * sway * seatedSwayDamp * (0.45 + 0.55 * weightShiftFactor);
  const spineYaw = -0.01 * sway * seatedSwayDamp * (0.4 + 0.6 * weightShiftFactor);

  const spine1Pitch = seatedSpine1Pitch - 0.008 * breath;
  const spine1Roll = 0.004 * sway * seatedSwayDamp * (0.4 + 0.6 * weightShiftFactor);
  const spine1Yaw = 0.005 * sway * seatedSwayDamp;

  const spine2Pitch = seatedSpine2Pitch - 0.015 * breath; // Subtle chest lift on inhale (-X)
  const spine2Roll = 0.005 * sway * seatedSwayDamp;
  const spine2Yaw = 0.004 * sway * seatedSwayDamp;

  // 4. Hips: seated on chair cushion or subtle standing weight-shift
  const hipPitch = (isSeated ? 0.02 : 0) - (isSeated ? 0.002 : 0.006) * breath * weightShiftFactor;
  const hipYaw = (isSeated ? 0.006 : 0.018) * sway * weightShiftFactor;
  const hipRoll = (isSeated ? 0.005 : 0.016) * sway * weightShiftFactor;

  if (bones.hips) {
    const baseHipsPos = rig.boneInitialPositions.get(bones.hips);
    if (baseHipsPos) {
      const targetShiftX = (isSeated ? 0.002 : 0.007) * sway * weightShiftFactor;
      const targetShiftY = isSeated
        ? SEATED_HIPS_DROP_Y + 0.0005 * breath * weightShiftFactor
        : -Math.abs(sway) * 0.0018 * weightShiftFactor + 0.0008 * breath * weightShiftFactor;
      const targetShiftZ = isSeated ? SEATED_HIPS_OFFSET_Z : 0;
      _hipsTargetOffset.set(targetShiftX, targetShiftY, targetShiftZ);

      const posAlpha = 1 - Math.exp(-5.0 * delta);
      if (isSeated && runtime.hipsOffset.y === 0 && runtime.hipsOffset.z === 0) {
        runtime.hipsOffset.set(targetShiftX, SEATED_HIPS_DROP_Y, SEATED_HIPS_OFFSET_Z);
      } else {
        runtime.hipsOffset.lerp(_hipsTargetOffset, posAlpha);
      }
      if (
        !isSeated &&
        _hipsTargetOffset.lengthSq() === 0 &&
        runtime.hipsOffset.lengthSq() < 1e-8
      ) {
        runtime.hipsOffset.set(0, 0, 0);
      }
      bones.hips.position.copy(baseHipsPos).add(runtime.hipsOffset);
    }
  }

  // 5. Lower-body pose: verified seated hips/knees/ankles OR subtle standing idle
  let lHipBend = 0;
  let lHipYaw = 0;
  let lHipSpreadZ = 0;
  let lKneeBend = 0;
  let lFootComp = 0;
  let lFootRoll = 0;
  let lToeComp = 0;

  let rHipBend = 0;
  let rHipYaw = 0;
  let rHipSpreadZ = 0;
  let rKneeBend = 0;
  let rFootComp = 0;
  let rFootRoll = 0;
  let rToeComp = 0;

  if (isSeated) {
    const microFoot = 0.008 * sway * weightShiftFactor;
    lHipBend = 1.46 + 0.004 * breath * weightShiftFactor;
    lHipYaw = -0.05;
    lHipSpreadZ = 0.09;
    lKneeBend = -1.48 - 0.004 * breath * weightShiftFactor;
    lFootComp = 0.06 + microFoot;
    lFootRoll = -0.004 * sway * weightShiftFactor;
    lToeComp = 0.004 * sway * weightShiftFactor;

    rHipBend = 1.46 + 0.004 * breath * weightShiftFactor;
    rHipYaw = 0.05;
    rHipSpreadZ = -0.09;
    rKneeBend = -1.48 - 0.004 * breath * weightShiftFactor;
    rFootComp = 0.06 - microFoot;
    rFootRoll = -0.004 * sway * weightShiftFactor;
    rToeComp = -0.004 * sway * weightShiftFactor;
  } else {
    const leftWeightRelease = Math.max(0, sway) * weightShiftFactor;
    const rightWeightRelease = Math.max(0, -sway) * weightShiftFactor;
    const baseKneeSoft = 0.025 * Math.min(1.2, intensityScale) * (runtime.idleEnabled && !prefersReducedMotion ? 1 : 0) * weightShiftFactor;

    lHipBend = baseKneeSoft + 0.042 * leftWeightRelease;
    lKneeBend = -2.0 * lHipBend;
    lFootComp = 0.95 * lHipBend;
    lFootRoll = -0.01 * sway * weightShiftFactor;
    lToeComp = -0.15 * lHipBend;
    lHipSpreadZ = 0.018 * weightShiftFactor + 0.008 * leftWeightRelease;

    rHipBend = baseKneeSoft + 0.042 * rightWeightRelease;
    rKneeBend = -2.0 * rHipBend;
    rFootComp = 0.95 * rHipBend;
    rFootRoll = -0.01 * sway * weightShiftFactor;
    rToeComp = -0.15 * rHipBend;
    rHipSpreadZ = -0.018 * weightShiftFactor - 0.008 * rightWeightRelease;
  }

  let stillConverging =
    runtime.bodyIdleBlend > 0.002 ||
    (!isSeated && runtime.hipsOffset.lengthSq() > 1e-7);

  const slerpAlpha = 1 - Math.exp(-6.5 * delta);

  const driveBodyBone = (
    bone: THREE.Object3D | null,
    tx: number,
    ty: number,
    tz: number
  ) => {
    if (!bone) return;
    const baseQ = rig.boneInitialQuaternions.get(bone);
    if (!baseQ) return;

    let currDelta = runtime.bodyDeltaQuats.get(bone);
    if (!currDelta) {
      currDelta = new THREE.Quaternion().setFromEuler(_bodyTargetEuler.set(tx, ty, tz, 'XYZ'));
      runtime.bodyDeltaQuats.set(bone, currDelta);
    }

    _bodyTargetEuler.set(tx, ty, tz, 'XYZ');
    _bodyTargetQuat.setFromEuler(_bodyTargetEuler);
    currDelta.slerp(_bodyTargetQuat, slerpAlpha);

    if (currDelta.angleTo(_bodyTargetQuat) > 0.0008) {
      stillConverging = true;
    }

    bone.quaternion.copy(baseQ).multiply(currDelta);
  };

  driveBodyBone(bones.hips, hipPitch, hipYaw, hipRoll);
  driveBodyBone(bones.spine, spinePitch, spineYaw, spineRoll);
  driveBodyBone(bones.spine1, spine1Pitch, spine1Yaw, spine1Roll);
  driveBodyBone(bones.spine2, spine2Pitch, spine2Yaw, spine2Roll);

  driveBodyBone(bones.leftUpLeg, lHipBend, lHipYaw, lHipSpreadZ);
  driveBodyBone(bones.leftLeg, lKneeBend, 0, 0);
  driveBodyBone(bones.leftFoot, lFootComp, 0, lFootRoll);
  driveBodyBone(bones.leftToeBase, lToeComp, 0, 0);

  driveBodyBone(bones.rightUpLeg, rHipBend, rHipYaw, rHipSpreadZ);
  driveBodyBone(bones.rightLeg, rKneeBend, 0, 0);
  driveBodyBone(bones.rightFoot, rFootComp, 0, rFootRoll);
  driveBodyBone(bones.rightToeBase, rToeComp, 0, 0);

  return { isAnimating: stillConverging };
}



