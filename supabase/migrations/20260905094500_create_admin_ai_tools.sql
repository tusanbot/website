create table if not exists public.ai_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  provider text not null default 'gemini',
  model text not null default 'gemini-2.5-flash',
  encrypted_api_key text not null,
  active boolean not null default true,
  rate_limit integer not null default 30 check (rate_limit between 1 and 10000),
  system_prompt text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists ai_tools_active_idx on public.ai_tools(active);
create index if not exists ai_tools_created_by_idx on public.ai_tools(created_by);
alter table public.ai_tools enable row level security;
revoke all on public.ai_tools from anon, authenticated;
