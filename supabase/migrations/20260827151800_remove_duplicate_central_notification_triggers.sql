drop trigger if exists trg_notify_message on public.messages;
drop trigger if exists trg_notify_order_created on public.orders;
drop trigger if exists trg_notify_order_status on public.orders;
drop trigger if exists trg_notify_payment on public.payments;

create or replace function private.notify_payment_event()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  recipient uuid;
  admin_id uuid;
begin
  if tg_op = 'INSERT' then
    for admin_id in select id from public.profiles where role = 'admin' loop
      perform private.create_notification(
        admin_id,
        'payment_status',
        'پرداخت جدید',
        'یک پرداخت برای سفارش ثبت شده است.',
        new.order_id,
        jsonb_build_object('payment_id',new.id,'status',new.status,'method',new.method,'amount',new.amount)
      );
    end loop;
  elsif new.status is distinct from old.status then
    select user_id into recipient from public.orders where id = new.order_id;
    if recipient is not null then
      perform private.create_notification(
        recipient,
        case when new.status = 'paid' then 'payment_success' else 'payment_status' end,
        case
          when new.status = 'paid' then 'پرداخت با موفقیت انجام شد'
          when new.status in ('failed','cancelled','expired') then 'وضعیت پرداخت تغییر کرد'
          else 'وضعیت پرداخت به‌روزرسانی شد'
        end,
        'وضعیت پرداخت سفارش شما به «' || coalesce(new.status,'') || '» تغییر کرد.',
        new.order_id,
        jsonb_build_object('payment_id',new.id,'old_status',old.status,'status',new.status,'method',new.method,'amount',new.amount)
      );
    end if;
    if new.status = 'paid' then
      for admin_id in select id from public.profiles where role = 'admin' loop
        perform private.create_notification(
          admin_id,'payment_success','پرداخت موفق','پرداخت یک سفارش با موفقیت تأیید شد.',new.order_id,
          jsonb_build_object('payment_id',new.id,'amount',new.amount)
        );
      end loop;
    end if;
  end if;

  if new.receipt_image_url is distinct from old.receipt_image_url and new.receipt_image_url is not null then
    for admin_id in select id from public.profiles where role = 'admin' loop
      perform private.create_notification(
        admin_id,'payment_receipt','رسید پرداخت جدید','برای یک سفارش رسید پرداخت جدید ثبت شده است.',new.order_id,
        jsonb_build_object('payment_id',new.id,'method',new.method)
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_payment_event on public.payments;
create trigger notifications_payment_event
  after insert or update of status, receipt_image_url on public.payments
  for each row execute function private.notify_payment_event();
