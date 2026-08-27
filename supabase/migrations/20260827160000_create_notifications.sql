create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  order_id uuid references public.orders(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

create policy "users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_order_id uuid default null
) returns uuid
language sql
security definer
set search_path = public
as $$
  insert into public.notifications(user_id, type, title, body, order_id)
  values (p_user_id, p_type, p_title, p_body, p_order_id)
  returning id;
$$;

revoke all on function public.create_notification(uuid, text, text, text, uuid) from public;
grant execute on function public.create_notification(uuid, text, text, text, uuid) to service_role;
