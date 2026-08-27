create or replace function public.notify_all_admins(p_type text, p_title text, p_message text, p_order_id uuid, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(recipient_id,type,title,message,order_id,metadata)
  select id,p_type,p_title,p_message,p_order_id,coalesce(p_metadata,'{}'::jsonb)
  from public.profiles where role='admin';
end; $$;

create or replace function public.notify_order_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_all_admins('new_order','سفارش جدید','یک سفارش جدید ثبت شد.',new.id,jsonb_build_object('tracking_code',new.tracking_code));
  return new;
end; $$;

create or replace function public.notify_order_status_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications(recipient_id,type,title,message,order_id,metadata)
    values (new.user_id,'order_status_changed','تغییر وضعیت سفارش','وضعیت سفارش شما تغییر کرد.',new.id,jsonb_build_object('old_status',old.status,'new_status',new.status,'tracking_code',new.tracking_code));
  end if;
  return new;
end; $$;

create or replace function public.notify_payment_events()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' then
    perform public.notify_all_admins('payment_status','پرداخت جدید','یک پرداخت برای سفارش ثبت شد.',new.order_id,jsonb_build_object('payment_id',new.id,'status',new.status,'method',new.method,'amount',new.amount));
  elsif new.status is distinct from old.status then
    if new.status='paid' then
      insert into public.notifications(recipient_id,type,title,message,order_id,metadata)
      values(new.user_id,'payment_success','پرداخت موفق','پرداخت سفارش شما با موفقیت تأیید شد.',new.order_id,jsonb_build_object('payment_id',new.id,'amount',new.amount));
      perform public.notify_all_admins('payment_success','پرداخت موفق','پرداخت یک سفارش با موفقیت تأیید شد.',new.order_id,jsonb_build_object('payment_id',new.id,'amount',new.amount));
    else
      insert into public.notifications(recipient_id,type,title,message,order_id,metadata)
      values(new.user_id,'payment_status','تغییر وضعیت پرداخت','وضعیت پرداخت سفارش شما تغییر کرد.',new.order_id,jsonb_build_object('payment_id',new.id,'old_status',old.status,'new_status',new.status));
    end if;
  end if;
  if new.receipt_image_url is distinct from old.receipt_image_url and new.receipt_image_url is not null then
    perform public.notify_all_admins('receipt_uploaded','رسید پرداخت جدید','برای یک سفارش رسید پرداخت بارگذاری شد.',new.order_id,jsonb_build_object('payment_id',new.id));
  end if;
  return new;
end; $$;

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sender_role='admin' then
    insert into public.notifications(recipient_id,type,title,message,order_id,metadata)
    select o.user_id,'new_message','پیام جدید',left(coalesce(new.message,''),180),new.order_id,jsonb_build_object('message_id',new.id)
    from public.orders o where o.id=new.order_id and o.user_id is not null;
  else
    insert into public.notifications(recipient_id,type,title,message,order_id,metadata)
    select p.id,'new_message','پیام جدید',left(coalesce(new.message,''),180),new.order_id,jsonb_build_object('message_id',new.id)
    from public.profiles p where p.role='admin';
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_order_created on public.orders;
create trigger trg_notify_order_created after insert on public.orders for each row execute function public.notify_order_created();
drop trigger if exists trg_notify_order_status on public.orders;
create trigger trg_notify_order_status after update of status on public.orders for each row execute function public.notify_order_status_changed();
drop trigger if exists trg_notify_payment on public.payments;
create trigger trg_notify_payment after insert or update of status,receipt_image_url on public.payments for each row execute function public.notify_payment_events();
drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message after insert on public.messages for each row execute function public.notify_new_message();
