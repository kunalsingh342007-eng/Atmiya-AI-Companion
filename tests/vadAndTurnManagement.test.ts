import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  DEFAULT_VAD_CONFIG,
  VoiceActivityDetector,
  computeRmsAndZcr,
  createVadState,
  stepVadState,
} from '../src/services/vad';
import { computeTurnLatencies, voiceDiagnostics } from '../src/utils/voiceDiagnostics';

const origWindow = (globalThis as any).window;
const origNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function setMockNavigator(value: unknown) {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  voiceDiagnostics.reset();
  (globalThis as any).window = origWindow;
  if (origNavigatorDesc) {
    Object.defineProperty(globalThis, 'navigator', origNavigatorDesc);
  }
});

describe('Voice Activity Detector (VAD), Turn Management & Privacy-Safe Latency Diagnostics', () => {
  it('computes RMS and ZCR accurately and rejects transient clicks below minSpeechMs', () => {
    const quiet = new Float32Array(256).fill(0.004);
    const qFeat = computeRmsAndZcr(quiet);
    assert.ok(qFeat.rms < 0.005);
    assert.equal(qFeat.zcr, 0);

    // Simulated voiced vowel oscillation (~0.18 RMS, moderate zero crossing rate)
    const voiced = new Float32Array(512);
    for (let i = 0; i < voiced.length; i += 1) {
      voiced[i] = 0.24 * Math.sin(i * 0.14);
    }
    const vFeat = computeRmsAndZcr(voiced);
    assert.ok(vFeat.rms > 0.14);
    assert.ok(vFeat.zcr > 0.02 && vFeat.zcr < 0.15);

    const state = createVadState(0, 0.006);
    const config = {
      ...DEFAULT_VAD_CONFIG,
      calibrationMs: 120,
      minSpeechMs: 200,
      silencePauseMs: 500,
    };

    // Ambient noise calibration phase
    stepVadState(state, qFeat, 40, config);
    stepVadState(state, qFeat, 90, config);
    stepVadState(state, qFeat, 130, config);

    // Short 90ms spike -> candidate starts, then quiet returns -> reset without speech-start or speech-end
    const spike1 = stepVadState(state, vFeat, 150, config);
    assert.equal(spike1.event, 'none');
    const spike2 = stepVadState(state, vFeat, 210, config);
    assert.equal(spike2.event, 'none');

    // Sustained silence resets unconfirmed transient candidate cleanly
    stepVadState(state, qFeat, 320, config);
    const afterTransient = stepVadState(state, qFeat, 460, config);
    assert.equal(afterTransient.event, 'none');
    assert.equal(state.isSpeechConfirmed, false);
  });

  it('confirms sustained speech, fires speech-end after silence hangover, and enforces maxTurnMs guard', () => {
    const config = {
      ...DEFAULT_VAD_CONFIG,
      calibrationMs: 100,
      minSpeechMs: 180,
      silencePauseMs: 600,
      maxTurnMs: 4000,
    };
    const quiet = { rms: 0.005, zcr: 0.01 };
    const speech = { rms: 0.18, zcr: 0.08 };

    const state = createVadState(0, 0.006);
    stepVadState(state, quiet, 110, config);

    // Sustained speech past minSpeechMs
    assert.equal(stepVadState(state, speech, 150, config).event, 'none');
    assert.equal(stepVadState(state, speech, 260, config).event, 'none');
    const started = stepVadState(state, speech, 340, config);
    assert.equal(started.event, 'speech-start');
    assert.equal(state.isSpeechConfirmed, true);

    // Short breath pause (250ms < 600ms) keeps turn alive
    const breath = stepVadState(state, quiet, 590, config);
    assert.equal(breath.event, 'none');

    // Longer post-speech pause (>= 600ms) closes the turn cleanly
    const ended = stepVadState(state, quiet, 950, config);
    assert.equal(ended.event, 'speech-end');
    assert.equal(state.ended, true);
    assert.ok(ended.speechDurationMs > 0);

    // Verify maxTurnMs hard safety limit
    const longState = createVadState(0, 0.006);
    stepVadState(longState, quiet, 110, config);
    stepVadState(longState, speech, 350, config);
    const maxed = stepVadState(longState, speech, 4005, config);
    assert.equal(maxed.event, 'max-duration');
    assert.equal(longState.ended, true);
  });

  it('manages MediaStream tracks and AudioContext cleanup on stop and permission denial', async () => {
    let trackStopped = 0;
    let ctxClosed = 0;

    class FakeVadAudioCtx {
      state: 'running' | 'closed' = 'running';
      async resume() {}
      async close() {
        ctxClosed += 1;
        this.state = 'closed';
      }
      createMediaStreamSource() {
        return { connect() {}, disconnect() {} };
      }
      createAnalyser() {
        return {
          fftSize: 1024,
          smoothingTimeConstant: 0.25,
          connect() {},
          disconnect() {},
          getFloatTimeDomainData(buf: Float32Array) {
            buf.fill(0.005);
          },
        };
      }
    }

    (globalThis as any).window = { AudioContext: FakeVadAudioCtx };
    setMockNavigator({
      mediaDevices: {
        getUserMedia: async () => ({
          getTracks: () => [
            {
              stop: () => {
                trackStopped += 1;
              },
            },
          ],
        }),
      },
    });

    const detector = new VoiceActivityDetector();
    const ok = await detector.start({});
    assert.equal(ok, true);
    assert.equal(detector.isRunning(), true);

    detector.stop();
    assert.equal(detector.isRunning(), false);
    assert.equal(trackStopped, 1);
    assert.equal(ctxClosed, 1);

    // Permission denied maps to friendly user error
    setMockNavigator({
      mediaDevices: {
        getUserMedia: async () => {
          const err: any = new Error('Permission denied');
          err.name = 'NotAllowedError';
          throw err;
        },
      },
    });

    const errors: string[] = [];
    const deniedOk = await detector.start({
      onError: (m) => errors.push(m),
    });
    assert.equal(deniedOk, false);
    assert.match(errors[0] || '', /Microphone permission denied/i);
  });

  it('records privacy-safe turn latency timestamps and bounds ring buffer to 10 turns', () => {
    const turnId = voiceDiagnostics.startTurn(1000);
    voiceDiagnostics.mark(turnId, 'chatRequestStartAt', 1010);
    voiceDiagnostics.mark(turnId, 'chatFirstResponseAt', 1480);
    voiceDiagnostics.mark(turnId, 'ttsRequestStartAt', 1490);
    voiceDiagnostics.mark(turnId, 'firstAudioChunkAt', 1730);
    voiceDiagnostics.mark(turnId, 'playbackStartAt', 1745);
    voiceDiagnostics.mark(turnId, 'playbackEndAt', 3745);
    voiceDiagnostics.setMode(turnId, 'gemini-stream-pcm', 5);

    const last = voiceDiagnostics.getLastTurn();
    assert.ok(last);
    assert.equal(last.playbackMode, 'gemini-stream-pcm');
    assert.equal(last.chunkCount, 5);
    assert.deepEqual(last.latencies, {
      chatResponseMs: 470,
      ttsFirstByteMs: 240,
      ttsTotalToPlaybackMs: 255,
      speechEndToPlaybackMs: 745,
      playbackDurationMs: 2000,
    });

    // Sanity check null handling for incomplete / cancelled turns
    const partial = computeTurnLatencies({ turnId: 99, speechEndAt: 100 });
    assert.equal(partial.speechEndToPlaybackMs, null);

    // Ring buffer stays capped at 10 turns
    for (let i = 0; i < 12; i += 1) {
      voiceDiagnostics.startTurn();
    }
    assert.equal(voiceDiagnostics.getRecentTurns().length, 10);
  });
});
