export type VoiceTurnPlaybackMode =
  | 'gemini-stream-pcm'
  | 'gemini-wav'
  | 'browser-tts'
  | 'silent'
  | 'cancelled'
  | 'error';

export interface VoiceTurnDiagnostics {
  turnId: number;
  speechEndAt?: number;
  chatRequestStartAt?: number;
  chatFirstResponseAt?: number;
  ttsRequestStartAt?: number;
  firstAudioChunkAt?: number;
  playbackStartAt?: number;
  playbackEndAt?: number;
  playbackMode?: VoiceTurnPlaybackMode;
  chunkCount?: number;
}

export interface ComputedTurnLatencies {
  chatResponseMs: number | null;
  ttsFirstByteMs: number | null;
  ttsTotalToPlaybackMs: number | null;
  speechEndToPlaybackMs: number | null;
  playbackDurationMs: number | null;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export function computeTurnLatencies(diag: VoiceTurnDiagnostics): ComputedTurnLatencies {
  const diff = (a?: number, b?: number): number | null =>
    typeof a === 'number' && typeof b === 'number' && b >= a ? Math.round(b - a) : null;

  return {
    chatResponseMs: diff(diag.chatRequestStartAt, diag.chatFirstResponseAt),
    ttsFirstByteMs: diff(diag.ttsRequestStartAt, diag.firstAudioChunkAt),
    ttsTotalToPlaybackMs: diff(diag.ttsRequestStartAt, diag.playbackStartAt),
    speechEndToPlaybackMs: diff(diag.speechEndAt, diag.playbackStartAt),
    playbackDurationMs: diff(diag.playbackStartAt, diag.playbackEndAt),
  };
}

class VoiceDiagnosticsStore {
  private turns: VoiceTurnDiagnostics[] = [];
  private activeTurnId = 0;

  public startTurn(speechEndAt?: number): number {
    this.activeTurnId += 1;
    const entry: VoiceTurnDiagnostics = {
      turnId: this.activeTurnId,
      ...(typeof speechEndAt === 'number' ? { speechEndAt } : {}),
    };
    this.turns.push(entry);
    if (this.turns.length > 10) {
      this.turns.shift();
    }
    return this.activeTurnId;
  }

  public mark(
    turnId: number,
    field: Exclude<keyof VoiceTurnDiagnostics, 'turnId' | 'playbackMode' | 'chunkCount'>,
    timestampMs = nowMs()
  ): void {
    const turn = this.turns.find((t) => t.turnId === turnId);
    if (!turn) return;
    if (turn[field] === undefined) {
      turn[field] = timestampMs;
    }
  }

  public setMode(turnId: number, mode: VoiceTurnPlaybackMode, chunkCount?: number): void {
    const turn = this.turns.find((t) => t.turnId === turnId);
    if (!turn) return;
    turn.playbackMode = mode;
    if (typeof chunkCount === 'number') {
      turn.chunkCount = chunkCount;
    }
  }

  public getLastTurn(): (VoiceTurnDiagnostics & { latencies: ComputedTurnLatencies }) | null {
    const last = this.turns[this.turns.length - 1];
    if (!last) return null;
    return {
      ...last,
      latencies: computeTurnLatencies(last),
    };
  }

  public getRecentTurns(): Array<VoiceTurnDiagnostics & { latencies: ComputedTurnLatencies }> {
    return this.turns.map((t) => ({
      ...t,
      latencies: computeTurnLatencies(t),
    }));
  }

  public reset(): void {
    this.turns = [];
    this.activeTurnId = 0;
  }
}

export const voiceDiagnostics = new VoiceDiagnosticsStore();
