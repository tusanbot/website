import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requestZibalPayment, zibalStartUrl } from "@/lib/social/zibal";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase server configuration is incomplete");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function getUserId(request: NextRequest) {
    const authorization = request.headers.get("authorization"); if (!authorization?.startsWith("Bearer ")) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !anonKey) return null;
    const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(); return error || !data.user ? null : data.user.id;
}
function siteUrl(request: NextRequest) { return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || request.nextUrl.origin; }

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request); if (!userId) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });
        const bodySizeError = rejectOversizedJsonBody(request, 8 * 1024); if (bodySizeError) return bodySizeError;
        const rateLimitResponse = await checkRateLimit({ scope: "social:payment:request", request, userId, limit: 3, windowSeconds: 60 }); if (rateLimitResponse) return rateLimitResponse;
        const body = await request.json().catch((): null => null) as { orderId?: unknown } | null;
        const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : ""; if (!orderId) return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });
        const admin = adminClient();
        const { data: order, error } = await admin.from("social_orders").select("id,user_id,tracking_code,price,status,payment_track_id,payment_provider,updated_at").eq("id", orderId).maybeSingle();
        if (error) return NextResponse.json({ error: "دریافت سفارش ناموفق بود." }, { status: 500 });
        if (!order || order.user_id !== userId) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
        if (order.status === "awaiting_payment" && order.payment_track_id && order.payment_provider === "zibal") return NextResponse.json({ success: true, paymentUrl: zibalStartUrl(Number(order.payment_track_id)), trackId: Number(order.payment_track_id), idempotent: true });
        const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        if (order.status === "awaiting_payment" && !order.payment_track_id) {
            if (order.updated_at && order.updated_at > staleBefore) return NextResponse.json({ error: "درخواست پرداخت دیگری در حال ایجاد است. چند لحظه بعد دوباره تلاش کنید." }, { status: 409 });
        } else if (!["pending", "failed", "cancelled"].includes(order.status)) return NextResponse.json({ error: "این سفارش در وضعیت قابل پرداخت نیست." }, { status: 409 });
        let claimQuery = admin.from("social_orders").update({ status: "awaiting_payment", payment_provider: "zibal", payment_track_id: null, payment_reference: null, paid_at: null, admin_note: null }).eq("id", order.id);
        if (order.status === "awaiting_payment") claimQuery = claimQuery.eq("status", "awaiting_payment").lt("updated_at", staleBefore) as typeof claimQuery;
        else claimQuery = claimQuery.in("status", ["pending", "failed", "cancelled"]) as typeof claimQuery;
        const { data: claimedOrder, error: claimError } = await claimQuery.select("id").maybeSingle();
        if (claimError) return NextResponse.json({ error: "قفل‌کردن درخواست پرداخت ناموفق بود." }, { status: 500 });
        if (!claimedOrder) return NextResponse.json({ error: "درخواست پرداخت دیگری در حال پردازش است. چند لحظه بعد دوباره تلاش کنید." }, { status: 409 });
        const priceInToman = Number(order.price); const amount = Math.round(priceInToman * 10);
        if (!Number.isSafeInteger(amount) || amount < 10000) { await admin.from("social_orders").update({ status: "failed" }).eq("id", order.id).eq("status", "awaiting_payment").is("payment_track_id", null); return NextResponse.json({ error: "مبلغ سفارش برای پرداخت معتبر نیست." }, { status: 409 }); }
        try {
            const payment = await requestZibalPayment({ amount, callbackUrl: `${siteUrl(request)}/api/social/payment/callback?orderId=${encodeURIComponent(order.id)}`, description: `پرداخت سفارش خدمات شبکه اجتماعی ${order.tracking_code}`, orderId: order.tracking_code });
            const { error: updateError } = await admin.from("social_orders").update({ status: "awaiting_payment", payment_provider: "zibal", payment_track_id: String(payment.trackId), payment_reference: null, paid_at: null, admin_note: null }).eq("id", order.id).eq("status", "awaiting_payment").is("payment_track_id", null);
            if (updateError) { await admin.from("social_orders").update({ status: "failed" }).eq("id", order.id).eq("status", "awaiting_payment").is("payment_track_id", null); return NextResponse.json({ error: "ثبت درخواست پرداخت ناموفق بود." }, { status: 500 }); }
            return NextResponse.json({ success: true, paymentUrl: zibalStartUrl(payment.trackId), trackId: payment.trackId });
        } catch (gatewayError) {
            console.error("[social/payment/request] gateway error", gatewayError);
            await admin.from("social_orders").update({ status: "failed" }).eq("id", order.id).eq("status", "awaiting_payment").is("payment_track_id", null);
            return NextResponse.json({ error: "ارتباط با درگاه پرداخت ناموفق بود. لطفاً دوباره تلاش کنید." }, { status: 502 });
        }
    } catch (error) {
        console.error("[social/payment/request] unexpected error", error);
        return NextResponse.json({ error: "ایجاد پرداخت ناموفق بود." }, { status: 500 });
    }
}
