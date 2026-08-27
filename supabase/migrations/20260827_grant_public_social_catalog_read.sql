-- Allow the public social-services catalog to be read by the browser client.
-- The catalog page uses the anon Supabase role.

grant select on public.social_services_public to anon, authenticated;
grant select on public.social_platforms to anon, authenticated;
grant select on public.social_categories to anon, authenticated;
grant select on public.social_services to anon, authenticated;

notify pgrst, 'reload schema';
