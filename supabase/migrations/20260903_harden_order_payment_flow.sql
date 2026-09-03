-- Harden the payment -> order -> completion flow.
-- Applied to production Supabase before being committed here.

create or replace function public.admin_review_payment(
  p_payment_id uuid,
  p_action text,
  p_note text default null
)
returns public.payments
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_admin uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_new_status text;
begin
  if v_admin is null or not public.is_admin(v_admin) then raise exception 'فقط مدیر اصلی مجاز است'; end if;
  if p_action not in ('approve','reject') then raise exception 'عملیات نامعتبر است'; end if;
  select * into v_payment from public.payments where id=p_payment_id for update;
  if not found then raise exception 'پرداخت پیدا نشد'; end if;
  select * into v_order from public.orders where id=v_payment.order_id for update;
  if not found then raise exception 'سفارش مرتبط با پرداخت پیدا نشد'; end if;
  if p_action='approve' then
    if v_payment.method<>'card_to_card' or v_payment.gateway<>'manual' then raise exception 'فقط پرداخت کارت‌به‌کارت دستی از این مسیر قابل تأیید است'; end if;
    if v_payment.status<>'awaiting_manual_verification' then raise exception 'فقط پرداخت در انتظار بررسی قابل تأیید است'; end if;
    if v_payment.user_id is distinct from v_order.user_id then raise exception 'مالک پرداخت با سفارش مطابقت ندارد'; end if;
    if v_payment.amount is distinct from v_order.price::bigint then raise exception 'مبلغ پرداخت با مبلغ سفارش مطابقت ندارد'; end if;
    v_new_status:='paid';
  else
    if v_payment.method<>'card_to_card' or v_payment.gateway<>'manual' then raise exception 'فقط پرداخت کارت‌به‌کارت دستی از این مسیر قابل رد است'; end if;
    if v_payment.status not in ('awaiting_manual_verification','pending') then raise exception 'این پرداخت در وضعیت قابل رد نیست'; end if;
    v_new_status:='rejected';
  end if;
  update public.payments set status=v_new_status, paid_at=case when v_new_status='paid' then now() else paid_at end, admin_note=coalesce(p_note,admin_note), updated_at=now() where id=v_payment.id returning * into v_payment;
  return v_payment;
end;
$$;

grant execute on function public.admin_review_payment(uuid,text,text) to authenticated;
grant execute on function public.admin_review_payment(uuid,text,text) to service_role;
revoke execute on function public.admin_review_payment(uuid,text,text) from anon, public;

create or replace function public.validate_manual_payment_transition()
returns trigger language plpgsql security definer set search_path to 'pg_catalog','public' as $$
declare v_order public.orders%rowtype;
begin
  if new.status='paid' and (tg_op='INSERT' or old.status is distinct from 'paid') then
    select * into v_order from public.orders where id=new.order_id for share;
    if not found then raise exception 'سفارش مرتبط با پرداخت پیدا نشد'; end if;
    if new.user_id is distinct from v_order.user_id then raise exception 'مالک پرداخت با سفارش مطابقت ندارد'; end if;
    if new.amount is distinct from v_order.price::bigint then raise exception 'مبلغ پرداخت با مبلغ سفارش مطابقت ندارد'; end if;
    if new.method='card_to_card' and new.gateway='manual' and new.receipt_image_url is null then raise exception 'تأیید پرداخت کارت‌به‌کارت بدون رسید مجاز نیست'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_manual_payment_transition on public.payments;
create trigger trg_validate_manual_payment_transition before insert or update of status on public.payments for each row execute function public.validate_manual_payment_transition();
revoke execute on function public.validate_manual_payment_transition() from anon, authenticated, public;
grant execute on function public.validate_manual_payment_transition() to service_role;

create or replace function public.record_order_history()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_history(order_id,old_status,new_status,description) values(new.id,old.status,new.status,coalesce(new.completion_note,'تغییر وضعیت سفارش'));
  elsif new.processing_status is distinct from old.processing_status then
    insert into public.order_history(order_id,old_status,new_status,description) values(new.id,old.processing_status,new.processing_status,coalesce(new.completion_note,'تغییر وضعیت عملیاتی سفارش'));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_processing_history on public.orders;
create trigger trg_order_processing_history after update of status, processing_status on public.orders for each row execute function public.record_order_history();

create or replace function public.update_staff_order_status(p_order_id uuid,p_status text,p_note text default null)
returns boolean language plpgsql security definer set search_path to 'pg_catalog','public' as $$
declare v_uid uuid:=auth.uid(); v_order public.orders%rowtype; v_admin boolean; v_order_manager boolean;
begin
 if v_uid is null then raise exception 'ورود الزامی است'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if v_order.id is null then raise exception 'سفارش پیدا نشد'; end if;
 v_admin:=public.is_admin(); v_order_manager:=public.is_staff_member(v_uid,'order_manager');
 if not v_admin and not v_order_manager then raise exception 'شما دسترسی لازم برای تغییر وضعیت سفارش را ندارید'; end if;
 if not v_admin and v_order.assigned_staff_id is distinct from v_uid then raise exception 'این سفارش به شما تخصیص نیافته است'; end if;
 if p_status not in ('registered','pending_payment','checking','need_documents','processing','ready','completed','cancelled','rejected') then raise exception 'وضعیت نامعتبر است'; end if;
 if not v_admin and p_status in ('registered','pending_payment','completed','cancelled','rejected') then raise exception 'این وضعیت فقط توسط مدیر اصلی قابل ثبت است'; end if;
 if not v_admin and p_status<>v_order.status and not ((v_order.status='checking' and p_status in ('processing','need_documents')) or (v_order.status='need_documents' and p_status='processing') or (v_order.status='processing' and p_status in ('ready','need_documents'))) then raise exception 'تغییر وضعیت از % به % برای مدیر سفارشات مجاز نیست',v_order.status,p_status; end if;
 if p_status in ('processing','completed') and not exists(select 1 from public.payments p where p.order_id=v_order.id and p.user_id=v_order.user_id and p.status='paid') then raise exception 'ادامه یا تکمیل سفارش قبل از تأیید پرداخت مجاز نیست'; end if;
 if p_status='completed' and v_order.processing_status<>'result_submitted' then raise exception 'برای تکمیل، ابتدا نتیجه سفارش باید ارسال و سفارش آماده تحویل شده باشد'; end if;
 update public.orders set status=p_status,processing_status=case when p_status='processing' then 'in_progress' when p_status='ready' then 'result_submitted' when p_status='completed' then 'completed' when p_status in ('cancelled','rejected') then p_status when p_status in ('registered','pending_payment') then 'awaiting_payment' when p_status='checking' then case when processing_status='awaiting_payment' then 'under_review' else processing_status end when p_status='need_documents' then 'need_documents' else processing_status end,result_submitted_at=case when p_status='ready' then coalesce(result_submitted_at,now()) else result_submitted_at end,completed_at=case when p_status='completed' then now() else completed_at end,completion_note=coalesce(p_note,completion_note),assignment_status=case when p_status='completed' then 'completed' when p_status in ('cancelled','rejected') then p_status else assignment_status end,updated_at=now() where id=v_order.id;
 if p_status='completed' then update public.order_commission_ledger set status='approved',approved_at=coalesce(approved_at,now()) where order_id=v_order.id and status='pending'; end if;
 return true;
end;
$$;

grant execute on function public.update_staff_order_status(uuid,text,text) to authenticated;
grant execute on function public.update_staff_order_status(uuid,text,text) to service_role;
revoke execute on function public.update_staff_order_status(uuid,text,text) from anon, public;
