import { createClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'new_order'
  | 'order_created'
  | 'order_status'
  | 'order_status_changed'
  | 'payment_status'
  | 'payment_success'
  | 'receipt_uploaded'
  | 'new_message'
  | 'document_requested'
  | 'documents_requested'
  | 'order_completed'

export type NotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message?: string
  orderId?: string
  metadata?: Record<string, unknown>
}

/**
 * Creates a notification using the canonical notifications schema.
 * RLS still decides whether the current session may create it.
 */
export async function createNotification(input: NotificationInput) {
  const supabase = await createClient()
  return supabase.from('notifications').insert({
    recipient_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    order_id: input.orderId ?? null,
    metadata: input.metadata ?? {},
  })
}

export async function getNotifications(limit = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('id,type,title,message,order_id,metadata,created_at,read_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100))

  if (error) throw error
  return data ?? []
}

export async function getUnreadNotificationsCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  if (error) throw error
  return count ?? 0
}

export async function markNotificationAsRead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return !error
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return !error
}
