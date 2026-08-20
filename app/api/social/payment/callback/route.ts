import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyZibalPayment } from "@/lib/social/zibal";
import { addFJPanelOrder } from "@/lib/social/fjpanel-orders";

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
    const trackId = Number(trackIdRaw);
    if (!orderId || !Number.isSafeInteger(trackId) || trackId <= 0) {
        return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=failed`);
    }

    try {
        const admin = adminClient();
        const { data: order, error } = await admin.from("social_orders")
            .select("id,tracking_code,user_id,service_id,link,quantity,price,status,payment_track_id,payment_provider,provider,provider_order_id")
            .eq("id", orderId).maybeSingle();
        if (error) throw new Error(error.message);
        if (!order || order.payment_provider !== "zibal" || String(order.payment_track_id) !== String(trackId)) {
            return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=failed`);
        }
        if (["processing", "completed", "partial"].includes(order.status)) {
            return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=success&order=${encodeURIComponent(order.id)}`);
        }

        const verification = await verifyZibalPayment(trackId);
        const expectedAmount = Math.round(Number(order.price));
        const amountMatches = Number.isFinite(verification.amount) && verification.amount === expectedAmount;

        if (!verification.success || !amountMatches) {
            await admin.from("social_orders").update({
                status: "failed",
                admin_note: !verification.success ? `Zibal verify failed: ${verification.message || verification.result}` : "مبلغ پرداخت‌شده با مبلغ سفارش مطابقت ندارد.",
            }).eq("id", order.id).in("status", ["pending", "awaiting_payment"]);
            return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=failed&order=${encodeURIComponent(order.id)}`);
        }

        const { error: updateError } = await admin.from("social_orders").update({
            status: "paid",
            payment_reference: verification.referenceNumber,
            paid_at: new Date().toISOString(),
        }).eq("id", order.id).in("status", ["pending", "awaiting_payment"]);
        if (updateError) throw new Error(updateError.message);

        // Send paid orders to FJPanel server-side. If provider submission fails,
        // preserve the paid state so it can be retried without losing the payment.
        if (order.provider === "fjpanel" && !order.provider_order_id) {
            const { data: service, error: serviceError } = await admin.from("social_services")
                .select("provider_service_id,is_active")
                .eq("id", order.service_id).maybeSingle();
            if (serviceError) throw new Error(serviceError.message);
            if (!service?.is_active || !service.provider_service_id) {
                await admin.from("social_orders").update({ admin_note: "پرداخت موفق بود اما شناسه سرویس ارائه‌دهنده معتبر نیست." }).eq("id", order.id);
            } else {
                try {
                    await admin.from("social_orders").update({ status: "processing" }).eq("id", order.id).eq("status", "paid");
                    const provider = await addFJPanelOrder(service.provider_service_id, order.link, order.quantity);
                    await admin.from("social_orders").update({
                        provider_order_id: String(provider.order),
                        provider_status: "submitted",
                        status: "processing",
                        admin_note: null,
                    }).eq("id", order.id);
                } catch (providerError) {
                    await admin.from("social_orders").update({
                        status: "paid",
                        admin_note: providerError instanceof Error ? `ارسال به FJPanel پس از پرداخت ناموفق بود: ${providerError.message}` : "ارسال به FJPanel پس از پرداخت ناموفق بود.",
                    }).eq("id", order.id);
                }
            }
        }

        return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=success&order=${encodeURIComponent(order.id)}`);
    } catch (error) {
        console.error("[social/payment/callback]", error);
        return NextResponse.redirect(`${siteUrl(request)}/social/orders?payment=failed`);
    }
}
