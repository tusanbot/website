-- Storage writes are routed through server-side APIs so MIME/content
-- validation and ownership checks cannot be bypassed by direct client uploads.

DROP POLICY IF EXISTS order_files_storage_user_insert ON storage.objects;

DROP POLICY IF EXISTS payment_receipts_user_upload ON storage.objects;
DROP POLICY IF EXISTS payment_receipts_user_update ON storage.objects;
DROP POLICY IF EXISTS payment_receipts_user_delete ON storage.objects;
