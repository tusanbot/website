-- Discount campaigns, member tags, referral links and atomic usage claims.
-- Safe to replay against a database where these objects already exist.

create table if not exists public.member_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  color text default '#179d99',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tag_referral_links (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.member_tags(id) on delete cascade,
  code text not null unique,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  assignment_duration_days integer check (assignment_duration_days is null or assignment_duration_days > 0)
);

create table if not exists public.member_tag_assignments (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.member_tags(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  source text not null default 'manual',
  referral_link_id uuid,
  unique(tag_id,user_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='member_tag_assignments_referral_link_fk') then
    alter table public.member_tag_assignments
      add constraint member_tag_assignments_referral_link_fk
      foreign key (referral_link_id) references public.tag_referral_links(id) on delete set null;
  end if;
end $$;

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  value numeric(12,2) not null check (value >= 0),
  max_discount_amount bigint,
  min_order_amount bigint,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  per_user_limit integer,
  is_active boolean not null default true,
  stackable boolean not null default false,
  priority integer not null default 0,
  applies_to_all_services boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  code text not null unique,
  is_active boolean not null default true,
  usage_limit integer,
  per_user_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.discount_tag_rules (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  tag_id uuid not null references public.member_tags(id) on delete cascade,
  unique(discount_id,tag_id)
);

create table if not exists public.discount_services (
  discount_id uuid not null references public.discounts(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key(discount_id,service_id)
);

alter table public.orders add column if not exists original_price bigint;
alter table public.orders add column if not exists discount_amount bigint not null default 0;
alter table public.orders add column if not exists discount_code_id uuid references public.discount_codes(id);
alter table public.orders add column if not exists discount_id uuid references public.discounts(id);
alter table public.orders add column if not exists discount_snapshot jsonb not null default '{}'::jsonb;

create table if not exists public.discount_usages (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id),
  discount_code_id uuid references public.discount_codes(id),
  user_id uuid references public.profiles(id),
  order_id uuid references public.orders(id),
  service_id uuid references public.services(id),
  original_amount bigint not null,
  discount_amount bigint not null,
  final_amount bigint not null,
  created_at timestamptz not null default now(),
  unique(discount_id,order_id)
);

create index if not exists idx_member_tag_assignments_user on public.member_tag_assignments(user_id);
create index if not exists idx_member_tag_assignments_tag on public.member_tag_assignments(tag_id);
create index if not exists idx_referral_links_code on public.tag_referral_links(code);
create index if not exists idx_discount_codes_code on public.discount_codes(code);
create index if not exists idx_discount_usages_user on public.discount_usages(user_id);
create index if not exists idx_discount_usages_order on public.discount_usages(order_id);
create index if not exists idx_discount_usages_discount_code on public.discount_usages(discount_code_id);
create index if not exists idx_discount_usages_discount_user on public.discount_usages(discount_id,user_id);
create index if not exists idx_discount_usages_code_user on public.discount_usages(discount_code_id,user_id);

alter table public.member_tags enable row level security;
alter table public.member_tag_assignments enable row level security;
alter table public.tag_referral_links enable row level security;
alter table public.discounts enable row level security;
alter table public.discount_codes enable row level security;
alter table public.discount_tag_rules enable row level security;
alter table public.discount_services enable row level security;
alter table public.discount_usages enable row level security;

drop policy if exists member_tags_admin_manage on public.member_tags;
create policy member_tags_admin_manage on public.member_tags for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists member_tag_assignments_admin_manage on public.member_tag_assignments;
create policy member_tag_assignments_admin_manage on public.member_tag_assignments for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists member_tag_assignments_user_read_own on public.member_tag_assignments;
create policy member_tag_assignments_user_read_own on public.member_tag_assignments for select to authenticated
using ((select auth.uid())=user_id);

drop policy if exists tag_referral_links_admin_manage on public.tag_referral_links;
create policy tag_referral_links_admin_manage on public.tag_referral_links for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists tag_referral_links_public_read_active on public.tag_referral_links;
create policy tag_referral_links_public_read_active on public.tag_referral_links for select to anon,authenticated
using (is_active=true and (expires_at is null or expires_at>=now()));

drop policy if exists discounts_admin_manage on public.discounts;
create policy discounts_admin_manage on public.discounts for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists discount_codes_admin_manage on public.discount_codes;
create policy discount_codes_admin_manage on public.discount_codes for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists discount_tag_rules_admin_manage on public.discount_tag_rules;
create policy discount_tag_rules_admin_manage on public.discount_tag_rules for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists discount_services_admin_manage on public.discount_services;
create policy discount_services_admin_manage on public.discount_services for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists discount_usages_admin_manage on public.discount_usages;
create policy discount_usages_admin_manage on public.discount_usages for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists discount_usages_user_read_own on public.discount_usages;
create policy discount_usages_user_read_own on public.discount_usages for select to authenticated
using ((select auth.uid())=user_id);

create or replace function public.claim_discount_usages(p_order_id uuid,p_user_id uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare item jsonb; v_discount_id uuid; v_code_id uuid; v_service_id uuid; v_original bigint; v_discount bigint; v_final bigint; v_discount_limit integer; v_discount_per_user integer; v_code_limit integer; v_code_per_user integer; v_discount_used integer; v_discount_user_used integer; v_code_used integer; v_code_user_used integer;
begin
 if p_order_id is null or p_user_id is null or jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' then raise exception 'پارامترهای ثبت مصرف تخفیف نامعتبر است.'; end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'discount_id' loop
  v_discount_id:=nullif(item->>'discount_id','')::uuid; v_code_id:=nullif(item->>'discount_code_id','')::uuid; v_service_id:=nullif(item->>'service_id','')::uuid;
  v_original:=greatest(0,coalesce((item->>'original_amount')::bigint,0)); v_discount:=greatest(0,coalesce((item->>'discount_amount')::bigint,0)); v_final:=greatest(0,coalesce((item->>'final_amount')::bigint,0));
  select usage_limit,per_user_limit into v_discount_limit,v_discount_per_user from public.discounts where id=v_discount_id and is_active=true for update;
  if not found then raise exception 'تخفیف دیگر فعال نیست.'; end if;
  if v_code_id is not null then
   select usage_limit,per_user_limit into v_code_limit,v_code_per_user from public.discount_codes where id=v_code_id and discount_id=v_discount_id and is_active=true for update;
   if not found then raise exception 'کد تخفیف دیگر فعال نیست.'; end if;
  end if;
  select count(*) into v_discount_used from public.discount_usages where discount_id=v_discount_id;
  select count(*) into v_discount_user_used from public.discount_usages where discount_id=v_discount_id and user_id=p_user_id;
  if v_discount_limit is not null and v_discount_used>=v_discount_limit then raise exception 'سقف استفاده از این تخفیف تکمیل شده است.'; end if;
  if v_discount_per_user is not null and v_discount_user_used>=v_discount_per_user then raise exception 'سقف استفاده شما از این تخفیف تکمیل شده است.'; end if;
  if v_code_id is not null then
   select count(*) into v_code_used from public.discount_usages where discount_code_id=v_code_id;
   select count(*) into v_code_user_used from public.discount_usages where discount_code_id=v_code_id and user_id=p_user_id;
   if v_code_limit is not null and v_code_used>=v_code_limit then raise exception 'سقف استفاده از این کد تخفیف تکمیل شده است.'; end if;
   if v_code_per_user is not null and v_code_user_used>=v_code_per_user then raise exception 'سقف استفاده شما از این کد تخفیف تکمیل شده است.'; end if;
  end if;
  insert into public.discount_usages(discount_id,discount_code_id,user_id,order_id,service_id,original_amount,discount_amount,final_amount)
  values(v_discount_id,v_code_id,p_user_id,p_order_id,v_service_id,v_original,v_discount,v_final)
  on conflict(discount_id,order_id) do update set discount_code_id=excluded.discount_code_id,service_id=excluded.service_id,original_amount=excluded.original_amount,discount_amount=excluded.discount_amount,final_amount=excluded.final_amount;
 end loop;
 return jsonb_build_object('success',true);
end; $$;

create or replace function public.set_order_canonical_price()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_base numeric; v_rules jsonb; v_canonical bigint;
begin
 if new.form_id is not null then
  select coalesce(cf.price,0) into v_base from public.custom_forms cf where cf.id=new.form_id and cf.service_id=new.service_id and cf.form_type='normal' and cf.is_public=true;
  if not found then raise exception 'فرم انتخاب‌شده با خدمت سفارش مطابقت ندارد.'; end if;
 else
  select coalesce(s.price,0),coalesce(s.pricing_rules,'[]'::jsonb) into v_base,v_rules from public.services s where s.id=new.service_id and s.is_active=true;
  if not found then raise exception 'خدمت انتخاب‌شده فعال یا معتبر نیست.'; end if;
  if exists(select 1 from public.services child where child.parent_service_id=new.service_id and child.is_active=true) then raise exception 'برای این خدمت باید یکی از زیرخدمت‌ها انتخاب شود.'; end if;
 end if;
 if new.form_id is not null then select coalesce(s.pricing_rules,'[]'::jsonb) into v_rules from public.services s where s.id=new.service_id and s.is_active=true; end if;
 v_canonical:=public.calculate_order_price_from_rules(v_base,v_rules,coalesce(new.form_data,'{}'::jsonb));
 new.original_price:=coalesce(nullif(new.original_price,0),v_canonical);
 new.discount_amount:=greatest(0,coalesce(new.discount_amount,0));
 new.price:=greatest(0,v_canonical-new.discount_amount);
 return new;
end; $$;
