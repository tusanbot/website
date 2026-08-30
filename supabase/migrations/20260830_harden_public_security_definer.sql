-- Security hardening: this RPC records private blog view telemetry and is not a public API.
-- Keep it inaccessible to both anonymous and browser-authenticated clients.
REVOKE EXECUTE ON FUNCTION public.blog_post_record_view(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.blog_post_record_view(uuid, uuid) FROM authenticated;
