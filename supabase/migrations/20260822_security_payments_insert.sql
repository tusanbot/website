-- Security hardening: payment records must not be created directly by authenticated clients.
-- The server-side payment API creates payments after validating the authenticated
-- user, order ownership and the authoritative order price.

DROP POLICY IF EXISTS payments_user_insert_own ON public.payments;

-- Keep RLS enabled. There is intentionally no authenticated INSERT policy here.
-- Server-side code using the service-role client is the only creation path.
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
