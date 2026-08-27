-- Allow the public social-services catalog view to read active catalog rows
-- without inheriting the base-table RLS policies.
-- The view exposes only customer-safe fields and must remain filtered to active rows.

alter view public.social_services_public
    set (security_invoker = false, security_barrier = true);

grant select on public.social_services_public to anon, authenticated;

notify pgrst, 'reload schema';
