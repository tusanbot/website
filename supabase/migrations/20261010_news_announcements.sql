-- Independent news and announcements section; deliberately separate from services_announcements.
create table if not exists public.news_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  category text not null default 'general',
  image_url text,
  source_name text,
  source_url text,
  official_url text,
  source_guid text,
  status text not null default 'review' check (status in ('draft', 'review', 'published', 'archived')),
  is_active_registration boolean not null default false,
  registration_start_at timestamptz,
  registration_end_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_registration_dates_valid check (
    registration_start_at is null or registration_end_at is null or registration_end_at >= registration_start_at
  )
);

create unique index if not exists news_announcements_source_url_unique
  on public.news_announcements (source_url) where source_url is not null;
create unique index if not exists news_announcements_source_guid_unique
  on public.news_announcements (source_guid) where source_guid is not null;
create index if not exists news_announcements_public_listing
  on public.news_announcements (published_at desc) where status = 'published';
create index if not exists news_announcements_review_queue
  on public.news_announcements (created_at desc) where status in ('draft', 'review');

create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null default 'website' check (source_type in ('rss', 'website', 'api')),
  url text not null unique,
  category text not null default 'general',
  is_active boolean not null default true,
  check_interval_hours integer not null default 24 check (check_interval_hours between 1 and 168),
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_announcements enable row level security;
alter table public.news_sources enable row level security;

grant select on public.news_announcements to anon, authenticated;
grant select, insert, update, delete on public.news_announcements to authenticated;
grant select, insert, update, delete on public.news_sources to authenticated;

drop policy if exists "Published news is publicly readable" on public.news_announcements;
create policy "Published news is publicly readable"
  on public.news_announcements for select to anon, authenticated
  using (status = 'published' or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager')
  ));

drop policy if exists "Admins manage news announcements" on public.news_announcements;
create policy "Admins manage news announcements"
  on public.news_announcements for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager')
  ));

drop policy if exists "Admins manage news sources" on public.news_sources;
create policy "Admins manage news sources"
  on public.news_sources for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager')
  ));

create or replace function public.set_news_announcement_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists news_announcements_updated_at on public.news_announcements;
create trigger news_announcements_updated_at
before update on public.news_announcements
for each row execute function public.set_news_announcement_updated_at();

drop trigger if exists news_sources_updated_at on public.news_sources;
create trigger news_sources_updated_at
before update on public.news_sources
for each row execute function public.set_news_announcement_updated_at();
