import * as THREE from 'three';
import { AVATAR_EMOTIONS, AvatarEmotion, AvatarState } from '../../types/companion';

export interface RigMorphEntry {
  mesh: THREE.Mesh;
  dict: Record<string, number>;
}

export interface DetectedRigBones {
  hips: THREE.Object3D | null;
  spine: THREE.Object3D | null;
  neck: THREE.Object3D | null;
  head: THREE.Object3D | null;
  headTop: THREE.Object3D | null;
  jaw: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
  leftForeArm: THREE.Object3D | null;
  leftHand: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  rightHand: THREE.Object3D | null;
}

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
  hasHeadNeckBones: boolean;
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
  'mouthFunnel',
  'mouthStretchLeft',
  'mouthStretchRight',
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
      browInnerUp: 0.85,
      browOuterUpLeft: 0.85,
      browOuterUpRight: 0.85,
      eyeWideLeft: 0.8,
      eyeWideRight: 0.8,
      jawOpen: 0.42,
      mouthFunnel: 0.25,
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
  if (lower.includes('jaw') || lower.startsWith('viseme_')) return 20;
  return 9;
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

  const bones: DetectedRigBones = {
    hips: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])hips$/i]),
    spine: findFirstBone(sceneRoot, boundBones, [/spine2|chest|upperchest/i, /(^|[._:-])spine$/i]),
    neck: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])neck$/i, /mixamorig:?neck$/i]),
    head: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])head$/i, /mixamorig:?head$/i, /bip01.*head$/i]),
    headTop: findFirstBone(sceneRoot, boundBones, [/headtop_end/i]),
    jaw: findFirstBone(sceneRoot, boundBones, [/(^|[._:-])jaw$/i, /chin/i]),
    leftArm: findFirstBone(sceneRoot, boundBones, [/^leftarm$/i, /upperarm_l|arm_l/i]),
    leftForeArm: findFirstBone(sceneRoot, boundBones, [/^leftforearm$/i, /forearm_l|lowerarm_l/i]),
    leftHand: findFirstBone(sceneRoot, boundBones, [/^lefthand$/i, /hand_l/i]),
    rightArm: findFirstBone(sceneRoot, boundBones, [/^rightarm$/i, /upperarm_r|arm_r/i]),
    rightForeArm: findFirstBone(sceneRoot, boundBones, [/^rightforearm$/i, /forearm_r|lowerarm_r/i]),
    rightHand: findFirstBone(sceneRoot, boundBones, [/^righthand$/i, /hand_r/i]),
  };

  const boneInitialRotations = new Map<THREE.Object3D, THREE.Euler>();
  const registerBone = (b: THREE.Object3D | null) => {
    if (b && !boneInitialRotations.has(b)) {
      boneInitialRotations.set(b, b.rotation.clone());
    }
  };
  registerBone(bones.hips);
  registerBone(bones.spine);
  registerBone(bones.neck);
  registerBone(bones.head);
  registerBone(bones.headTop);
  registerBone(bones.jaw);
  registerBone(bones.leftArm);
  registerBone(bones.leftForeArm);
  registerBone(bones.leftHand);
  registerBone(bones.rightArm);
  registerBone(bones.rightForeArm);
  registerBone(bones.rightHand);

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
        ...CHANNEL_ALIASES.mouthFunnel,
        ...CHANNEL_ALIASES.mouthPucker,
        ...CHANNEL_ALIASES.mouthStretchLeft,
        ...CHANNEL_ALIASES.mouthPressLeft,
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
  const hasHeadNeckBones = Boolean(bones.head || bones.neck || bones.spine);
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
      hasHeadNeckBones,
      hasExpressionMorphs,
    },
    supportedExpressions,
  };
}

/**
 * Applies a static natural standing rest pose to the arms so Upper/Full camera presets
 * do not display a rigid horizontal T-pose. Does not animate head, hands, or body (Phase 1).
 */
export function applyStaticRelaxedArmPose(rig: InspectedRigData): void {
  const applyStaticOffset = (bone: THREE.Object3D | null, dx: number, dy: number, dz: number) => {
    if (!bone) return;
    const init = rig.boneInitialRotations.get(bone);
    if (!init) return;
    bone.rotation.set(init.x + dx, init.y + dy, init.z + dz);
  };

  applyStaticOffset(rig.bones.leftArm, 1.16, 0, 0.08);
  applyStaticOffset(rig.bones.leftForeArm, 0, 0, 0.18);
  applyStaticOffset(rig.bones.leftHand, 0, 0, 0.04);

  applyStaticOffset(rig.bones.rightArm, 1.16, 0, -0.08);
  applyStaticOffset(rig.bones.rightForeArm, 0, 0, -0.18);
  applyStaticOffset(rig.bones.rightHand, 0, 0, -0.04);
}

export interface RigAnimationRuntime {
  nextBlinkAt: number;
  blinkProgress: number;
  blinkDuration: number;
  nextGazeShiftAt: number;
  targetGazeX: number;
  targetGazeY: number;
  gazeX: number;
  gazeY: number;
  talkPhase: number;
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
  };
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
  emotion: AvatarEmotion;
  emotionIntensity: number;
  audioLevel: number;
  prefersReducedMotion: boolean;
  elapsed: number;
  delta: number;
}) {
  const {
    rig,
    runtime,
    state,
    emotion,
    emotionIntensity,
    audioLevel,
    prefersReducedMotion,
    elapsed,
    delta,
  } = params;

  const clampedIntensity = Math.max(0.15, Math.min(1, emotionIntensity));

  // Effective expression: blend talking/thinking states cleanly with explicit emotion
  const activeEmotion: AvatarEmotion =
    state === 'speaking' && emotion === 'neutral'
      ? 'talking'
      : state === 'thinking' && emotion === 'neutral'
      ? 'thinking'
      : emotion;

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

  const presetMorphs = preset.morphs;
  for (const ch in presetMorphs) {
    const channel = ch as FacialChannel;
    if (channel === 'jawOpen' && (state === 'listening' || state === 'interrupted')) continue;
    const base = presetMorphs[channel] ?? 0;
    _desiredChannels[channel] = Math.min(1, base * clampedIntensity);
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

  // 4. Audio-amplitude approximate speech animation (jawOpen + visemes)
  let speechJawWeight = 0;
  let speechFunnelWeight = 0;
  let speechStretchWeight = 0;

  if (state === 'speaking') {
    const effectiveAudio = Math.max(0, Math.min(1, audioLevel));
    if (effectiveAudio > 0.02) {
      runtime.talkPhase += delta * 13.0;
      const harmonic = 0.78 + 0.22 * Math.sin(runtime.talkPhase);
      speechJawWeight = Math.min(0.44, effectiveAudio * 0.6 * harmonic);

      if (rig.capabilities.hasVisemeMorphs) {
        const vowelWave = (Math.sin(runtime.talkPhase * 0.62) + 1) * 0.5;
        const roundWave = (Math.cos(runtime.talkPhase * 0.45) + 1) * 0.5;
        const spreadWave = (Math.sin(runtime.talkPhase * 0.95 + 1.1) + 1) * 0.5;
        const consonantWave = Math.max(0, Math.sin(runtime.talkPhase * 1.45));

        _desiredChannels[VISEME_CHANNEL_BY_NAME.viseme_aa] = Math.min(
          0.42,
          effectiveAudio * 0.5 * vowelWave
        );
        _desiredChannels[VISEME_CHANNEL_BY_NAME.viseme_O] = Math.min(
          0.32,
          effectiveAudio * 0.36 * roundWave * (1 - vowelWave * 0.4)
        );
        _desiredChannels[VISEME_CHANNEL_BY_NAME.viseme_E] = Math.min(
          0.28,
          effectiveAudio * 0.32 * spreadWave * (1 - roundWave * 0.5)
        );
        _desiredChannels[VISEME_CHANNEL_BY_NAME.viseme_I] = Math.min(
          0.2,
          effectiveAudio * 0.24 * spreadWave * (1 - vowelWave * 0.6)
        );
        _desiredChannels[VISEME_CHANNEL_BY_NAME.viseme_U] = Math.min(
          0.22,
          effectiveAudio * 0.24 * (1 - vowelWave) * roundWave
        );
        _desiredChannels[VISEME_CHANNEL_BY_NAME.viseme_PP] = Math.min(
          0.18,
          effectiveAudio * 0.22 * (1 - vowelWave) * consonantWave
        );
        _desiredChannels[VISEME_CHANNEL_BY_NAME.viseme_SS] = Math.min(
          0.16,
          effectiveAudio * 0.2 * spreadWave * consonantWave * 0.6
        );
      } else {
        speechFunnelWeight = Math.min(
          0.32,
          effectiveAudio * 0.4 * (0.5 + 0.5 * Math.cos(runtime.talkPhase * 0.7))
        );
        speechStretchWeight = Math.min(
          0.26,
          effectiveAudio * 0.32 * (0.5 + 0.5 * Math.sin(runtime.talkPhase * 1.1))
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

  // Conflict prevention: suppress lip press/close during jaw opening, and frown during smile
  if ((_desiredChannels.jawOpen ?? 0) > 0.02 || state === 'speaking') {
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
