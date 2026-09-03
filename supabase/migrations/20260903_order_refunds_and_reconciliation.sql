-- Complete the regular-order cancellation/refund/reconciliation workflow.

create table if not exists public.order_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested','approved','processing','completed','rejected','failed')),
  reason text not null,
  refund_method text not null default 'manual_bank_transfer',
  transaction_id text,
  admin_note text,
  requested_by uuid references public.profiles(id),
  processed_by uuid references public.profiles(id),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_refunds_order_unique unique(order_id)
);

create index if not exists idx_order_refunds_status on public.order_refunds(status);
create index if not exists idx_order_refunds_user on public.order_refunds(user_id);

alter table public.order_refunds enable row level security;
drop policy if exists "order_refunds_select_owner" on public.order_refunds;
create policy "order_refunds_select_owner" on public.order_refunds
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

revoke all on public.order_refunds from anon, public;
grant select on public.order_refunds to authenticated, service_role;

create or replace function public.admin_request_order_refund(p_order_id uuid, p_reason text)
returns public.order_refunds language plpgsql security definer set search_path to 'pg_catalog','public' as $$
declare v_admin uuid:=auth.uid(); v_order public.orders%rowtype; v_paid bigint; v_refund public.order_refunds%rowtype;
begin
 if v_admin is null or not public.is_admin() then raise exception 'فقط مدیر اصلی مجاز است'; end if;
 if p_reason is null or btrim(p_reason)='' then raise exception 'علت بازپرداخت الزامی است'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'سفارش پیدا نشد'; end if;
 if v_order.user_id is null then raise exception 'مالک سفارش مشخص نیست'; end if;
 if v_order.status not in ('cancelled','rejected') then raise exception 'ابتدا سفارش باید لغو یا رد شده باشد'; end if;
 select coalesce(sum(p.amount),0) into v_paid from public.payments p where p.order_id=v_order.id and p.user_id=v_order.user_id and p.status='paid';
 if v_paid<=0 then raise exception 'برای این سفارش پرداخت موفقی ثبت نشده است'; end if;
 if v_order.price is not null and v_paid<>v_order.price::bigint then raise exception 'مجموع پرداخت‌های موفق با مبلغ سفارش برابر نیست؛ بازپرداخت دستی نیازمند بررسی مغایرت است'; end if;
 select * into v_refund from public.order_refunds where order_id=v_order.id for update;
 if found then
   if v_refund.status='completed' then raise exception 'این سفارش قبلاً بازپرداخت شده است'; end if;
   if v_refund.status not in ('rejected','failed') then return v_refund; end if;
   update public.order_refunds set status='requested',reason=p_reason,admin_note=null,transaction_id=null,requested_by=v_admin,processed_by=null,processed_at=null,updated_at=now() where id=v_refund.id returning * into v_refund;
   return v_refund;
 end if;
 insert into public.order_refunds(order_id,user_id,amount,reason,requested_by) values(v_order.id,v_order.user_id,v_paid,p_reason,v_admin) returning * into v_refund;
 return v_refund;
end;
$$;
grant execute on function public.admin_request_order_refund(uuid,text) to authenticated, service_role;
revoke execute on function public.admin_request_order_refund(uuid,text) from anon, public;

create or replace function public.admin_update_order_refund(p_refund_id uuid,p_action text,p_transaction_id text default null,p_note text default null)
returns public.order_refunds language plpgsql security definer set search_path to 'pg_catalog','public' as $$
declare v_admin uuid:=auth.uid(); v_refund public.order_refunds%rowtype; v_order public.orders%rowtype; v_new_status text; v_commission bigint:=0; v_staff uuid;
begin
 if v_admin is null or not public.is_admin() then raise exception 'فقط مدیر اصلی مجاز است'; end if;
 if p_action not in ('approve','reject','processing','completed','failed') then raise exception 'عملیات بازپرداخت نامعتبر است'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_refund_id::text,0));
 select * into v_refund from public.order_refunds where id=p_refund_id for update;
 if not found then raise exception 'درخواست بازپرداخت پیدا نشد'; end if;
 select * into v_order from public.orders where id=v_refund.order_id for update;
 if not found then raise exception 'سفارش مرتبط پیدا نشد'; end if;
 if p_action='approve' then
   if v_refund.status<>'requested' then raise exception 'فقط درخواست در انتظار تایید قابل تایید است'; end if;
   v_new_status:='approved';
 elsif p_action='reject' then
   if v_refund.status not in ('requested','approved','processing') then raise exception 'این بازپرداخت قابل رد نیست'; end if;
   v_new_status:='rejected';
 elsif p_action='processing' then
   if v_refund.status not in ('approved','requested') then raise exception 'فقط بازپرداخت تاییدشده قابل پردازش است'; end if;
   v_new_status:='processing';
 elsif p_action='failed' then
   if v_refund.status not in ('processing','approved','requested') then raise exception 'این بازپرداخت قابل ثبت به عنوان ناموفق نیست'; end if;
   v_new_status:='failed';
 else
   if v_refund.status<>'processing' then raise exception 'فقط بازپرداخت در حال پردازش قابل تکمیل است'; end if;
   if p_transaction_id is null or btrim(p_transaction_id)='' then raise exception 'شماره پیگیری واریز وجه الزامی است'; end if;
   if not exists(select 1 from public.payments p where p.order_id=v_order.id and p.user_id=v_order.user_id and p.status='paid') then raise exception 'پرداخت موفقی برای این سفارش وجود ندارد'; end if;
   update public.payments set status='refunded',admin_note=coalesce(p_note,admin_note),updated_at=now() where order_id=v_order.id and user_id=v_order.user_id and status='paid';
   v_staff:=v_order.assigned_staff_id;
   if v_staff is not null then
     select coalesce(sum(commission_amount),0) into v_commission from public.order_commission_ledger where order_id=v_order.id and staff_user_id=v_staff and status in ('approved','paid');
     update public.order_commission_ledger set status='void' where order_id=v_order.id and staff_user_id=v_staff and status in ('approved','paid');
     if v_commission>0 then
       insert into public.staff_financial_adjustments(staff_id,order_id,amount,reason,created_by,adjustment_type,reference_key) values(v_staff,v_order.id,-v_commission,coalesce(p_note,'برگشت کمیسیون بابت بازپرداخت سفارش'),v_admin,'refund','refund:'||v_order.id::text) on conflict(reference_key) do nothing;
     end if;
   end if;
   v_new_status:='completed';
 end if;
 update public.order_refunds set status=v_new_status,transaction_id=coalesce(nullif(btrim(p_transaction_id),''),transaction_id),admin_note=coalesce(p_note,admin_note),processed_by=case when v_new_status in ('rejected','failed','completed') then v_admin else processed_by end,processed_at=case when v_new_status in ('rejected','failed','completed') then now() else processed_at end,updated_at=now() where id=v_refund.id returning * into v_refund;
 if v_new_status='completed' then
   insert into public.order_history(order_id,old_status,new_status,description) values(v_order.id,v_order.status,v_order.status,'بازپرداخت مبلغ سفارش تکمیل شد؛ شماره پیگیری: '||coalesce(p_transaction_id,'---'));
   insert into public.notifications(recipient_id,type,title,message,order_id,metadata) values(v_order.user_id,'order_refund','بازپرداخت سفارش انجام شد','مبلغ بازپرداخت سفارش شما انجام شد. شماره پیگیری: '||coalesce(p_transaction_id,'---'),v_order.id,jsonb_build_object('refund_id',v_refund.id,'amount',v_refund.amount,'transaction_id',p_transaction_id));
   if v_staff is not null then insert into public.notifications(recipient_id,type,title,message,order_id,metadata) values(v_staff,'staff_finance','اصلاح مالی بازپرداخت سفارش','به‌دلیل بازپرداخت سفارش، اصلاح مالی کمیسیون برای شما ثبت شد.',v_order.id,jsonb_build_object('refund_id',v_refund.id,'commission_reversal',v_commission)); end if;
 end if;
 return v_refund;
end;
$$;
grant execute on function public.admin_update_order_refund(uuid,text,text,text) to authenticated, service_role;
revoke execute on function public.admin_update_order_refund(uuid,text,text,text) from anon, public;

create or replace function public.record_order_refund_debt(p_order_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path to 'pg_catalog','public' as $$
declare v_admin uuid:=auth.uid(); v_order public.orders%rowtype; v_amount bigint;
begin
 if v_admin is null or not public.is_admin() then raise exception 'فقط مدیر اصلی مجاز است'; end if;
 select * into v_order from public.orders where id=p_order_id;
 if not found or v_order.assigned_staff_id is null then raise exception 'سفارش یا مدیر مسئول پیدا نشد'; end if;
 select coalesce(sum(commission_amount),0) into v_amount from public.order_commission_ledger where order_id=p_order_id and staff_user_id=v_order.assigned_staff_id and status in ('approved','paid');
 if v_amount<=0 then return true; end if;
 insert into public.staff_financial_adjustments(staff_id,order_id,amount,reason,created_by,adjustment_type,reference_key) values(v_order.assigned_staff_id,p_order_id,-v_amount,coalesce(p_reason,'بازگشت وجه سفارش'),v_admin,'refund','refund:'||p_order_id::text) on conflict(reference_key) do nothing;
 return true;
end;
$$;
grant execute on function public.record_order_refund_debt(uuid,text) to authenticated, service_role;
revoke execute on function public.record_order_refund_debt(uuid,text) from anon, public;
