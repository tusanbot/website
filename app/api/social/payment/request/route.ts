import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requestZibalPayment, zibalStartUrl } from "@/lib/social/zibal";

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
    const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser();
    return error || !data.user ? null : data.user.id;
}

function siteUrl(request: NextRequest) {
    return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);
        if (!userId) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });
        const body = await request.json().catch(() => null) as { orderId?: unknown } | null;
        const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
        if (!orderId) return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });

        const admin = adminClient();
        const { data: order, error } = await admin.from("social_orders")
            .select("id,user_id,tracking_code,price,status,payment_track_id,payment_provider")
            .eq("id", orderId).maybeSingle();
        if (error) throw new Error(error.message);
        if (!order || order.user_id !== userId) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
        if (!["pending", "awaiting_payment"].includes(order.status)) return NextResponse.json({ error: "این سفارش در وضعیت قابل پرداخت نیست." }, { status: 409 });
        if (order.payment_track_id && order.payment_provider === "zibal") {
            return NextResponse.json({ success: true, paymentUrl: zibalStartUrl(Number(order.payment_track_id)), trackId: Number(order.payment_track_id) });
        }

        const amount = Math.round(Number(order.price));
        if (!Number.isSafeInteger(amount) || amount < 1000) return NextResponse.json({ error: "مبلغ سفارش برای پرداخت معتبر نیست." }, { status: 409 });

        const payment = await requestZibalPayment({
            amount,
            callbackUrl: `${siteUrl(request)}/api/social/payment/callback?orderId=${encodeURIComponent(order.id)}`,
            description: `پرداخت سفارش خدمات شبکه اجتماعی ${order.tracking_code}`,
            orderId: order.tracking_code,
        });

        const { error: updateError } = await admin.from("social_orders").update({
            status: "awaiting_payment",
            payment_provider: "zibal",
            payment_track_id: String(payment.trackId),
        }).eq("id", order.id).in("status", ["pending", "awaiting_payment"]);
        if (updateError) throw new Error(updateError.message);

        return NextResponse.json({ success: true, paymentUrl: zibalStartUrl(payment.trackId), trackId: payment.trackId });
    } catch (error) {
        console.error("[social/payment/request]", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "ایجاد پرداخت ناموفق بود." }, { status: 500 });
    }
}
