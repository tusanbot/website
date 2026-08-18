-- Form hierarchy for service forms.
-- Existing custom_forms rows remain valid: parent_form_id is NULL and form_type defaults to 'normal'.

ALTER TABLE public.custom_forms
    ADD COLUMN IF NOT EXISTS form_type text NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS parent_form_id uuid NULL,
    ADD COLUMN IF NOT EXISTS service_id uuid NULL,
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.custom_forms
    DROP CONSTRAINT IF EXISTS custom_forms_form_type_check;

ALTER TABLE public.custom_forms
    ADD CONSTRAINT custom_forms_form_type_check
    CHECK (form_type IN ('normal', 'parent'));

ALTER TABLE public.custom_forms
    DROP CONSTRAINT IF EXISTS custom_forms_parent_form_id_fkey;

ALTER TABLE public.custom_forms
    ADD CONSTRAINT custom_forms_parent_form_id_fkey
    FOREIGN KEY (parent_form_id)
    REFERENCES public.custom_forms(id)
    ON DELETE CASCADE;

ALTER TABLE public.custom_forms
    DROP CONSTRAINT IF EXISTS custom_forms_service_id_fkey;

ALTER TABLE public.custom_forms
    ADD CONSTRAINT custom_forms_service_id_fkey
    FOREIGN KEY (service_id)
    REFERENCES public.services(id)
    ON DELETE CASCADE;

-- A child form must belong to a parent. A parent form must not have a parent.
ALTER TABLE public.custom_forms
    DROP CONSTRAINT IF EXISTS custom_forms_hierarchy_check;

ALTER TABLE public.custom_forms
    ADD CONSTRAINT custom_forms_hierarchy_check
    CHECK (
        (form_type = 'parent' AND parent_form_id IS NULL)
        OR
        (form_type = 'normal')
    );

CREATE INDEX IF NOT EXISTS idx_custom_forms_parent_form_id
    ON public.custom_forms(parent_form_id);

CREATE INDEX IF NOT EXISTS idx_custom_forms_service_id
    ON public.custom_forms(service_id);

CREATE INDEX IF NOT EXISTS idx_custom_forms_service_parent_sort
    ON public.custom_forms(service_id, parent_form_id, sort_order);

-- Only one root/parent form is allowed per service.
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_forms_one_parent_per_service
    ON public.custom_forms(service_id)
    WHERE form_type = 'parent' AND parent_form_id IS NULL;

-- Child form names are unique inside a parent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_forms_unique_child_title
    ON public.custom_forms(parent_form_id, lower(title))
    WHERE parent_form_id IS NOT NULL;

-- Keep track of which child/normal form was used for an order.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS form_id uuid NULL;

ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_form_id_fkey;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_form_id_fkey
    FOREIGN KEY (form_id)
    REFERENCES public.custom_forms(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_form_id
    ON public.orders(form_id);

COMMENT ON COLUMN public.custom_forms.form_type IS
    'normal = standalone or child form; parent = container/root form';

COMMENT ON COLUMN public.custom_forms.parent_form_id IS
    'Self-reference to the parent form. NULL for parent and standalone forms.';

COMMENT ON COLUMN public.custom_forms.service_id IS
    'Service that owns this form hierarchy.';

COMMENT ON COLUMN public.custom_forms.sort_order IS
    'Display order of child forms inside the parent.';

COMMENT ON COLUMN public.orders.form_id IS
    'The exact custom form used to create this order.';
