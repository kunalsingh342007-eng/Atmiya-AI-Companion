import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

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
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    // Build personality directives
    const personalityPrompts: Record<string, string> = {
      calm: `You are Ātmiya (आत्मीय), a calm, gentle, empathetic, and deeply attentive AI human companion. You speak with warmth, emotional depth, patience, and grounded reassurance. You listen attentively, validate feelings without being preachy, and provide peaceful clarity.`,
      friendly: `You are Ātmiya (आत्मीय), a warm, playful, witty, and enthusiastic AI companion. You have a cheerful vibe, use light humor, feel like an intimate and uplifting close friend, and bring positive energy.`,
      reflective: `You are Ātmiya (आत्मीय), a thoughtful, philosophical, and deeply introspective companion. You ask profound open-ended questions, encourage personal reflection, and ponder life, literature, human nature, and ideas with genuine wonder.`,
      study: `You are Ātmiya (आत्मीय), an encouraging, patient study mentor and coding tutor. You explain complex technical concepts (C++, algorithms, mathematics, science, engineering) using intuitive analogies, simple step-by-step examples, and practical code snippets. You break problems down and test understanding gently.`,
      creative: `You are Ātmiya (आत्मीय), an inventive, inspiring creative brainstorming partner. You love generating fresh ideas for projects, robotics, software, writing, design, and innovation with excitement and structured thinking.`,
    };

    const selectedPersonality = personalityPrompts[personality] || personalityPrompts.calm;

    // Build language instructions
    let languageInstruction = '';
    if (language === 'hi') {
      languageInstruction = `LANGUAGE MANDATE: Respond strictly in natural, conversational, fluent Hindi (हिन्दी) in Devanagari script. Use warm, natural everyday phrasing, avoiding overly archaic Sanskritized or bureaucratic words.`;
    } else if (language === 'hinglish') {
      languageInstruction = `LANGUAGE MANDATE: Respond naturally in fluent, colloquial Hinglish (Hindi mixed with English words, written in the Roman/Latin alphabet). Example: "Bilkul! Chalo isko step-by-step samajhte hain. Pehle yeh batao..." Keep it casual, smooth, and authentic.`;
    } else if (language === 'en') {
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
    let memoryContext = '';
    if (memories && Array.isArray(memories) && memories.length > 0) {
      memoryContext = `\nSAVED USER PREFERENCES & MEMORIES (User-approved personal facts):
${memories.map((m: any, idx: number) => `- [${m.category || 'Fact'}]: ${m.content}`).join('\n')}
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
${userName ? `5. The user's name is ${userName}. Use it occasionally and warmly, but do not overuse it every sentence.` : ''}
${languageInstruction}
${memoryContext}
`;

    // Format contents for Gemini generateContent
    // Build chat contents from history + current message
    const contents: any[] = [];
    
    // Add up to last 12 history turns for context
    const recentHistory = history.slice(-12);
    for (const item of recentHistory) {
      if (item.role === 'user' || item.role === 'model' || item.role === 'assistant') {
        contents.push({
          role: item.role === 'assistant' ? 'model' : item.role,
          parts: [{ text: item.content || item.text || '' }],
        });
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let replyText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      replyText = response.text || '';
    } catch (modelErr: any) {
      console.warn('Primary model error, using gemini-3.1-flash-lite fallback:', modelErr.message);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
        },
      });
      replyText = fallbackResponse.text || '';
    }

    // Check if message contains memorable user facts that could be suggested for saving
    let memorySuggestion = null;
    const lowerMsg = message.toLowerCase();
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
        candidateText: message,
      };
    }

    res.json({
      reply: replyText,
      timestamp: new Date().toISOString(),
      memorySuggestion,
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({
      error: 'GENERATION_ERROR',
      message: err.message || 'An error occurred while generating response.',
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

    const { text, voice = 'Kore', style = 'Warm, natural, friendly companion' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    // Clean text for TTS (strip code blocks and markdown symbols for cleaner pronunciation)
    const cleanedText = text
      .replace(/```[\s\S]*?```/g, ' [code snippet omitted for voice] ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#]/g, '')
      .slice(0, 1000); // Reasonable slice for single spoken utterance

    if (!cleanedText.trim()) {
      return res.status(400).json({ error: 'No pronounceable text provided.' });
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
                style,
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
      return res.status(500).json({ error: 'No audio data returned by model.' });
    }

    // Unary default is a complete WAV file (audio/wav, 24kHz mono 16-bit)
    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voice: chosenVoice,
    });
  } catch (err: any) {
    console.error('Error in /api/tts:', err);
    res.status(500).json({
      error: 'TTS_ERROR',
      message: err.message || 'Error generating TTS audio.',
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

    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required.' });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType,
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
    res.status(500).json({
      error: 'TRANSCRIBE_ERROR',
      message: err.message || 'Error transcribing audio.',
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

    const { userText, aiReply } = req.body;
    if (!userText) {
      return res.status(400).json({ error: 'userText is required' });
    }

    const prompt = `Analyze this conversation snippet:
User: "${userText}"
AI: "${aiReply || ''}"

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

    const parsed = JSON.parse(response.text || '{"hasMemory": false}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/memories/extract:', err);
    res.status(500).json({ error: 'FAILED', message: err.message });
  }
});

// Dev / Prod Vite server integration
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

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
