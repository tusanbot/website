-- FJPanel service IDs are unique per provider. This lets sync safely upsert
-- without creating duplicates on repeated synchronization runs.
create unique index if not exists uq_social_services_provider_service
on public.social_services(provider, provider_service_id)
where provider_service_id is not null;
