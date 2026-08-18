-- Per-form pricing and order form reference.
-- Safe for existing data: all new columns are nullable/defaulted.

ALTER TABLE public.custom_forms
    ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;

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

COMMENT ON COLUMN public.custom_forms.price IS
    'Price for this exact form. Child forms may override the service base price.';

COMMENT ON COLUMN public.orders.form_id IS
    'The exact custom form selected when the order was created.';
