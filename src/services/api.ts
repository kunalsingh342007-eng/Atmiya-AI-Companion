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

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30000, signal: externalSignal, ...fetchOpts } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);

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
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export const api = {
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
        model: 'gemini-3.8-flash',
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
    const res = await fetchWithTimeout('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal,
      timeoutMs: 35000,
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Failed to send message');
      (err as any).code = data.error;
      throw err;
    }
    return data;
  },

  async generateTTS(
    params: {
      text: string;
      voice?: string;
      style?: string;
    },
    signal?: AbortSignal
  ): Promise<TTSResponse> {
    const res = await fetchWithTimeout('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal,
      timeoutMs: 25000,
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(data.message || data.error || 'TTS generation failed');
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
      throw new Error(data.message || data.error || 'Transcription failed');
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
