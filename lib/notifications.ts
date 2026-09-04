import { supabase } from "@/lib/supabase";

export type NotificationType =
    | "new_order"
    | "order_status"
    | "payment_status"
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

type UnreadMessageRow = { order_id: string | null };
type UnreadMessageCacheEntry = {
    expiresAt: number;
    promise: Promise<Record<string, number>>;
};

const unreadMessagesCache = new Map<string, UnreadMessageCacheEntry>();
const UNREAD_MESSAGES_CACHE_TTL = 5000;

async function getAllUnreadMessageCounts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {} as Record<string, number>;

    const cached = unreadMessagesCache.get(user.id);
    if (cached && cached.expiresAt > Date.now()) return cached.promise;

    const promise = (async () => {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        if (!profile) return {} as Record<string, number>;

        let query = supabase
            .from("messages")
            .select("order_id")
            .neq("sender_id", user.id);

        query = profile.role === "admin"
            ? query.eq("sender_role", "user").eq("read_by_admin", false)
            : query.eq("sender_role", "admin").eq("read_by_user", false);

        const { data, error } = await query;
        if (error) return {} as Record<string, number>;

        return (data as UnreadMessageRow[] | null ?? []).reduce<Record<string, number>>((counts, row) => {
            if (row.order_id) counts[row.order_id] = (counts[row.order_id] ?? 0) + 1;
            return counts;
        }, {});
    })();

    unreadMessagesCache.set(user.id, {
        promise,
        expiresAt: Date.now() + UNREAD_MESSAGES_CACHE_TTL,
    });

    return promise;
}

export async function getUnreadMessagesByOrders(orderIds: string[]) {
    if (orderIds.length === 0) return {} as Record<string, number>;
    const counts = await getAllUnreadMessageCounts();
    return orderIds.reduce<Record<string, number>>((result, orderId) => {
        result[orderId] = counts[orderId] ?? 0;
        return result;
    }, {});
}

export async function getUnreadMessagesByOrder(orderId: string) {
    const counts = await getUnreadMessagesByOrders([orderId]);
    return counts[orderId] ?? 0;
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
