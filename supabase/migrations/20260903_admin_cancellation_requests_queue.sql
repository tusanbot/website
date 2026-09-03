create or replace function public.admin_list_order_cancellation_requests(p_status text default 'pending')
returns table (
  id uuid,
  order_id uuid,
  user_id uuid,
  status text,
  reason text,
  admin_note text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  tracking_code text,
  order_status text,
  price integer,
  customer_name text,
  customer_phone text,
  service_title text,
  service_icon text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'فقط مدیر اصلی مجاز است';
  end if;
  if lower(coalesce(p_status, 'pending')) not in ('pending','approved','rejected','all') then
    raise exception 'فیلتر وضعیت نامعتبر است';
  end if;
  return query
  select
    r.id,
    r.order_id,
    r.user_id,
    r.status,
    r.reason,
    r.admin_note,
    r.requested_at,
    r.reviewed_at,
    o.tracking_code,
    o.status,
    o.price,
    p.full_name,
    p.phone,
    s.title,
    s.icon
  from public.order_cancellation_requests r
  join public.orders o on o.id = r.order_id
  left join public.profiles p on p.id = r.user_id
  left join public.services s on s.id = o.service_id
  where lower(coalesce(p_status, 'pending')) = 'all'
     or r.status = lower(coalesce(p_status, 'pending'))
  order by case when r.status = 'pending' then 0 else 1 end, r.requested_at desc;
end;
$$;

revoke all on function public.admin_list_order_cancellation_requests(text) from anon, public;
grant execute on function public.admin_list_order_cancellation_requests(text) to authenticated, service_role;
