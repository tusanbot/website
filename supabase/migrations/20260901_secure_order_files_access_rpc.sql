create or replace function public.get_order_files_for_current_user(p_order_id uuid)
returns setof public.order_files
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid := auth.uid(); v_allowed boolean := false;
begin
  if v_uid is null then raise exception 'ورود الزامی است'; end if;
  select exists(
    select 1 from public.orders o
    where o.id=p_order_id
      and (o.user_id=v_uid or o.assigned_staff_id=v_uid or public.is_admin())
  ) into v_allowed;
  if not v_allowed then raise exception 'دسترسی به مدارک این سفارش مجاز نیست'; end if;
  return query
    select f.* from public.order_files f
    where f.order_id=p_order_id
    order by f.created_at asc;
end; $$;
revoke all on function public.get_order_files_for_current_user(uuid) from public;
grant execute on function public.get_order_files_for_current_user(uuid) to authenticated;
