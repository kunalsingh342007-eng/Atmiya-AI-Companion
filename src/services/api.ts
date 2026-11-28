import { 
  AvatarEmotion,
  AvatarGestureHint,
  CompanionLanguage, 
  CompanionPersonality, 
  ChatMessage, 
  SystemStatus, 
} from '../types/companion';
import { normalizeStructuredEmotionPayload } from '../components/Avatar/expressionRig';

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export interface ChatResponse {
  reply: string;
  emotion?: AvatarEmotion;
  intensity?: number;
  gesture?: AvatarGestureHint;
  timestamp: string;
}

export interface TTSResponse {
  audioBase64: string;
  mimeType: string;
  voice: string;
}

export interface TtsStreamChunk {
  audioBase64: string;
  sampleRate: number;
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
      const res = await fetchWithTimeout(apiUrl('/api/status'), { timeoutMs: 8000 });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error(`Status check failed: ${res.status} ${res.statusText}`);
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

      const res = await fetchWithTimeout(apiUrl('/api/chat'), {
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

      const rawReply =
        typeof data?.reply === 'string'
          ? data.reply
          : typeof data?.text === 'string'
          ? data.text
          : '';
      if (!rawReply.trim()) {
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

      const normalized = normalizeStructuredEmotionPayload(data);
      return {
        ...data,
        reply: normalized.text,
        emotion: normalized.emotion,
        intensity: normalized.intensity,
        gesture: normalized.gesture,
      } as ChatResponse;
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

    const res = await fetchWithTimeout(apiUrl('/api/tts'), {
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

  async streamTTS(
    params: {
      text: string;
      voice?: string;
      style?: string;
    },
    signal?: AbortSignal
  ): Promise<AsyncGenerator<TtsStreamChunk, void, unknown>> {
    if (api.isTtsInCooldown()) {
      throw createApiError('Gemini TTS is temporarily in quota cooldown.', {
        status: 429,
        code: 'TTS_QUOTA_COOLDOWN',
      });
    }

    const res = await fetchWithTimeout(apiUrl('/api/tts/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal,
      timeoutMs: 25000,
    });

    if (!res.ok) {
      const data = await parseJsonSafe(res);
      if (res.status === 429 || data.error === 'TTS_QUOTA_EXCEEDED' || data.error === 'QUOTA_EXCEEDED') {
        const retrySec = Number(data.retryAfterSeconds) || 900;
        const boundedCooldownMs = Math.min(Math.max(retrySec, 60), 1800) * 1000;
        ttsQuotaCooldownUntil = Date.now() + boundedCooldownMs;
      }
      throw createApiError(data.message || data.error || 'Streaming TTS failed', {
        status: res.status,
        code: data.error,
        retryAfterSeconds: data.retryAfterSeconds,
      });
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    // If proxy/backend returned unary WAV JSON instead of NDJSON, adapt seamlessly
    if (contentType.includes('application/json') && !contentType.includes('ndjson')) {
      const jsonData = await parseJsonSafe(res);
      if (jsonData?.audioBase64) {
        return (async function* singleWavFallback(): AsyncGenerator<TtsStreamChunk, void, unknown> {
          throw createApiError('STREAM_RETURNED_UNARY_WAV', {
            code: 'STREAM_UNSUPPORTED_PAYLOAD',
          });
        })();
      }
    }

    if (!res.body || typeof res.body.getReader !== 'function') {
      throw createApiError('Streaming body unavailable in this environment.', {
        code: 'STREAM_UNAVAILABLE',
      });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    async function* iterateNdjson(): AsyncGenerator<TtsStreamChunk, void, unknown> {
      let buffer = '';
      try {
        while (true) {
          if (signal?.aborted) {
            throw signal.reason || new DOMException('Aborted', 'AbortError');
          }
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nlIdx = buffer.indexOf('\n');
          while (nlIdx !== -1) {
            const line = buffer.slice(0, nlIdx).trim();
            buffer = buffer.slice(nlIdx + 1);
            nlIdx = buffer.indexOf('\n');
            if (!line) continue;

            let parsed: any;
            try {
              parsed = JSON.parse(line);
            } catch {
              continue;
            }

            if (parsed.type === 'chunk' && typeof parsed.audioBase64 === 'string' && parsed.audioBase64) {
              yield {
                audioBase64: parsed.audioBase64,
                sampleRate: typeof parsed.sampleRate === 'number' && parsed.sampleRate > 0 ? parsed.sampleRate : 24000,
              };
            } else if (parsed.type === 'error') {
              if (parsed.error === 'TTS_QUOTA_EXCEEDED' || parsed.error === 'QUOTA_EXCEEDED') {
                ttsQuotaCooldownUntil = Date.now() + 900 * 1000;
              }
              throw createApiError(parsed.message || 'Streaming TTS interrupted.', {
                code: parsed.error || 'TTS_ERROR',
              });
            } else if (parsed.type === 'done') {
              return;
            }
          }
        }

        const trailing = buffer.trim();
        if (trailing) {
          try {
            const parsed = JSON.parse(trailing);
            if (parsed.type === 'chunk' && typeof parsed.audioBase64 === 'string' && parsed.audioBase64) {
              yield {
                audioBase64: parsed.audioBase64,
                sampleRate: typeof parsed.sampleRate === 'number' && parsed.sampleRate > 0 ? parsed.sampleRate : 24000,
              };
            }
          } catch {
            // ignore trailing incomplete fragment
          }
        }
      } finally {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
      }
    }

    return iterateNdjson();
  },

  async transcribeAudio(
    audioBase64: string,
    mimeType = 'audio/webm',
    signal?: AbortSignal
  ): Promise<string> {
    const res = await fetchWithTimeout(apiUrl('/api/transcribe'), {
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
};
