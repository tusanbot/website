-- Harden SECURITY DEFINER RPC execution without breaking intentional client flows.
-- Public blog view recording remains executable because it is intentionally anonymous.
-- Blog view-count aggregation is server/admin-only and must not be exposed through PostgREST.

ALTER FUNCTION public.blog_post_record_view(uuid, uuid)
  SET search_path = pg_catalog, public, private;
ALTER FUNCTION public.blog_post_view_counts()
  SET search_path = pg_catalog, public, private;

ALTER FUNCTION public.claim_support_conversation(uuid)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.close_support_conversation(uuid)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_my_staff_bank_accounts()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_support_agent(uuid)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.request_order_assignment(uuid)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.request_staff_settlement(uuid, bigint)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.send_support_message(uuid, text)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.start_support_conversation(uuid)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.submit_staff_review(uuid, smallint, text, text[], text[])
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.submit_support_review(uuid, smallint, text, text[], text[])
  SET search_path = pg_catalog, public;

REVOKE EXECUTE ON FUNCTION public.blog_post_view_counts() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blog_post_record_view(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_support_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_support_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_staff_bank_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_agent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_order_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_staff_settlement(uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_support_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_support_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_staff_review(uuid, smallint, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_support_review(uuid, smallint, text, text[], text[]) TO authenticated;
