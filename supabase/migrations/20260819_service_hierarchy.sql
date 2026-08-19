-- Service hierarchy: services are either root (mother) or child of another service.
-- Existing services remain valid because parent_service_id is nullable.

ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS parent_service_id uuid NULL;

ALTER TABLE public.services
    DROP CONSTRAINT IF EXISTS services_parent_service_id_fkey;

ALTER TABLE public.services
    ADD CONSTRAINT services_parent_service_id_fkey
    FOREIGN KEY (parent_service_id)
    REFERENCES public.services(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_services_parent_service_id
    ON public.services(parent_service_id);

CREATE INDEX IF NOT EXISTS idx_services_active_parent_created
    ON public.services(is_active, parent_service_id, created_at DESC);

COMMENT ON COLUMN public.services.parent_service_id IS
    'NULL for standalone or mother services; points to the mother service for child services.';

-- Backward compatibility: old form hierarchy used custom_forms.parent_form_id.
-- Do not delete or rewrite those records. New code can use parent_service_id while
-- the legacy custom_forms hierarchy remains available for existing orders/forms.
