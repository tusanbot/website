-- Dual-database phase 1: durable change capture for every public application table and private.blog_post_views.
-- This migration is intentionally not applied automatically. Review and apply only
-- after the MySQL bridge and destination schema are ready.
begin;

create table if not exists public.data_sync_outbox (
  id bigint generated always as identity primary key,
  event_id uuid not null default gen_random_uuid() unique,
  source_database text not null default 'supabase',
  schema_name text not null,
  table_name text not null,
  record_key jsonb not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  row_data jsonb not null,
  source_txid bigint not null default txid_current(),
  created_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  last_error text
);

create index if not exists data_sync_outbox_pending_idx
  on public.data_sync_outbox (next_attempt_at, id)
  where processed_at is null;

alter table public.data_sync_outbox enable row level security;
revoke all on table public.data_sync_outbox from public, anon, authenticated;
grant select, update on table public.data_sync_outbox to service_role;
grant usage, select on sequence public.data_sync_outbox_id_seq to service_role;

create or replace function public.capture_data_sync_outbox()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_row jsonb;
  v_key jsonb;
  v_operation text;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_row := v_new;
    v_operation := 'insert';
  elsif tg_op = 'UPDATE' then
    v_new := to_jsonb(new);
    v_old := to_jsonb(old);
    v_row := v_new;
    v_operation := 'update';
  else
    v_old := to_jsonb(old);
    v_row := v_old;
    v_operation := 'delete';
  end if;

  select jsonb_object_agg(a.attname, coalesce(v_new -> a.attname, v_old -> a.attname) order by k.ord)
    into v_key
  from pg_index i
  cross join lateral unnest(i.indkey) with ordinality as k(attnum, ord)
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
  where i.indrelid = tg_relid and i.indisprimary;

  if v_key is null then
    raise exception 'Cannot capture sync event for %.% without a primary key', tg_table_schema, tg_table_name;
  end if;

  insert into public.data_sync_outbox
    (schema_name, table_name, record_key, operation, row_data)
  values
    (tg_table_schema, tg_table_name, v_key, v_operation, v_row);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_data_sync_outbox() from public, anon, authenticated;

-- Attach capture to the complete schema snapshot. Missing tables are skipped
-- so this migration remains safe to review against the deployed schema first.
do $$
declare
  v_table text;
  v_tables text[] := array[
    'profiles',
    'services',
    'registrations',
    'orders',
    'order_files',
    'order_history',
    'messages',
    'custom_forms',
    'services_announcements',
    'site_settings',
    'goals',
    'sub_goals',
    'financial_transactions',
    'payments',
    'social_platforms',
    'social_categories',
    'social_services',
    'social_orders',
    'social_sync_logs',
    'api_rate_limits',
    'blog_categories',
    'blog_posts',
    'blog_post_services',
    'ai_profiles',
    'ai_sessions',
    'form_versions',
    'traxtor_saved_projects',
    'notifications',
    'support_conversations',
    'support_messages',
    'blog_comments',
    'blog_ratings',
    'blog_reactions',
    'staff_roles',
    'staff_role_assignments',
    'staff_service_access',
    'support_conversation_participants',
    'order_staff_requests',
    'order_commission_ledger',
    'staff_category_access',
    'staff_reviews',
    'support_reviews',
    'staff_bank_accounts',
    'staff_earnings',
    'staff_settlements',
    'staff_financial_adjustments',
    'payout_requests',
    'support_faqs',
    'order_refunds',
    'order_cancellation_requests',
    'member_tags',
    'member_tag_assignments',
    'tag_referral_links',
    'discounts',
    'discount_codes',
    'discount_tag_rules',
    'discount_services',
    'discount_usages',
    'news_announcements',
    'news_sources'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('drop trigger if exists data_sync_outbox_capture on public.%I', v_table);
      execute format(
        'create trigger data_sync_outbox_capture after insert or update or delete on public.%I for each row execute function public.capture_data_sync_outbox()',
        v_table
      );
    end if;
  end loop;

  if to_regclass('private.blog_post_views') is not null then
    execute 'drop trigger if exists data_sync_outbox_capture on private.blog_post_views';
    execute 'create trigger data_sync_outbox_capture after insert or update or delete on private.blog_post_views for each row execute function public.capture_data_sync_outbox()';
  end if;
end;
$$;

-- Service-role-only keyset export for the private blog view table. PostgREST does not
-- expose the private schema directly, but the initial MySQL baseline must include
-- existing view rows before outbox events are replayed.
create or replace function public.export_private_blog_post_views(
  p_after_id uuid default null,
  p_limit integer default 500
)
returns table (
  id uuid,
  post_id uuid,
  visitor_id text,
  viewed_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  select v.id, v.post_id, v.visitor_id, v.viewed_at
  from private.blog_post_views v
  where p_after_id is null or v.id > p_after_id
  order by v.id
  limit greatest(1, least(coalesce(p_limit, 500), 1000));
$$;

revoke all on function public.export_private_blog_post_views(uuid, integer) from public, anon, authenticated;
grant execute on function public.export_private_blog_post_views(uuid, integer) to service_role;

-- A single serialized dispatcher claim prevents concurrent route invocations from
-- skipping a locked earliest event and delivering later events first.
create table if not exists public.data_sync_dispatch_state (
  id smallint primary key default 1 check (id = 1),
  locked_by text,
  locked_at timestamptz
);
insert into public.data_sync_dispatch_state (id) values (1) on conflict (id) do nothing;
alter table public.data_sync_dispatch_state enable row level security;
revoke all on table public.data_sync_dispatch_state from public, anon, authenticated;
grant select, update on table public.data_sync_dispatch_state to service_role;

create or replace function public.claim_data_sync_outbox(p_worker_id text, p_limit integer default 10)
returns setof public.data_sync_outbox
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lock public.data_sync_dispatch_state%rowtype;
begin
  if p_worker_id is null or length(trim(p_worker_id)) = 0 then
    raise exception 'p_worker_id is required';
  end if;

  select * into v_lock
  from public.data_sync_dispatch_state
  where id = 1
  for update;

  if v_lock.locked_at is not null and v_lock.locked_at > now() - interval '10 minutes' then
    return;
  end if;

  update public.data_sync_dispatch_state
  set locked_by = p_worker_id, locked_at = now()
  where id = 1;

  return query
  with picked as (
    select o.id
    from public.data_sync_outbox o
    where o.processed_at is null
      and o.next_attempt_at <= now()
      and (o.locked_at is null or o.locked_at < now() - interval '10 minutes')
      and not exists (
        select 1
        from public.data_sync_outbox earlier
        where earlier.processed_at is null
          and earlier.schema_name = o.schema_name
          and earlier.table_name = o.table_name
          and earlier.record_key = o.record_key
          and earlier.id < o.id
      )
    order by o.id
    limit greatest(1, least(coalesce(p_limit, 10), 50))
    for update of o
  )
  update public.data_sync_outbox o
  set locked_at = now(), locked_by = p_worker_id, attempts = attempts + 1
  from picked
  where o.id = picked.id
  returning o.*;
end;
$$;

create or replace function public.release_data_sync_dispatch(p_worker_id text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.data_sync_dispatch_state
  set locked_by = null, locked_at = null
  where id = 1 and locked_by = p_worker_id;
  return found;
end;
$$;

revoke all on function public.claim_data_sync_outbox(text, integer) from public, anon, authenticated;
revoke all on function public.release_data_sync_dispatch(text) from public, anon, authenticated;
grant execute on function public.claim_data_sync_outbox(text, integer) to service_role;
grant execute on function public.release_data_sync_dispatch(text) to service_role;

commit;
