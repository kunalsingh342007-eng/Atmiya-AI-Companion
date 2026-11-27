import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const VALID_EMOTIONS = [
  'neutral',
  'happy',
  'smile',
  'laughing',
  'encouraging',
  'sad',
  'thinking',
  'confused',
  'surprised',
  'curious',
  'worried',
  'concerned',
  'empathetic',
  'excited',
  'calm',
  'disappointed',
  'winking',
  'talking',
] as const;

type ServerAvatarEmotion = (typeof VALID_EMOTIONS)[number];

const VALID_GESTURES = [
  'none',
  'gentle_nod',
  'wave',
  'open_palm',
  'head_tilt',
] as const;

type ServerAvatarGesture = (typeof VALID_GESTURES)[number];

function normalizeEmotion(value: unknown): ServerAvatarEmotion {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if ((VALID_EMOTIONS as readonly string[]).includes(normalized)) {
      return normalized as ServerAvatarEmotion;
    }
  }
  return 'neutral';
}

function normalizeGesture(value: unknown): ServerAvatarGesture {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (normalized === 'nod') return 'gentle_nod';
    if (normalized === 'tilt') return 'head_tilt';
    if (normalized === 'open_hand') return 'open_palm';
    if ((VALID_GESTURES as readonly string[]).includes(normalized)) {
      return normalized as ServerAvatarGesture;
    }
  }
  return 'none';
}

function clampIntensity(value: unknown, fallback = 0.7): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware for parsing JSON with ample limit for audio blobs
app.use(express.json({ limit: '25mb' }));

// Helper to get GoogleGenAI client
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to extract structured error details from @google/genai ApiError
function parseGeminiError(err: unknown): {
  httpStatus: number;
  code: string;
  message: string;
  retryAfterSeconds?: number;
  isTimeout: boolean;
  isQuota: boolean;
  isAuth: boolean;
  isBadRequest: boolean;
} {
  const anyErr = err as any;
  const rawMessage = typeof anyErr?.message === 'string' ? anyErr.message : String(err || 'Unknown error');
  const errName = typeof anyErr?.name === 'string' ? anyErr.name : '';

  let status =
    typeof anyErr?.status === 'number'
      ? anyErr.status
      : typeof anyErr?.code === 'number'
      ? anyErr.code
      : 0;

  let extractedMessage = rawMessage;
  let retryAfterSeconds: number | undefined;

  // @google/genai ApiError often serializes JSON into err.message
  const jsonStart = rawMessage.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart));
      const inner = parsed?.error ?? parsed;
      if (!status && typeof inner?.code === 'number') {
        status = inner.code;
      }
      if (typeof inner?.message === 'string' && inner.message.trim()) {
        extractedMessage = inner.message.trim();
      }
      const details = Array.isArray(inner?.details) ? inner.details : [];
      for (const d of details) {
        if (typeof d?.retryDelay === 'string') {
          const secMatch = d.retryDelay.match(/^(\d+(?:\.\d+)?)s$/i);
          if (secMatch) {
            retryAfterSeconds = Math.ceil(parseFloat(secMatch[1]));
          }
        }
      }
    } catch {
      // Ignore JSON parse error and fall back to regex inspection
    }
  }

  if (!retryAfterSeconds) {
    const retryInMatch = rawMessage.match(/Please retry in\s+(?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
    if (retryInMatch) {
      const h = parseInt(retryInMatch[1] || '0', 10);
      const m = parseInt(retryInMatch[2] || '0', 10);
      const s = Math.ceil(parseFloat(retryInMatch[3] || '0'));
      retryAfterSeconds = h * 3600 + m * 60 + s;
    }
  }

  const isTimeout =
    errName === 'TimeoutError' ||
    errName === 'AbortError' ||
    status === 408 ||
    status === 504 ||
    /timed?\s*out|aborted|DEADLINE_EXCEEDED/i.test(rawMessage);

  const isQuota =
    status === 429 ||
    /RESOURCE_EXHAUSTED|quota|rate[- ]?limit/i.test(rawMessage);

  const isAuth =
    status === 401 ||
    status === 403 ||
    /API_KEY_INVALID|PERMISSION_DENIED|unauthenticated|forbidden/i.test(rawMessage);

  const isBadRequest = status === 400;

  if (isQuota) {
    return {
      httpStatus: 429,
      code: 'QUOTA_EXCEEDED',
      message:
        'Gemini API quota limit reached for this key. Please retry shortly or add a billed API key in Settings > Secrets.',
      retryAfterSeconds,
      isTimeout: false,
      isQuota: true,
      isAuth: false,
      isBadRequest: false,
    };
  }

  if (isTimeout) {
    return {
      httpStatus: 504,
      code: 'TIMEOUT',
      message: 'The AI model took too long to respond. Please try sending your message again.',
      isTimeout: true,
      isQuota: false,
      isAuth: false,
      isBadRequest: false,
    };
  }

  if (isAuth) {
    return {
      httpStatus: 403,
      code: 'AUTH_ERROR',
      message: 'Gemini API access was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.',
      isTimeout: false,
      isQuota: false,
      isAuth: true,
      isBadRequest: false,
    };
  }

  const isUnavailable =
    status === 503 ||
    /UNAVAILABLE|high demand|overloaded|try again later/i.test(rawMessage);

  if (isBadRequest) {
    return {
      httpStatus: 400,
      code: 'BAD_REQUEST',
      message: extractedMessage.slice(0, 240),
      isTimeout: false,
      isQuota: false,
      isAuth: false,
      isBadRequest: true,
    };
  }

  if (isUnavailable) {
    return {
      httpStatus: 503,
      code: 'MODEL_BUSY',
      message:
        extractedMessage.slice(0, 240) ||
        'The AI model is temporarily busy. Please try sending your message again.',
      isTimeout: false,
      isQuota: false,
      isAuth: false,
      isBadRequest: false,
    };
  }

  return {
    httpStatus: status >= 400 && status < 600 ? status : 500,
    code: 'GENERATION_ERROR',
    message: extractedMessage.slice(0, 240) || 'An unexpected AI error occurred.',
    isTimeout: false,
    isQuota: false,
    isAuth: false,
    isBadRequest: false,
  };
}

function createUpstreamAbortControl(res: Response, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  let clientClosed = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException(`Upstream request timed out after ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  const onResClose = () => {
    if (!res.writableEnded) {
      clientClosed = true;
      controller.abort(new DOMException('Client closed request', 'AbortError'));
    }
  };
  res.on('close', onResClose);

  return {
    signal: controller.signal,
    isTimedOut: () => timedOut,
    isClientClosed: () => clientClosed,
    cleanup: () => {
      clearTimeout(timer);
      res.off('close', onResClose);
    },
  };
}

// 1. Health and configuration status endpoint
app.get('/api/status', (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY');
  
  res.json({
    status: 'ok',
    isKeyConfigured,
    model: 'gemini-4-hydrogen',
    ttsModel: 'gemini-3.8-flash-lite-tts',
    transcribeModel: 'gemini-3.5-transcribe',
    serverTime: new Date().toISOString(),
    supportedLanguages: ['hi-IN', 'en-IN', 'en-US', 'hinglish'],
    supportedVoices: ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'],
  });
});

// 2. Chat Completion endpoint with personality & language support
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'API_KEY_MISSING',
        message: 'Gemini API Key is not configured. Please add GEMINI_API_KEY to your environment secrets.',
      });
    }

    const {
      message,
      history = [],
      personality = 'calm',
      language = 'auto',
      userName = '',
    } = req.body ?? {};

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Message text is required.' });
    }

    const trimmedMessage = message.trim().slice(0, 8000);
    const safeHistory = Array.isArray(history) ? history : [];
    const safePersonality = typeof personality === 'string' ? personality : 'calm';
    const safeLanguage = typeof language === 'string' ? language : 'auto';
    const safeUserName = typeof userName === 'string' ? userName.trim().slice(0, 80) : '';

    // Build personality directives
    const personalityPrompts: Record<string, string> = {
      calm: `You are Ātmiya (आत्मीय), a calm, gentle, empathetic, and deeply attentive AI human companion. You speak with warmth, emotional depth, patience, and grounded reassurance. You listen attentively, validate feelings without being preachy, and provide peaceful clarity.`,
      friendly: `You are Ātmiya (आत्मीय), a warm, playful, witty, and enthusiastic AI companion. You have a cheerful vibe, use light humor, feel like an intimate and uplifting close friend, and bring positive energy.`,
      reflective: `You are Ātmiya (आत्मीय), a thoughtful, philosophical, and deeply introspective companion. You ask profound open-ended questions, encourage personal reflection, and ponder life, literature, human nature, and ideas with genuine wonder.`,
      study: `You are Ātmiya (आत्मीय), an encouraging, patient study mentor and coding tutor. You explain complex technical concepts (C++, algorithms, mathematics, science, engineering) using intuitive analogies, simple step-by-step examples, and practical code snippets. You break problems down and test understanding gently.`,
      creative: `You are Ātmiya (आत्मीय), an inventive, inspiring creative brainstorming partner. You love generating fresh ideas for projects, robotics, software, writing, design, and innovation with excitement and structured thinking.`,
    };

    const selectedPersonality = personalityPrompts[safePersonality] || personalityPrompts.calm;

    // Build language instructions
    let languageInstruction = '';
    if (safeLanguage === 'hi') {
      languageInstruction = `LANGUAGE MANDATE: Respond strictly in natural, conversational, fluent Hindi (हिन्दी) in Devanagari script. Use warm, natural everyday phrasing, avoiding overly archaic Sanskritized or bureaucratic words.`;
    } else if (safeLanguage === 'hinglish') {
      languageInstruction = `LANGUAGE MANDATE: Respond naturally in fluent, colloquial Hinglish (Hindi mixed with English words, written in the Roman/Latin alphabet). Example: "Bilkul! Chalo isko step-by-step samajhte hain. Pehle yeh batao..." Keep it casual, smooth, and authentic.`;
    } else if (safeLanguage === 'en') {
      languageInstruction = `LANGUAGE MANDATE: Respond in clear, natural, warm English.`;
    } else {
      // Auto-detect
      languageInstruction = `LANGUAGE INSTRUCTION: Auto-detect the user's language and respond naturally in the same language or dialect:
- If the user speaks Hindi in Devanagari, reply in natural conversational Hindi.
- If the user speaks Hinglish (Hindi words in Roman alphabet, e.g. "Mujhe C++ simple tareeqe se samjhao"), respond naturally in warm, friendly Hinglish.
- If the user speaks English, reply in warm English.
- If the user mixes both or switches halfway, follow their lead effortlessly.`;
    }

    const userContext = safeUserName
      ? `The user's name is "${safeUserName}". Address them naturally by name when appropriate without overusing it.`
      : '';

    const systemInstruction = `${selectedPersonality}

CRITICAL IDENTITY & BEHAVIOR GUIDELINES:
- You are Ātmiya (आत्मीय), a personal, emotionally grounded, human-relatable AI companion.
- Be natural, attentive, concise when casual, and thorough when helping with deep questions, coding, or study topics.
- Never fabricate past personal events or pretend to remember private details that were not shared in this conversation.
- ${userContext ? userContext : 'Keep your tone warm, respectful, and personal.'}

OUTPUT FORMAT & EMOTION SYNC:
Return a JSON object with:
- "reply": your conversational message to the user.
- "emotion": one of [${VALID_EMOTIONS.join(', ')}] matching the emotional tone of your reply.
- "intensity": number from 0.0 to 1.0 indicating expression strength (use 0.25-0.65 for natural conversation, higher only for genuine strong moments).
- "gesture": one of [${VALID_GESTURES.join(', ')}] ("none" for normal turns, or a subtle physical cue like "gentle_nod", "tilt_curious", "open_hand_explain", "calm_breathe", or "wave_greet" for greetings).

${languageInstruction}
`;

    // Format contents for Gemini generateContent
    const contents: any[] = [];

    // Add up to last 12 valid history turns for context
    const recentHistory = safeHistory.slice(-12);
    for (const item of recentHistory) {
      if (!item || typeof item !== 'object') continue;
      const rawText = typeof item.content === 'string' ? item.content : typeof item.text === 'string' ? item.text : '';
      if (!rawText.trim()) continue;
      if (item.role === 'user' || item.role === 'model' || item.role === 'assistant') {
        contents.push({
          role: item.role === 'assistant' ? 'model' : item.role,
          parts: [{ text: rawText.slice(0, 8000) }],
        });
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: trimmedMessage }],
    });

    const chatResponseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: {
          type: Type.STRING,
          description: 'The natural conversational reply text from Ātmiya.',
        },
        emotion: {
          type: Type.STRING,
          enum: [...VALID_EMOTIONS],
          description: 'Most appropriate facial emotion matching the reply and user context.',
        },
        intensity: {
          type: Type.NUMBER,
          description: 'Emotional expression strength between 0.0 and 1.0.',
        },
        gesture: {
          type: Type.STRING,
          enum: [...VALID_GESTURES],
          description: 'Optional restrained physical gesture cue matching the reply ("none" by default).',
        },
      },
      required: ['reply', 'emotion', 'intensity'],
    };

    const extractResponseText = (resp: any): string => {
      if (typeof resp?.text === 'string' && resp.text.trim()) {
        return resp.text;
      }
      const parts = resp?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        const joined = parts
          .filter((p: any) => p && !p.thought && typeof p.text === 'string')
          .map((p: any) => p.text)
          .join('');
        if (joined.trim()) return joined;
      }
      return '';
    };

    const parseChatPayload = (
      rawText: string
    ): {
      replyText: string;
      emotion: ServerAvatarEmotion;
      intensity: number;
      gesture: ServerAvatarGesture;
    } | null => {
      const cleanedRaw = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      if (!cleanedRaw) return null;

      if (cleanedRaw.startsWith('{') || cleanedRaw.startsWith('[')) {
        try {
          const parsed = JSON.parse(cleanedRaw);
          const candidateReply =
            typeof parsed?.reply === 'string'
              ? parsed.reply
              : typeof parsed?.text === 'string'
              ? parsed.text
              : '';
          if (parsed && candidateReply.trim()) {
            return {
              replyText: candidateReply.trim(),
              emotion: normalizeEmotion(parsed.emotion),
              intensity: clampIntensity(parsed.intensity, 0.7),
              gesture: normalizeGesture(parsed.gesture),
            };
          }
          // JSON returned without a usable reply field — force retry/fallback rather than returning raw JSON
          return null;
        } catch {
          // Malformed JSON fragment — reject if it looks like truncated JSON wrapper
          if (cleanedRaw.startsWith('{"reply"') || cleanedRaw.startsWith('{"text"')) {
            return null;
          }
        }
      }

      return {
        replyText: cleanedRaw,
        emotion: 'neutral',
        intensity: 0.5,
        gesture: 'none',
      };
    };

    const waitMs = (ms: number, signal?: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(signal.reason || new DOMException('Aborted', 'AbortError'));
          return;
        }
        const t = setTimeout(resolve, ms);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(t);
            reject(signal.reason || new DOMException('Aborted', 'AbortError'));
          },
          { once: true }
        );
      });

    const attempts: Array<{ model: string; useJsonSchema: boolean; delayMs: number; timeoutMs: number }> = [
      { model: 'gemini-4-hydrogen', useJsonSchema: true, delayMs: 0, timeoutMs: 20000 },
      { model: 'gemini-3.1-flash-lite', useJsonSchema: true, delayMs: 350, timeoutMs: 18000 },
      { model: 'gemini-4-hydrogen', useJsonSchema: true, delayMs: 700, timeoutMs: 18000 },
      { model: 'gemini-3.1-flash-lite', useJsonSchema: false, delayMs: 400, timeoutMs: 15000 },
    ];

    let parsedPayload: {
      replyText: string;
      emotion: ServerAvatarEmotion;
      intensity: number;
      gesture: ServerAvatarGesture;
    } | null = null;
    let lastAttemptError: unknown = null;

    for (let i = 0; i < attempts.length; i += 1) {
      const attempt = attempts[i];
      if (res.writableEnded || res.headersSent) return;

      const attemptControl = createUpstreamAbortControl(res, attempt.timeoutMs);
      try {
        if (attempt.delayMs > 0) {
          await waitMs(attempt.delayMs, attemptControl.signal);
        }

        const attemptInstruction = attempt.useJsonSchema
          ? systemInstruction
          : `${systemInstruction}\nOUTPUT FORMAT: Reply directly with Ātmiya's conversational response text only (do not wrap in JSON or markdown fences).`;

        const response = await ai.models.generateContent({
          model: attempt.model,
          contents,
          config: {
            systemInstruction: attemptInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            ...(attempt.useJsonSchema
              ? {
                  responseMimeType: 'application/json',
                  responseSchema: chatResponseSchema,
                }
              : {}),
            abortSignal: attemptControl.signal,
          },
        });

        const rawModelText = extractResponseText(response);
        const candidatePayload = parseChatPayload(rawModelText);
        if (candidatePayload && candidatePayload.replyText) {
          parsedPayload = candidatePayload;
          break;
        }

        console.warn(
          `/api/chat attempt ${i + 1} (${attempt.model}, schema=${attempt.useJsonSchema}) returned empty payload.`
        );
      } catch (err) {
        if (attemptControl.isClientClosed()) {
          return;
        }
        lastAttemptError = err;
        const parsedErr = parseGeminiError(err);
        if (parsedErr.isQuota || parsedErr.isAuth || parsedErr.isBadRequest) {
          throw err;
        }
        console.warn(
          `/api/chat attempt ${i + 1} (${attempt.model}) failed (${parsedErr.code}): ${parsedErr.message}`
        );
      } finally {
        attemptControl.cleanup();
      }
    }

    if (res.writableEnded || res.headersSent) {
      return;
    }

    if (!parsedPayload || !parsedPayload.replyText.trim()) {
      if (lastAttemptError) {
        throw lastAttemptError;
      }
      return res.status(502).json({
        error: 'EMPTY_RESPONSE',
        message: 'Ātmiya could not form a response right now. Please try again.',
      });
    }

    const { replyText, emotion, intensity, gesture } = parsedPayload;

    res.json({
      reply: replyText,
      emotion,
      intensity,
      gesture,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    if (res.writableEnded || res.headersSent) return;
    const parsed = parseGeminiError(err);
    if (parsed.isQuota || parsed.isTimeout) {
      console.warn(`/api/chat ${parsed.httpStatus} (${parsed.code}): ${parsed.message}`);
    } else {
      console.error('Error in /api/chat:', err);
    }
    if (parsed.retryAfterSeconds) {
      res.setHeader('Retry-After', String(parsed.retryAfterSeconds));
    }
    res.status(parsed.httpStatus).json({
      error: parsed.code,
      message: parsed.message,
      ...(parsed.retryAfterSeconds ? { retryAfterSeconds: parsed.retryAfterSeconds } : {}),
    });
  }
});

// 3. Text-to-Speech (TTS) endpoint using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'API_KEY_MISSING',
        message: 'Gemini API Key is not configured for TTS.',
      });
    }

    const { text, voice = 'Kore', style = 'Warm, natural, friendly companion' } = req.body ?? {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Text is required for TTS.' });
    }

    const safeStyle = typeof style === 'string' && style.trim()
      ? style.trim().slice(0, 120)
      : 'Warm, natural, friendly companion';

    // Clean text for TTS (strip code blocks and markdown symbols for cleaner pronunciation)
    const cleanedText = text
      .replace(/```[\s\S]*?```/g, ' [code snippet omitted for voice] ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#]/g, '')
      .slice(0, 1000); // Reasonable slice for single spoken utterance

    if (!cleanedText.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'No pronounceable text provided.' });
    }

    const validVoices = ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

    const ttsAbort = createUpstreamAbortControl(res, 18000);
    let base64Audio: string | undefined;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanedText,
                speechMetadata: {
                  style: safeStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
          abortSignal: ttsAbort.signal,
        },
      });
      base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } finally {
      ttsAbort.cleanup();
    }

    if (res.writableEnded || res.headersSent) return;

    if (!base64Audio) {
      return res.status(502).json({ error: 'TTS_EMPTY', message: 'No audio data returned by model.' });
    }

    // Unary default is a complete WAV file (audio/wav, 24kHz mono 16-bit)
    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voice: chosenVoice,
    });
  } catch (err: any) {
    if (res.writableEnded || res.headersSent) return;
    const parsed = parseGeminiError(err);

    if (parsed.isQuota) {
      console.warn(
        `/api/tts quota exhausted (429)${parsed.retryAfterSeconds ? `, retryAfter=${parsed.retryAfterSeconds}s` : ''} — client falling back to browser voice.`
      );
      if (parsed.retryAfterSeconds) {
        res.setHeader('Retry-After', String(parsed.retryAfterSeconds));
      }
      return res.status(429).json({
        error: 'TTS_QUOTA_EXCEEDED',
        message: 'Gemini TTS free-tier quota reached. Switched to browser voice fallback.',
        ...(parsed.retryAfterSeconds ? { retryAfterSeconds: parsed.retryAfterSeconds } : {}),
      });
    }

    if (parsed.isTimeout) {
      console.warn(`/api/tts timeout (504): ${parsed.message}`);
    } else {
      console.error('Error in /api/tts:', err);
    }

    res.status(parsed.httpStatus).json({
      error: parsed.code === 'GENERATION_ERROR' ? 'TTS_ERROR' : parsed.code,
      message: parsed.message,
    });
  }
});

// 4. Audio Transcription endpoint using gemini-3.5-transcribe
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'API_KEY_MISSING',
        message: 'Gemini API Key is not configured for transcription.',
      });
    }

    const { audioBase64, mimeType = 'audio/webm' } = req.body ?? {};
    if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'audioBase64 is required.' });
    }

    const safeMimeType =
      typeof mimeType === 'string' && /^audio\/[a-z0-9.+-]+$/i.test(mimeType)
        ? mimeType
        : 'audio/webm';

    const audioPart = {
      inlineData: {
        mimeType: safeMimeType,
        data: audioBase64,
      },
    };

    const transcribeAbort = createUpstreamAbortControl(res, 20000);
    let transcription = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            {
              text: 'Transcribe this spoken audio accurately. The speech may be in Hindi, English, or Hinglish (Hindi in Roman script). Output only the exact transcribed words without extra preamble.',
            },
          ],
        },
        config: {
          abortSignal: transcribeAbort.signal,
        },
      });
      transcription = response.text?.trim() || '';
    } finally {
      transcribeAbort.cleanup();
    }

    if (res.writableEnded || res.headersSent) return;
    res.json({ text: transcription });
  } catch (err: any) {
    if (res.writableEnded || res.headersSent) return;
    const parsed = parseGeminiError(err);
    console.error('Error in /api/transcribe:', parsed.isQuota || parsed.isTimeout ? parsed.message : err);
    if (parsed.retryAfterSeconds) {
      res.setHeader('Retry-After', String(parsed.retryAfterSeconds));
    }
    res.status(parsed.httpStatus).json({
      error: parsed.code === 'GENERATION_ERROR' ? 'TRANSCRIBE_ERROR' : parsed.code,
      message: parsed.message,
    });
  }
});



// Return JSON 404 for unknown API routes before SPA fallback
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'API route not found.' });
});

// Dev / Prod Vite server integration
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const staticRoot = isProduction
    ? path.resolve(__dirname, 'dist')
    : path.resolve(__dirname, 'public');

  // Ensure missing 3D model binaries return 404 instead of SPA index.html
  app.use('/models', (req: Request, res: Response, next) => {
    const relPath = req.path.replace(/^\/+/, '');
    const resolved = path.resolve(staticRoot, 'models', relPath);
    const modelsRoot = path.resolve(staticRoot, 'models');
    if (!resolved.startsWith(modelsRoot) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      return res.status(404).json({
        error: 'MODEL_NOT_FOUND',
        message: '3D model asset not found at /models/' + relPath,
      });
    }
    next();
  });

  if (!isProduction) {
    // In development mode, mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ātmiya Companion Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
