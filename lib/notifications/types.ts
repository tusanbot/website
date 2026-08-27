export type NotificationType =
  | 'order_created'
  | 'payment_success'
  | 'receipt_uploaded'
  | 'documents_requested'
  | 'order_status_changed'
  | 'new_message'
  | 'order_completed'

export type Notification = {
  id: string
  type: NotificationType
  title: string
  body: string | null
  order_id: string | null
  read_at: string | null
  created_at: string
}
