-- Keep the provider's original name separate from the local customer-facing name.
ALTER TABLE public.social_services
ADD COLUMN IF NOT EXISTS provider_name text;

UPDATE public.social_services
SET provider_name = COALESCE(NULLIF(provider_name, ''), name)
WHERE provider_name IS NULL OR provider_name = '';

COMMENT ON COLUMN public.social_services.name IS 'Local customer-facing display name; editable by admins.';
COMMENT ON COLUMN public.social_services.provider_name IS 'Original service name returned by the external provider (FJPanel).';
