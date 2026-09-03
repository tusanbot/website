-- Lock down sensitive order RPCs to authenticated/service-role callers.
-- The functions keep their internal authorization checks; this removes unnecessary
-- direct anonymous execution from the exposed public schema.

revoke execute on function public.get_staff_orders() from public;
revoke execute on function public.get_staff_orders() from anon;
grant execute on function public.get_staff_orders() to authenticated, service_role;

revoke execute on function public.get_staff_order_detail(uuid) from public;
revoke execute on function public.get_staff_order_detail(uuid) from anon;
grant execute on function public.get_staff_order_detail(uuid) to authenticated, service_role;

revoke execute on function public.send_staff_order_message(uuid, text) from public;
revoke execute on function public.send_staff_order_message(uuid, text) from anon;
grant execute on function public.send_staff_order_message(uuid, text) to authenticated, service_role;

revoke execute on function public.get_customer_order_detail(uuid) from public;
revoke execute on function public.get_customer_order_detail(uuid) from anon;
grant execute on function public.get_customer_order_detail(uuid) to authenticated, service_role;

revoke execute on function public.update_staff_order_status(uuid, text, text) from public;
revoke execute on function public.update_staff_order_status(uuid, text, text) from anon;
grant execute on function public.update_staff_order_status(uuid, text, text) to authenticated, service_role;

revoke execute on function public.get_order_files_for_current_user(uuid) from public;
revoke execute on function public.get_order_files_for_current_user(uuid) from anon;
grant execute on function public.get_order_files_for_current_user(uuid) to authenticated, service_role;
