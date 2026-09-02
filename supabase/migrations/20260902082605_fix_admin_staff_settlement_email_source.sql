create or replace function public.admin_list_staff_settlements(p_status text default null)
returns table(
  id uuid,
  staff_id uuid,
  bank_account_id uuid,
  amount bigint,
  fee_amount bigint,
  net_amount bigint,
  status text,
  admin_note text,
  requested_at timestamptz,
  processed_at timestamptz,
  processed_by uuid,
  staff_name text,
  staff_email text,
  iban text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null
     or not exists (
       select 1
       from public.profiles p
       where p.id = auth.uid()
         and p.role = 'admin'
     ) then
    raise exception 'دسترسی غیرمجاز';
  end if;

  return query
  select
    s.id,
    s.staff_id,
    s.bank_account_id,
    s.amount,
    s.fee_amount,
    s.net_amount,
    s.status,
    s.admin_note,
    s.requested_at,
    s.processed_at,
    s.processed_by,
    coalesce(p.full_name, 'کاربر')::text,
    coalesce(u.email, '')::text,
    b.iban::text
  from public.staff_settlements s
  join public.profiles p on p.id = s.staff_id
  left join auth.users u on u.id = s.staff_id
  join public.staff_bank_accounts b on b.id = s.bank_account_id
  where p_status is null or s.status = p_status
  order by s.requested_at desc;
end;
$function$;
