import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  UnifiedAnimationController,
  createSpeechGestureRunner,
  planSpeechGestureCues,
  resetOpeningGreetingSessionForTests,
  stepSpeechGesturePlan,
} from '../src/components/Avatar/UnifiedAnimationController';

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
});
