-- Support chat is a private authenticated feature. Keep the REST API from
-- exposing these tables to anonymous clients even if RLS configuration changes.
revoke all on table public.support_conversations from anon;
revoke all on table public.support_messages from anon;

-- The timestamp trigger is internal and must not be callable through PostgREST.
revoke execute on function public.touch_support_conversation() from public;
revoke execute on function public.touch_support_conversation() from anon;
revoke execute on function public.touch_support_conversation() from authenticated;
