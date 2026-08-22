-- Security hardening: order integrity, price integrity and IDOR protection.
-- User-facing order creation remains client-side, but the database is the trust boundary.
-- Users may create only their own registered orders for active services/forms, with the
-- canonical price from the selected service/form. Users cannot update or delete orders.

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Replace every existing orders policy so an older permissive policy cannot survive.
DO $$
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'orders'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.orders',
            policy_record.policyname
        );
    END LOOP;
END
$$;

-- Customers can read only their own orders.
CREATE POLICY orders_user_select_own
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Customers can create only a valid order for themselves.
-- Price is never trusted from the browser: it must equal the current price of
-- the selected service or exact custom form.
CREATE POLICY orders_user_insert_own
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND status = 'registered'
    AND jsonb_typeof(COALESCE(form_data, '{}'::jsonb)) = 'object'
    AND char_length(COALESCE(tracking_code, '')) BETWEEN 8 AND 100
    AND (
        (
            form_id IS NULL
            AND EXISTS (
                SELECT 1
                FROM public.services s
                WHERE s.id = service_id
                  AND s.is_active = true
            )
            AND NOT EXISTS (
                SELECT 1
                FROM public.services child
                WHERE child.parent_service_id = service_id
                  AND child.is_active = true
            )
            AND price = (
                SELECT COALESCE(s.price, 0)
                FROM public.services s
                WHERE s.id = service_id
                  AND s.is_active = true
            )
        )
        OR
        (
            form_id IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.custom_forms cf
                JOIN public.services s
                  ON s.id = cf.service_id
                WHERE cf.id = form_id
                  AND cf.service_id = service_id
                  AND cf.form_type = 'normal'
                  AND cf.is_public = true
                  AND s.is_active = true
                  AND price = COALESCE(cf.price, 0)
            )
        )
    )
);

-- Only administrators can update or delete orders.
-- This intentionally prevents a customer from changing price, status,
-- service_id, form_id, user_id or form_data after creation.
CREATE POLICY orders_admin_all
ON public.orders
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
);

-- Keep the existing pricing trigger, but make it authoritative for both
-- service orders and legacy custom-form orders. This protects the value even
-- if another trusted server-side writer forgets to calculate price itself.
CREATE OR REPLACE FUNCTION public.set_order_canonical_price()
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
         WHERE cf.id = NEW.form_id
           AND cf.service_id = NEW.service_id
           AND cf.form_type = 'normal'
           AND cf.is_public = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'فرم انتخاب‌شده با خدمت سفارش مطابقت ندارد.';
        END IF;
    ELSE
        SELECT COALESCE(s.price, 0)
          INTO NEW.price
          FROM public.services s
         WHERE s.id = NEW.service_id
           AND s.is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'خدمت انتخاب‌شده فعال یا معتبر نیست.';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.services child
            WHERE child.parent_service_id = NEW.service_id
              AND child.is_active = true
        ) THEN
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
FOR EACH ROW
EXECUTE FUNCTION public.set_order_canonical_price();

-- Rebuild the payments INSERT policy that was previously removed. Card-to-card
-- payments are still created from the browser, so the policy must be strict:
-- users can only create a manual payment for their own order, for the exact
-- current order amount, and cannot forge a successful payment.
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_user_insert_own ON public.payments;

CREATE POLICY payments_user_insert_own
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND method = 'card_to_card'
    AND gateway = 'manual'
    AND status = 'awaiting_manual_verification'
    AND amount = (
        SELECT CAST(o.price AS bigint)
        FROM public.orders o
        WHERE o.id = order_id
          AND o.user_id = auth.uid()
    )
    AND amount > 0
);

COMMENT ON POLICY orders_user_insert_own ON public.orders IS
    'Users may create only their own registered orders with canonical service/form pricing.';

COMMENT ON POLICY orders_admin_all ON public.orders IS
    'Only admins may update or delete orders; users have no direct mutation access after creation.';
