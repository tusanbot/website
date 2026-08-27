-- Central notification system for admin and customer events
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  order_id uuid references public.orders(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

create policy "users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users can mark own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "service role manages notifications"
  on public.notifications for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.mark_notification_read(notification_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.notifications
  set is_read = true, read_at = coalesce(read_at, now())
  where id = notification_id and user_id = auth.uid();
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security invoker
set search_path = public
as $$
  update public.notifications
  set is_read = true, read_at = coalesce(read_at, now())
  where user_id = auth.uid() and is_read = false;
$$;
