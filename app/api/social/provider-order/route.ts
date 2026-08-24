import { NextRequest, NextResponse } from "next/server";
import { addFJPanelOrder } from "@/lib/social/fjpanel-orders";
import { isNextResponse, requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const adminUser = await requireAdmin(request);
    if (isNextResponse(adminUser)) return adminUser;
    try {
        const body = await request.json().catch((): null => null) as { orderId?: unknown } | null;
        const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
        if (!orderId) return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });
        const admin = supabaseAdmin();
        const { data: order, error: orderError } = await admin.from("social_orders").select("id, service_id, link, quantity, status, provider, provider_order_id").eq("id", orderId).maybeSingle();
        if (orderError) throw new Error(orderError.message);
        if (!order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
        if (order.status !== "paid") return NextResponse.json({ error: "این سفارش هنوز پرداخت تأییدشده ندارد." }, { status: 409 });
        if (order.provider_order_id) return NextResponse.json({ success: true, providerOrderId: order.provider_order_id, alreadySubmitted: true });
        if (order.provider !== "fjpanel") return NextResponse.json({ error: "ارائه‌دهنده این سفارش پشتیبانی نمی‌شود." }, { status: 400 });
        const { data: service, error: serviceError } = await admin.from("social_services").select("provider_service_id, is_active").eq("id", order.service_id).maybeSingle();
        if (serviceError) throw new Error(serviceError.message);
        if (!service?.is_active || !service.provider_service_id) return NextResponse.json({ error: "شناسه سرویس ارائه‌دهنده معتبر نیست." }, { status: 409 });
        const { data: claimed, error: claimError } = await admin.from("social_orders").update({ status: "processing" }).eq("id", order.id).eq("status", "paid").is("provider_order_id", null).select("id").maybeSingle();
        if (claimError) throw new Error(claimError.message);
        if (!claimed) return NextResponse.json({ error: "این سفارش قبلاً در حال پردازش یا ارسال است." }, { status: 409 });
        try {
            const provider = await addFJPanelOrder(String(service.provider_service_id), String(order.link), Number(order.quantity));
            const { error: updateError } = await admin.from("social_orders").update({ provider_order_id: String(provider.order), provider_status: "submitted", status: "processing" }).eq("id", order.id).is("provider_order_id", null);
            if (updateError) throw new Error(updateError.message);
            return NextResponse.json({ success: true, providerOrderId: String(provider.order) });
        } catch (providerError) {
            await admin.from("social_orders").update({ status: "paid", admin_note: providerError instanceof Error ? providerError.message : "ارسال به ارائه‌دهنده ناموفق بود." }).eq("id", order.id).eq("status", "processing").is("provider_order_id", null);
            throw providerError;
        }
    } catch (error) {
        console.error("[social/provider-order]", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "ارسال سفارش به ارائه‌دهنده ناموفق بود." }, { status: 500 });
    }
}
