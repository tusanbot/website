alter table public.social_orders add column if not exists idempotency_key text;

create unique index if not exists social_orders_user_id_idempotency_key_uq
  on public.social_orders (user_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists payments_one_active_per_order_uq
  on public.payments (order_id)
  where status in ('pending', 'redirected');

create index if not exists social_orders_user_id_created_at_idx
  on public.social_orders (user_id, created_at desc);
