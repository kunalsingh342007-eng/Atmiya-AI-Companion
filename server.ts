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
  'sad',
  'thinking',
  'confused',
  'surprised',
  'curious',
  'worried',
  'empathetic',
  'excited',
  'calm',
  'disappointed',
  'winking',
  'talking',
] as const;

type ServerAvatarEmotion = (typeof VALID_EMOTIONS)[number];

function normalizeEmotion(value: unknown): ServerAvatarEmotion {
  if (typeof value === 'string' && (VALID_EMOTIONS as readonly string[]).includes(value)) {
    return value as ServerAvatarEmotion;
  }
  return 'neutral';
}

function clampIntensity(value: unknown, fallback = 0.7): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
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

// 1. Health and configuration status endpoint
app.get('/api/status', (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY');
  
  res.json({
    status: 'ok',
    isKeyConfigured,
    model: 'gemini-3.8-flash',
    ttsModel: 'gemini-3.8-flash-lite-tts',
    transcribeModel: 'gemini-3.5-transcribe',
    serverTime: new Date().toISOString(),
    supportedLanguages: ['hi-IN', 'en-IN', 'en-US', 'hinglish'],
    supportedVoices: ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'],
  });
});

// 2. Chat Completion endpoint with memory & personality support
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
      memories = [],
      personality = 'calm',
      language = 'auto',
      userName = '',
    } = req.body ?? {};

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Message text is required.' });
    }

    const trimmedMessage = message.trim().slice(0, 8000);
    const safeHistory = Array.isArray(history) ? history : [];
    const safeMemories = Array.isArray(memories) ? memories : [];
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

    // Build memory context
    const validMemories = safeMemories.filter(
      (m: unknown): m is { category?: string; content: string } =>
        Boolean(m && typeof m === 'object' && typeof (m as any).content === 'string' && (m as any).content.trim())
    );
    let memoryContext = '';
    if (validMemories.length > 0) {
      memoryContext = `\nSAVED USER PREFERENCES & MEMORIES (User-approved personal facts):
${validMemories
  .slice(0, 40)
  .map((m) => `- [${typeof m.category === 'string' ? m.category : 'Fact'}]: ${m.content.trim().slice(0, 400)}`)
  .join('\n')}
Use these memories naturally to personalize your responses, without explicitly reciting "According to my database" or sounding creepy.`;
    }

    // System instruction
    const systemInstruction = `${selectedPersonality}

CRITICAL IDENTITY & BEHAVIOR GUIDELINES:
1. Your name is Ātmiya (Devanagari: आत्मीय). In Sanskrit and Hindi, Ātmiya means someone who is your very own, a close confidant, someone deeply connected to the soul.
2. Transparency: You are a real-time AI companion, not an organic biological human. Be honest about this if asked, but maintain a rich, warm, human-like voice, personality, empathy, and conversational presence. Never pretend to have a physical body or real physical sensor experience in this room unless hardware telemetry is connected.
3. Boundaries: Do not encourage unhealthy emotional dependency, obsessive romantic attachment, or isolation from real-world human connections. Encourage the user's real-life agency, friendships, health, and goals.
4. Voice & Conversational Style:
   - Talk naturally like a real companion in a room.
   - Do not sound like a robotic customer support chatbot.
   - Do not start every message with repetitive filler like "Certainly!", "Hello [User]!", or "As an AI...".
   - Keep answers conversational in length unless the user specifically asks for an essay or detailed lesson.
   - When helping with code (like C++, Python, web), provide clean, modern, well-commented code with concise intuition.
${safeUserName ? `5. The user's name is ${safeUserName}. Use it occasionally and warmly, but do not overuse it every sentence.` : ''}
6. Emotional Expression Selection:
   - Choose the single most authentic facial "emotion" from the schema enum and an "intensity" from 0.0 to 1.0 that matches your reply.
   - Match serious or emotional context responsibly: NEVER pick happy, smile, laughing, excited, or winking when the user shares sadness, stress, grief, failure, worry, or serious struggles — use empathetic, calm, sad, or worried instead.
${languageInstruction}
${memoryContext}
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
      },
      required: ['reply', 'emotion', 'intensity'],
    };

    let rawModelText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: chatResponseSchema,
        },
      });
      rawModelText = response.text || '';
    } catch (modelErr: any) {
      console.warn('Primary model error, using gemini-3.1-flash-lite fallback:', modelErr?.message || 'Unknown error');
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: chatResponseSchema,
        },
      });
      rawModelText = fallbackResponse.text || '';
    }

    let replyText = '';
    let emotion: ServerAvatarEmotion = 'neutral';
    let intensity = 0.7;

    const cleanedRaw = rawModelText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    if (cleanedRaw.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanedRaw);
        if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
          replyText = parsed.reply.trim();
          emotion = normalizeEmotion(parsed.emotion);
          intensity = clampIntensity(parsed.intensity, 0.7);
        }
      } catch {
        // Safe fallback to plain text below
      }
    }

    if (!replyText) {
      replyText = rawModelText.trim();
      emotion = 'neutral';
      intensity = 0.5;
    }

    if (!replyText.trim()) {
      return res.status(502).json({
        error: 'EMPTY_RESPONSE',
        message: 'Ātmiya could not form a response right now. Please try again.',
      });
    }

    // Check if message contains memorable user facts that could be suggested for saving
    let memorySuggestion = null;
    const lowerMsg = trimmedMessage.toLowerCase();
    if (
      lowerMsg.includes('remember that') ||
      lowerMsg.includes('yaad rakhna') ||
      lowerMsg.includes('my favorite') ||
      lowerMsg.includes('mera favourite') ||
      lowerMsg.includes('i prefer') ||
      lowerMsg.includes('i like') ||
      lowerMsg.includes('i am learning') ||
      lowerMsg.includes('i am working on') ||
      lowerMsg.includes('mujhe pasand hai')
    ) {
      memorySuggestion = {
        detected: true,
        candidateText: trimmedMessage,
      };
    }

    res.json({
      reply: replyText,
      emotion,
      intensity,
      timestamp: new Date().toISOString(),
      memorySuggestion,
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'GENERATION_ERROR',
      message: isProd
        ? 'An error occurred while generating a response. Please try again.'
        : err?.message || 'An error occurred while generating response.',
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
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
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
    console.error('Error in /api/tts:', err);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'TTS_ERROR',
      message: isProd ? 'Error generating TTS audio.' : err?.message || 'Error generating TTS audio.',
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
    });

    const transcription = response.text?.trim() || '';
    res.json({ text: transcription });
  } catch (err: any) {
    console.error('Error in /api/transcribe:', err);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'TRANSCRIBE_ERROR',
      message: isProd ? 'Error transcribing audio.' : err?.message || 'Error transcribing audio.',
    });
  }
});

// 5. Memory extraction endpoint (AI-assisted fact detection)
app.post('/api/memories/extract', async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({ error: 'API_KEY_MISSING' });
    }

    const { userText, aiReply } = req.body ?? {};
    if (typeof userText !== 'string' || !userText.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'userText is required' });
    }

    const safeUserText = userText.trim().slice(0, 2000);
    const safeAiReply = typeof aiReply === 'string' ? aiReply.trim().slice(0, 2000) : '';

    const prompt = `Analyze this conversation snippet:
User: "${safeUserText}"
AI: "${safeAiReply}"

Identify if the user explicitly shared any durable personal preferences, ongoing projects, learning goals, or important facts about themselves (e.g. language preference, study focus like C++, favorite things, goals).
DO NOT save passwords, sensitive financial credentials, health medical records, or trivial chit-chat.

Respond in pure JSON matching this structure:
{
  "hasMemory": boolean,
  "memory": {
    "category": "language" | "project" | "preference" | "learning_goal" | "fact",
    "content": "Short, clear summary of what to remember"
  } | null
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawJson = (response.text || '{"hasMemory": false}')
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: any = { hasMemory: false };
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      parsed = { hasMemory: false };
    }
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/memories/extract:', err);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'FAILED',
      message: isProd ? 'Memory extraction failed.' : err?.message || 'Memory extraction failed.',
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
