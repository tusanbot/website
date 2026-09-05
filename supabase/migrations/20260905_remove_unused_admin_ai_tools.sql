-- The public AI architecture uses per-user Gemini credentials and the admin writer
-- uses the Tusan-owned server credential. Dedicated per-tool admin credentials
-- were not needed, so remove the unused storage table.
drop table if exists public.ai_tools;
