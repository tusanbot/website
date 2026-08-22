-- Security hardening: order integrity, canonical pricing and IDOR protection.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='orders'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', policy_record.policyname); END LOOP;
END $$;

CREATE POLICY orders_user_select_own ON public.orders FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY orders_user_insert_own ON public.orders FOR INSERT TO authenticated
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

CREATE POLICY orders_admin_all ON public.orders FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION public.set_order_canonical_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.form_id IS NOT NULL THEN
    SELECT COALESCE(cf.price, 0) INTO NEW.price
    FROM public.custom_forms cf
    WHERE cf.id = NEW.form_id
      AND cf.service_id = NEW.service_id
      AND cf.form_type = 'normal'
      AND cf.is_public = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'فرم انتخاب‌شده با خدمت سفارش مطابقت ندارد.'; END IF;
  ELSE
    SELECT COALESCE(s.price, 0) INTO NEW.price
    FROM public.services s
    WHERE s.id = NEW.service_id AND s.is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'خدمت انتخاب‌شده فعال یا معتبر نیست.'; END IF;
    IF EXISTS (SELECT 1 FROM public.services child WHERE child.parent_service_id = NEW.service_id AND child.is_active = true) THEN
      RAISE EXCEPTION 'برای این خدمت باید یکی از زیرخدمت‌ها انتخاب شود.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_form_price ON public.orders;
DROP TRIGGER IF EXISTS trg_orders_canonical_price ON public.orders;
CREATE TRIGGER trg_orders_canonical_price
BEFORE INSERT OR UPDATE OF service_id, form_id, price
ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_canonical_price();
