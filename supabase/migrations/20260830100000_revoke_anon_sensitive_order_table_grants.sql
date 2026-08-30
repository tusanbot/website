-- These tables contain customer/order/support data and are never intended
-- to be accessed directly by anonymous clients. RLS policies target the
-- authenticated role; remove the unnecessary table-level privileges too.
revoke all on table public.orders from anon;
revoke all on table public.order_files from anon;
revoke all on table public.messages from anon;
revoke all on table public.notifications from anon;
