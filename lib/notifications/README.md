# Notification system

The project already contains a `public.notifications` table. This module is reserved for the central notification workflow and should be used by server-side order/payment/message events rather than duplicating notification logic in UI components.

## Planned event types

- `order_created`
- `payment_paid`
- `card_to_card_receipt_submitted`
- `order_status_changed`
- `new_message`
- `order_completed`

## Rules

- Notifications must be scoped to a recipient user.
- Server-side events create notifications; clients only read/mark them.
- Unread state must be persisted in the database.
- Never expose notifications belonging to another user.
