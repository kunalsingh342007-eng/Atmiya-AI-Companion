export type GameSoundEffect = 'tap' | 'flip' | 'match' | 'correct' | 'wrong' | 'win' | 'pad0' | 'pad1' | 'pad2' | 'pad3';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playTone(ctx: AudioContext, freq: number, durationSec: number, startOffset = 0, type: OscillatorType = 'sine', volume = 0.08) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function playGameSound(effect: GameSoundEffect, soundEnabled: boolean): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    switch (effect) {
      case 'tap':
        playTone(ctx, 520, 0.07, 0, 'sine', 0.06);
        break;
      case 'flip':
        playTone(ctx, 440, 0.08, 0, 'triangle', 0.06);
        break;
      case 'match':
        playTone(ctx, 523.25, 0.12, 0, 'sine', 0.08);
        playTone(ctx, 659.25, 0.16, 0.09, 'sine', 0.08);
        break;
      case 'correct':
        playTone(ctx, 587.33, 0.12, 0, 'sine', 0.08);
        playTone(ctx, 783.99, 0.18, 0.08, 'sine', 0.08);
        break;
      case 'wrong':
        playTone(ctx, 260, 0.18, 0, 'triangle', 0.07);
        playTone(ctx, 210, 0.22, 0.12, 'triangle', 0.07);
        break;
      case 'win':
        playTone(ctx, 523.25, 0.14, 0, 'sine', 0.09);
        playTone(ctx, 659.25, 0.14, 0.1, 'sine', 0.09);
        playTone(ctx, 783.99, 0.14, 0.2, 'sine', 0.09);
        playTone(ctx, 1046.5, 0.28, 0.3, 'sine', 0.09);
        break;
      case 'pad0':
        playTone(ctx, 392.0, 0.18, 0, 'sine', 0.08); // G4
        break;
      case 'pad1':
        playTone(ctx, 493.88, 0.18, 0, 'sine', 0.08); // B4
        break;
      case 'pad2':
        playTone(ctx, 587.33, 0.18, 0, 'sine', 0.08); // D5
        break;
      case 'pad3':
        playTone(ctx, 783.99, 0.18, 0, 'sine', 0.08); // G5
        break;
    }
  } catch {
    // Ignore audio context restrictions gracefully
  }
}
