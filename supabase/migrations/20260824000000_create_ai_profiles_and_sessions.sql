create extension if not exists pgcrypto;

create table if not exists public.ai_profiles (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  encrypted_api_key text not null,
  provider text not null default 'gemini',
  model text not null default 'gemini-2.5-flash',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  ai_profile_id uuid not null references public.ai_profiles(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz
);

create index if not exists ai_sessions_profile_idx on public.ai_sessions(ai_profile_id);
create index if not exists ai_sessions_expires_idx on public.ai_sessions(expires_at);

alter table public.ai_profiles enable row level security;
alter table public.ai_sessions enable row level security;

revoke all on public.ai_profiles from anon, authenticated;
revoke all on public.ai_sessions from anon, authenticated;
