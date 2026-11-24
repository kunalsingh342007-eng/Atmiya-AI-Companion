import { 
  AvatarEmotion,
  CompanionLanguage, 
  CompanionPersonality, 
  ChatMessage, 
  SystemStatus, 
  UserMemory 
} from '../types/companion';

export interface ChatResponse {
  reply: string;
  emotion?: AvatarEmotion;
  intensity?: number;
  timestamp: string;
  memorySuggestion?: {
    detected: boolean;
    candidateText: string;
  } | null;
}

export interface TTSResponse {
  audioBase64: string;
  mimeType: string;
  voice: string;
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
}

let ttsQuotaCooldownUntil = 0;

function createApiError(
  message: string,
  opts: { status?: number; code?: string; retryAfterSeconds?: number; name?: string } = {}
): Error {
  const err = new Error(message);
  if (opts.name) err.name = opts.name;
  if (opts.status !== undefined) (err as any).status = opts.status;
  if (opts.code !== undefined) (err as any).code = opts.code;
  if (opts.retryAfterSeconds !== undefined) (err as any).retryAfterSeconds = opts.retryAfterSeconds;
  return err;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30000, signal: externalSignal, ...fetchOpts } = options;
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    return await fetch(url, { ...fetchOpts, signal: controller.signal });
  } catch (err: any) {
    if (timedOut && !externalSignal?.aborted) {
      throw createApiError(
        'The AI server took too long to respond. Please try sending your message again.',
        { status: 504, code: 'TIMEOUT', name: 'TimeoutError' }
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export const api = {
  isTtsInCooldown(): boolean {
    return Date.now() < ttsQuotaCooldownUntil;
  },

  resetTtsCooldown(): void {
    ttsQuotaCooldownUntil = 0;
  },

  async getStatus(): Promise<SystemStatus> {
    try {
      const res = await fetchWithTimeout('/api/status', { timeoutMs: 8000 });
      if (!res.ok) {
        throw new Error(`Status check failed: ${res.statusText}`);
      }
      return await res.json();
    } catch (err: any) {
      console.warn('Backend status check error:', err);
      return {
        isKeyConfigured: false,
        model: 'gemini-4-hydrogen',
        ttsModel: 'gemini-3.8-flash-lite-tts',
        transcribeModel: 'gemini-3.5-transcribe',
        supportedVoices: ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'],
      };
    }
  },

  async sendMessage(
    params: {
      message: string;
      history: ChatMessage[];
      memories: UserMemory[];
      personality: CompanionPersonality;
      language: CompanionLanguage;
      userName?: string;
    },
    signal?: AbortSignal
  ): Promise<ChatResponse> {
    const maxAttempts = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (signal?.aborted) {
        throw signal.reason || new DOMException('Aborted', 'AbortError');
      }

      if (attempt > 0) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 650);
          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(signal.reason || new DOMException('Aborted', 'AbortError'));
            },
            { once: true }
          );
        });
      }

      const res = await fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal,
        timeoutMs: 48000,
      });

      const data = await parseJsonSafe(res);
      if (!res.ok) {
        const err = createApiError(data.message || data.error || 'Failed to send message', {
          status: res.status,
          code: data.error,
          retryAfterSeconds: data.retryAfterSeconds,
        });
        const isTransient = res.status === 502 || res.status === 503 || res.status === 504;
        if (isTransient && attempt < maxAttempts - 1) {
          lastError = err;
          continue;
        }
        throw err;
      }

      if (typeof data?.reply !== 'string' || !data.reply.trim()) {
        const emptyErr = createApiError(
          'Ātmiya could not form a response right now. Please try sending your message again.',
          {
            status: 502,
            code: 'EMPTY_RESPONSE',
          }
        );
        if (attempt < maxAttempts - 1) {
          lastError = emptyErr;
          continue;
        }
        throw emptyErr;
      }

      return data as ChatResponse;
    }

    throw (
      lastError ||
      createApiError('Failed to send message. Please try again.', {
        status: 502,
        code: 'EMPTY_RESPONSE',
      })
    );
  },

  async generateTTS(
    params: {
      text: string;
      voice?: string;
      style?: string;
    },
    signal?: AbortSignal
  ): Promise<TTSResponse> {
    if (api.isTtsInCooldown()) {
      throw createApiError('Gemini TTS is temporarily in quota cooldown.', {
        status: 429,
        code: 'TTS_QUOTA_COOLDOWN',
      });
    }

    const res = await fetchWithTimeout('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal,
      timeoutMs: 25000,
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      if (res.status === 429 || data.error === 'TTS_QUOTA_EXCEEDED' || data.error === 'QUOTA_EXCEEDED') {
        const retrySec = Number(data.retryAfterSeconds) || 900;
        const boundedCooldownMs = Math.min(Math.max(retrySec, 60), 1800) * 1000;
        ttsQuotaCooldownUntil = Date.now() + boundedCooldownMs;
      }
      throw createApiError(data.message || data.error || 'TTS generation failed', {
        status: res.status,
        code: data.error,
        retryAfterSeconds: data.retryAfterSeconds,
      });
    }
    return data;
  },

  async transcribeAudio(
    audioBase64: string,
    mimeType = 'audio/webm',
    signal?: AbortSignal
  ): Promise<string> {
    const res = await fetchWithTimeout('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType }),
      signal,
      timeoutMs: 30000,
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw createApiError(data.message || data.error || 'Transcription failed', {
        status: res.status,
        code: data.error,
        retryAfterSeconds: data.retryAfterSeconds,
      });
    }
    return data.text || '';
  },

  async extractMemory(userText: string, aiReply: string): Promise<{
    hasMemory: boolean;
    memory?: {
      category: any;
      content: string;
    } | null;
  }> {
    try {
      const res = await fetchWithTimeout('/api/memories/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userText, aiReply }),
        timeoutMs: 15000,
      });
      if (!res.ok) return { hasMemory: false };
      return await parseJsonSafe(res);
    } catch {
      return { hasMemory: false };
    }
  },
};
