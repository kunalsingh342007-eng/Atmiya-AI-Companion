import { 
  CompanionLanguage, 
  CompanionPersonality, 
  ChatMessage, 
  SystemStatus, 
  UserMemory 
} from '../types/companion';

export interface ChatResponse {
  reply: string;
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

export const api = {
  async getStatus(): Promise<SystemStatus> {
    try {
      const res = await fetch('/api/status');
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

  async sendMessage(params: {
    message: string;
    history: ChatMessage[];
    memories: UserMemory[];
    personality: CompanionPersonality;
    language: CompanionLanguage;
    userName?: string;
  }): Promise<ChatResponse> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Failed to send message');
      (err as any).code = data.error;
      throw err;
    }
    return data;
  },

  async generateTTS(params: {
    text: string;
    voice?: string;
    style?: string;
  }): Promise<TTSResponse> {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'TTS generation failed');
    }
    return data;
  },

  async transcribeAudio(audioBase64: string, mimeType = 'audio/webm'): Promise<string> {
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType }),
    });

    const data = await res.json();
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
      const res = await fetch('/api/memories/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userText, aiReply }),
      });
      if (!res.ok) return { hasMemory: false };
      return await res.json();
    } catch {
      return { hasMemory: false };
    }
  },
};
