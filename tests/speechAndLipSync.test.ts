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
  speechService.resetAudioContextForTests();
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

  it('segments voiced bursts across pauses and decodes chunked PCM16 LE cleanly across odd-byte boundaries', async () => {
    const {
      segmentAudioVoiceSpans,
      alignTimeToVoicedSegments,
      buildVoicedCueTimeline,
      describeTimingCapabilities,
    } = await import('../src/components/Avatar/speechSyncAdapter');
    const { buildSpeechCueTimeline } = await import('../src/components/Avatar/lipSync');
    const { decodePcm16LeToFloat32 } = await import('../src/services/speech');

    // Envelope with two clear voiced bursts separated by a 350ms pause
    const hopSec = 0.05;
    const rms = new Float32Array([
      0.01, 0.25, 0.3, 0.28, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.26, 0.32, 0.24, 0.01,
    ]);
    const envelope = {
      rms,
      zcr: new Float32Array(rms.length).fill(0.08),
      hopSec,
      durationSec: rms.length * hopSec,
      firstVoicedSec: 0.05,
      lastVoicedSec: 0.7,
      noiseFloor: 0.01,
      speechPeak: 0.32,
    };

    const spans = segmentAudioVoiceSpans(envelope);
    assert.equal(spans.length, 2);
    assert.equal(spans[0].startNormRatio, 0);
    assert.equal(spans[1].endNormRatio, 1);

    // Silence gap between burst 1 and burst 2 should hold progress steady right at boundary
    const midPauseStart = alignTimeToVoicedSegments(envelope, spans, 0.26);
    const midPauseEnd = alignTimeToVoicedSegments(envelope, spans, 0.48);
    assert.ok(Math.abs(midPauseStart - midPauseEnd) < 1e-6);

    const rawTimeline = buildSpeechCueTimeline('Hello there, how are you?', 1.0);
    const voicedTimeline = buildVoicedCueTimeline(rawTimeline);
    assert.ok(voicedTimeline && voicedTimeline.cues.every((c) => !c.isSilence));
    assert.equal(describeTimingCapabilities('audio-analyser', true).hasExactVisemeTimestamps, false);

    // Odd-byte boundary PCM16 LE split test: [0x00, 0x40] (+16384), [0x00, 0xC0] (-16384)
    const firstChunk = new Uint8Array([0x00, 0x40, 0x00]);
    const secondChunk = new Uint8Array([0xc0]);
    const decoded1 = decodePcm16LeToFloat32(firstChunk, null);
    assert.equal(decoded1.samples.length, 1);
    assert.equal(decoded1.nextCarryByte, 0x00);
    assert.ok(Math.abs(decoded1.samples[0] - 16384 / 32768) < 1e-4);

    const decoded2 = decodePcm16LeToFloat32(secondChunk, decoded1.nextCarryByte);
    assert.equal(decoded2.samples.length, 1);
    assert.equal(decoded2.nextCarryByte, null);
    assert.ok(Math.abs(decoded2.samples[0] - -16384 / 32768) < 1e-4);
  });

  it('tracks progressive PCM streams in LipSyncEngine and schedules gapless playPcmStream chunks with clean cancellation', async () => {
    installMinimalDomMocks();

    const engine = new LipSyncEngine();
    const fakeCtx = {
      sampleRate: 24000,
      currentTime: 0.1,
    } as AudioContext;
    const fakeAnalyser = {
      fftSize: 1024,
      frequencyBinCount: 512,
      getFloatTimeDomainData(buf: Float32Array) {
        buf.fill(0.18);
      },
      getByteFrequencyData(buf: Uint8Array) {
        for (let i = 0; i < buf.length; i += 1) {
          buf[i] = i < 30 ? 150 : 60;
        }
      },
    } as unknown as AnalyserNode;

    engine.startPcmStreamSession({
      token: 42,
      ctx: fakeCtx,
      analyser: fakeAnalyser,
      startCtxTime: 0.0,
      text: 'Progressive voice check!',
      rate: 1.0,
    });
    engine.updatePcmStreamDuration(42, 0.8);
    assert.equal(engine.getTimingCapabilities().providerKind, 'acoustic-formant-plus-lexical-alignment');

    const streamFrame = engine.sampleFrame(120);
    assert.equal(streamFrame.isActive, true);
    assert.equal(streamFrame.mode, 'audio-analyser');
    assert.ok(streamFrame.jawOpen > 0);

    // Stale token must NOT stop newer session
    engine.stop(999);
    assert.equal(engine.sampleFrame(140).isActive, true);
    engine.stop(42);
    assert.equal(engine.sampleFrame(160).jawOpen, 0);

    // Test speechService.playPcmStream gapless start times & interruption
    const createdNodes: Array<{ startOffset: number; stopped: boolean; onended: (() => void) | null }> = [];
    class StreamAudioContext {
      state: 'running' | 'suspended' = 'running';
      currentTime = 1.0;
      sampleRate = 24000;
      destination = {};
      async resume() {}
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
            buf.fill(0.12);
          },
          getByteFrequencyData(buf: Uint8Array) {
            buf.fill(70);
          },
        };
      }
      createBuffer(channels: number, length: number, sampleRate: number) {
        const ch = new Float32Array(length);
        return {
          numberOfChannels: channels,
          length,
          sampleRate,
          duration: length / sampleRate,
          getChannelData: () => ch,
        };
      }
      createBufferSource() {
        const node = {
          buffer: null,
          onended: null as (() => void) | null,
          startOffset: -1,
          stopped: false,
          connect() {},
          disconnect() {},
          start(when = 0) {
            this.startOffset = when;
          },
          stop() {
            this.stopped = true;
          },
        };
        createdNodes.push(node);
        return node;
      }
    }

    (globalThis as any).window = { AudioContext: StreamAudioContext };

    // Two small 240-sample (10ms) PCM16 chunks
    const pcmChunk = Buffer.from(new Uint8Array(480).fill(0x20)).toString('base64');
    let firstChunkCount = 0;
    let startedCount = 0;
    let completed = false;

    async function* makeChunks() {
      yield { audioBase64: pcmChunk, mimeType: 'audio/l16;rate=24000', sampleRate: 24000 };
      yield { audioBase64: pcmChunk, mimeType: 'audio/l16;rate=24000', sampleRate: 24000 };
    }

    await speechService.playPcmStream(
      makeChunks(),
      () => {
        completed = true;
      },
      (err) => {
        throw err;
      },
      {
        text: 'Streaming check',
        onFirstChunk: () => {
          firstChunkCount += 1;
        },
        onStart: () => {
          startedCount += 1;
        },
      }
    );

    assert.equal(firstChunkCount, 1);
    assert.equal(startedCount, 1);
    assert.equal(createdNodes.length, 2);
    assert.ok(createdNodes[1].startOffset > createdNodes[0].startOffset);

    // Trigger sequential end events on all scheduled nodes
    createdNodes[0].onended?.();
    assert.equal(completed, false);
    createdNodes[1].onended?.();
    assert.equal(completed, true);
    assert.equal(speechService.getIsSpeaking(), false);

    // Mid-stream cancellation immediately stops queued chunk nodes
    createdNodes.length = 0;
    let cancelledEnded = false;
    async function* slowChunks() {
      yield { audioBase64: pcmChunk, mimeType: 'audio/l16;rate=24000', sampleRate: 24000 };
      yield { audioBase64: pcmChunk, mimeType: 'audio/l16;rate=24000', sampleRate: 24000 };
    }
    await speechService.playPcmStream(slowChunks(), () => {
      cancelledEnded = true;
    });
    assert.equal(speechService.getIsSpeaking(), true);
    speechService.stopSpeaking();
    assert.equal(speechService.getIsSpeaking(), false);
    assert.equal(createdNodes.every((n) => n.stopped), true);
    assert.equal(cancelledEnded, false);
  });
});

