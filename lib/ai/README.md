# AI profile infrastructure

The AI tools use a shared Gemini profile session. The browser submits a Gemini API key only to `/api/ai/session`; the server validates it, stores only a SHA-256 key hash plus an AES-GCM encrypted copy, and issues an HttpOnly session cookie.

Required server environment variable:

- `AI_PROFILE_ENCRYPTION_KEY`: a long random secret used to encrypt stored Gemini API keys.

The Supabase service-role key must remain server-only. AI profile/session tables have RLS enabled and no Data API grants; server routes access them through the service role.
