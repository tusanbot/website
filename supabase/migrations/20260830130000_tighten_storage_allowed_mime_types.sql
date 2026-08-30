-- Keep order-file uploads constrained to non-active content types.
-- Direct storage writes are already disabled; uploads are validated by the server API.
-- Remove application/octet-stream from the bucket so storage configuration cannot accept
-- an ambiguous active/binary content type if a write path is accidentally reintroduced.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/json',
  'image/jpeg',
  'image/png',
  'image/webp'
]::text[]
WHERE id = 'order-files';
