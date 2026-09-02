-- Bank account rejection/edit/resubmission workflow
alter table public.staff_bank_accounts
  add column if not exists rejection_reason text;

create or replace function public.staff_update_bank_account(
  p_account_id uuid,
  p_account_title text,
  p_iban text,
  p_account_number text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.staff_bank_accounts
    where id = p_account_id and user_id = auth.uid()
  ) then
    raise exception 'حساب بانکی پیدا نشد یا دسترسی ندارید';
  end if;

  update public.staff_bank_accounts
  set account_title = trim(p_account_title),
      iban = trim(p_iban),
      account_number = nullif(trim(p_account_number), ''),
      status = 'pending',
      rejection_reason = null,
      verified_by = null,
      verified_at = null,
      updated_at = now()
  where id = p_account_id and user_id = auth.uid();

  return true;
end;
$$;

grant execute on function public.staff_update_bank_account(uuid,text,text,text) to authenticated;

create or replace function public.admin_set_bank_account_status(
  p_account_id uuid,
  p_status text,
  p_rejection_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff_member(auth.uid(),'admin') then
    raise exception 'دسترسی غیرمجاز';
  end if;
  if p_status not in ('approved','rejected','pending') then
    raise exception 'وضعیت نامعتبر است';
  end if;
  if p_status = 'rejected' and nullif(trim(p_rejection_reason), '') is null then
    raise exception 'دلیل رد حساب الزامی است';
  end if;

  update public.staff_bank_accounts
  set status = p_status,
      rejection_reason = case when p_status='rejected' then trim(p_rejection_reason) else null end,
      verified_by = case when p_status='approved' then auth.uid() else null end,
      verified_at = case when p_status='approved' then now() else null end,
      updated_at = now()
  where id = p_account_id;

  if not found then raise exception 'حساب بانکی پیدا نشد'; end if;
  return true;
end;
$$;

grant execute on function public.admin_set_bank_account_status(uuid,text,text) to authenticated;
