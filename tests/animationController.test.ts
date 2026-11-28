import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import {
  UnifiedAnimationController,
  createSpeechGestureRunner,
  planSpeechGestureCues,
  resetOpeningGreetingSessionForTests,
  stepSpeechGesturePlan,
} from '../src/components/Avatar/UnifiedAnimationController';
import {
  createRigRuntime,
  inspectGlbRig,
  resetSpeechMorphs,
  updateArmHandRig,
  updateExpressionRig,
  updateFullBodyAndLowerRig,
  updateHeadNeckRig,
} from '../src/components/Avatar/expressionRig';
import { createNeutralLipSyncWeights } from '../src/components/Avatar/lipSync';

describe('Body & Unified Animation Controller State Machine', () => {
  it('transitions cleanly across listening, thinking, preparing_audio, speaking, interrupted, error, and idle', () => {
    const controller = new UnifiedAnimationController();

    assert.equal(controller.getSnapshot().unifiedState, 'idle');

    const listening = controller.dispatch({ animationState: 'listening', source: 'voice' });
    assert.equal(listening.accepted, true);
    assert.equal(listening.snapshot.unifiedState, 'listening');
    assert.equal(listening.snapshot.emotion, 'neutral');

    const thinking = controller.dispatch({ animationState: 'thinking', source: 'conversation' });
    assert.equal(thinking.accepted, true);
    assert.equal(thinking.snapshot.unifiedState, 'thinking');
    assert.equal(thinking.snapshot.avatarState, 'thinking');

    const prep = controller.dispatch({ animationState: 'preparing_audio', source: 'conversation' });
    assert.equal(prep.accepted, true);
    assert.equal(prep.snapshot.unifiedState, 'preparing_audio');

    const speaking = controller.dispatch({
      animationState: 'speaking',
      emotion: 'happy',
      intensity: 0.8,
      gestureHint: 'open_palm',
      source: 'conversation',
    });
    assert.equal(speaking.accepted, true);
    assert.equal(speaking.snapshot.unifiedState, 'speaking');
    assert.equal(speaking.snapshot.emotion, 'happy');

    // Low-priority mood transition must NOT override active speaking, only updating facial emotion
    const lowPriMood = controller.dispatch({
      animationState: 'concerned',
      emotion: 'empathetic',
      intensity: 0.6,
    });
    assert.equal(lowPriMood.accepted, false);
    assert.equal(controller.getSnapshot().unifiedState, 'speaking');
    assert.equal(controller.getSnapshot().emotion, 'empathetic');

    // Interrupt forces immediate cancellation of speaking + neutral reset
    const interrupted = controller.interrupt(0);
    assert.equal(interrupted.accepted, true);
    assert.equal(interrupted.snapshot.unifiedState, 'interrupted');
    assert.equal(interrupted.snapshot.activeGesture, 'none');

    const errored = controller.setError();
    assert.equal(errored.accepted, true);
    assert.equal(errored.snapshot.unifiedState, 'error');

    assert.equal(controller.returnToIdle(), true);
    assert.equal(controller.getSnapshot().unifiedState, 'idle');

    controller.dispose();
  });

  it('rejects stale requestIds so delayed async callbacks cannot clobber newer interactions', () => {
    const controller = new UnifiedAnimationController();
    const firstReq = controller.dispatch({ animationState: 'speaking', emotion: 'happy' });
    const secondReq = controller.dispatch({ animationState: 'listening', force: true });

    assert.notEqual(firstReq.requestId, secondReq.requestId);
    assert.equal(controller.returnToIdle(firstReq.requestId), false);
    assert.equal(controller.getSnapshot().unifiedState, 'listening');

    assert.equal(controller.returnToIdle(secondReq.requestId), true);
    assert.equal(controller.getSnapshot().unifiedState, 'idle');

    controller.dispose();
  });

  it('fires session-once opening greeting only once per session and plans restrained speech cues', async () => {
    resetOpeningGreetingSessionForTests();
    const c1 = new UnifiedAnimationController();
    let triggerCount = 0;

    c1.scheduleOpeningGreetingOnce({
      delayMs: 10,
      durationMs: 2500,
      onTrigger: () => {
        triggerCount += 1;
      },
    });

    await new Promise((r) => setTimeout(r, 40));
    assert.equal(triggerCount, 1);
    assert.equal(c1.getSnapshot().unifiedState, 'greeting');
    assert.equal(c1.getSnapshot().activeGesture, 'wave');

    // Second controller/mount in same session must not replay opening greeting
    const c2 = new UnifiedAnimationController();
    c2.scheduleOpeningGreetingOnce({
      delayMs: 10,
      onTrigger: () => {
        triggerCount += 1;
      },
    });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(triggerCount, 1);

    // Speech gesture planning & pause gating
    const plan = planSpeechGestureCues({
      text: 'First, take a deep breath because staying calm helps you focus clearly on the next step.',
      emotion: 'encouraging',
      gestureHint: 'open_palm',
      sessionId: 3,
      requestId: 9,
    });
    assert.equal(plan.category, 'explanation');
    assert.ok(plan.cues.length >= 2);

    const runner = createSpeechGestureRunner();
    const pausedStep = stepSpeechGesturePlan({
      runner,
      plan,
      delta: 0.5,
      isSpeaking: true,
      isVoiced: false,
      speechPausedSec: 0.4,
      activeGesture: 'none',
      runtimeArmGesture: 'none',
      prefersReducedMotion: false,
    });
    assert.equal(pausedStep.cue, null);

    const voicedStep = stepSpeechGesturePlan({
      runner,
      plan,
      delta: 0.1,
      isSpeaking: true,
      isVoiced: true,
      speechPausedSec: 0,
      activeGesture: 'none',
      runtimeArmGesture: 'none',
      prefersReducedMotion: false,
    });
    assert.ok(voicedStep.cue !== null);

    c1.dispose();
    c2.dispose();
  });

  it('coordinates facial expressions, blinking, lip-sync, head, arm, and torso without cumulative drift or stuck morphs', () => {
    const root = new THREE.Group();
    const makeBone = (name: string) => {
      const b = new THREE.Bone();
      b.name = name;
      return b;
    };

    const hips = makeBone('Hips');
    const spine = makeBone('Spine');
    const spine1 = makeBone('Spine1');
    const spine2 = makeBone('Spine2');
    const neck = makeBone('Neck');
    const head = makeBone('Head');
    const rightShoulder = makeBone('RightShoulder');
    const rightArm = makeBone('RightArm');
    const rightForeArm = makeBone('RightForeArm');
    const rightHand = makeBone('RightHand');

    hips.add(spine);
    spine.add(spine1);
    spine1.add(spine2);
    spine2.add(neck);
    spine2.add(rightShoulder);
    neck.add(head);
    rightShoulder.add(rightArm);
    rightArm.add(rightForeArm);
    rightForeArm.add(rightHand);
    root.add(hips);

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    headMesh.name = 'Wolf3D_Head';
    headMesh.morphTargetDictionary = {
      eyeBlinkLeft: 0,
      eyeBlinkRight: 1,
      jawOpen: 2,
      viseme_aa: 3,
      mouthSmileLeft: 4,
      mouthSmileRight: 5,
    };
    headMesh.morphTargetInfluences = [0, 0, 0, 0, 0, 0];
    root.add(headMesh);

    const rig = inspectGlbRig(root);
    const runtime = createRigRuntime();
    // Force active blink mid-flight during happy speech
    runtime.blinkProgress = 0.45;
    runtime.blinkDuration = 0.2;

    const initialHeadQuat = rig.boneInitialQuaternions.get(head)!.clone();
    const initialSpineQuat = rig.boneInitialQuaternions.get(spine2)!.clone();

    const baseNeutral = createNeutralLipSyncWeights();
    const lipSyncActive = {
      ...baseNeutral,
      isActive: true,
      mode: 'audio-analyser' as const,
      overallLevel: 0.65,
      jawOpen: 0.48,
      mouthClose: 0.05,
      mouthFunnel: 0.08,
      mouthPucker: 0.02,
      mouthStretch: 0.1,
      mouthPress: 0,
      mouthRollLower: 0.04,
      isVoiced: true,
      activeViseme: 'viseme_aa' as const,
      visemes: {
        ...baseNeutral.visemes,
        viseme_aa: 0.62,
        viseme_E: 0.1,
        viseme_I: 0.04,
        viseme_O: 0.02,
      },
    };

    for (let i = 0; i < 6; i += 1) {
      updateExpressionRig({
        rig,
        runtime,
        state: 'speaking',
        unifiedState: 'speaking',
        emotion: 'happy',
        emotionIntensity: 0.85,
        expressionsEnabled: true,
        audioLevel: 0.65,
        lipSyncFrame: lipSyncActive,
        prefersReducedMotion: false,
        elapsed: 1 + i * 0.016,
        delta: 0.016,
      });
      updateHeadNeckRig({
        rig,
        runtime,
        state: 'speaking',
        unifiedState: 'speaking',
        lipSyncFrame: lipSyncActive,
        prefersReducedMotion: false,
        elapsed: 1 + i * 0.016,
        delta: 0.016,
      });
      updateArmHandRig({
        rig,
        runtime,
        prefersReducedMotion: false,
        postureMode: 'standing',
        state: 'speaking',
        unifiedState: 'speaking',
        elapsed: 1 + i * 0.016,
        delta: 0.016,
      });
      updateFullBodyAndLowerRig({
        rig,
        runtime,
        state: 'speaking',
        unifiedState: 'speaking',
        presentationMode: 'upper-body',
        postureMode: 'standing',
        prefersReducedMotion: false,
        elapsed: 1 + i * 0.016,
        delta: 0.016,
      });
    }

    // Coexistence verified: blinking + happy smile + jawOpen + viseme_aa are all active simultaneously
    assert.ok(headMesh.morphTargetInfluences[0] > 0.2, 'blink should be non-zero');
    assert.ok(headMesh.morphTargetInfluences[2] > 0.2, 'jawOpen should respond to speech');
    assert.ok(headMesh.morphTargetInfluences[3] > 0.2, 'viseme_aa should respond to speech');
    assert.ok(headMesh.morphTargetInfluences[4] > 0.15, 'mouthSmileLeft should coexist with speech');

    // Bind quaternions stay strictly immutable over long frame sequences (zero cumulative drift)
    assert.ok(rig.boneInitialQuaternions.get(head)!.equals(initialHeadQuat));
    assert.ok(rig.boneInitialQuaternions.get(spine2)!.equals(initialSpineQuat));

    // Settle back to neutral idle over several frames and confirm exact zero closure on jaw/viseme
    resetSpeechMorphs(rig);
    const neutralLip = { ...lipSyncActive, isActive: false, jawOpen: 0, overallLevel: 0, isVoiced: false };
    for (let i = 0; i < 60; i += 1) {
      updateExpressionRig({
        rig,
        runtime,
        state: 'idle',
        unifiedState: 'idle',
        emotion: 'neutral',
        emotionIntensity: 0.7,
        expressionsEnabled: true,
        audioLevel: 0,
        lipSyncFrame: neutralLip,
        prefersReducedMotion: true,
        elapsed: 2 + i * 0.05,
        delta: 0.05,
      });
    }
    assert.equal(headMesh.morphTargetInfluences[2], 0);
    assert.equal(headMesh.morphTargetInfluences[3], 0);
  });
});

