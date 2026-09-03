create table if not exists public.support_faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_faqs_active_category_idx on public.support_faqs(is_active,category,sort_order);

alter table public.support_faqs enable row level security;
drop policy if exists support_faqs_public_read on public.support_faqs;
create policy support_faqs_public_read on public.support_faqs for select to authenticated using (is_active=true);
grant select on public.support_faqs to authenticated;

insert into public.support_faqs(category,question,answer,keywords,sort_order) values
('سفارش','چطور وضعیت سفارش خود را پیگیری کنم؟','از حساب کاربری وارد بخش سفارش‌ها شوید. در آنجا وضعیت و کد پیگیری سفارش‌های شما نمایش داده می‌شود.','{پیگیری,وضعیت,کدپیگیری,سفارش}',10),
('سفارش','چرا سفارش من هنوز توسط مدیر سفارش تأیید نشده است؟','تا زمانی که سفارش به مدیر سفارش تخصیص داده نشده باشد، بررسی تخصصی آن شروع نشده است. اگر برای این سفارش پشتیبانی بخواهید و مدیری برای آن تعیین نشده باشد، گفتگو به اپراتور پشتیبانی منتقل می‌شود.','{تایید,مدیر,تخصیص,بررسی}',20),
('سفارش','چطور سفارش را لغو کنم؟','اگر گزینه لغو برای سفارش شما فعال باشد، می‌توانید از صفحه جزئیات همان سفارش درخواست لغو را ثبت کنید. در صورت نبود گزینه لغو، از پشتیبانی کمک بگیرید.','{لغو,کنسل,حذف}',30),
('پرداخت','پرداخت انجام شده ولی وضعیت سفارش تغییر نکرده؛ چه کار کنم؟','ابتدا چند دقیقه برای ثبت نتیجه پرداخت صبر کنید و سپس صفحه سفارش را تازه‌سازی کنید. اگر مبلغ از حساب شما کسر شده ولی پرداخت در سایت ثبت نشده است، با پشتیبانی تماس بگیرید و اطلاعات تراکنش را اعلام کنید.','{پرداخت,تراکنش,کسر,ناموفق}',10),
('حساب کاربری','چطور وارد حساب کاربری شوم؟','از منوی ورود، اطلاعات ورود خود را وارد کنید. اگر دسترسی خود را فراموش کرده‌اید، از گزینه بازیابی دسترسی استفاده کنید.','{ورود,رمز,حساب,بازیابی}',10),
('خدمات','مدارک موردنیاز برای انجام خدمات را از کجا ببینم؟','در صفحه هر خدمت، مدارک و اطلاعات موردنیاز همان خدمت را بررسی کنید. اگر درباره یک خدمت خاص ابهام دارید، نام خدمت را برای پشتیبانی ارسال کنید.','{مدارک,مدرک,خدمت,ثبت}',10),
('پشتیبانی','چه زمانی می‌توانم با پشتیبانی آنلاین صحبت کنم؟','در هر زمان که پشتیبانی آنلاین فعال باشد می‌توانید گفتگو را شروع کنید. ابتدا پاسخ سؤال‌های متداول نمایش داده می‌شود و اگر پاسخ مناسب پیدا نشود، گفتگو به اپراتور پشتیبانی منتقل می‌شود.','{پشتیبانی,اپراتور,آنلاین}',10),
('سفارش','اگر مدیر سفارش تعیین نشده باشد چه می‌شود؟','گفتگوی مرتبط با سفارش در صف پشتیبانی قرار می‌گیرد تا اپراتور پشتیبانی شما را راهنمایی کند. پس از تخصیص مدیر سفارش نیز گفتگوی باز سفارش می‌تواند به مدیر مربوط منتقل شود.','{مدیر,اپراتور,صف,تخصیص}',40)
on conflict do nothing;

create or replace function public.start_support_conversation(p_order_id uuid default null)
returns uuid language plpgsql security definer set search_path to 'pg_catalog','public' as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_staff uuid; v_mode text;
begin
 if v_uid is null then raise exception 'ورود الزامی است'; end if;
 if p_order_id is not null and not exists(select 1 from public.orders where id=p_order_id and user_id=v_uid) then raise exception 'این سفارش متعلق به شما نیست'; end if;
 if p_order_id is null then select id into v_id from public.support_conversations where user_id=v_uid and status='open' and order_id is null order by updated_at desc limit 1;
 else select id into v_id from public.support_conversations where user_id=v_uid and status='open' and order_id=p_order_id order by updated_at desc limit 1; end if;
 if v_id is not null then return v_id; end if;
 select assigned_staff_id into v_staff from public.orders where id=p_order_id;
 v_mode:=case when p_order_id is not null and v_staff is not null then 'order' else 'queue' end;
 insert into public.support_conversations(user_id,order_id,assignment_mode,assigned_staff_id,assigned_at,status) values(v_uid,p_order_id,v_mode,v_staff,case when v_staff is not null then now() end,'open') returning id into v_id; return v_id;
exception when unique_violation then
 select id into v_id from public.support_conversations where user_id=v_uid and status='open' and ((p_order_id is null and order_id is null) or order_id=p_order_id) order by updated_at desc limit 1; if v_id is null then raise; end if; return v_id;
end; $$;
grant execute on function public.start_support_conversation(uuid) to authenticated;

create or replace function public.search_support_faqs(p_query text default null,p_category text default null)
returns table(id uuid,category text,question text,answer text,score real) language sql stable security invoker set search_path='pg_catalog','public' as $$
select f.id,f.category,f.question,f.answer,case when nullif(trim(p_query),'') is null then 1::real else (case when f.question ilike '%'||trim(p_query)||'%' then 2 else 1 end)::real end as score from public.support_faqs f where f.is_active=true and (p_category is null or f.category=p_category) and (nullif(trim(p_query),'') is null or f.question ilike '%'||trim(p_query)||'%' or f.answer ilike '%'||trim(p_query)||'%' or exists(select 1 from unnest(f.keywords) k where k ilike '%'||trim(p_query)||'%')) order by score desc,f.sort_order,f.question limit 8;
$$;
grant execute on function public.search_support_faqs(text,text) to authenticated;
