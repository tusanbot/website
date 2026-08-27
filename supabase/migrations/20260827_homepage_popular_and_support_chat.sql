alter table public.services add column if not exists is_popular boolean not null default false;
create index if not exists services_popular_active_idx on public.services (is_popular, is_active, created_at desc);

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_conversations_user_idx on public.support_conversations(user_id, updated_at desc);
create index if not exists support_conversations_status_idx on public.support_conversations(status, updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('user','admin')),
  message text not null check (char_length(trim(message)) between 1 and 4000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_conversation_idx on public.support_messages(conversation_id, created_at);
create index if not exists support_messages_unread_idx on public.support_messages(is_read, created_at);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists support_conversations_user_select on public.support_conversations;
create policy support_conversations_user_select on public.support_conversations for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists support_conversations_user_insert on public.support_conversations;
create policy support_conversations_user_insert on public.support_conversations for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists support_conversations_user_update on public.support_conversations;
create policy support_conversations_user_update on public.support_conversations for update to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')) with check (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages for select to authenticated using (exists (select 1 from public.support_conversations c where c.id = conversation_id and (c.user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))));

drop policy if exists support_messages_insert on public.support_messages;
create policy support_messages_insert on public.support_messages for insert to authenticated with check (sender_id = (select auth.uid()) and exists (select 1 from public.support_conversations c where c.id = conversation_id and (c.user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))));

drop policy if exists support_messages_update on public.support_messages;
create policy support_messages_update on public.support_messages for update to authenticated using (exists (select 1 from public.support_conversations c where c.id = conversation_id and (c.user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')))) with check (exists (select 1 from public.support_conversations c where c.id = conversation_id and (c.user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))));

create or replace function public.touch_support_conversation() returns trigger language plpgsql set search_path = public as $$ begin update public.support_conversations set updated_at = now() where id = new.conversation_id; return new; end; $$;
drop trigger if exists support_messages_touch_conversation on public.support_messages;
create trigger support_messages_touch_conversation after insert on public.support_messages for each row execute function public.touch_support_conversation();

alter table public.support_conversations replica identity full;
alter table public.support_messages replica identity full;
