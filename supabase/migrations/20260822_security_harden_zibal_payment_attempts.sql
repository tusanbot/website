-- Security hardening: prevent concurrent duplicate active Zibal payment attempts.
-- A single order should not have multiple pending/redirected online gateway attempts.

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_active_zibal_per_order
ON public.payments(order_id)
WHERE gateway = 'zibal'
  AND status IN ('pending', 'redirected');
