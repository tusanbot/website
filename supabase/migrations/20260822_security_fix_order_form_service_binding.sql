-- Fix the order INSERT policy so a public custom form cannot be paired with a different service.
DROP POLICY IF EXISTS orders_user_insert_own ON public.orders;

CREATE POLICY orders_user_insert_own
ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'registered'
  AND jsonb_typeof(COALESCE(form_data, '{}'::jsonb)) = 'object'
  AND char_length(COALESCE(tracking_code, '')) BETWEEN 8 AND 100
  AND (
    (
      form_id IS NULL
      AND EXISTS (SELECT 1 FROM public.services s WHERE s.id = public.orders.service_id AND s.is_active = true)
      AND NOT EXISTS (SELECT 1 FROM public.services child WHERE child.parent_service_id = public.orders.service_id AND child.is_active = true)
      AND public.orders.price = (SELECT COALESCE(s.price, 0) FROM public.services s WHERE s.id = public.orders.service_id AND s.is_active = true)
    )
    OR
    (
      form_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.custom_forms cf
        JOIN public.services s ON s.id = cf.service_id
        WHERE cf.id = public.orders.form_id
          AND cf.service_id = public.orders.service_id
          AND cf.form_type = 'normal'
          AND cf.is_public = true
          AND s.is_active = true
          AND public.orders.price = COALESCE(cf.price, 0)
      )
    )
  )
);
