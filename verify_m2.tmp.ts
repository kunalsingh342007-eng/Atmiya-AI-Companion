import fs from 'node:fs';
import * as THREE from 'three';
import {
  createRigRuntime,
  inspectGlbRig,
  setHeadIdleEnabled,
  setSpeechHeadTilt,
  clearSpeechHeadTilt,
  startArmGesture,
  cancelArmGesture,
  triggerHeadNod,
  tiltHeadLeft,
  updateArmHandRig,
  updateExpressionRig,
  updateFullBodyAndLowerRig,
  updateHeadNeckRig,
} from './src/components/Avatar/expressionRig';
import {
  classifySpeechUtterance,
  createSpeechGestureRunner,
  planSpeechGestureCues,
  resetOpeningGreetingSessionForTests,
  stepSpeechGesturePlan,
  UnifiedAnimationController,
} from './src/components/Avatar/UnifiedAnimationController';
import { createNeutralLipSyncWeights } from './src/components/Avatar/lipSync';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

function parseGlbToThreeScene(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.toString('ascii', 0, 4);
  assert(magic === 'glTF', 'Valid GLB header');
  const jsonLen = buf.readUInt32LE(12);
  const jsonText = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonText);

  const nodes: THREE.Object3D[] = (gltf.nodes || []).map((n: any, idx: number) => {
    let obj: THREE.Object3D;
    if (n.mesh !== undefined) {
      const meshDef = gltf.meshes[n.mesh];
      const prim = meshDef.primitives?.[0];
      const geom = new THREE.BufferGeometry();
      const targetNames = meshDef.extras?.targetNames || prim?.extras?.targetNames || [];
      const mat = new THREE.MeshStandardMaterial({ name: 'Mat' });
      const mesh = n.skin !== undefined ? new THREE.SkinnedMesh(geom, mat) : new THREE.Mesh(geom, mat);
      if (targetNames.length > 0) {
        const dict: Record<string, number> = {};
        targetNames.forEach((name: string, i: number) => {
          dict[name] = i;
        });
        mesh.morphTargetDictionary = dict;
        mesh.morphTargetInfluences = new Array(targetNames.length).fill(0);
      }
      obj = mesh;
    } else {
      obj = new THREE.Bone();
    }
    obj.name = n.name || `Node_${idx}`;
    if (n.translation) obj.position.fromArray(n.translation);
    if (n.rotation) obj.quaternion.fromArray(n.rotation);
    if (n.scale) obj.scale.fromArray(n.scale);
    return obj;
  });

  (gltf.nodes || []).forEach((n: any, idx: number) => {
    (n.children || []).forEach((childIdx: number) => {
      nodes[idx].add(nodes[childIdx]);
    });
  });

  const root = new THREE.Group();
  root.name = 'GLTF_Scene';
  const sceneDef = gltf.scenes?.[gltf.scene ?? 0];
  (sceneDef?.nodes || []).forEach((nodeIdx: number) => {
    root.add(nodes[nodeIdx]);
  });
  root.updateMatrixWorld(true);

  return {
    root,
    animations: (gltf.animations || []).map((a: any) => a.name || '(unnamed)'),
    nodeCount: nodes.length,
  };
}

async function run() {
  console.log('--- 1. Inspecting public/models/atmiya-avatar.glb ---');
  const parsed = parseGlbToThreeScene('public/models/atmiya-avatar.glb');
  const rig = inspectGlbRig(parsed.root);
  console.log('Animations count:', parsed.animations.length);
  console.log('Morph meshes:', rig.morphMeshes.map((m) => m.meshName));
  console.log('Node count in GLB:', parsed.nodeCount, 'Registered bone transforms:', rig.boneInitialQuaternions.size);
  console.log('Unique morph keys:', rig.availableMorphKeys.size);
  console.log('Verified skeleton:', rig.verifiedSkeleton);
  console.log('Verified arm/hand:', {
    rightArmChain: rig.verifiedArmHand.rightArmChain,
    leftArmChain: rig.verifiedArmHand.leftArmChain,
    preferredWaveSide: rig.verifiedArmHand.preferredWaveSide,
    leftFingers: rig.verifiedArmHand.leftFingerBones.length,
    rightFingers: rig.verifiedArmHand.rightFingerBones.length,
  });
  console.log('Verified full body:', rig.verifiedFullBody);
  console.log('Capabilities:', rig.capabilities);
  assert(parsed.animations.length === 0, 'GLB has 0 animation clips');
  assert(rig.availableMorphKeys.size === 67, `Expected 67 unique morphs, got ${rig.availableMorphKeys.size}`);
  assert(!rig.bones.jaw, 'No Jaw bone');
  assert(rig.verifiedSkeleton.head.detected && rig.verifiedSkeleton.neck.detected, 'Head and Neck present');
  assert(rig.verifiedSkeleton.spine.detected && rig.verifiedSkeleton.spine1.detected && rig.verifiedSkeleton.spine2.detected, 'Spine hierarchy present');
  assert(rig.verifiedArmHand.hasLeftArmReady && rig.verifiedArmHand.hasRightArmReady, 'Both arms rigged');

  console.log('--- 2. Testing Idle Animation & Non-Accumulation ---');
  const runtime = createRigRuntime();
  const emptyLip = createNeutralLipSyncWeights();
  let t = 0;
  const dt = 1 / 60;
  const spineAngles: number[] = [];
  const rShoulderAngles: number[] = [];
  const headAngles: number[] = [];
  const baseHeadQ = rig.boneInitialQuaternions.get(rig.bones.head!)!.clone();
  const baseSpineQ = rig.boneInitialQuaternions.get(rig.bones.spine!)!.clone();
  const baseRShQ = rig.boneInitialQuaternions.get(rig.bones.rightShoulder!)!.clone();

  for (let i = 0; i < 600; i++) {
    t += dt;
    updateHeadNeckRig({ rig, runtime, state: 'idle', unifiedState: 'idle', lipSyncFrame: emptyLip, prefersReducedMotion: false, elapsed: t, delta: dt });
    updateArmHandRig({ rig, runtime, state: 'idle', unifiedState: 'idle', prefersReducedMotion: false, elapsed: t, delta: dt });
    updateFullBodyAndLowerRig({ rig, runtime, state: 'idle', unifiedState: 'idle', postureMode: 'standing', prefersReducedMotion: false, elapsed: t, delta: dt });
    if (i % 60 === 59) {
      headAngles.push(rig.bones.head!.quaternion.angleTo(baseHeadQ));
      spineAngles.push(rig.bones.spine!.quaternion.angleTo(baseSpineQ));
      rShoulderAngles.push(rig.bones.rightShoulder!.quaternion.angleTo(baseRShQ));
    }
  }
  console.log('Idle 10s sampled delta angles (rad):', { headAngles: headAngles.map((v) => +v.toFixed(4)), spineAngles: spineAngles.map((v) => +v.toFixed(4)), rShoulderAngles: rShoulderAngles.map((v) => +v.toFixed(4)) });
  assert(Math.max(...headAngles) > 0.002 && Math.max(...headAngles) < 0.12, 'Head idle subtle & bounded');
  assert(Math.max(...spineAngles) > 0.001 && Math.max(...spineAngles) < 0.08, 'Spine idle subtle & bounded');
  assert(Math.max(...rShoulderAngles) > 0.001 && Math.max(...rShoulderAngles) < 0.08, 'Shoulder idle subtle & bounded');

  // Verify reducedMotion brings idle back to exact neutral
  for (let i = 0; i < 120; i++) {
    t += dt;
    updateHeadNeckRig({ rig, runtime, state: 'idle', unifiedState: 'idle', lipSyncFrame: emptyLip, prefersReducedMotion: true, elapsed: t, delta: dt });
    updateArmHandRig({ rig, runtime, state: 'idle', unifiedState: 'idle', prefersReducedMotion: true, elapsed: t, delta: dt });
    updateFullBodyAndLowerRig({ rig, runtime, state: 'idle', unifiedState: 'idle', postureMode: 'standing', prefersReducedMotion: true, elapsed: t, delta: dt });
  }
  assert(rig.bones.head!.quaternion.angleTo(baseHeadQ) < 0.005, 'ReducedMotion settles head to bind');

  // Check Milestone 1 morph isolation: body/head/arm updaters must NEVER touch morphTargetInfluences
  const headMesh = parsed.root.getObjectByName('Wolf3D_Head') as THREE.Mesh;
  assert(headMesh && headMesh.morphTargetInfluences, 'Wolf3D_Head morphTargetInfluences present');
  const jawIdx = headMesh.morphTargetDictionary!['jawOpen'];
  headMesh.morphTargetInfluences![jawIdx] = 0.65;
  updateHeadNeckRig({ rig, runtime, state: 'speaking', unifiedState: 'speaking', lipSyncFrame: { ...emptyLip, isActive: true, isVoiced: true, overallLevel: 0.7, jawOpen: 0.65 }, prefersReducedMotion: false, elapsed: t + 0.1, delta: dt });
  updateArmHandRig({ rig, runtime, state: 'speaking', unifiedState: 'speaking', prefersReducedMotion: false, elapsed: t + 0.1, delta: dt });
  updateFullBodyAndLowerRig({ rig, runtime, state: 'speaking', unifiedState: 'speaking', postureMode: 'standing', prefersReducedMotion: false, elapsed: t + 0.1, delta: dt });
  assert(headMesh.morphTargetInfluences![jawIdx] === 0.65, 'Body/head/arm updaters preserve morphTargetInfluences');

  // And verify updateExpressionRig still drives lip-sync & blinks cleanly while body animates
  updateExpressionRig({
    rig,
    runtime,
    emotion: 'happy',
    emotionIntensity: 0.75,
    state: 'speaking',
    audioLevel: 0.6,
    lipSyncFrame: { ...emptyLip, isActive: true, isVoiced: true, overallLevel: 0.65, jawOpen: 0.52, mouthFunnel: 0.18, visemes: { ...emptyLip.visemes, viseme_aa: 0.58 } },
    delta: 0.05,
    prefersReducedMotion: false,
  });
  assert(headMesh.morphTargetInfluences![jawIdx] > 0.4, 'Milestone 1 jawOpen morph still driven by updateExpressionRig');

  console.log('--- 3. Testing Speech Classification & Cue Planning ---');
  assert(classifySpeechUtterance('Hi! Welcome back!', 'happy') === 'greeting', 'Greeting classified');
  assert(classifySpeechUtterance('Sure, I can do that right away for you.', 'calm') === 'confirmation', 'Confirmation classified');
  assert(classifySpeechUtterance('Would you like me to explain how neural networks learn patterns?', 'curious') === 'question', 'Question classified');
  assert(classifySpeechUtterance('Great!', 'happy') === 'minimal', 'Short reply classified as minimal');
  assert(classifySpeechUtterance('Photosynthesis is the biological process where plants convert sunlight, water, and carbon dioxide into glucose and oxygen inside chloroplasts.', 'calm') === 'explanation', 'Long reply classified as explanation');

  const shortPlan = planSpeechGestureCues({ text: 'Yes, got it.', emotion: 'calm', unifiedState: 'speaking', activeGesture: 'none', sessionId: 1, requestId: 1 });
  const qPlan = planSpeechGestureCues({ text: 'Would you like to try a quick memory game or continue chatting about science?', emotion: 'curious', unifiedState: 'speaking', activeGesture: 'none', sessionId: 2, requestId: 2 });
  const longPlan = planSpeechGestureCues({
    text: 'First, a browser renders HTML into a DOM tree and CSS into a CSSOM tree. Then it combines them into a render tree, calculates exact layout geometry, paints pixels onto layers, and composites everything onto your screen smoothly.',
    emotion: 'happy',
    unifiedState: 'speaking',
    activeGesture: 'none',
    sessionId: 3,
    requestId: 3,
  });
  const wavePlan = planSpeechGestureCues({ text: longPlan.estimatedDurationSec + ' long text with greeting active', emotion: 'happy', unifiedState: 'greeting', activeGesture: 'wave', sessionId: 4, requestId: 4 });
  console.log('Short cues:', shortPlan.cues.map((c) => c.kind));
  console.log('Question cues:', qPlan.cues.map((c) => `${c.kind}@${c.atSec.toFixed(2)}s`));
  console.log('Long cues:', longPlan.cues.map((c) => `${c.kind}@${c.atSec.toFixed(2)}s`));
  assert(shortPlan.cues.filter((c) => c.kind === 'arm').length === 0, 'Short utterance has 0 arm cues');
  assert(qPlan.cues.some((c) => c.kind === 'tilt'), 'Question schedules tilt cue');
  assert(longPlan.cues.filter((c) => c.kind === 'arm').length >= 2, 'Long explanation schedules spaced arm cues');
  const armTimes = longPlan.cues.filter((c) => c.kind === 'arm').map((c) => c.atSec);
  for (let i = 1; i < armTimes.length; i++) {
    assert(armTimes[i] - armTimes[i - 1] >= 3.5, 'Arm cues spaced >= 3.5s apart');
  }
  assert(wavePlan.cues.length === 0, 'Active greeting/wave produces 0 overlapping cues');

  console.log('--- 4. Testing Pause Gate & Non-Bursty Resume ---');
  const runner = createSpeechGestureRunner();
  const pauseRuntime = createRigRuntime();
  // Step 0.3s into longPlan during silence -> speechPausedSec becomes > 0.28 -> cue at 0.35s must NOT fire while paused!
  for (let i = 0; i < 30; i++) {
    updateHeadNeckRig({
      rig,
      runtime: pauseRuntime,
      state: 'speaking',
      unifiedState: 'speaking',
      lipSyncFrame: { ...emptyLip, isActive: true, isVoiced: false, overallLevel: 0 },
      prefersReducedMotion: false,
      elapsed: i * 0.02,
      delta: 0.02,
    });
    const step = stepSpeechGesturePlan({
      runner,
      plan: longPlan,
      delta: 0.02,
      isSpeaking: true,
      isVoiced: false,
      speechPausedSec: pauseRuntime.speechPausedSec,
      activeGesture: 'none',
      runtimeArmGesture: pauseRuntime.armGesture,
      prefersReducedMotion: false,
    });
    assert(step.cue === null, 'No new gesture fires during audible pause');
  }
  assert(pauseRuntime.speechPausedSec > 0.28 && pauseRuntime.speechPauseDamp < 0.7, 'Pause detected and sway damped');
  // Now speech resumes (voiced = true): cue at 0.35s should fire once!
  updateHeadNeckRig({
    rig,
    runtime: pauseRuntime,
    state: 'speaking',
    unifiedState: 'speaking',
    lipSyncFrame: { ...emptyLip, isActive: true, isVoiced: true, overallLevel: 0.6 },
    prefersReducedMotion: false,
    elapsed: 0.65,
    delta: 0.02,
  });
  const resumed = stepSpeechGesturePlan({
    runner,
    plan: longPlan,
    delta: 0.02,
    isSpeaking: true,
    isVoiced: true,
    speechPausedSec: pauseRuntime.speechPausedSec,
    activeGesture: 'none',
    runtimeArmGesture: pauseRuntime.armGesture,
    prefersReducedMotion: false,
  });
  assert(resumed.cue?.kind === 'arm', 'First arm cue triggers cleanly when voice resumes');

  // Also test manual tilt protection: clearSpeechHeadTilt must NOT clear manual tiltHeadLeft
  const tiltRuntime = createRigRuntime();
  tiltHeadLeft(tiltRuntime, 0.9);
  setSpeechHeadTilt(tiltRuntime, 'tilt-right', 0.5);
  assert(tiltRuntime.headPose === 'tilt-left', 'Manual head tilt cannot be overwritten by speech tilt');
  clearSpeechHeadTilt(tiltRuntime);
  assert(tiltRuntime.headPose === 'tilt-left', 'Manual head tilt preserved by clearSpeechHeadTilt');
  const speechTiltRuntime = createRigRuntime();
  setSpeechHeadTilt(speechTiltRuntime, 'tilt-right', 0.5);
  assert(speechTiltRuntime.headPose === 'tilt-right', 'Speech head tilt applied on neutral pose');
  clearSpeechHeadTilt(speechTiltRuntime);
  assert(speechTiltRuntime.headPose === 'neutral', 'Speech head tilt cleared cleanly by clearSpeechHeadTilt');

  console.log('--- 5. Testing UnifiedAnimationController Greeting Wave Protection & Speech Session ---');
  resetOpeningGreetingSessionForTests();
  const ctrl = new UnifiedAnimationController();
  let triggerCalled = 0;
  ctrl.scheduleOpeningGreetingOnce({
    delayMs: 10,
    durationMs: 200,
    onTrigger: () => {
      triggerCalled += 1;
      // Simulate app-open voice starting immediately while wave runs
      ctrl.dispatch({ animationState: 'speaking', emotion: 'happy', intensity: 0.85, force: true, source: 'app-open' });
    },
  });
  await new Promise((r) => setTimeout(r, 40));
  assert(triggerCalled === 1, 'Greeting triggered once');
  let snap = ctrl.getSnapshot();
  assert(snap.unifiedState === 'greeting' && snap.activeGesture === 'wave' && snap.avatarState === 'speaking', 'App-open speaking preserves greeting + wave');

  // If TTS finishes early (e.g. muted/silent fallback), finishAppOpenSpeech keeps wave running until gestureReturnTimer fires
  ctrl.finishAppOpenSpeech();
  snap = ctrl.getSnapshot();
  assert(snap.unifiedState === 'greeting' && snap.activeGesture === 'wave', 'finishAppOpenSpeech does not clip active wave');

  await new Promise((r) => setTimeout(r, 230));
  snap = ctrl.getSnapshot();
  assert(snap.unifiedState === 'idle' && snap.activeGesture === 'none', 'Greeting returns cleanly to idle after wave completes');

  // Test speech session lifecycle + interruption
  const d1 = ctrl.dispatch({ animationState: 'speaking', emotion: 'happy', force: true, source: 'conversation' });
  const plan1 = ctrl.beginSpeechSession({
    text: 'This is a long enough explanation so that several gestures would normally trigger across multiple sentences.',
    emotion: 'happy',
    requestId: d1.requestId,
  });
  assert(ctrl.getSnapshot().activeSpeechPlan?.sessionId === plan1.sessionId, 'Speech session stored in snapshot');
  ctrl.returnToIdle(999999); // stale requestId ignored
  assert(ctrl.getSnapshot().unifiedState === 'speaking', 'Stale requestId rejected cleanly');
  ctrl.returnToIdle(); // real interrupt/stop
  assert(ctrl.getSnapshot().unifiedState === 'idle' && ctrl.getSnapshot().activeSpeechPlan === null, 'Interrupt clears activeSpeechPlan and returns to idle');

  ctrl.dispose();
  console.log('ALL MILESTONE 2 UNIT/RIG TESTS PASSED!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
