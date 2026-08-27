-- Remove legacy notification triggers that duplicated the canonical private-schema workflow.
-- Canonical triggers are notifications_message_event, notifications_order_events,
-- and notifications_payment_event.

drop trigger if exists trg_notifications_messages on public.messages;
drop trigger if exists trg_notifications_orders on public.orders;
drop trigger if exists trg_notifications_payments on public.payments;

drop function if exists public.trg_notifications_messages();
drop function if exists public.trg_notifications_orders();
drop function if exists public.trg_notifications_payments();

comment on trigger notifications_message_event on public.messages is
  'Canonical central notification trigger; legacy duplicate trigger removed 2026-08-27.';
comment on trigger notifications_order_events on public.orders is
  'Canonical central notification trigger; legacy duplicate trigger removed 2026-08-27.';
comment on trigger notifications_payment_event on public.payments is
  'Canonical central notification trigger; legacy duplicate trigger removed 2026-08-27.';
