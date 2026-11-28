import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import * as THREE from 'three';
import { LipSyncEngine } from '../src/components/Avatar/lipSync';
import { inspectGlbRig, resetSpeechMorphs } from '../src/components/Avatar/expressionRig';
import { speechService } from '../src/services/speech';

const origWindow = (globalThis as any).window;
const origNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const origAtob = (globalThis as any).atob;
const origRAF = (globalThis as any).requestAnimationFrame;
const origCAF = (globalThis as any).cancelAnimationFrame;

function setMockNavigator(value: unknown) {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true,
  });
}

function installMinimalDomMocks() {
  (globalThis as any).requestAnimationFrame = () => 1;
  (globalThis as any).cancelAnimationFrame = () => {};
  if (!origAtob) {
    (globalThis as any).atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
  }
}

afterEach(() => {
  speechService.stopSpeaking();
  speechService.stopRecognition();
  (globalThis as any).window = origWindow;
  if (origNavigatorDesc) {
    Object.defineProperty(globalThis, 'navigator', origNavigatorDesc);
  }
  (globalThis as any).atob = origAtob;
  (globalThis as any).requestAnimationFrame = origRAF;
  (globalThis as any).cancelAnimationFrame = origCAF;
});

describe('Voice Permission Handling, Audio Playback, Interruption & Lip-Sync Neutral Reset', () => {
  it('handles unsupported speech recognition and microphone permission denial gracefully', () => {
    installMinimalDomMocks();
    (globalThis as any).window = {};

    const errors: string[] = [];
    const unsupportedOk = speechService.startRecognition('auto', {
      onResult: () => {},
      onError: (msg) => errors.push(msg),
      onStart: () => {},
      onEnd: () => {},
    });
    assert.equal(unsupportedOk, false);
    assert.match(errors[0] || '', /not supported/i);

    let activeInstance: any = null;
    class FakeSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onstart: (() => void) | null = null;
      onresult: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() {
        activeInstance = this;
      }
      start() {
        this.onstart?.();
      }
      abort() {
        this.onend?.();
      }
      stop() {
        this.onend?.();
      }
    }

    (globalThis as any).window = { SpeechRecognition: FakeSpeechRecognition };
    let started = false;
    const recErrors: string[] = [];
    const startedOk = speechService.startRecognition('hi-IN', {
      onResult: () => {},
      onError: (msg) => recErrors.push(msg),
      onStart: () => {
        started = true;
      },
      onEnd: () => {},
    });

    assert.equal(startedOk, true);
    assert.equal(started, true);
    assert.equal(activeInstance.lang, 'hi-IN');

    // No-speech and aborted are ignored quietly; permission denial surfaces clear user message
    activeInstance.onerror({ error: 'no-speech' });
    activeInstance.onerror({ error: 'aborted' });
    assert.equal(recErrors.length, 0);

    activeInstance.onerror({ error: 'not-allowed' });
    assert.equal(recErrors[0], 'Microphone permission denied. Please allow microphone access.');

    activeInstance.onerror({ error: 'audio-capture' });
    assert.equal(recErrors[1], 'Speech error: audio-capture');
  });

  it('handles WAV audio playback completion, interruption, and decode errors without stale state', async () => {
    installMinimalDomMocks();

    let lastSourceNode: any = null;
    let shouldFailDecode = false;

    class FakeAudioContext {
      state: 'running' | 'suspended' = 'running';
      currentTime = 0.1;
      sampleRate = 24000;
      destination = {};

      async resume() {
        this.state = 'running';
      }

      async decodeAudioData() {
        if (shouldFailDecode) {
          throw new Error('Unable to decode audio');
        }
        return {
          duration: 0.4,
          sampleRate: 24000,
          length: 2400,
          numberOfChannels: 1,
          getChannelData: () => new Float32Array(2400).fill(0.25),
        };
      }

      createAnalyser() {
        return {
          fftSize: 1024,
          frequencyBinCount: 512,
          smoothingTimeConstant: 0.35,
          minDecibels: -85,
          maxDecibels: -18,
          connect() {},
          disconnect() {},
          getFloatTimeDomainData(buf: Float32Array) {
            buf.fill(0.15);
          },
          getByteFrequencyData(buf: Uint8Array) {
            buf.fill(80);
          },
        };
      }

      createBufferSource() {
        const node = {
          buffer: null,
          onended: null as (() => void) | null,
          stopped: false,
          connect() {},
          disconnect() {},
          start() {},
          stop() {
            this.stopped = true;
          },
        };
        lastSourceNode = node;
        return node;
      }
    }

    (globalThis as any).window = { AudioContext: FakeAudioContext };

    let started = false;
    let ended = false;
    let errSeen: unknown = null;

    await speechService.playWavAudio(
      Buffer.from('RIFFfakewav').toString('base64'),
      () => {
        ended = true;
      },
      (err) => {
        errSeen = err;
      },
      {
        text: 'Namaste!',
        onStart: () => {
          started = true;
        },
      }
    );

    assert.equal(errSeen, null);
    assert.equal(started, true);
    assert.equal(speechService.getIsSpeaking(), true);

    // Complete playback naturally
    lastSourceNode.onended();
    assert.equal(ended, true);
    assert.equal(speechService.getIsSpeaking(), false);

    // Start again and interrupt mid-playback
    let interruptedEnded = false;
    await speechService.playWavAudio(
      Buffer.from('RIFFfakewav2').toString('base64'),
      () => {
        interruptedEnded = true;
      },
      () => {}
    );
    assert.equal(speechService.getIsSpeaking(), true);
    const interruptedNode = lastSourceNode;
    speechService.stopSpeaking();
    assert.equal(speechService.getIsSpeaking(), false);
    assert.equal(interruptedNode.stopped, true);
    assert.equal(interruptedEnded, false);

    // Decode failure calls onError cleanly and leaves speaking false
    shouldFailDecode = true;
    let decodeErr: any = null;
    await speechService.playWavAudio(
      Buffer.from('corrupt').toString('base64'),
      () => {},
      (e) => {
        decodeErr = e;
      }
    );
    assert.ok(decodeErr instanceof Error);
    assert.equal(speechService.getIsSpeaking(), false);

    // Empty payload triggers onError cleanly
    let emptyErr: any = null;
    await speechService.playWavAudio('', () => {}, (e) => {
      emptyErr = e;
    });
    assert.match(String(emptyErr?.message || ''), /Empty audio payload/i);
    assert.equal(speechService.getIsSpeaking(), false);
  });

  it('returns autoplay-blocked cleanly in speakWithAutoplaySupport when user interaction is absent', async () => {
    installMinimalDomMocks();
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [],
        speak: () => {},
        cancel: () => {},
      },
    };
    setMockNavigator({
      userActivation: { hasBeenActive: false, isActive: false },
    });

    let blockedCalled = false;
    const outcome = await speechService.speakWithAutoplaySupport('Hello!', 'en-IN', 1.0, {
      onBlocked: () => {
        blockedCalled = true;
      },
    });
    assert.equal(outcome, 'autoplay-blocked');
    assert.equal(blockedCalled, true);
  });

  it('resets LipSyncEngine weights and GLB speech morphs back to neutral when speech stops', () => {
    const engine = new LipSyncEngine();
    engine.startSpeechSynthesisSession({
      token: 7,
      text: 'Namaste! How are you doing today?',
      rate: 1.0,
    });
    engine.markSynthesisStarted(7, 100);

    const activeFrame = engine.sampleFrame(280);
    assert.equal(activeFrame.isActive, true);
    assert.ok(activeFrame.overallLevel > 0 || activeFrame.jawOpen > 0);

    engine.stop(7);
    const neutralFrame = engine.sampleFrame(320);
    assert.equal(neutralFrame.isActive, false);
    assert.equal(neutralFrame.mode, 'idle');
    assert.equal(neutralFrame.jawOpen, 0);
    assert.equal(neutralFrame.mouthClose, 0);
    assert.equal(neutralFrame.mouthFunnel, 0);
    assert.equal(neutralFrame.mouthPucker, 0);
    assert.equal(neutralFrame.visemes.viseme_aa, 0);
    assert.equal(neutralFrame.visemes.viseme_O, 0);

    // Also verify GLB rig speech morphs reset cleanly while preserving non-speech morphs if desired
    const root = new THREE.Group();
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    headMesh.name = 'Wolf3D_Head';
    headMesh.morphTargetDictionary = {
      jawOpen: 0,
      viseme_aa: 1,
      viseme_O: 2,
      mouthSmileLeft: 3,
    };
    headMesh.morphTargetInfluences = [0.55, 0.72, 0.3, 0.4];
    root.add(headMesh);

    const rig = inspectGlbRig(root);
    resetSpeechMorphs(rig);
    assert.equal(headMesh.morphTargetInfluences[0], 0);
    assert.equal(headMesh.morphTargetInfluences[1], 0);
    assert.equal(headMesh.morphTargetInfluences[2], 0);
    assert.equal(headMesh.morphTargetInfluences[3], 0.4);
  });
});
