import { supabase } from "@/lib/supabase";

export type NotificationType =
    | "order_created"
    | "payment_success"
    | "receipt_uploaded"
    | "order_status_changed"
    | "new_message"
    | "document_requested"
    | "order_completed";

export async function createNotification(input: {
    recipientId: string;
    type: NotificationType;
    title: string;
    message?: string;
    orderId?: string;
    metadata?: Record<string, unknown>;
}) {
    const { data, error } = await supabase
        .from("notifications")
        .insert({
            recipient_id: input.recipientId,
            type: input.type,
            title: input.title,
            message: input.message ?? null,
            order_id: input.orderId ?? null,
            metadata: input.metadata ?? {},
        })
        .select("id")
        .single();

    if (error) throw error;
    return data;
}

export async function getUnreadNotificationsCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null);

    if (error) return 0;
    return count ?? 0;
}

export async function getNotifications(limit = 30) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, order_id, metadata, created_at, read_at")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 100));

    if (error) return [];
    return data ?? [];
}

export async function markNotificationAsRead(notificationId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("recipient_id", user.id)
        .is("read_at", null);

    return !error;
}

export async function markAllNotificationsAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .is("read_at", null);

    return !error;
}

// Existing message unread helpers are intentionally preserved for compatibility.
export async function getUnreadMessagesCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile) return 0;
    let query = supabase.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", user.id);
    query = profile.role === "admin"
        ? query.eq("sender_role", "user").eq("read_by_admin", false)
        : query.eq("sender_role", "admin").eq("read_by_user", false);
    const { count } = await query;
    return count ?? 0;
}

export async function getUnreadMessagesByOrder(orderId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile) return 0;
    let query = supabase.from("messages").select("id", { count: "exact", head: true }).eq("order_id", orderId);
    query = profile.role === "admin"
        ? query.eq("sender_role", "user").eq("read_by_admin", false)
        : query.eq("sender_role", "admin").eq("read_by_user", false);
    const { count } = await query;
    return count ?? 0;
}

export async function getAdminUnreadMessagesByOrder(orderId: string) {
    return getUnreadMessagesByOrder(orderId);
}

export async function getAdminUnreadMessagesCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_role", "user").eq("read_by_admin", false);
    return count ?? 0;
}
