-- Support chat v2: atomic routing, staff identity, closing, survey, admin review.
alter table public.staff_role_assignments add column if not exists staff_code text;
update public.staff_role_assignments set staff_code='OP-'||upper(substr(replace(id::text,'-',''),1,6)) where staff_code is null;
create unique index if not exists staff_role_assignments_staff_code_uq on public.staff_role_assignments(staff_code) where staff_code is not null;

create table if not exists public.support_reviews (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null unique references public.support_conversations(id) on delete cascade,
 customer_id uuid not null references public.profiles(id) on delete cascade,
 staff_id uuid references public.profiles(id) on delete set null,
 rating smallint not null check(rating between 1 and 5),
 comment text,
 strengths text[] not null default '{}',
 weaknesses text[] not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.support_reviews enable row level security;
create index if not exists support_reviews_staff_idx on public.support_reviews(staff_id,created_at desc);
create index if not exists support_reviews_customer_idx on public.support_reviews(customer_id,created_at desc);

create or replace function public.send_support_message(p_conversation_id uuid,p_message text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_role text; v_id uuid; v_status text; v_owner uuid; v_assigned uuid; begin
 if v_uid is null then raise exception 'احراز هویت لازم است'; end if;
 if length(trim(p_message))=0 or length(p_message)>4000 then raise exception 'متن پیام نامعتبر است'; end if;
 select status,user_id,assigned_staff_id into v_status,v_owner,v_assigned from public.support_conversations where id=p_conversation_id for update;
 if v_status is null then raise exception 'گفتگو پیدا نشد'; end if;
 if v_status<>'open' then raise exception 'این گفتگو بسته شده است'; end if;
 if v_owner=v_uid then v_role:='user';
 elsif public.is_staff_member(v_uid,'admin') then v_role:='admin';
 elsif public.is_staff_member(v_uid,'order_manager') and v_assigned=v_uid then v_role:='staff';
 elsif public.is_staff_member(v_uid,'support_operator') and v_assigned=v_uid then v_role:='staff';
 else raise exception 'شما عضو این گفتگو نیستید'; end if;
 insert into public.support_messages(conversation_id,sender_id,sender_role,message) values(p_conversation_id,v_uid,v_role,trim(p_message)) returning id into v_id;
 update public.support_conversations set updated_at=now() where id=p_conversation_id;
 return v_id;
end; $$;
grant execute on function public.send_support_message(uuid,text) to authenticated;

create or replace function public.close_support_conversation(p_conversation_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_owner uuid; v_assigned uuid; v_status text; begin
 if v_uid is null then raise exception 'احراز هویت لازم است'; end if;
 select status,user_id,assigned_staff_id into v_status,v_owner,v_assigned from public.support_conversations where id=p_conversation_id for update;
 if v_status is null then raise exception 'گفتگو پیدا نشد'; end if;
 if not (v_owner=v_uid or public.is_staff_member(v_uid,'admin') or (v_assigned=v_uid and public.is_staff_member(v_uid))) then raise exception 'اجازه بستن این گفتگو را ندارید'; end if;
 update public.support_conversations set status='closed',closed_at=coalesce(closed_at,now()),updated_at=now() where id=p_conversation_id;
 update public.support_conversation_participants set left_at=coalesce(left_at,now()) where conversation_id=p_conversation_id;
 return true;
end; $$;
grant execute on function public.close_support_conversation(uuid) to authenticated;

create or replace function public.submit_support_review(p_conversation_id uuid,p_rating smallint,p_comment text default null,p_strengths text[] default '{}',p_weaknesses text[] default '{}') returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_owner uuid; v_staff uuid; v_status text; v_id uuid; begin
 if v_uid is null then raise exception 'احراز هویت لازم است'; end if;
 select status,user_id,assigned_staff_id into v_status,v_owner,v_staff from public.support_conversations where id=p_conversation_id;
 if v_owner<>v_uid then raise exception 'فقط مشتری گفتگو می‌تواند نظرسنجی ثبت کند'; end if;
 if v_status<>'closed' then raise exception 'پس از بسته شدن گفتگو نظرسنجی فعال می‌شود'; end if;
 if p_rating<1 or p_rating>5 then raise exception 'امتیاز نامعتبر است'; end if;
 insert into public.support_reviews(conversation_id,customer_id,staff_id,rating,comment,strengths,weaknesses) values(p_conversation_id,v_uid,v_staff,nullif(p_rating,0),nullif(trim(coalesce(p_comment,'')),''),coalesce(p_strengths,'{}'),coalesce(p_weaknesses,'{}')) returning id into v_id;
 return v_id;
exception when unique_violation then raise exception 'برای این گفتگو قبلاً نظرسنجی ثبت شده است'; end; $$;
grant execute on function public.submit_support_review(uuid,smallint,text,text[],text[]) to authenticated;

-- A customer can see only their own reviews; staff cannot read reviews directly; admin can.
drop policy if exists support_reviews_customer_select on public.support_reviews;
create policy support_reviews_customer_select on public.support_reviews for select to authenticated using(customer_id=auth.uid() or public.is_staff_member(auth.uid(),'admin'));
drop policy if exists support_reviews_admin_all on public.support_reviews;
create policy support_reviews_admin_all on public.support_reviews for all to authenticated using(public.is_staff_member(auth.uid(),'admin')) with check(public.is_staff_member(auth.uid(),'admin'));

-- Keep the existing queue claim, but allow assigned order managers to claim their own order conversations.
create or replace function public.claim_support_conversation(p_conversation_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_order uuid; v_order_staff uuid; v_assigned uuid; v_mode text; begin
 if v_uid is null or not public.is_staff_member(v_uid) then raise exception 'دسترسی پشتیبانی مجاز نیست'; end if;
 select order_id,assigned_staff_id,assignment_mode into v_order,v_order_staff,v_mode from public.support_conversations where id=p_conversation_id and status='open' for update;
 if v_order is not null and v_order_staff is not null and v_order_staff<>v_uid then return false; end if;
 update public.support_conversations set assigned_staff_id=v_uid,assigned_at=now(),updated_at=now() where id=p_conversation_id and status='open' and (assigned_staff_id is null or assigned_staff_id=v_uid) returning assigned_staff_id into v_assigned;
 if v_assigned is null then return false; end if;
 insert into public.support_conversation_participants(conversation_id,user_id,participant_type) values(p_conversation_id,v_uid,'staff') on conflict(conversation_id,user_id) do update set left_at=null;
 return true;
end; $$;
grant execute on function public.claim_support_conversation(uuid) to authenticated;
