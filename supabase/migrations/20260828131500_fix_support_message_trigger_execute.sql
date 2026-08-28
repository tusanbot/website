-- Required by the support_messages INSERT path.
-- The security hardening migration revoked this privilege and caused RLS failures
-- when authenticated users attempted to send messages.
grant execute on function public.touch_support_conversation() to authenticated;
revoke execute on function public.touch_support_conversation() from anon;
