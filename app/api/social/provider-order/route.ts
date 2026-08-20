import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addFJPanelOrder } from "@/lib/social/fjpanel-orders";

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

        const body = await request.json().catch(() => null) as { orderId?: unknown } | null;
        const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
        if (!orderId) return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });

        const admin = adminClient();
        const { data: order, error: orderError } = await admin
            .from("social_orders")
            .select("id, user_id, service_id, link, quantity, status, provider, provider_order_id")
            .eq("id", orderId)
            .maybeSingle();

        if (orderError) throw new Error(orderError.message);
        if (!order || order.user_id !== userId) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
        if (order.status !== "paid") return NextResponse.json({ error: "این سفارش هنوز پرداخت تأییدشده ندارد." }, { status: 409 });
        if (order.provider_order_id) return NextResponse.json({ success: true, providerOrderId: order.provider_order_id, alreadySubmitted: true });
        if (order.provider !== "fjpanel") return NextResponse.json({ error: "ارائه‌دهنده این سفارش پشتیبانی نمی‌شود." }, { status: 400 });

        const { data: service, error: serviceError } = await admin
            .from("social_services")
            .select("provider_service_id, is_active")
            .eq("id", order.service_id)
            .maybeSingle();
        if (serviceError) throw new Error(serviceError.message);
        if (!service?.is_active || !service.provider_service_id) {
            return NextResponse.json({ error: "شناسه سرویس ارائه‌دهنده معتبر نیست." }, { status: 409 });
        }

        await admin.from("social_orders").update({ status: "processing" }).eq("id", order.id).eq("status", "paid");

        try {
            const provider = await addFJPanelOrder(service.provider_service_id, order.link, order.quantity);
            const { error: updateError } = await admin
                .from("social_orders")
                .update({ provider_order_id: String(provider.order), provider_status: "submitted", status: "processing" })
                .eq("id", order.id);
            if (updateError) throw new Error(updateError.message);
            return NextResponse.json({ success: true, providerOrderId: String(provider.order) });
        } catch (providerError) {
            await admin.from("social_orders").update({ status: "paid", admin_note: providerError instanceof Error ? providerError.message : "ارسال به ارائه‌دهنده ناموفق بود." }).eq("id", order.id);
            throw providerError;
        }
    } catch (error) {
        console.error("[social/provider-order]", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "ارسال سفارش به ارائه‌دهنده ناموفق بود." }, { status: 500 });
    }
}
