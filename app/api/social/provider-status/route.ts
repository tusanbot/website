import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getFJPanelOrderStatus } from "@/lib/social/fjpanel-orders";

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

function mapProviderStatus(status: string) {
    const value = status.toLowerCase();
    if (value.includes("complete") || value.includes("completed")) return "completed";
    if (value.includes("cancel") || value.includes("refund")) return "cancelled";
    if (value.includes("partial")) return "partial";
    if (value.includes("fail")) return "failed";
    return "processing";
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
            .select("id, user_id, provider, provider_order_id, status")
            .eq("id", orderId)
            .maybeSingle();
        if (orderError) throw new Error(orderError.message);
        if (!order || order.user_id !== userId) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
        if (order.provider !== "fjpanel" || !order.provider_order_id) return NextResponse.json({ error: "سفارش هنوز شناسه ارائه‌دهنده ندارد." }, { status: 409 });

        const provider = await getFJPanelOrderStatus(String(order.provider_order_id));
        const status = mapProviderStatus(provider.status);
        const { error: updateError } = await admin
            .from("social_orders")
            .update({ provider_status: provider.status, status })
            .eq("id", order.id);
        if (updateError) throw new Error(updateError.message);

        return NextResponse.json({ success: true, status, providerStatus: provider.status, charge: provider.charge, currency: provider.currency });
    } catch (error) {
        console.error("[social/provider-status]", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "دریافت وضعیت سفارش ناموفق بود." }, { status: 500 });
    }
}
