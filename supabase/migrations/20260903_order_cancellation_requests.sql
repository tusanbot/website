create table if not exists public.order_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason text not null check (char_length(btrim(reason)) between 3 and 2000),
  admin_note text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_cancellation_requests_user_idx on public.order_cancellation_requests(user_id, created_at desc);
create index if not exists order_cancellation_requests_status_idx on public.order_cancellation_requests(status, created_at desc);

alter table public.order_cancellation_requests enable row level security;
drop policy if exists "customers can view own cancellation requests" on public.order_cancellation_requests;
drop policy if exists "admins can view cancellation requests" on public.order_cancellation_requests;
create policy "customers can view own cancellation requests" on public.order_cancellation_requests for select to authenticated using ((select auth.uid()) = user_id);
create policy "admins can view cancellation requests" on public.order_cancellation_requests for select to authenticated using ((select public.is_admin()));
revoke all on table public.order_cancellation_requests from anon, public;
grant select on table public.order_cancellation_requests to authenticated;
grant select, insert, update, delete on table public.order_cancellation_requests to service_role;

create or replace function public.request_order_cancellation(p_order_id uuid, p_reason text)
returns public.order_cancellation_requests
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_uid uuid := auth.uid(); v_order public.orders%rowtype; v_request public.order_cancellation_requests%rowtype;
begin
 if v_uid is null then raise exception 'ورود به حساب کاربری الزامی است'; end if;
 if p_reason is null or char_length(btrim(p_reason)) < 3 then raise exception 'علت لغو را وارد کنید'; end if;
 if char_length(p_reason) > 2000 then raise exception 'علت لغو بیش از حد مجاز طولانی است'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'سفارش پیدا نشد'; end if;
 if v_order.user_id is distinct from v_uid then raise exception 'شما مالک این سفارش نیستید'; end if;
 if v_order.status in ('completed','cancelled','rejected') then raise exception 'این سفارش دیگر قابل درخواست لغو نیست'; end if;
 select * into v_request from public.order_cancellation_requests where order_id=p_order_id for update;
 if found then
   if v_request.status='pending' then return v_request; end if;
   if v_request.status='approved' then raise exception 'درخواست لغو این سفارش قبلاً تأیید شده است'; end if;
   update public.order_cancellation_requests set status='pending',reason=btrim(p_reason),admin_note=null,requested_at=now(),reviewed_at=null,reviewed_by=null,updated_at=now() where id=v_request.id returning * into v_request;
 else
   insert into public.order_cancellation_requests(order_id,user_id,reason) values(v_order.id,v_uid,btrim(p_reason)) returning * into v_request;
 end if;
 insert into public.notifications(recipient_id,type,title,message,order_id,metadata)
 select p.id,'order_cancellation_requested','درخواست لغو سفارش','مشتری برای لغو یک سفارش درخواست ثبت کرده است.',v_order.id,jsonb_build_object('tracking_code',v_order.tracking_code,'reason',btrim(p_reason)) from public.profiles p where p.role='admin';
 return v_request;
end; $$;

create or replace function public.admin_review_order_cancellation(p_request_id uuid,p_action text,p_note text default null)
returns public.order_cancellation_requests
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_admin uuid:=auth.uid(); v_request public.order_cancellation_requests%rowtype; v_order public.orders%rowtype; v_action text:=lower(btrim(coalesce(p_action,''))); v_note text:=nullif(btrim(coalesce(p_note,'')),'');
begin
 if v_admin is null or not public.is_admin() then raise exception 'فقط مدیر اصلی مجاز است'; end if;
 if v_action not in ('approve','reject') then raise exception 'عملیات نامعتبر است'; end if;
 if v_action='reject' and v_note is null then raise exception 'علت رد درخواست الزامی است'; end if;
 select * into v_request from public.order_cancellation_requests where id=p_request_id for update;
 if not found then raise exception 'درخواست لغو پیدا نشد'; end if;
 if v_request.status<>'pending' then raise exception 'این درخواست قبلاً بررسی شده است'; end if;
 select * into v_order from public.orders where id=v_request.order_id for update;
 if not found then raise exception 'سفارش مربوط به درخواست پیدا نشد'; end if;
 if v_order.user_id is distinct from v_request.user_id then raise exception 'مالک درخواست با سفارش مطابقت ندارد'; end if;
 if v_order.status in ('completed','cancelled','rejected') then
   update public.order_cancellation_requests set status='rejected',admin_note='وضعیت سفارش پیش از بررسی تغییر کرده است.',reviewed_by=v_admin,reviewed_at=now(),updated_at=now() where id=v_request.id returning * into v_request;
   return v_request;
 end if;
 if v_action='approve' then
   update public.order_cancellation_requests set status='approved',admin_note=v_note,reviewed_by=v_admin,reviewed_at=now(),updated_at=now() where id=v_request.id returning * into v_request;
   update public.orders set status='cancelled',processing_status='cancelled',assignment_status='cancelled',completion_note=coalesce(v_note,completion_note),updated_at=now() where id=v_order.id;
   insert into public.notifications(recipient_id,type,title,message,order_id,metadata) values(v_order.user_id,'order_cancellation_approved','لغو سفارش تأیید شد','درخواست لغو سفارش شما تأیید شد. در صورت وجود پرداخت موفق، بازپرداخت از بخش بازپرداخت مدیریت پیگیری می‌شود.',v_order.id,jsonb_build_object('tracking_code',v_order.tracking_code));
 else
   update public.order_cancellation_requests set status='rejected',admin_note=v_note,reviewed_by=v_admin,reviewed_at=now(),updated_at=now() where id=v_request.id returning * into v_request;
   insert into public.notifications(recipient_id,type,title,message,order_id,metadata) values(v_order.user_id,'order_cancellation_rejected','درخواست لغو رد شد','درخواست لغو سفارش شما توسط مدیریت رد شد.',v_order.id,jsonb_build_object('tracking_code',v_order.tracking_code,'note',v_note));
 end if;
 return v_request;
end; $$;

revoke all on function public.request_order_cancellation(uuid,text) from anon, public;
revoke all on function public.admin_review_order_cancellation(uuid,text,text) from anon, public;
grant execute on function public.request_order_cancellation(uuid,text) to authenticated, service_role;
grant execute on function public.admin_review_order_cancellation(uuid,text,text) to authenticated, service_role;

create or replace function public.update_order_cancellation_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists trg_order_cancellation_updated_at on public.order_cancellation_requests;
create trigger trg_order_cancellation_updated_at before update on public.order_cancellation_requests for each row execute function public.update_order_cancellation_updated_at();
revoke all on function public.update_order_cancellation_updated_at() from anon, authenticated, public;
grant execute on function public.update_order_cancellation_updated_at() to service_role;
