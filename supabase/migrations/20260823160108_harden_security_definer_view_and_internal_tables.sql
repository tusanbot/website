-- Harden the public catalog view so its underlying RLS is evaluated as the querying role.
alter view public.social_services_public set (security_invoker = true);

-- These tables are server-side/internal. RLS remains enabled and there are intentionally
-- no anon/authenticated policies. Remove Data API table privileges as defense in depth.
revoke all on table public.api_rate_limits from anon, authenticated, public;
revoke all on table public.financial_transactions from anon, authenticated, public;
revoke all on table public.registrations from anon, authenticated, public;
revoke all on table public.social_sync_logs from anon, authenticated, public;
