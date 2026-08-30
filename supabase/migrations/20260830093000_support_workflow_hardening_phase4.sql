-- Phase 4: support workflow hardening
-- Prevent duplicate open general support conversations per customer.
create unique index if not exists support_conversations_one_open_general_per_user
  on public.support_conversations(user_id)
  where status = 'open' and order_id is null;

-- Restrict staff lookup to the requesting staff member or an admin.
create or replace function public.get_support_agent(p_staff_id uuid)
returns table(staff_id uuid, full_name text, staff_code text, role_code text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id,
         p.full_name,
         coalesce(a.staff_code, 'OP-' || upper(substr(replace(a.id::text,'-',''),1,6))),
         r.code
  from public.profiles p
  join public.staff_role_assignments a on a.user_id=p.id and a.status='approved'
  join public.staff_roles r on r.id=a.role_id and r.code in ('order_manager','support_operator')
  where p.id=p_staff_id
    and (p_staff_id = auth.uid() or public.is_staff_member(auth.uid(),'admin'))
  limit 1
$$;

-- Make starting support idempotent for general queues and preserve order ownership.
create or replace function public.start_support_conversation(p_order_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_staff uuid;
  v_mode text;
begin
  if v_uid is null then raise exception 'ورود الزامی است'; end if;

  if p_order_id is not null and not exists(
    select 1 from public.orders where id=p_order_id and user_id=v_uid
  ) then
    raise exception 'این سفارش متعلق به شما نیست';
  end if;

  if p_order_id is null then
    select id into v_id
    from public.support_conversations
    where user_id=v_uid and status='open' and order_id is null
    order by updated_at desc
    limit 1;
    if v_id is not null then return v_id; end if;
  end if;

  select assigned_staff_id into v_staff
  from public.orders where id=p_order_id;

  v_mode := case when p_order_id is not null and v_staff is not null then 'order' else 'queue' end;

  insert into public.support_conversations(user_id,order_id,assignment_mode,assigned_staff_id,assigned_at,status)
  values(v_uid,p_order_id,v_mode,v_staff,case when v_staff is not null then now() end,'open')
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    select id into v_id
    from public.support_conversations
    where user_id=v_uid and status='open' and order_id is null
    order by updated_at desc limit 1;
    if v_id is null then raise; end if;
    return v_id;
end;
$$;

-- Ensure callers cannot directly mutate support messages; all sends go through the RPC.
revoke update on public.support_messages from authenticated;

-- Keep RPC execution available to authenticated users; the functions enforce membership/role internally.
grant execute on function public.get_support_agent(uuid) to authenticated;
grant execute on function public.start_support_conversation(uuid) to authenticated;
grant execute on function public.send_support_message(uuid,text) to authenticated;
grant execute on function public.claim_support_conversation(uuid) to authenticated;
grant execute on function public.close_support_conversation(uuid) to authenticated;
