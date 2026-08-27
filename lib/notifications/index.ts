import { createClient } from '@/lib/supabase/server'

export type NotificationType = 'order_created' | 'payment_success' | 'receipt_uploaded' | 'order_status' | 'new_message' | 'documents_requested' | 'order_completed'

export async function createNotification(input: { userId: string; type: NotificationType; title: string; message?: string; orderId?: string }) {
  const supabase = await createClient()
  return supabase.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    order_id: input.orderId ?? null,
    is_read: false,
  })
}
