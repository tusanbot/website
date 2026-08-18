-- Payment foundation for Tusan.
-- Supports online gateways (Zibal now, ZarinPal later) and manual card-to-card payments.
-- This migration is intentionally independent from gateway credentials and production activation.

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount bigint NOT NULL CHECK (amount > 0),
    method text NOT NULL DEFAULT 'online',
    gateway text NULL,
    status text NOT NULL DEFAULT 'pending',
    authority text NULL,
    transaction_id text NULL,
    gateway_response jsonb NULL,
    card_last4 text NULL,
    receipt_image_url text NULL,
    admin_note text NULL,
    paid_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT payments_method_check
        CHECK (method IN ('online', 'card_to_card')),

    CONSTRAINT payments_gateway_check
        CHECK (gateway IS NULL OR gateway IN ('zibal', 'zarinpal', 'manual')),

    CONSTRAINT payments_status_check
        CHECK (status IN (
            'pending',
            'redirected',
            'paid',
            'failed',
            'cancelled',
            'refunded',
            'awaiting_manual_verification',
            'rejected'
        )),

    CONSTRAINT payments_order_id_fkey
        FOREIGN KEY (order_id)
        REFERENCES public.orders(id)
        ON DELETE CASCADE,

    CONSTRAINT payments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id
    ON public.payments(order_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id
    ON public.payments(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
    ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_payments_gateway
    ON public.payments(gateway);

CREATE INDEX IF NOT EXISTS idx_payments_authority
    ON public.payments(authority)
    WHERE authority IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_transaction_id
    ON public.payments(transaction_id)
    WHERE transaction_id IS NOT NULL;

-- Prevent accidental duplicate gateway transactions while allowing NULL values.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_authority
    ON public.payments(gateway, authority)
    WHERE authority IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_transaction
    ON public.payments(gateway, transaction_id)
    WHERE transaction_id IS NOT NULL;

-- Keep updated_at current whenever a payment is modified.
CREATE OR REPLACE FUNCTION public.set_payments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_set_updated_at ON public.payments;
CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.set_payments_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_user_select_own ON public.payments;
CREATE POLICY payments_user_select_own
ON public.payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS payments_user_insert_own ON public.payments;
CREATE POLICY payments_user_insert_own
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS payments_admin_all ON public.payments;
CREATE POLICY payments_admin_all
ON public.payments
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

COMMENT ON TABLE public.payments IS
    'Payment attempts and transactions for Tusan orders. Supports online gateways and manual card-to-card verification.';

COMMENT ON COLUMN public.payments.method IS
    'online = gateway payment; card_to_card = manual bank-card transfer.';

COMMENT ON COLUMN public.payments.gateway IS
    'Payment provider: zibal, zarinpal, or manual for card-to-card.';

COMMENT ON COLUMN public.payments.authority IS
    'Gateway-specific payment authority/token, such as Zibal trackId when applicable.';

COMMENT ON COLUMN public.payments.transaction_id IS
    'Gateway reference/transaction identifier after successful verification.';

COMMENT ON COLUMN public.payments.gateway_response IS
    'Raw normalized/sanitized gateway response for auditing; never store secrets.';

COMMENT ON COLUMN public.payments.receipt_image_url IS
    'Storage URL for a user-uploaded card-to-card receipt.';
