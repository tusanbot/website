-- Ensure order pricing follows the exact selected child form.
-- This also makes the behavior safe for older client builds that still send services.price.

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

CREATE OR REPLACE FUNCTION public.set_order_form_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.form_id IS NOT NULL THEN
        SELECT COALESCE(cf.price, 0)
          INTO NEW.price
          FROM public.custom_forms cf
         WHERE cf.id = NEW.form_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_form_price ON public.orders;
CREATE TRIGGER trg_orders_form_price
BEFORE INSERT OR UPDATE OF form_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_form_price();

COMMENT ON COLUMN public.custom_forms.price IS
    'Price for this exact form; child forms may have their own service price.';

COMMENT ON COLUMN public.orders.form_id IS
    'Exact custom form selected for this order.';
