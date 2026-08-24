import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase server configuration is incomplete");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getUserId(request: NextRequest) {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    const client = createClient(url, anonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser();
    return error || !data.user ? null : data.user.id;
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);
        if (!userId) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });
        const bodySizeError = rejectOversizedJsonBody(request, 4 * 1024);
        if (bodySizeError) return bodySizeError;
        const rateLimitResponse = await checkRateLimit({ scope: "social:order:cancel", request, userId, limit: 10, windowSeconds: 60 });
        if (rateLimitResponse) return rateLimitResponse;
        const body = await request.json().catch((): null => null) as { orderId?: unknown } | null;
        const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
        if (!orderId) return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });
        const admin = adminClient();
        const { data: order, error } = await admin.from("social_orders").select("id,user_id,status,provider_order_id").eq("id", orderId).maybeSingle();
        if (error) return NextResponse.json({ error: "بررسی سفارش ناموفق بود." }, { status: 500 });
        if (!order || order.user_id !== userId) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
        const cancellable = ["pending", "awaiting_payment", "failed"].includes(order.status);
        if (!cancellable) return NextResponse.json({ error: "این سفارش دیگر قابل لغو نیست." }, { status: 409 });
        if (order.provider_order_id) return NextResponse.json({ error: "سفارش به سرویس‌دهنده ارسال شده و قابل لغو نیست." }, { status: 409 });
        const { error: updateError } = await admin.from("social_orders").update({ status: "cancelled", admin_note: "لغو توسط کاربر" }).eq("id", order.id).eq("user_id", userId).in("status", ["pending", "awaiting_payment", "failed"]);
        if (updateError) return NextResponse.json({ error: "لغو سفارش ناموفق بود." }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[social/order/cancel] unexpected error", error);
        return NextResponse.json({ error: "خطایی هنگام لغو سفارش رخ داد." }, { status: 500 });
    }
}
