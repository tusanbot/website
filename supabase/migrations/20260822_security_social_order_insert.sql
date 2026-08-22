-- Security hardening: social_orders must not be writable directly by authenticated clients.
-- The server API validates the service, quantity and calculated price, then uses
-- the service-role client to create the order. Users retain read access to their own orders.

drop policy if exists "social orders user insert own" on public.social_orders;

-- Keep the table protected by RLS. There is intentionally no authenticated INSERT
-- policy here; the service-role API is the only creation path.
alter table public.social_orders enable row level security;
