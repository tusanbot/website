-- Restrict SECURITY DEFINER functions that are not intended to be called
-- directly through the public Supabase RPC surface.

REVOKE EXECUTE ON FUNCTION public.blog_admin_analytics(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_child_service_parent_form() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_service_parent_form_from_custom_form() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.blog_admin_analytics(integer) TO service_role;
