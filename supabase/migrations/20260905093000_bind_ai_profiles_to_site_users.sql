alter table public.ai_profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.ai_profiles
  drop constraint if exists ai_profiles_key_hash_key;

create unique index if not exists ai_profiles_user_id_unique_idx
  on public.ai_profiles(user_id)
  where user_id is not null;

create unique index if not exists ai_profiles_anonymous_key_hash_unique_idx
  on public.ai_profiles(key_hash)
  where user_id is null;

create index if not exists ai_profiles_user_id_idx
  on public.ai_profiles(user_id);
