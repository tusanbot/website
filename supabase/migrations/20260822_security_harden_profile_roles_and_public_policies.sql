-- Security hardening: prevent self-escalation and reduce RLS policy exposure.

-- Profiles: users may edit their profile fields, but never the authorization role.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, national_code, birth_date, address, avatar_url, theme_config) ON public.profiles TO authenticated;

-- Keep role assignment exclusively server/admin controlled.
DROP POLICY IF EXISTS "User can update own profile" ON public.profiles;
CREATE POLICY "User can update own profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Tighten policies that were unnecessarily granted to PUBLIC.
ALTER POLICY "Admin can update orders" ON public.orders TO authenticated;
ALTER POLICY "Admin can view all orders" ON public.orders TO authenticated;
ALTER POLICY "User create orders" ON public.orders TO authenticated;
ALTER POLICY "User see own orders" ON public.orders TO authenticated;

ALTER POLICY "Admin can insert order history" ON public.order_history TO authenticated;

ALTER POLICY "Admins can manage announcements" ON public.services_announcements TO authenticated;

ALTER POLICY "Admins can update site settings" ON public.site_settings TO authenticated;

ALTER POLICY "social_categories_admin_all" ON public.social_categories TO authenticated;
ALTER POLICY "social_categories_public_read" ON public.social_categories TO anon, authenticated;
ALTER POLICY "social_platforms_admin_all" ON public.social_platforms TO authenticated;
ALTER POLICY "social_platforms_public_read" ON public.social_platforms TO anon, authenticated;
ALTER POLICY "social_services_admin_all" ON public.social_services TO authenticated;
ALTER POLICY "social_services_public_read" ON public.social_services TO anon, authenticated;
ALTER POLICY "social_orders_admin_all" ON public.social_orders TO authenticated;
ALTER POLICY "social_orders_user_read" ON public.social_orders TO authenticated;

-- These tables intentionally have no client policies. RLS remains deny-by-default.
-- They are used through privileged server-side paths only.
COMMENT ON TABLE public.financial_transactions IS 'RLS enabled; no client policies. Access is server/admin controlled.';
COMMENT ON TABLE public.registrations IS 'RLS enabled; no client policies. Access is server/admin controlled.';
COMMENT ON TABLE public.social_sync_logs IS 'RLS enabled; no client policies. Access is server-side only.';
