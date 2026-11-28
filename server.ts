import express, { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const isServerlessRuntime = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION
);

if (!isServerlessRuntime) {
  try {
    dotenv.config();
  } catch {
    // Ignore missing/unreadable .env files
  }
}

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

function sanitizeLogText(text: string): string {
  return text
    .replace(/AIza[0-9A-Za-z_-]{16,}/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:key|api_key|token|auth)=)[^&\s]+/gi, '$1[REDACTED]')
    .slice(0, 200);
}

export function logServerError(
  route: string,
  category: string,
  err: unknown,
  status?: number
): void {
  const anyErr = err as { name?: unknown; code?: unknown; message?: unknown } | null | undefined;
  const errorName = typeof anyErr?.name === 'string' && anyErr.name ? anyErr.name : 'Error';
  const errorCode =
    typeof anyErr?.code === 'string' || typeof anyErr?.code === 'number'
      ? String(anyErr.code)
      : undefined;
  const rawMessage =
    typeof anyErr?.message === 'string' && anyErr.message
      ? anyErr.message
      : typeof err === 'string' && err
      ? err
      : 'Unexpected server error';

  console.error(
    JSON.stringify({
      level: 'error',
      route,
      category,
      ...(status ? { status } : {}),
      errorName,
      ...(errorCode ? { errorCode } : {}),
      message: sanitizeLogText(rawMessage),
    })
  );
}

export function logServerWarn(route: string, category: string, message: string, status?: number): void {
  console.warn(
    JSON.stringify({
      level: 'warn',
      route,
      category,
      ...(status ? { status } : {}),
      message: sanitizeLogText(message),
    })
  );
}

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Baseline security headers compatible with iframe hosting
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Optional explicit CORS allowlist for split-origin deployments (no wildcard)
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  } else if (origin && req.method === 'OPTIONS' && req.path.startsWith('/api/')) {
    return res.status(403).json({
      error: 'CORS_ORIGIN_DENIED',
      message: 'Cross-origin request is not permitted.',
    });
  }
  next();
});

// Dependency-free sliding-window per-IP rate limiter for AI endpoints
interface RateLimitBucket {
  timestamps: number[];
}

const activeRateLimitStores: Array<Map<string, RateLimitBucket>> = [];

export function resetRateLimitersForTests(): void {
  for (const store of activeRateLimitStores) {
    store.clear();
  }
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  routeLabel: string;
}) {
  const store = new Map<string, RateLimitBucket>();
  activeRateLimitStores.push(store);
  let lastPruneMs = Date.now();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const cutoff = now - options.windowMs;

    if (now - lastPruneMs > options.windowMs && store.size > 200) {
      lastPruneMs = now;
      for (const [key, bucket] of store.entries()) {
        bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
        if (bucket.timestamps.length === 0) {
          store.delete(key);
        }
      }
    }

    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : Array.isArray(forwarded)
        ? forwarded[0]?.trim()
        : '';
    const clientIp = req.ip || forwardedIp || req.socket?.remoteAddress || 'unknown';

    const bucket = store.get(clientIp) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= options.maxRequests) {
      const oldest = bucket.timestamps[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      logServerWarn(options.routeLabel, 'RATE_LIMITED', `Rate limit reached (${options.maxRequests}/${Math.round(options.windowMs / 1000)}s).`, 429);
      return res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many requests in a short window. Please wait a moment and try again.',
        retryAfterSeconds: retryAfterSec,
      });
    }

    bucket.timestamps.push(now);
    store.set(clientIp, bucket);
    next();
  };
}

const chatRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30, routeLabel: '/api/chat' });
const ttsRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30, routeLabel: '/api/tts' });
const transcribeRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 15, routeLabel: '/api/transcribe' });

// Middleware for parsing JSON with ample limit for audio blobs
app.use(express.json({ limit: '25mb' }));

function isValidGeminiApiKey(apiKey: string | undefined): apiKey is string {
  if (!apiKey) return false;
  const trimmed = apiKey.trim();
  if (!trimmed) return false;
  const placeholders = new Set(['MY_GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY', 'REPLACE_ME']);
  return !placeholders.has(trimmed);
}

// Helper to get GoogleGenAI client
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!isValidGeminiApiKey(apiKey)) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
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
        'Gemini API quota limit reached for this key. Please retry shortly or check billing/quota for GEMINI_API_KEY in your server environment variables.',
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
      message:
        'Gemini API access was rejected. Please verify GEMINI_API_KEY in your server environment variables.',
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

function createAbortError(message: string, name: 'TimeoutError' | 'AbortError'): Error {
  if (typeof DOMException === 'function') {
    return new DOMException(message, name) as unknown as Error;
  }
  const err = new Error(message);
  err.name = name;
  return err;
}

function createUpstreamAbortControl(res: Response, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  let clientClosed = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(createAbortError(`Upstream request timed out after ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  const onResClose = () => {
    if (!res.writableEnded) {
      clientClosed = true;
      controller.abort(createAbortError('Client closed request', 'AbortError'));
    }
  };
  res.on('close', onResClose);

  return {
    signal: controller.signal,
    isTimedOut: () => timedOut,
    isClientClosed: () => clientClosed,
    cleanup: () => {
      clearTimeout(timer);
      if (typeof res.off === 'function') {
        res.off('close', onResClose);
      } else if (typeof res.removeListener === 'function') {
        res.removeListener('close', onResClose);
      }
    },
  };
}

// 1. Health and configuration status endpoint
app.get('/api/status', (_req: Request, res: Response) => {
  try {
    const isKeyConfigured = isValidGeminiApiKey(process.env.GEMINI_API_KEY);
    if (!isKeyConfigured) {
      logServerWarn('/api/status', 'API_KEY_MISSING', 'GEMINI_API_KEY is missing or placeholder.', 200);
    }

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
  } catch (err) {
    logServerError('/api/status', 'STATUS_ERROR', err, 500);
    if (!res.writableEnded && !res.headersSent) {
      res.status(500).json({
        error: 'STATUS_ERROR',
        message: 'Unable to check server configuration status.',
      });
    }
  }
});

// 2. Chat Completion endpoint with personality & language support
app.post('/api/chat', chatRateLimiter, async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      logServerWarn('/api/chat', 'API_KEY_MISSING', 'GEMINI_API_KEY is missing or invalid.', 503);
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

    const rawTrimmedMessage = message.trim();
    if (rawTrimmedMessage.length > 8000) {
      return res.status(400).json({
        error: 'INPUT_TOO_LONG',
        message: 'Message text exceeds the 8,000-character limit.',
      });
    }

    const trimmedMessage = rawTrimmedMessage;
    const safeHistory = Array.isArray(history) ? history.slice(-30) : [];
    const allowedLanguages = new Set(['auto', 'en', 'hi', 'hinglish']);
    const safePersonality = typeof personality === 'string' ? personality : 'calm';
    const safeLanguage =
      typeof language === 'string' && allowedLanguages.has(language) ? language : 'auto';
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
- "gesture": one of [${VALID_GESTURES.join(', ')}] ("none" for normal turns, or a subtle physical cue like "gentle_nod", "head_tilt", "open_palm", or "wave" for greetings).

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
          reject(signal.reason || createAbortError('Aborted', 'AbortError'));
          return;
        }
        const t = setTimeout(resolve, ms);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(t);
            reject(signal.reason || createAbortError('Aborted', 'AbortError'));
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

        logServerWarn(
          '/api/chat',
          'EMPTY_MODEL_ATTEMPT',
          `Attempt ${i + 1} (${attempt.model}, schema=${attempt.useJsonSchema}) returned empty payload.`
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
        logServerWarn(
          '/api/chat',
          parsedErr.code,
          `Attempt ${i + 1} (${attempt.model}) failed: ${parsedErr.message}`,
          parsedErr.httpStatus
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
      logServerWarn('/api/chat', parsed.code, parsed.message, parsed.httpStatus);
    } else {
      logServerError('/api/chat', parsed.code, { name: err?.name, code: parsed.code, message: parsed.message }, parsed.httpStatus);
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
app.post('/api/tts', ttsRateLimiter, async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      logServerWarn('/api/tts', 'API_KEY_MISSING', 'GEMINI_API_KEY is missing or invalid.', 503);
      return res.status(503).json({
        error: 'API_KEY_MISSING',
        message: 'Gemini API Key is not configured for TTS.',
      });
    }

    const { text, voice = 'Kore', style = 'Warm, natural, friendly companion' } = req.body ?? {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Text is required for TTS.' });
    }

    if (text.trim().length > 8000) {
      return res.status(400).json({
        error: 'INPUT_TOO_LONG',
        message: 'TTS input exceeds the maximum allowed character limit.',
      });
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
    const chosenVoice = typeof voice === 'string' && validVoices.includes(voice) ? voice : 'Kore';

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
      logServerWarn(
        '/api/tts',
        'TTS_QUOTA_EXCEEDED',
        `Quota exhausted${parsed.retryAfterSeconds ? `, retryAfter=${parsed.retryAfterSeconds}s` : ''}`,
        429
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

    const category = parsed.code === 'GENERATION_ERROR' ? 'TTS_ERROR' : parsed.code;
    if (parsed.isTimeout) {
      logServerWarn('/api/tts', category, parsed.message, parsed.httpStatus);
    } else {
      logServerError('/api/tts', category, { name: err?.name, code: category, message: parsed.message }, parsed.httpStatus);
    }

    res.status(parsed.httpStatus).json({
      error: category,
      message: parsed.message,
    });
  }
});

// 4. Audio Transcription endpoint using gemini-3.5-transcribe
app.post('/api/transcribe', transcribeRateLimiter, async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      logServerWarn('/api/transcribe', 'API_KEY_MISSING', 'GEMINI_API_KEY is missing or invalid.', 503);
      return res.status(503).json({
        error: 'API_KEY_MISSING',
        message: 'Gemini API Key is not configured for transcription.',
      });
    }

    const { audioBase64, mimeType = 'audio/webm' } = req.body ?? {};
    if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'audioBase64 is required.' });
    }

    if (audioBase64.length > 18 * 1024 * 1024) {
      return res.status(413).json({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Audio recording is too large for a single transcription request.',
      });
    }

    const normalizedBase64 = audioBase64
      .trim()
      .replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, '')
      .replace(/\s+/g, '');

    if (!normalizedBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalizedBase64)) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'audioBase64 must be valid base64-encoded audio data.',
      });
    }

    const safeMimeType =
      typeof mimeType === 'string' && /^audio\/[a-z0-9.+-]+$/i.test(mimeType)
        ? mimeType
        : 'audio/webm';

    const audioPart = {
      inlineData: {
        mimeType: safeMimeType,
        data: normalizedBase64,
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
    const category = parsed.code === 'GENERATION_ERROR' ? 'TRANSCRIBE_ERROR' : parsed.code;
    if (parsed.isQuota || parsed.isTimeout) {
      logServerWarn('/api/transcribe', category, parsed.message, parsed.httpStatus);
    } else {
      logServerError(
        '/api/transcribe',
        category,
        { name: err?.name, code: category, message: parsed.message },
        parsed.httpStatus
      );
    }
    if (parsed.retryAfterSeconds) {
      res.setHeader('Retry-After', String(parsed.retryAfterSeconds));
    }
    res.status(parsed.httpStatus).json({
      error: category,
      message: parsed.message,
    });
  }
});



// Return JSON 404 for unknown API routes before SPA fallback
app.all('/api/*', (req: Request, res: Response) => {
  const route = req.originalUrl ? req.originalUrl.split('?')[0] : req.path || '/api';
  logServerWarn(route, 'NOT_FOUND', `Unhandled API route ${req.method} ${route}`, 404);
  res.status(404).json({ error: 'NOT_FOUND', message: 'API route not found.' });
});

// Global Express error handler: always return structured JSON HTTP errors and safe logs
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  if (res.writableEnded || res.headersSent) {
    return;
  }
  const route = req.originalUrl ? req.originalUrl.split('?')[0] : req.path || '/api';
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    logServerError(route, 'INVALID_JSON', err, 400);
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'Request body must be valid JSON.',
    });
  }
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    logServerError(route, 'PAYLOAD_TOO_LARGE', err, 413);
    return res.status(413).json({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload exceeds the maximum allowed size.',
    });
  }
  const status =
    typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  const category = status === 500 ? 'UNHANDLED_EXPRESS_ERROR' : 'REQUEST_ERROR';
  logServerError(route, category, err, status);
  return res.status(status).json({
    error: status === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
    message: 'The server encountered an error while processing your request.',
  });
});

function resolveRuntimeDir(): string {
  try {
    if (typeof import.meta?.url === 'string' && import.meta.url.startsWith('file:')) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Fallback to cwd if import.meta.url cannot be resolved
  }
  return process.cwd();
}

// Dev / Prod Vite server integration (local/standalone mode only; bypassed in serverless)
async function startServer() {
  const runtimeDir = resolveRuntimeDir();
  const isProduction = process.env.NODE_ENV === 'production';
  const staticRoot = isProduction
    ? path.resolve(runtimeDir, 'dist')
    : path.resolve(runtimeDir, 'public');

  // Ensure missing 3D model binaries return 404 instead of SPA index.html
  app.use('/models', (req: Request, res: Response, next) => {
    const relPath = req.path.replace(/^\/+/, '');
    const resolved = path.resolve(staticRoot, 'models', relPath);
    const modelsRoot = path.resolve(staticRoot, 'models');
    if (
      (resolved !== modelsRoot && !resolved.startsWith(modelsRoot + path.sep)) ||
      !fs.existsSync(resolved) ||
      fs.statSync(resolved).isDirectory()
    ) {
      return res.status(404).json({
        error: 'MODEL_NOT_FOUND',
        message: '3D model asset not found at /models/' + relPath,
      });
    }
    next();
  });

  if (!isProduction) {
    // Dynamically import Vite only in local development so serverless bundles do not pull Vite
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production standalone mode, serve dist folder
    app.use(express.static(path.resolve(runtimeDir, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(runtimeDir, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ātmiya Companion Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!isServerlessRuntime && process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT) {
  startServer().catch((err) => {
    logServerError('startup', 'SERVER_START_ERROR', err, 500);
    process.exit(1);
  });
}

export default app;
