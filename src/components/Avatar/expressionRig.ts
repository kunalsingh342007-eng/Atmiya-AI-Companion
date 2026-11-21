import * as THREE from 'three';
import { AVATAR_EMOTIONS, AvatarEmotion, AvatarState } from '../../types/companion';

export interface RigMorphEntry {
  mesh: THREE.Mesh;
  dict: Record<string, number>;
}

export interface DetectedRigBones {
  head: THREE.Object3D | null;
  neck: THREE.Object3D | null;
  spine: THREE.Object3D | null;
  leftEye: THREE.Object3D | null;
  rightEye: THREE.Object3D | null;
  jaw: THREE.Object3D | null;
  leftShoulder: THREE.Object3D | null;
  rightShoulder: THREE.Object3D | null;
}

export interface RigCapabilities {
  hasBlinking: boolean;
  hasSpeechMorphs: boolean;
  hasJawBone: boolean;
  hasEyeBones: boolean;
  hasHeadNeckBones: boolean;
  hasExpressionMorphs: boolean;
}

export interface InspectedRigData {
  morphMeshes: RigMorphEntry[];
  bones: DetectedRigBones;
  boneInitialRotations: Map<THREE.Object3D, THREE.Euler>;
  availableMorphKeys: Set<string>;
  activeSpeechMorphs: string[];
  activeBlinkMorphs: string[];
  capabilities: RigCapabilities;
  supportedExpressions: Record<AvatarEmotion, boolean>;
}

// Logical facial channels mapped to standard ARKit, Ready Player Me, VRoid, and common glTF names
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
  jawOpen: ['jawOpen', 'JawOpen', 'mouthOpen', 'viseme_aa', 'A', 'Fcl_MTH_A', 'mouth_open'],
  mouthFunnel: ['mouthFunnel', 'MouthFunnel', 'viseme_O', 'O', 'Fcl_MTH_O'],
  mouthPucker: ['mouthPucker', 'MouthPucker', 'viseme_U', 'U', 'Fcl_MTH_U'],
  mouthStretchLeft: ['mouthStretchLeft', 'MouthStretchLeft', 'viseme_E', 'E', 'Fcl_MTH_E'],
  mouthStretchRight: ['mouthStretchRight', 'MouthStretchRight'],
  mouthPressLeft: ['mouthPressLeft', 'MouthPressLeft', 'viseme_PP'],
  mouthPressRight: ['mouthPressRight', 'MouthPressRight'],
  eyeLookUpLeft: ['eyeLookUpLeft', 'EyeLookUpLeft'],
  eyeLookUpRight: ['eyeLookUpRight', 'EyeLookUpRight'],
  eyeLookInLeft: ['eyeLookInLeft', 'EyeLookInLeft'],
  eyeLookOutLeft: ['eyeLookOutLeft', 'EyeLookOutLeft'],
  eyeLookInRight: ['eyeLookInRight', 'EyeLookInRight'],
  eyeLookOutRight: ['eyeLookOutRight', 'EyeLookOutRight'],
} as const;

type FacialChannel = keyof typeof CHANNEL_ALIASES;

interface ExpressionPreset {
  morphs: Partial<Record<FacialChannel, number>>;
  headRot?: [number, number, number]; // pitch X, yaw Y, roll Z in radians
}

export const EXPRESSION_PRESETS: Record<AvatarEmotion, ExpressionPreset> = {
  neutral: {
    morphs: {},
    headRot: [0, 0, 0],
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
    headRot: [-0.02, 0.02, 0.03],
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
    headRot: [-0.01, 0, 0.02],
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
    headRot: [-0.06, 0, 0.04],
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
    headRot: [0.06, -0.02, -0.03],
  },
  thinking: {
    morphs: {
      browInnerUp: 0.32,
      browDownLeft: 0.22,
      eyeSquintLeft: 0.2,
      eyeSquintRight: 0.14,
      mouthPucker: 0.24,
      mouthPressLeft: 0.2,
    },
    headRot: [-0.05, 0.08, -0.05],
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
    headRot: [-0.02, 0.05, 0.08],
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
    headRot: [-0.05, 0, 0],
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
    headRot: [-0.03, -0.05, 0.07],
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
    headRot: [0.04, 0.02, -0.04],
  },
  empathetic: {
    morphs: {
      browInnerUp: 0.48,
      smileLeft: 0.24,
      smileRight: 0.24,
      eyeSquintLeft: 0.16,
      eyeSquintRight: 0.16,
    },
    headRot: [0.03, 0, -0.055],
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
    headRot: [-0.04, 0, 0.03],
  },
  calm: {
    morphs: {
      smileLeft: 0.2,
      smileRight: 0.2,
      eyeSquintLeft: 0.08,
      eyeSquintRight: 0.08,
    },
    headRot: [0.01, 0, 0.01],
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
    headRot: [0.07, -0.03, -0.02],
  },
  winking: {
    morphs: {
      blinkLeft: 0.95,
      smileLeft: 0.62,
      smileRight: 0.45,
      cheekSquintLeft: 0.5,
      browOuterUpRight: 0.28,
    },
    headRot: [-0.02, 0.05, 0.06],
  },
  talking: {
    morphs: {
      smileLeft: 0.18,
      smileRight: 0.18,
      browOuterUpLeft: 0.12,
      browOuterUpRight: 0.12,
    },
    headRot: [0, 0, 0],
  },
};

function findFirstBone(root: THREE.Object3D, patterns: RegExp[]): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (found) return;
    const isBoneLike = (obj as THREE.Bone).isBone || obj.type === 'Bone' || obj.name.length > 0;
    if (!isBoneLike || !obj.name) return;
    if (patterns.some((re) => re.test(obj.name))) {
      found = obj;
    }
  });
  return found;
}

export function inspectGlbRig(sceneRoot: THREE.Object3D): InspectedRigData {
  const morphMeshes: RigMorphEntry[] = [];
  const availableMorphKeys = new Set<string>();

  sceneRoot.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        morphMeshes.push({ mesh, dict: mesh.morphTargetDictionary });
        Object.keys(mesh.morphTargetDictionary).forEach((key) => availableMorphKeys.add(key));
      }
    }
  });

  const hasChannel = (channel: FacialChannel): boolean =>
    CHANNEL_ALIASES[channel].some((alias) => availableMorphKeys.has(alias));

  const bones: DetectedRigBones = {
    head: findFirstBone(sceneRoot, [/(^|[._:-])head$/i, /mixamorig:?head$/i, /bip01.*head$/i]),
    neck: findFirstBone(sceneRoot, [/(^|[._:-])neck/i, /mixamorig:?neck/i]),
    spine: findFirstBone(sceneRoot, [/spine2|chest|upperchest/i, /(^|[._:-])spine/i]),
    leftEye: findFirstBone(sceneRoot, [/lefteye|eye_l|eye\.l|l_eye/i]),
    rightEye: findFirstBone(sceneRoot, [/righteye|eye_r|eye\.r|r_eye/i]),
    jaw: findFirstBone(sceneRoot, [/(^|[._:-])jaw$/i, /chin/i]),
    leftShoulder: findFirstBone(sceneRoot, [/leftshoulder|shoulder_l|shoulder\.l|clavicle_l/i]),
    rightShoulder: findFirstBone(sceneRoot, [/rightshoulder|shoulder_r|shoulder\.r|clavicle_r/i]),
  };

  const boneInitialRotations = new Map<THREE.Object3D, THREE.Euler>();
  Object.values(bones).forEach((b) => {
    if (b) {
      boneInitialRotations.set(b, b.rotation.clone());
    }
  });

  const activeSpeechMorphs = Array.from(availableMorphKeys).filter((k) =>
    (
      [
        ...CHANNEL_ALIASES.jawOpen,
        ...CHANNEL_ALIASES.mouthFunnel,
        ...CHANNEL_ALIASES.mouthPucker,
        ...CHANNEL_ALIASES.mouthStretchLeft,
        ...CHANNEL_ALIASES.mouthPressLeft,
      ] as string[]
    ).includes(k)
  );

  const activeBlinkMorphs = Array.from(availableMorphKeys).filter((k) =>
    ([...CHANNEL_ALIASES.blinkLeft, ...CHANNEL_ALIASES.blinkRight] as string[]).includes(k)
  );

  const hasBlinking = activeBlinkMorphs.length > 0;
  const hasSpeechMorphs = activeSpeechMorphs.length > 0;
  const hasJawBone = Boolean(bones.jaw);
  const hasEyeBones = Boolean(bones.leftEye || bones.rightEye);
  const hasHeadNeckBones = Boolean(bones.head || bones.neck || bones.spine);
  const hasExpressionMorphs = (Object.keys(CHANNEL_ALIASES) as FacialChannel[]).some(
    (ch) => ch !== 'jawOpen' && hasChannel(ch)
  );

  // Compute genuine support per expression based on what morphs/bones actually exist
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
    // Require at least 1 real facial morph match for expressive presets (calm can also use subtle head/smile if present)
    supportedExpressions[emotion] =
      emotion === 'calm' ? matchedMorphs.length > 0 || hasHeadNeckBones : matchedMorphs.length > 0;
  }

  return {
    morphMeshes,
    bones,
    boneInitialRotations,
    availableMorphKeys,
    activeSpeechMorphs,
    activeBlinkMorphs,
    capabilities: {
      hasBlinking,
      hasSpeechMorphs,
      hasJawBone,
      hasEyeBones,
      hasHeadNeckBones,
      hasExpressionMorphs,
    },
    supportedExpressions,
  };
}

export interface RigAnimationRuntime {
  nextBlinkAt: number;
  blinkProgress: number; // -1 when not blinking, 0..1 during blink
  nextGazeShiftAt: number;
  targetGazeX: number;
  targetGazeY: number;
  gazeX: number;
  gazeY: number;
  talkPhase: number;
}

export function createRigRuntime(): RigAnimationRuntime {
  return {
    nextBlinkAt: 2.2 + Math.random() * 2.5,
    blinkProgress: -1,
    nextGazeShiftAt: 2.0 + Math.random() * 3.0,
    targetGazeX: 0,
    targetGazeY: 0,
    gazeX: 0,
    gazeY: 0,
    talkPhase: 0,
  };
}

export function clearAllRigMorphs(rig: InspectedRigData) {
  rig.morphMeshes.forEach(({ mesh }) => {
    if (!mesh.morphTargetInfluences) return;
    for (let i = 0; i < mesh.morphTargetInfluences.length; i += 1) {
      mesh.morphTargetInfluences[i] = 0;
    }
  });
  if (rig.bones.jaw) {
    const initial = rig.boneInitialRotations.get(rig.bones.jaw);
    if (initial) rig.bones.jaw.rotation.copy(initial);
  }
}

export function updateExpressionRig(params: {
  rig: InspectedRigData;
  runtime: RigAnimationRuntime;
  rootGroup: THREE.Group | null;
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
    rootGroup,
    state,
    emotion,
    emotionIntensity,
    audioLevel,
    prefersReducedMotion,
    elapsed,
    delta,
  } = params;

  const clampedIntensity = Math.max(0.15, Math.min(1, emotionIntensity));

  // Effective expression: if speaking and emotion is neutral, use 'talking' subtle engagement
  const activeEmotion: AvatarEmotion =
    state === 'speaking' && emotion === 'neutral'
      ? 'talking'
      : state === 'thinking' && emotion === 'neutral'
      ? 'thinking'
      : emotion;

  const preset = EXPRESSION_PRESETS[activeEmotion] || EXPRESSION_PRESETS.neutral;

  // 1. Varied natural blinking (2.5 - 6.0s intervals)
  let blinkWeight = 0;
  if (!prefersReducedMotion && rig.capabilities.hasBlinking) {
    if (runtime.blinkProgress >= 0) {
      runtime.blinkProgress += delta / 0.16; // ~160ms full blink cycle
      if (runtime.blinkProgress >= 1) {
        runtime.blinkProgress = -1;
        runtime.nextBlinkAt = elapsed + 2.5 + Math.random() * 3.5;
      } else {
        blinkWeight = Math.sin(runtime.blinkProgress * Math.PI);
      }
    } else if (elapsed >= runtime.nextBlinkAt) {
      runtime.blinkProgress = 0;
    }
  }

  // 2. Subtle natural gaze shifts (keep eye contact centered most of the time)
  if (!prefersReducedMotion) {
    if (elapsed >= runtime.nextGazeShiftAt) {
      runtime.nextGazeShiftAt = elapsed + 2.2 + Math.random() * 3.2;
      if (state === 'thinking' || activeEmotion === 'thinking') {
        runtime.targetGazeX = (Math.random() - 0.3) * 0.08;
        runtime.targetGazeY = 0.05 + Math.random() * 0.03;
      } else if (state === 'listening') {
        runtime.targetGazeX = (Math.random() - 0.5) * 0.02;
        runtime.targetGazeY = (Math.random() - 0.5) * 0.015;
      } else {
        runtime.targetGazeX = (Math.random() - 0.5) * 0.05;
        runtime.targetGazeY = (Math.random() - 0.5) * 0.03;
      }
    }
    runtime.gazeX = THREE.MathUtils.damp(runtime.gazeX, runtime.targetGazeX, 6, delta);
    runtime.gazeY = THREE.MathUtils.damp(runtime.gazeY, runtime.targetGazeY, 6, delta);
  }

  // 3. Build desired facial channel weights (scaled by intensity)
  const desiredChannels: Partial<Record<FacialChannel, number>> = {};
  (Object.keys(preset.morphs) as FacialChannel[]).forEach((ch) => {
    const base = preset.morphs[ch] ?? 0;
    // Do not open mouth from static emotion if listening/interrupted
    if (ch === 'jawOpen' && state === 'listening') return;
    desiredChannels[ch] = Math.min(1, base * clampedIntensity);
  });

  // Apply natural blink on top unless winking overrides left eye
  if (blinkWeight > 0) {
    desiredChannels.blinkLeft = Math.max(desiredChannels.blinkLeft ?? 0, blinkWeight);
    if (activeEmotion !== 'winking') {
      desiredChannels.blinkRight = Math.max(desiredChannels.blinkRight ?? 0, blinkWeight);
    }
  }

  // 4. Audio-level speech mouth movement ONLY during speaking state (never while listening)
  let speechJawWeight = 0;
  let speechFunnelWeight = 0;
  let speechStretchWeight = 0;
  if (state === 'speaking' || activeEmotion === 'talking') {
    const effectiveAudio = state === 'speaking' ? audioLevel : 0;
    if (effectiveAudio > 0.01) {
      runtime.talkPhase += delta * 13;
      const harmonic = 0.8 + 0.2 * Math.sin(runtime.talkPhase);
      speechJawWeight = Math.min(0.85, effectiveAudio * 1.15 * harmonic);
      speechFunnelWeight = Math.min(0.35, effectiveAudio * 0.45 * (0.5 + 0.5 * Math.cos(runtime.talkPhase * 0.7)));
      speechStretchWeight = Math.min(0.3, effectiveAudio * 0.35 * (0.5 + 0.5 * Math.sin(runtime.talkPhase * 1.1)));
    }
  }

  desiredChannels.jawOpen = Math.max(desiredChannels.jawOpen ?? 0, speechJawWeight);
  if (speechFunnelWeight > 0) {
    desiredChannels.mouthFunnel = Math.max(desiredChannels.mouthFunnel ?? 0, speechFunnelWeight);
  }
  if (speechStretchWeight > 0) {
    desiredChannels.mouthStretchLeft = Math.max(desiredChannels.mouthStretchLeft ?? 0, speechStretchWeight);
    desiredChannels.mouthStretchRight = Math.max(desiredChannels.mouthStretchRight ?? 0, speechStretchWeight);
  }

  // 5. Damp all known morph targets smoothly toward desired weights (or back to 0)
  if (rig.morphMeshes.length > 0) {
    // Build lookup of target weight by exact morph name
    const targetByMorphName = new Map<string, number>();
    (Object.keys(CHANNEL_ALIASES) as FacialChannel[]).forEach((ch) => {
      const weight = desiredChannels[ch] ?? 0;
      for (const alias of CHANNEL_ALIASES[ch]) {
        if (rig.availableMorphKeys.has(alias)) {
          const prev = targetByMorphName.get(alias) ?? 0;
          if (weight >= prev) {
            targetByMorphName.set(alias, weight);
          }
          break; // Drive primary alias on each mesh first to avoid double-driving single 'Blink' or 'Smile'
        }
      }
    });

    rig.morphMeshes.forEach(({ mesh, dict }) => {
      const influences = mesh.morphTargetInfluences;
      if (!influences) return;
      targetByMorphName.forEach((targetWeight, morphName) => {
        const idx = dict[morphName];
        if (typeof idx !== 'number') return;
        const speed = morphName.toLowerCase().includes('blink') ? 28 : morphName.toLowerCase().includes('jaw') ? 16 : 8;
        influences[idx] = THREE.MathUtils.damp(influences[idx] || 0, targetWeight, speed, delta);
      });
    });
  }

  // 6. Jaw bone fallback if GLB uses a jaw bone instead of morph targets
  if (rig.bones.jaw) {
    const initial = rig.boneInitialRotations.get(rig.bones.jaw);
    if (initial) {
      const targetJawPitch = initial.x + speechJawWeight * 0.28;
      rig.bones.jaw.rotation.x = THREE.MathUtils.damp(rig.bones.jaw.rotation.x, targetJawPitch, 16, delta);
    }
  }

  // 7. Eye bone gaze if eye bones exist
  if (!prefersReducedMotion) {
    [rig.bones.leftEye, rig.bones.rightEye].forEach((eye) => {
      if (!eye) return;
      const initial = rig.boneInitialRotations.get(eye);
      if (!initial) return;
      eye.rotation.y = THREE.MathUtils.damp(eye.rotation.y, initial.y + runtime.gazeX, 6, delta);
      eye.rotation.x = THREE.MathUtils.damp(eye.rotation.x, initial.x - runtime.gazeY, 6, delta);
    });
  }

  // 8. Head, neck, and subtle breathing motion on skeleton bones (or subtle root group if no bones)
  if (!prefersReducedMotion) {
    const breath = Math.sin(elapsed * 1.45);
    const subtleNod =
      state === 'listening'
        ? 0.025 * Math.sin(elapsed * 1.9)
        : state === 'speaking'
        ? 0.02 * Math.sin(elapsed * 2.8)
        : 0.01 * breath;

    const [presetPitch = 0, presetYaw = 0, presetRoll = 0] = preset.headRot || [0, 0, 0];
    const stateRoll = state === 'listening' ? 0.04 : 0;
    const statePitch = state === 'thinking' ? -0.04 : 0;

    const targetHeadPitch = (presetPitch + statePitch) * clampedIntensity + subtleNod;
    const targetHeadYaw = presetYaw * clampedIntensity + runtime.gazeX * 0.35;
    const targetHeadRoll = (presetRoll + stateRoll) * clampedIntensity;

    if (rig.bones.head) {
      const initHead = rig.boneInitialRotations.get(rig.bones.head);
      if (initHead) {
        rig.bones.head.rotation.x = THREE.MathUtils.damp(rig.bones.head.rotation.x, initHead.x + targetHeadPitch, 5, delta);
        rig.bones.head.rotation.y = THREE.MathUtils.damp(rig.bones.head.rotation.y, initHead.y + targetHeadYaw, 5, delta);
        rig.bones.head.rotation.z = THREE.MathUtils.damp(rig.bones.head.rotation.z, initHead.z + targetHeadRoll, 5, delta);
      }
    } else if (rootGroup) {
      rootGroup.rotation.x = THREE.MathUtils.damp(rootGroup.rotation.x, targetHeadPitch * 0.65, 5, delta);
      rootGroup.rotation.y = THREE.MathUtils.damp(rootGroup.rotation.y, targetHeadYaw * 0.65, 5, delta);
      rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, targetHeadRoll * 0.65, 5, delta);
    }

    if (rig.bones.neck) {
      const initNeck = rig.boneInitialRotations.get(rig.bones.neck);
      if (initNeck) {
        rig.bones.neck.rotation.x = THREE.MathUtils.damp(rig.bones.neck.rotation.x, initNeck.x + targetHeadPitch * 0.35, 4, delta);
        rig.bones.neck.rotation.z = THREE.MathUtils.damp(rig.bones.neck.rotation.z, initNeck.z + targetHeadRoll * 0.35, 4, delta);
      }
    }

    if (rig.bones.spine) {
      const initSpine = rig.boneInitialRotations.get(rig.bones.spine);
      if (initSpine) {
        rig.bones.spine.rotation.x = THREE.MathUtils.damp(
          rig.bones.spine.rotation.x,
          initSpine.x + breath * 0.015,
          4,
          delta
        );
      }
    }

    if (rig.bones.leftShoulder && rig.bones.rightShoulder) {
      const initL = rig.boneInitialRotations.get(rig.bones.leftShoulder);
      const initR = rig.boneInitialRotations.get(rig.bones.rightShoulder);
      if (initL && initR) {
        rig.bones.leftShoulder.rotation.z = THREE.MathUtils.damp(
          rig.bones.leftShoulder.rotation.z,
          initL.z + breath * 0.012,
          4,
          delta
        );
        rig.bones.rightShoulder.rotation.z = THREE.MathUtils.damp(
          rig.bones.rightShoulder.rotation.z,
          initR.z - breath * 0.012,
          4,
          delta
        );
      }
    }
  }
}
