# Security Summary

This summary reflects the security audit and hardening applied across the Ātmiya AI Companion application before production verification.

## Fixed & Hardened Controls

- **Server-Side Secret Isolation (`server.ts`)**: `GEMINI_API_KEY` is read exclusively in the Node/Express server and Vercel serverless wrapper (`api/index.ts`). No client-side bundle code references `GEMINI_API_KEY` or passes API secrets in browser headers or URLs. Safe diagnostic logs sanitize any accidental key or bearer tokens before writing to stdout/stderr.
- **Abuse & Rate-Limit Protection (`server.ts`)**: Added a sliding-window per-IP rate limiter (`createRateLimiter`) across `/api/chat` (30 req/min), `/api/tts` (30 req/min), and `/api/transcribe` (15 req/min) returning HTTP `429` with `Retry-After` headers. Proxy client IP resolution is enabled via `app.set('trust proxy', 1)`.
- **Input & Payload Validation (`server.ts`)**: Enforced bounded string lengths (`<= 8000` characters) on `/api/chat` and `/api/tts`, conversation history window capping (`slice(-30)`), strict base64 validation with optional audio data-URI prefix stripping on `/api/transcribe`, and JSON error responses (`400`/`404`/`503`) that never leak stack traces or environment configuration.
- **CORS Allowlist & Security Headers (`server.ts`, `.env.example`)**: Removed `X-Powered-By`, added `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`, enforced explicit origin checks via `ALLOWED_ORIGIN` (no wildcard `*`), and rejected unauthorized cross-origin `OPTIONS /api/*` preflight requests with `403 CORS_ORIGIN_DENIED`.
- **Static `/models` Traversal Guard (`server.ts`)**: Hardened path containment validation with directory-separator boundary checks (`modelsRoot + path.sep`) so malformed paths or missing binaries return JSON `404 MODEL_NOT_FOUND` rather than exposing sibling directories or SPA HTML.
- **Local Import & Asset URL Sanitization (`src/services/storage.ts`, `src/components/Wardrobe/WardrobeScreen.tsx`)**: Validated imported/saved profile images and avatar asset paths (`sanitizeProfileAvatarUrl`, `sanitizeSafeAssetUrl`) to reject `javascript:` or non-image `data:` URIs and cleared dead `/avatars/atmiya.png` references.

## PoC Verification

All security and functional checks were verified using automated regression tests (`npm test`), TypeScript type checking (`npm run lint`), production Vite bundling (`npm run build`), and live HTTP `curl` probes against the running server:

1. **Missing Key & Secret Isolation**: Requesting `POST /api/chat` without `GEMINI_API_KEY` returns HTTP `503` (`API_KEY_MISSING`) with zero key material or stack details in body or logs; scanning `src/` and `dist/` confirms no API keys are bundled in frontend assets.
2. **CORS Preflight Enforcement**: `OPTIONS /api/chat` with an allowed origin returns `204` with matching `Access-Control-Allow-Origin`; an untrusted origin returns `403` (`CORS_ORIGIN_DENIED`).
3. **Input Bounds & Traversal Checks**: Oversized chat/TTS payloads (`8001` chars) and malformed transcription base64 payloads return `400`; `GET /models/../package.json` and `GET /models/missing.glb` return `404 MODEL_NOT_FOUND`.
4. **Rate Limiting Enforcement**: Exceeding the configured window threshold triggers HTTP `429 RATE_LIMITED` with a numeric `Retry-After` header and recovers once the sliding window expires.
5. **Import Sanitization**: `storage.importData` strips `javascript:` and `data:text/html` avatar URLs while preserving valid `https:` and `data:image/*` images.
