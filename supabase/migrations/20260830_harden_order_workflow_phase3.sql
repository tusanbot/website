-- Phase 3: enforce payment-before-assignment and strict order processing transitions.
-- Browser clients must use audited SECURITY DEFINER RPCs for these mutations.

CREATE OR REPLACE FUNCTION public.request_order_assignment(p_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_uid uuid:=auth.uid(); v_id uuid; v_service uuid; v_comm numeric; v_order public.orders%rowtype;
begin
 if v_uid is null or not public.is_staff_member(v_uid,'order_manager') then raise exception 'این عملیات مخصوص مدیر سفارشات تأییدشده است'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if v_order.id is null then raise exception 'سفارش پیدا نشد'; end if;
 if v_order.assignment_status not in ('unassigned','pending_approval') then raise exception 'این سفارش در وضعیت قابل تخصیص نیست'; end if;
 if v_order.status not in ('checking','processing','ready') or not exists (select 1 from public.payments p where p.order_id=v_order.id and p.user_id=v_order.user_id and p.status='paid') then raise exception 'تخصیص سفارش قبل از تأیید پرداخت مجاز نیست'; end if;
 v_service:=v_order.service_id;
 select commission_percent into v_comm from public.staff_service_access where user_id=v_uid and service_id=v_service and status='approved';
 if v_comm is null then raise exception 'شما برای انجام این خدمت مجوز ندارید؛ ابتدا تأیید مدیر اصلی لازم است'; end if;
 insert into public.order_staff_requests(order_id,staff_user_id,requested_by,status,commission_percent) values(p_order_id,v_uid,v_uid,'pending',v_comm)
 on conflict(order_id,staff_user_id) do update set status='pending',commission_percent=excluded.commission_percent,updated_at=now(),approved_by=null,approved_at=null returning id into v_id;
 update public.orders set assignment_status='pending_approval',updated_at=now() where id=p_order_id and assignment_status in ('unassigned','pending_approval');
 return v_id;
end;$function$;

CREATE OR REPLACE FUNCTION public.approve_order_assignment(p_request_id uuid,p_approve boolean,p_commission numeric DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid:=auth.uid(); v_req public.order_staff_requests%rowtype; v_order public.orders%rowtype; v_comm numeric; v_amount bigint; v_ledger_amount bigint;
begin
 if v_uid is null or not public.is_staff_member(v_uid,'admin') then raise exception 'فقط مدیر اصلی می‌تواند تخصیص سفارش را تأیید کند'; end if;
 select * into v_req from public.order_staff_requests where id=p_request_id for update;
 if v_req.id is null then raise exception 'درخواست پیدا نشد'; end if;
 if v_req.status<>'pending' then raise exception 'فقط درخواست‌های در انتظار تأیید قابل بررسی هستند'; end if;
 select * into v_order from public.orders where id=v_req.order_id for update;
 if v_order.id is null then raise exception 'سفارش پیدا نشد'; end if;
 if not p_approve then
   update public.order_staff_requests set status='rejected',approved_by=v_uid,approved_at=now(),updated_at=now() where id=v_req.id;
   update public.orders set assignment_status='unassigned',assigned_staff_id=null,assigned_at=null,assigned_by=null,processing_status=case when processing_status='awaiting_payment' then processing_status else 'awaiting_assignment' end,updated_at=now() where id=v_req.order_id and assigned_staff_id=v_req.staff_user_id;
   return true;
 end if;
 if v_order.status not in ('checking','processing','ready') or not exists (select 1 from public.payments p where p.order_id=v_order.id and p.user_id=v_order.user_id and p.status='paid') then raise exception 'تخصیص سفارش قبل از تأیید پرداخت مجاز نیست'; end if;
 v_comm:=coalesce(p_commission,v_req.commission_percent);
 if v_comm<0 or v_comm>100 then raise exception 'درصد کارمزد نامعتبر است'; end if;
 if v_order.assignment_status not in ('unassigned','pending_approval') then raise exception 'این سفارش دیگر آماده تخصیص نیست'; end if;
 v_amount:=coalesce(v_order.price,0); v_ledger_amount:=round(v_amount*v_comm/100.0);
 update public.order_staff_requests set status='approved',commission_percent=v_comm,approved_by=v_uid,approved_at=now(),updated_at=now() where id=v_req.id;
 update public.orders set assigned_staff_id=v_req.staff_user_id,assignment_status='assigned',assigned_at=now(),assigned_by=v_uid,commission_percent=v_comm,commission_amount=v_ledger_amount,processing_status=case when processing_status in ('awaiting_payment','awaiting_assignment') then 'assigned' else processing_status end,updated_at=now() where id=v_req.order_id;
 insert into public.order_commission_ledger(order_id,staff_user_id,commission_percent,order_amount,commission_amount,status) values(v_req.order_id,v_req.staff_user_id,v_comm,v_amount,v_ledger_amount,'pending') on conflict(order_id,staff_user_id) do update set commission_percent=excluded.commission_percent,order_amount=excluded.order_amount,commission_amount=excluded.commission_amount,status='pending';
 update public.support_conversations set assigned_staff_id=v_req.staff_user_id,assignment_mode='order',assigned_at=now(),updated_at=now() where order_id=v_req.order_id and status='open';
 return true;
end;$function$;

CREATE OR REPLACE FUNCTION public.set_order_processing_status(p_order_id uuid,p_status text,p_note text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
declare v_uid uuid:=auth.uid(); v_order public.orders%rowtype;
begin
 if v_uid is null then raise exception 'ورود الزامی است'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if v_order.id is null then raise exception 'سفارش پیدا نشد'; end if;
 if not (public.is_admin() or v_order.assigned_staff_id=v_uid) then raise exception 'شما مسئول این سفارش نیستید'; end if;
 if p_status not in ('in_progress','result_submitted','completed','rejected','cancelled') then raise exception 'وضعیت نامعتبر است'; end if;
 if p_status in ('completed','rejected','cancelled') and not public.is_admin() then raise exception 'تکمیل، رد یا لغو نهایی فقط توسط مدیر اصلی انجام می‌شود'; end if;
 if p_status='in_progress' then
   if v_order.assignment_status<>'assigned' or v_order.assigned_staff_id<>v_uid then raise exception 'سفارش هنوز به شما تخصیص نیافته است'; end if;
   if v_order.processing_status not in ('assigned','under_review') then raise exception 'این سفارش در وضعیت قابل شروع نیست'; end if;
   if v_order.status not in ('checking','processing','ready') or not exists (select 1 from public.payments p where p.order_id=v_order.id and p.user_id=v_order.user_id and p.status='paid') then raise exception 'شروع انجام سفارش قبل از تأیید پرداخت مجاز نیست'; end if;
 end if;
 if p_status='result_submitted' and (v_order.assigned_staff_id<>v_uid or v_order.processing_status<>'in_progress') then raise exception 'ثبت نتیجه فقط پس از شروع انجام خدمت مجاز است'; end if;
 if p_status='completed' and v_order.processing_status<>'result_submitted' then raise exception 'برای تکمیل، ابتدا نتیجه سفارش باید ارسال شود'; end if;
 if p_status='rejected' and v_order.processing_status not in ('under_review','assigned','in_progress','result_submitted') then raise exception 'این سفارش در وضعیت قابل رد نیست'; end if;
 if p_status='cancelled' and v_order.processing_status in ('completed','cancelled') then raise exception 'این سفارش دیگر قابل لغو نیست'; end if;
 update public.orders set processing_status=p_status,result_submitted_at=case when p_status='result_submitted' then now() else result_submitted_at end,completed_at=case when p_status='completed' then now() else completed_at end,completion_note=coalesce(p_note,completion_note),status=case when p_status='completed' then 'completed' when p_status in ('cancelled','rejected') then p_status else status end,assignment_status=case when p_status='completed' then 'completed' when p_status='cancelled' then 'cancelled' else assignment_status end,updated_at=now() where id=v_order.id;
 if p_status='completed' then update public.order_commission_ledger set status='approved',approved_at=now() where order_id=v_order.id and status='pending'; end if;
 return true;
end;$function$;

REVOKE EXECUTE ON FUNCTION public.request_order_assignment(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_order_assignment(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_order_assignment(uuid,boolean,numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_order_assignment(uuid,boolean,numeric) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_order_processing_status(uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_order_processing_status(uuid,text,text) TO authenticated;
