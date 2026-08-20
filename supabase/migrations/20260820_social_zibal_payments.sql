-- Social services payment fields for Zibal integration.
-- Run once in Supabase SQL Editor.

alter table public.social_orders
    add column if not exists payment_provider text,
    add column if not exists payment_track_id text,
    add column if not exists payment_reference text,
    add column if not exists paid_at timestamptz;

create unique index if not exists uq_social_orders_payment_track_id
on public.social_orders(payment_track_id)
where payment_track_id is not null;

create index if not exists idx_social_orders_payment_reference
on public.social_orders(payment_reference)
where payment_reference is not null;

notify pgrst, 'reload schema';
