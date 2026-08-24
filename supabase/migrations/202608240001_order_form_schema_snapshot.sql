ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS form_schema_snapshot jsonb;

COMMENT ON COLUMN public.orders.form_schema_snapshot IS
  'Immutable snapshot of the exact form schema used when the order was submitted.';
