# Notification system audit

Audited 2026-08-27.

The database already contains `public.notifications` with recipient, type, title, message, optional order_id/metadata, created_at and read_at. The table is RLS-enabled and has foreign keys to profiles and orders. Its schema comment states that event generation is handled by private-schema triggers to avoid duplicate notifications.

Therefore the previously proposed central notification feature is already present at the database layer and should not be reimplemented as a new table or duplicate event system.

Next work should focus on verifying the application/UI consumption of this existing notification infrastructure and filling only confirmed gaps.
