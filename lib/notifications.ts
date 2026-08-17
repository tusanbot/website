import { supabase } from "@/lib/supabase";

export async function getUnreadMessagesCount() {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 0;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile) return 0;

    let query = supabase
        .from("messages")
        .select("id", {
            count: "exact",
            head: true,
        })
        .neq("sender_id", user.id);

    if (profile.role === "admin") {
        query = query
            .eq("sender_role", "user")
            .eq("read_by_admin", false);
    } else {
        query = query
            .eq("sender_role", "admin")
            .eq("read_by_user", false);
    }

    const { count, error } = await query;

    if (error) {
        console.log(error);
        return 0;
    }

    return count || 0;
}


/**
 * تعداد پیام‌های خوانده‌نشده یک سفارش
 *
 * برای مشتری:
 * پیام‌های ارسال‌شده توسط مدیر که هنوز مشتری نخوانده است.
 *
 * برای مدیر:
 * پیام‌های ارسال‌شده توسط مشتری که هنوز مدیر نخوانده است.
 */
export async function getUnreadMessagesByOrder(
    orderId: string
) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 0;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile) return 0;

    let query = supabase
        .from("messages")
        .select("id", {
            count: "exact",
            head: true,
        })
        .eq("order_id", orderId);

    if (profile.role === "admin") {
        query = query
            .eq("sender_role", "user")
            .eq("read_by_admin", false);
    } else {
        query = query
            .eq("sender_role", "admin")
            .eq("read_by_user", false);
    }

    const { count, error } = await query;

    if (error) {
        console.log(error);
        return 0;
    }

    return count || 0;
}


/**
 * تعداد پیام‌های خوانده‌نشده یک سفارش برای مدیر
 *
 * این تابع برای سازگاری با کدهای قبلی نگه داشته شده است.
 */
export async function getAdminUnreadMessagesByOrder(
    orderId: string
) {
    return getUnreadMessagesByOrder(orderId);
}


/**
 * تعداد کل پیام‌های خوانده‌نشده برای مدیر
 *
 * این تابع نیز برای کدهای قبلی نگه داشته شده است.
 */
export async function getAdminUnreadMessagesCount() {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 0;

    const { count } = await supabase
        .from("messages")
        .select("*", {
            count: "exact",
            head: true,
        })
        .eq("sender_role", "user")
        .eq("read_by_admin", false);

    return count || 0;
}