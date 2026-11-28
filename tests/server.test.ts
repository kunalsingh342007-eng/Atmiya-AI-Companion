import assert from 'node:assert/strict';
import http from 'node:http';
import { after, beforeEach, describe, it } from 'node:test';
import express from 'express';

// Configure deterministic environment before importing server module
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGIN = 'https://app.atmiya.test';
process.env.GEMINI_API_KEY = '';

const serverModule = await import('../server');
const apiIndexModule = await import('../api/index');
const { api } = await import('../src/services/api');

const { app, createRateLimiter, resetRateLimitersForTests } = serverModule;
const vercelHandler = apiIndexModule.default;

async function startTestServer(handler: http.RequestListener): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const srv = http.createServer(handler);
  await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
  const address = srv.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind ephemeral test port');
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => srv.close((e) => (e ? reject(e) : resolve()))),
  };
}

describe('Server API, Security Headers, CORS, Rate Limiting & Client API', () => {
  let baseUrl = '';
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    resetRateLimitersForTests();
    api.resetTtsCooldown();
    process.env.GEMINI_API_KEY = '';
  });

  after(async () => {
    if (closeServer) {
      await closeServer();
    }
  });

  it('boots via Vercel handler /api/index.ts and exposes hardened headers on /api/status', async () => {
    const started = await startTestServer(vercelHandler);
    baseUrl = started.baseUrl;
    closeServer = started.close;

    const res = await fetch(`${baseUrl}/api/status`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('x-powered-by'), null);

    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.isKeyConfigured, false);
    assert.equal(typeof body.model, 'string');
    assert.equal(Array.isArray(body.supportedVoices), true);
  });

  it('enforces explicit CORS allowlist and rejects disallowed preflights with 403', async () => {
    const allowed = await fetch(`${baseUrl}/api/chat`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://app.atmiya.test' },
    });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.atmiya.test');

    const denied = await fetch(`${baseUrl}/api/chat`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example.com' },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    const deniedJson = (await denied.json()) as Record<string, unknown>;
    assert.equal(deniedJson.error, 'CORS_ORIGIN_DENIED');
  });

  it('validates chat, tts, transcribe inputs and fails safely when GEMINI_API_KEY is missing', async () => {
    // Missing key returns safe 503 without exposing secrets
    const missingKeyChat = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello Atmiya' }),
    });
    assert.equal(missingKeyChat.status, 503);
    const missingJson = (await missingKeyChat.json()) as Record<string, unknown>;
    assert.equal(missingJson.error, 'API_KEY_MISSING');

    // Provide dummy key to test downstream input validation guards
    process.env.GEMINI_API_KEY = 'dummy-nonempty-test-key-value';

    const emptyChat = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    assert.equal(emptyChat.status, 400);
    assert.equal(((await emptyChat.json()) as any).error, 'INVALID_INPUT');

    const longChat = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'a'.repeat(8001) }),
    });
    assert.equal(longChat.status, 400);
    assert.equal(((await longChat.json()) as any).error, 'INPUT_TOO_LONG');

    const emptyTts = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    });
    assert.equal(emptyTts.status, 400);

    const longTts = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'b'.repeat(8001) }),
    });
    assert.equal(longTts.status, 400);
    assert.equal(((await longTts.json()) as any).error, 'INPUT_TOO_LONG');

    const badTranscribe = await fetch(`${baseUrl}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: '!!!not-valid-base64!!!', mimeType: 'audio/webm' }),
    });
    assert.equal(badTranscribe.status, 400);
    assert.equal(((await badTranscribe.json()) as any).error, 'INVALID_INPUT');

    const unknownApi = await fetch(`${baseUrl}/api/nonexistent`);
    assert.equal(unknownApi.status, 404);
    assert.equal(((await unknownApi.json()) as any).error, 'NOT_FOUND');
  });

  it('enforces sliding-window rate limits with 429 + Retry-After and recovers cleanly', async () => {
    const miniApp = express();
    const limiter = createRateLimiter({ windowMs: 120, maxRequests: 2, routeLabel: '/api/test' });
    miniApp.get('/ping', limiter, (_req, res) => res.json({ ok: true }));

    const mini = await startTestServer(miniApp);
    try {
      const r1 = await fetch(`${mini.baseUrl}/ping`);
      const r2 = await fetch(`${mini.baseUrl}/ping`);
      const r3 = await fetch(`${mini.baseUrl}/ping`);
      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);
      assert.equal(r3.status, 429);
      assert.ok(Number(r3.headers.get('retry-after')) >= 1);
      const r3Json = (await r3.json()) as Record<string, unknown>;
      assert.equal(r3Json.error, 'RATE_LIMITED');

      await new Promise((r) => setTimeout(r, 150));
      const r4 = await fetch(`${mini.baseUrl}/ping`);
      assert.equal(r4.status, 200);
    } finally {
      await mini.close();
    }
  });

  it('client api.sendMessage normalizes structured reply & retries transient empty responses; TTS enters cooldown on 429', async () => {
    const origFetch = globalThis.fetch;
    let chatAttempts = 0;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/chat')) {
        chatAttempts += 1;
        if (chatAttempts === 1) {
          return new Response(JSON.stringify({ reply: '   ', timestamp: new Date().toISOString() }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            reply: 'Namaste! Ready to help.',
            emotion: 'HAPPY',
            intensity: 1.5,
            gesture: 'tilt',
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.endsWith('/api/tts')) {
        return new Response(
          JSON.stringify({ error: 'TTS_QUOTA_EXCEEDED', message: 'Quota reached', retryAfterSeconds: 120 }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;

    try {
      const chatRes = await api.sendMessage({
        message: 'Hi',
        history: [],
        personality: 'calm',
        language: 'auto',
      });
      assert.equal(chatAttempts, 2);
      assert.equal(chatRes.reply, 'Namaste! Ready to help.');
      assert.equal(chatRes.emotion, 'happy');
      assert.equal(chatRes.intensity, 1);
      assert.equal(chatRes.gesture, 'head_tilt');

      await assert.rejects(
        () => api.generateTTS({ text: 'Hello', voice: 'Kore' }),
        (err: any) => err?.status === 429 && err?.code === 'TTS_QUOTA_EXCEEDED'
      );
      assert.equal(api.isTtsInCooldown(), true);

      await assert.rejects(
        () => api.generateTTS({ text: 'Hello again', voice: 'Kore' }),
        (err: any) => err?.code === 'TTS_QUOTA_COOLDOWN'
      );
    } finally {
      globalThis.fetch = origFetch;
      api.resetTtsCooldown();
    }
  });
});
