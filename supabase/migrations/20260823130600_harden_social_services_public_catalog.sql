-- Expose only customer-safe social service catalog data.
-- Provider identity, provider service IDs, provider cost and margin data remain server-side.

create or replace view public.social_services_public
with (security_barrier = true) as
select
  s.id,
  s.platform_id,
  s.category_id,
  s.name,
  s.description,
  s.service_type,
  s.min_quantity,
  s.max_quantity,
  s.is_active,
  s.sort_order,
  round((coalesce(s.provider_rate, 0) * 2)::numeric, 2) as customer_unit_price
from public.social_services s
where s.is_active = true;

revoke all on table public.social_services_public from public;
grant select on table public.social_services_public to anon, authenticated;

revoke all on table public.social_services from anon, authenticated;
grant select (
  id,
  platform_id,
  category_id,
  name,
  description,
  service_type,
  min_quantity,
  max_quantity,
  is_active,
  sort_order
) on table public.social_services to anon, authenticated;
