alter table public.ai_profiles
  add column if not exists xai_text_encrypted_api_key text,
  add column if not exists xai_tts_encrypted_api_key text;

create index if not exists ai_profiles_provider_idx on public.ai_profiles(provider);