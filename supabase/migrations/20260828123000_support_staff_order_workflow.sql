-- Applied to Supabase production on 2026-08-28.
-- Keeps support-chat privileges/RLS aligned with the staff workflow.

grant select, insert, update on table public.support_conversations to authenticated;
grant select, insert, update on table public.support_messages to authenticated;
revoke all on table public.support_conversations from anon;
revoke all on table public.support_messages from anon;

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  name text not null, description text, permissions jsonb not null default '{}'::jsonb,
  is_system boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.staff_role_assignments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.staff_roles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','suspended','rejected')),
  commission_percent numeric(5,2) not null default 0 check(commission_percent between 0 and 100),
  approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,role_id)
);
create table if not exists public.staff_service_access (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','suspended','rejected')),
  commission_percent numeric(5,2) not null default 0 check(commission_percent between 0 and 100),
  approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,service_id)
);
create table if not exists public.order_staff_requests (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  commission_percent numeric(5,2) not null default 0 check(commission_percent between 0 and 100),
  approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(order_id,staff_user_id)
);

alter table public.orders add column if not exists assigned_staff_id uuid references public.profiles(id) on delete set null;
alter table public.orders add column if not exists assignment_status text not null default 'unassigned' check(assignment_status in ('unassigned','pending_approval','assigned','in_progress','completed','cancelled'));
alter table public.orders add column if not exists assigned_at timestamptz;
alter table public.orders add column if not exists assigned_by uuid references public.profiles(id) on delete set null;
alter table public.support_conversations add column if not exists order_id uuid references public.orders(id) on delete set null;
alter table public.support_conversations add column if not exists assignment_mode text not null default 'queue' check(assignment_mode in ('order','queue'));
alter table public.support_conversations add column if not exists assigned_staff_id uuid references public.profiles(id) on delete set null;
alter table public.support_conversations add column if not exists assigned_at timestamptz;
alter table public.support_conversations add column if not exists closed_at timestamptz;

create table if not exists public.support_conversation_participants (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  participant_type text not null check(participant_type in ('customer','staff')), joined_at timestamptz not null default now(), left_at timestamptz,
  unique(conversation_id,user_id)
);

insert into public.staff_roles(code,name,description,permissions,is_system) values
('admin','مدیر اصلی','دسترسی کامل','{"orders":true,"support":true,"services":true,"users":true}',true),
('order_manager','مدیر سفارشات','مدیریت سفارش‌های تخصیص‌یافته و انجام خدمات پس از تأیید','{"orders":true,"support":false,"services":false,"users":false}',true),
('support_operator','اپراتور پشتیبانی','پاسخگویی و مدیریت گفتگوهای پشتیبانی','{"orders":false,"support":true,"services":false,"users":false}',true)
on conflict(code) do update set name=excluded.name,description=excluded.description,permissions=excluded.permissions;

alter table public.staff_roles enable row level security;
alter table public.staff_role_assignments enable row level security;
alter table public.staff_service_access enable row level security;
alter table public.order_staff_requests enable row level security;
alter table public.support_conversation_participants enable row level security;

create or replace function public.is_staff_member(target_user_id uuid,target_role text default null) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id where a.user_id=target_user_id and a.status='approved' and (target_role is null or r.code=target_role))
 or exists(select 1 from public.profiles p where p.id=target_user_id and p.role='admin'); $$;
create or replace function public.has_staff_permission(p_permission text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id where a.user_id=auth.uid() and a.status='approved' and coalesce((r.permissions->>p_permission)::boolean,false)) or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'); $$;

grant execute on function public.is_staff_member(uuid,text) to authenticated;
grant execute on function public.has_staff_permission(text) to authenticated;

-- Atomic first-claim queue: exactly one staff member can win an unassigned conversation.
create or replace function public.claim_support_conversation(p_conversation_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_claimed uuid;
begin
 if v_uid is null or not public.is_staff_member(v_uid) then raise exception 'دسترسی پشتیبانی مجاز نیست'; end if;
 update public.support_conversations set assigned_staff_id=v_uid,assigned_at=now() where id=p_conversation_id and status='open' and assigned_staff_id is null returning assigned_staff_id into v_claimed;
 if v_claimed is null then return false; end if;
 insert into public.support_conversation_participants(conversation_id,user_id,participant_type) values(p_conversation_id,v_uid,'staff') on conflict(conversation_id,user_id) do update set left_at=null;
 return true;
end; $$;
grant execute on function public.claim_support_conversation(uuid) to authenticated;

create or replace function public.start_support_conversation(p_order_id uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_staff uuid; v_owner uuid;
begin
 if v_uid is null then raise exception 'احراز هویت لازم است'; end if;
 if p_order_id is not null then select user_id,assigned_staff_id into v_owner,v_staff from public.orders where id=p_order_id; if v_owner is null or v_owner<>v_uid then raise exception 'این سفارش متعلق به شما نیست'; end if; end if;
 select id into v_id from public.support_conversations where user_id=v_uid and status='open' order by updated_at desc limit 1;
 if v_id is null then insert into public.support_conversations(user_id,order_id,assignment_mode,assigned_staff_id,assigned_at) values(v_uid,p_order_id,case when p_order_id is null then 'queue' else 'order' end,v_staff,case when v_staff is null then null else now() end) returning id into v_id;
 elsif p_order_id is not null then update public.support_conversations set order_id=p_order_id,assignment_mode='order',assigned_staff_id=coalesce(assigned_staff_id,v_staff),assigned_at=case when assigned_staff_id is null and v_staff is not null then now() else assigned_at end where id=v_id; end if;
 insert into public.support_conversation_participants(conversation_id,user_id,participant_type) values(v_id,v_uid,'customer') on conflict(conversation_id,user_id) do update set left_at=null;
 if v_staff is not null then insert into public.support_conversation_participants(conversation_id,user_id,participant_type) values(v_id,v_staff,'staff') on conflict(conversation_id,user_id) do update set left_at=null; end if;
 return v_id;
end; $$;
grant execute on function public.start_support_conversation(uuid) to authenticated;

create or replace function public.approve_staff_role(p_user_id uuid,p_role_code text,p_approve boolean,p_commission numeric default 0) returns boolean language plpgsql security definer set search_path=public as $$
declare v_admin uuid:=auth.uid(); v_role uuid; begin if v_admin is null or not public.is_staff_member(v_admin,'admin') then raise exception 'فقط مدیر اصلی مجاز است'; end if; select id into v_role from public.staff_roles where code=p_role_code; if v_role is null then raise exception 'نقش پیدا نشد'; end if; if p_commission<0 or p_commission>100 then raise exception 'درصد کارمزد نامعتبر است'; end if; insert into public.staff_role_assignments(user_id,role_id,status,commission_percent,approved_by,approved_at) values(p_user_id,v_role,case when p_approve then 'approved' else 'rejected' end,p_commission,v_admin,case when p_approve then now() else null end) on conflict(user_id,role_id) do update set status=excluded.status,commission_percent=excluded.commission_percent,approved_by=excluded.approved_by,approved_at=excluded.approved_at,updated_at=now(); return true; end; $$;
grant execute on function public.approve_staff_role(uuid,text,boolean,numeric) to authenticated;

create or replace function public.set_staff_service_access(p_user_id uuid,p_service_id uuid,p_approve boolean,p_commission numeric default 0) returns boolean language plpgsql security definer set search_path=public as $$
declare v_admin uuid:=auth.uid(); begin if v_admin is null or not public.is_staff_member(v_admin,'admin') then raise exception 'فقط مدیر اصلی مجاز است'; end if; if not exists(select 1 from public.staff_role_assignments a join public.staff_roles r on r.id=a.role_id where a.user_id=p_user_id and a.status='approved' and r.code='order_manager') then raise exception 'کاربر مدیر سفارشات تأییدشده نیست'; end if; insert into public.staff_service_access(user_id,service_id,status,commission_percent,approved_by,approved_at) values(p_user_id,p_service_id,case when p_approve then 'approved' else 'rejected' end,p_commission,v_admin,case when p_approve then now() else null end) on conflict(user_id,service_id) do update set status=excluded.status,commission_percent=excluded.commission_percent,approved_by=excluded.approved_by,approved_at=excluded.approved_at,updated_at=now(); return true; end; $$;
grant execute on function public.set_staff_service_access(uuid,uuid,boolean,numeric) to authenticated;
