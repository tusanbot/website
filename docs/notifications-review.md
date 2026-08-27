# Notifications review

The production Supabase project already contains `public.notifications` with recipient_id, type, title, message, order_id, metadata, created_at, and read_at. No triggers are currently defined on the table. This document records that the proposed central notification work must be based on the existing table rather than creating a duplicate schema.
