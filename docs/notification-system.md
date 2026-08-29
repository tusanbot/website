# Notification System

The central notification layer is planned separately from order chat/messages.

## Event types
- new_order
- payment_success
- card_to_card_receipt
- documents_requested
- order_status_changed
- new_customer_message
- order_completed

## Requirements
- unread/read state
- user/role scoped visibility
- central notification list and unread counter
- deep link to the related order
- server-side creation for trusted events
- retention and cleanup policy
