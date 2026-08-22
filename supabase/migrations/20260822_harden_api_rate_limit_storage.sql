create index if not exists api_rate_limits_updated_at_idx
    on public.api_rate_limits (updated_at);

revoke all on table public.api_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
    from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
    to service_role;

create or replace function public.consume_api_rate_limit(
    p_key text,
    p_limit integer,
    p_window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer, remaining integer)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
    v_now timestamptz := now();
    v_row public.api_rate_limits%rowtype;
    v_elapsed integer;
    v_retry integer;
begin
    if p_key is null or length(p_key) < 16 or length(p_key) > 128 then
        raise exception 'invalid rate limit key';
    end if;

    if p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
        raise exception 'invalid rate limit configuration';
    end if;

    insert into public.api_rate_limits(key, window_started_at, request_count, updated_at)
    values (p_key, v_now, 1, v_now)
    on conflict (key) do update
    set
        window_started_at = case
            when extract(epoch from (v_now - public.api_rate_limits.window_started_at)) >= p_window_seconds
                then v_now
            else public.api_rate_limits.window_started_at
        end,
        request_count = case
            when extract(epoch from (v_now - public.api_rate_limits.window_started_at)) >= p_window_seconds
                then 1
            else least(public.api_rate_limits.request_count + 1, 2147483647)
        end,
        updated_at = v_now
    returning * into v_row;

    v_elapsed := greatest(
        0,
        floor(extract(epoch from (v_now - v_row.window_started_at)))::integer
    );

    if v_row.request_count <= p_limit then
        return query select
            true,
            greatest(0, p_window_seconds - v_elapsed),
            p_limit - v_row.request_count;
    end if;

    v_retry := greatest(1, p_window_seconds - v_elapsed);
    return query select false, v_retry, 0;
end;
$$;
