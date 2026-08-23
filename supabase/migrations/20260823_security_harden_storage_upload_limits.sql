-- Harden private user-uploaded storage buckets with explicit size/type limits.
-- Existing objects are left untouched; restrictions apply to future uploads.

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/json',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
WHERE id = 'order-files';

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
WHERE id = 'payment-receipts';
