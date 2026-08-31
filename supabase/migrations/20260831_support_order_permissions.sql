-- Fix staff visibility and support conversation permissions.
-- The FK relationships already exist in the production database; this migration records
-- the policy/function fixes applied there.

create policy "Staff can read customer profiles"
on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or is_staff_member(auth.uid(),'admin')
  or is_staff_member(auth.uid(),'support_operator')
  or is_staff_member(auth.uid(),'order_manager')
);

drop policy if exists support_conversations_select on public.support_conversations;
create policy support_conversations_select
on public.support_conversations
for select to authenticated
using (
  user_id = auth.uid()
  or is_staff_member(auth.uid(),'admin')
  or (is_staff_member(auth.uid(),'support_operator') and status='open')
  or assigned_staff_id = auth.uid()
);

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select
on public.support_messages
for select to authenticated
using (
  exists (
    select 1
    from public.support_conversations c
    where c.id = support_messages.conversation_id
      and (
        c.user_id = auth.uid()
        or is_staff_member(auth.uid(),'admin')
        or (is_staff_member(auth.uid(),'support_operator') and c.status='open')
        or c.assigned_staff_id = auth.uid()
      )
  )
);

create or replace function public.send_support_message(p_conversation_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_uid uuid:=auth.uid(); v_role text; v_id uuid; v_status text; v_owner uuid; v_assigned uuid;
begin
  if v_uid is null then raise exception 'احراز هویت لازم است'; end if;
  if length(trim(p_message))=0 or length(p_message)>4000 then raise exception 'متن پیام نامعتبر است'; end if;
  select status,user_id,assigned_staff_id into v_status,v_owner,v_assigned
  from public.support_conversations where id=p_conversation_id for update;
  if v_status is null then raise exception 'گفتگو پیدا نشد'; end if;
  if v_status<>'open' then raise exception 'این گفتگو بسته شده است'; end if;
  if v_owner=v_uid then v_role:='user';
  elsif public.is_staff_member(v_uid,'admin') then v_role:='admin';
  elsif public.is_staff_member(v_uid,'support_operator') then v_role:='staff';
  elsif public.is_staff_member(v_uid,'order_manager') and v_assigned=v_uid then v_role:='staff';
  else raise exception 'شما عضو این گفتگو نیستید'; end if;
  if v_role='staff' and public.is_staff_member(v_uid,'support_operator') and v_assigned is null then
    update public.support_conversations
    set assigned_staff_id=v_uid,assigned_at=coalesce(assigned_at,now()),assignment_mode=case when order_id is null then 'queue' else 'order' end
    where id=p_conversation_id and assigned_staff_id is null;
  end if;
  insert into public.support_messages(conversation_id,sender_id,sender_role,message)
  values(p_conversation_id,v_uid,v_role,trim(p_message)) returning id into v_id;
  update public.support_conversations set updated_at=now() where id=p_conversation_id;
  return v_id;
end;
$$;

grant execute on function public.send_support_message(uuid,text) to authenticated;
