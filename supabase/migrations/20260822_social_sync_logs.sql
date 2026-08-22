create table if not exists public.social_sync_logs (
  id uuid primary key default gen_random_uuid(),
  success boolean not null default false,
  received integer not null default 0,
  synced integer not null default 0,
  skipped integer not null default 0,
  error_message text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists social_sync_logs_created_at_idx
  on public.social_sync_logs (created_at desc);

alter table public.social_sync_logs enable row level security;
