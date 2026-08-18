-- Storage for user-uploaded card-to-card payment receipts.
-- Run after 20260819_payments.sql.

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS payment_receipts_user_upload ON storage.objects;
CREATE POLICY payment_receipts_user_upload
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS payment_receipts_user_read ON storage.objects;
CREATE POLICY payment_receipts_user_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS payment_receipts_user_update ON storage.objects;
CREATE POLICY payment_receipts_user_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS payment_receipts_user_delete ON storage.objects;
CREATE POLICY payment_receipts_user_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS payment_receipts_admin_read ON storage.objects;
CREATE POLICY payment_receipts_admin_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-receipts'
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);
