import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyZibalPayment } from "@/lib/social/zibal";

export const dynamic = "force-dynamic";

function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase server configuration is incomplete");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function siteUrl(request: NextRequest) {
    return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
    const orderId = request.nextUrl.searchParams.get("orderId")?.trim() || "";
    const trackIdRaw = request.nextUrl.searchParams.get("trackId")?.trim() || "";
    const callbackStatusRaw = request.nextUrl.searchParams.get("status")?.trim() || "";
    const trackId = Number(trackIdRaw);
    const callbackStatus = Number(callbackStatusRaw);

    if (!orderId || !Number.isSafeInteger(trackId) || trackId <= 0) {
        return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=failed&reason=invalid_callback`);
    }

    try {
        const admin = adminClient();
        const { data: order, error } = await admin.from("social_orders")
            .select("id,tracking_code,user_id,service_id,link,quantity,price,status,payment_track_id,payment_provider,provider,provider_order_id,admin_approved")
            .eq("id", orderId).maybeSingle();

        if (error) throw new Error(error.message);
        if (!order || order.payment_provider !== "zibal" || String(order.payment_track_id) !== String(trackId)) {
            return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=failed&reason=payment_not_found`);
        }

        if (callbackStatus === 3) {
            await admin.from("social_orders").update({
                status: "cancelled",
                admin_note: "پرداخت توسط کاربر لغو شد.",
            }).eq("id", order.id).in("status", ["pending", "awaiting_payment"]);

            return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=cancelled&order=${encodeURIComponent(order.id)}`);
        }

        if (["processing", "completed", "partial"].includes(order.status)) {
            return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=success&order=${encodeURIComponent(order.id)}`);
        }

        const verification = await verifyZibalPayment(trackId);
        const expectedAmount = Math.round(Number(order.price) * 10);
        const amountMatches = Number.isFinite(verification.amount) && verification.amount === expectedAmount;

        if (!verification.success || !amountMatches) {
            const reason = !verification.success
                ? `Zibal verify failed: ${verification.message || verification.result}`
                : "مبلغ پرداخت‌شده با مبلغ سفارش مطابقت ندارد.";

            await admin.from("social_orders").update({
                status: "failed",
                admin_note: reason,
            }).eq("id", order.id).in("status", ["pending", "awaiting_payment"]);

            return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=failed&order=${encodeURIComponent(order.id)}`);
        }

        const { error: updateError } = await admin.from("social_orders").update({
            status: "paid",
            payment_reference: verification.referenceNumber,
            paid_at: new Date().toISOString(),
            admin_approved: false,
            admin_approved_at: null,
            admin_approved_by: null,
            admin_note: "پرداخت با موفقیت تأیید شد و سفارش در انتظار تأیید مدیر است.",
        }).eq("id", order.id).in("status", ["pending", "awaiting_payment"]);

        if (updateError) throw new Error(updateError.message);

        // Important: payment success does NOT submit the order to FJPanel.
        // An authenticated admin must explicitly approve it through the admin API.
        return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=success&order=${encodeURIComponent(order.id)}`);
    } catch (error) {
        console.error("[social/payment/callback]", error);
        return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=failed&reason=server_error`);
    }
}
