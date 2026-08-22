-- Security hardening: prevent client-side direct inserts into social_orders.
-- Orders must be created through /api/social/order, where service pricing,
-- quantity limits, ownership and status are validated server-side.

DROP POLICY IF EXISTS "social orders user insert own" ON public.social_orders;

-- Keep ownership-based reads for users and admin update access.
-- No authenticated user policy grants INSERT/UPDATE/DELETE on social_orders.
-- The server-side order API uses the service-role client and therefore bypasses RLS.

DROP POLICY IF EXISTS "social orders user read own" ON public.social_orders;
CREATE POLICY "social orders user read own"
ON public.social_orders
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
);

DROP POLICY IF EXISTS "social orders admin update" ON public.social_orders;
CREATE POLICY "social orders admin update"
ON public.social_orders
FOR UPDATE
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
