-- Social services module: independent from the main services/orders tables.
-- Auth/profiles remain shared with the main Tusan application.

create table if not exists public.social_platforms (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    icon text,
    description text,
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.social_categories (
    id uuid primary key default gen_random_uuid(),
    platform_id uuid not null references public.social_platforms(id) on delete cascade,
    name text not null,
    slug text not null,
    description text,
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(platform_id, slug)
);

create table if not exists public.social_services (
    id uuid primary key default gen_random_uuid(),
    platform_id uuid not null references public.social_platforms(id) on delete cascade,
    category_id uuid not null references public.social_categories(id) on delete cascade,
    provider text not null default 'fjpanel',
    provider_service_id text,
    name text not null,
    description text,
    service_type text not null default 'default',
    provider_rate numeric(14,6),
    min_quantity integer not null default 1 check (min_quantity > 0),
    max_quantity integer not null default 1 check (max_quantity >= min_quantity),
    profit_type text not null default 'percentage' check (profit_type in ('percentage', 'fixed', 'none')),
    profit_value numeric(14,4) not null default 0 check (profit_value >= 0),
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.social_orders (
    id uuid primary key default gen_random_uuid(),
    tracking_code text not null unique,
    user_id uuid not null references auth.users(id) on delete cascade,
    service_id uuid not null references public.social_services(id),
    provider text not null default 'fjpanel',
    provider_order_id text,
    link text not null,
    quantity integer not null check (quantity > 0),
    price numeric(14,2) not null default 0 check (price >= 0),
    provider_charge numeric(14,6),
    status text not null default 'pending' check (status in ('pending', 'awaiting_payment', 'paid', 'processing', 'partial', 'completed', 'cancelled', 'failed')),
    provider_status text,
    admin_note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_social_categories_platform on public.social_categories(platform_id, sort_order);
create index if not exists idx_social_services_platform on public.social_services(platform_id, sort_order);
create index if not exists idx_social_services_category on public.social_services(category_id, sort_order);
create index if not exists idx_social_orders_user on public.social_orders(user_id, created_at desc);
create index if not exists idx_social_orders_status on public.social_orders(status, created_at desc);
create index if not exists idx_social_orders_provider on public.social_orders(provider, provider_order_id);

alter table public.social_platforms enable row level security;
alter table public.social_categories enable row level security;
alter table public.social_services enable row level security;
alter table public.social_orders enable row level security;

create policy "social platforms public read active"
on public.social_platforms for select
using (is_active = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "social categories public read active"
on public.social_categories for select
using (is_active = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "social services public read active"
on public.social_services for select
using (is_active = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "social orders user read own"
on public.social_orders for select
using (auth.uid() = user_id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "social orders user insert own"
on public.social_orders for insert
with check (auth.uid() = user_id);

create policy "social platforms admin write"
on public.social_platforms for all
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "social categories admin write"
on public.social_categories for all
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "social services admin write"
on public.social_services for all
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "social orders admin update"
on public.social_orders for update
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create or replace function public.set_social_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists social_platforms_updated_at on public.social_platforms;
create trigger social_platforms_updated_at before update on public.social_platforms
for each row execute function public.set_social_updated_at();

drop trigger if exists social_categories_updated_at on public.social_categories;
create trigger social_categories_updated_at before update on public.social_categories
for each row execute function public.set_social_updated_at();

drop trigger if exists social_services_updated_at on public.social_services;
create trigger social_services_updated_at before update on public.social_services
for each row execute function public.set_social_updated_at();

drop trigger if exists social_orders_updated_at on public.social_orders;
create trigger social_orders_updated_at before update on public.social_orders
for each row execute function public.set_social_updated_at();

insert into public.social_platforms (name, slug, icon, description, sort_order)
values
    ('اینستاگرام', 'instagram', 'instagram', 'فالوور، لایک، ویو، ریلز و سایر خدمات اینستاگرام', 1),
    ('تلگرام', 'telegram', 'send', 'عضو، بازدید و سایر خدمات کانال و گروه تلگرام', 2),
    ('یوتیوب', 'youtube', 'youtube', 'ویو، لایک و سابسکرایب یوتیوب', 3),
    ('تیک‌تاک', 'tiktok', 'music-2', 'ویو، لایک و فالوور تیک‌تاک', 4),
    ('ایکس', 'x', 'at-sign', 'خدمات تعامل و رشد حساب‌های X', 5),
    ('روبیکا', 'rubika', 'message-circle', 'خدمات کانال و محتوای روبیکا', 6),
    ('ایتا', 'eitaa', 'message-square', 'خدمات کانال و محتوای ایتا', 7),
    ('آپارات', 'aparat', 'play-square', 'خدمات بازدید و تعامل آپارات', 8)
on conflict (slug) do update set
    name = excluded.name,
    icon = excluded.icon,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.social_categories (platform_id, name, slug, description, sort_order)
select p.id, c.name, c.slug, c.description, c.sort_order
from public.social_platforms p
cross join (values
    ('instagram', 'فالوور', 'followers', 'خدمات افزایش فالوور', 1),
    ('instagram', 'لایک', 'likes', 'خدمات لایک پست و ریلز', 2),
    ('instagram', 'بازدید', 'views', 'بازدید پست و ریلز', 3),
    ('instagram', 'کامنت', 'comments', 'کامنت و تعامل', 4),
    ('telegram', 'عضو', 'members', 'افزایش اعضای کانال یا گروه', 1),
    ('telegram', 'بازدید', 'views', 'بازدید پست‌های کانال', 2),
    ('youtube', 'بازدید', 'views', 'افزایش بازدید ویدیو', 1),
    ('youtube', 'سابسکرایب', 'subscribers', 'افزایش مشترک کانال', 2),
    ('tiktok', 'فالوور', 'followers', 'افزایش دنبال‌کننده', 1),
    ('tiktok', 'لایک', 'likes', 'افزایش لایک و تعامل', 2)
) as c(platform_slug, name, slug, description, sort_order)
on p.slug = c.platform_slug
on conflict (platform_id, slug) do update set
    name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

-- Demo catalog entries keep the UI useful before the provider sync is enabled.
insert into public.social_services (platform_id, category_id, provider, provider_service_id, name, description, service_type, provider_rate, min_quantity, max_quantity, profit_type, profit_value, sort_order)
select p.id, c.id, 'fjpanel', null, s.name, s.description, 'default', null, s.min_quantity, s.max_quantity, 'percentage', 30, s.sort_order
from (values
    ('instagram','followers','فالوور اینستاگرام','شروع سریع و مناسب کمپین‌های رشد پیج',100,10000,1),
    ('instagram','likes','لایک اینستاگرام','افزایش لایک برای پست و ریلز',100,10000,1),
    ('instagram','views','ویو ریلز اینستاگرام','افزایش بازدید ریلز',100,100000,1),
    ('telegram','members','عضو تلگرام','افزایش اعضای کانال',100,10000,1),
    ('telegram','views','بازدید تلگرام','افزایش بازدید پست‌های کانال',100,100000,1),
    ('youtube','views','ویو یوتیوب','افزایش بازدید ویدیو',100,100000,1),
    ('youtube','subscribers','سابسکرایب یوتیوب','افزایش مشترک کانال',100,10000,1),
    ('tiktok','followers','فالوور تیک‌تاک','افزایش دنبال‌کننده',100,10000,1),
    ('tiktok','likes','لایک تیک‌تاک','افزایش لایک و تعامل',100,10000,1)
) as s(platform_slug, category_slug, name, description, min_quantity, max_quantity, sort_order)
join public.social_platforms p on p.slug = s.platform_slug
join public.social_categories c on c.platform_id = p.id and c.slug = s.category_slug
where not exists (
    select 1 from public.social_services existing
    where existing.platform_id = p.id and existing.category_id = c.id and existing.name = s.name
);
