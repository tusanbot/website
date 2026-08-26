create schema if not exists private;

alter table public.notifications enable row level security;
revoke all on table public.notifications from anon;
grant select, update on table public.notifications to authenticated;

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;

create policy notifications_select_own on public.notifications
for select to authenticated
using ((select auth.uid()) = recipient_id);

create policy notifications_update_own on public.notifications
for update to authenticated
using ((select auth.uid()) = recipient_id)
with check ((select auth.uid()) = recipient_id);

create or replace function private.create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_message text default null,
  p_order_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  insert into public.notifications(recipient_id,type,title,message,order_id,metadata)
  values(p_recipient_id,p_type,p_title,p_message,p_order_id,coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function private.create_notification(uuid,text,text,text,uuid,jsonb) from public, anon, authenticated;

drop function if exists private.notify_order_events() cascade;
create function private.notify_order_events() returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare admin_id uuid;
begin
  if tg_op = 'INSERT' then
    for admin_id in select id from public.profiles where role = 'admin' loop
      perform private.create_notification(admin_id,'new_order','سفارش جدید',
        'یک سفارش جدید ثبت شده است: ' || coalesce(new.tracking_code::text,''),new.id,
        jsonb_build_object('tracking_code',new.tracking_code,'status',new.status));
    end loop;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.user_id is not null then
    perform private.create_notification(new.user_id,'order_status','تغییر وضعیت سفارش',
      'وضعیت سفارش ' || coalesce(new.tracking_code::text,'') || ' به «' || coalesce(new.status::text,'') || '» تغییر کرد.',new.id,
      jsonb_build_object('old_status',old.status,'new_status',new.status,'tracking_code',new.tracking_code));
  end if;
  return new;
end;
$$;

create trigger notifications_order_events
after insert or update of status on public.orders
for each row execute function private.notify_order_events();

revoke all on function private.notify_order_events() from public, anon, authenticated;

drop function if exists private.notify_message_event() cascade;
create function private.notify_message_event() returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare admin_id uuid; recipient uuid;
begin
  if new.sender_role = 'user' then
    for admin_id in select id from public.profiles where role = 'admin' and id is distinct from new.sender_id loop
      perform private.create_notification(admin_id,'new_message','پیام جدید',left(coalesce(new.message,''),180),new.order_id,
        jsonb_build_object('message_id',new.id));
    end loop;
  elsif new.sender_role = 'admin' and new.order_id is not null then
    select user_id into recipient from public.orders where id = new.order_id;
    if recipient is not null and recipient is distinct from new.sender_id then
      perform private.create_notification(recipient,'new_message','پاسخ جدید مدیر',left(coalesce(new.message,''),180),new.order_id,
        jsonb_build_object('message_id',new.id));
    end if;
  end if;
  return new;
end;
$$;

create trigger notifications_message_event
after insert on public.messages
for each row execute function private.notify_message_event();

revoke all on function private.notify_message_event() from public, anon, authenticated;

drop function if exists private.notify_payment_event() cascade;
create function private.notify_payment_event() returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare recipient uuid; title text; body text;
begin
  if new.status is distinct from old.status then
    select user_id into recipient from public.orders where id = new.order_id;
    if recipient is not null then
      title := case when new.status = 'paid' then 'پرداخت با موفقیت انجام شد'
                    when new.status in ('failed','cancelled','expired') then 'وضعیت پرداخت تغییر کرد'
                    else 'وضعیت پرداخت به‌روزرسانی شد' end;
      body := 'وضعیت پرداخت سفارش شما به «' || coalesce(new.status,'') || '» تغییر کرد.';
      perform private.create_notification(recipient,'payment_status',title,body,new.order_id,
        jsonb_build_object('payment_id',new.id,'status',new.status,'method',new.method,'amount',new.amount));
    end if;
  end if;
  return new;
end;
$$;

create trigger notifications_payment_event
after update of status on public.payments
for each row execute function private.notify_payment_event();

revoke all on function private.notify_payment_event() from public, anon, authenticated;
