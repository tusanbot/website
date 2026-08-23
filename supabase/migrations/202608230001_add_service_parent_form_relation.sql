-- Keep service and form hierarchies linked without recreating existing services.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS parent_form_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_parent_form_id_fkey'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_parent_form_id_fkey
      FOREIGN KEY (parent_form_id)
      REFERENCES public.custom_forms(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_services_parent_form_id
  ON public.services(parent_form_id);

UPDATE public.services s
SET parent_form_id = cf.id
FROM public.custom_forms cf
WHERE s.service_type = 'parent'
  AND cf.service_id = s.id
  AND cf.form_type = 'parent'
  AND cf.parent_form_id IS NULL
  AND s.parent_form_id IS NULL;
