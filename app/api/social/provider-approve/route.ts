import { NextRequest, NextResponse } from "next/server";
import { addFJPanelOrder } from "@/lib/social/fjpanel-orders";
import { isNextResponse, requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const adminUser = await requireAdmin(request);
    if (isNextResponse(adminUser)) return adminUser;
    try {
        const bodySizeError = rejectOversizedJsonBody(request, 8 * 1024); if (bodySizeError) return bodySizeError;
        const rateLimitResponse = await checkRateLimit({ scope: "social:provider-approve", request, userId: adminUser.id, limit: 10, windowSeconds: 60 }); if (rateLimitResponse) return rateLimitResponse;
        const body = await request.json().catch((): null => null) as { orderId?: unknown } | null;
        const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
        if (!orderId) return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });
        const admin = supabaseAdmin();
        const { data: order, error } = await admin.from("social_orders").select("id,tracking_code,status,provider,provider_order_id,link,quantity,service_id,admin_approved").eq("id", orderId).maybeSingle();
        if (error) return NextResponse.json({ error: "دریافت سفارش ناموفق بود." }, { status: 500 });
        if (!order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
        if (order.status !== "paid") return NextResponse.json({ error: "فقط سفارش‌های پرداخت‌شده قابل تأیید هستند." }, { status: 409 });
        if (order.admin_approved || order.provider_order_id) return NextResponse.json({ error: "این سفارش قبلاً تأیید یا ارسال شده است." }, { status: 409 });
        if (order.provider !== "fjpanel") return NextResponse.json({ error: "سرویس‌دهنده این سفارش پشتیبانی نمی‌شود." }, { status: 409 });
        const { data: service, error: serviceError } = await admin.from("social_services").select("provider_service_id,is_active").eq("id", order.service_id).maybeSingle();
        if (serviceError) return NextResponse.json({ error: "دریافت سرویس ارائه‌دهنده ناموفق بود." }, { status: 500 });
        if (!service?.is_active || !service.provider_service_id) return NextResponse.json({ error: "سرویس ارائه‌دهنده برای این سفارش معتبر یا فعال نیست." }, { status: 409 });
        const { data: claimed, error: claimError } = await admin.from("social_orders").update({ admin_approved: true, admin_approved_at: new Date().toISOString(), admin_approved_by: adminUser.id, status: "processing", admin_note: "سفارش توسط مدیر تأیید و برای FJPanel ارسال شد." }).eq("id", order.id).eq("status", "paid").eq("admin_approved", false).is("provider_order_id", null).select("id").maybeSingle();
        if (claimError) return NextResponse.json({ error: "قفل‌کردن سفارش برای پردازش ناموفق بود." }, { status: 500 });
        if (!claimed) return NextResponse.json({ error: "این سفارش هم‌اکنون در حال پردازش یا قبلاً ارسال شده است." }, { status: 409 });
        try {
            const provider = await addFJPanelOrder(String(service.provider_service_id), String(order.link), Number(order.quantity));
            const { error: providerUpdateError } = await admin.from("social_orders").update({ provider_order_id: String(provider.order), provider_status: "submitted", status: "processing", admin_note: null, updated_at: new Date().toISOString() }).eq("id", order.id).is("provider_order_id", null);
            if (providerUpdateError) throw new Error("ثبت نتیجه ارسال به ارائه‌دهنده ناموفق بود.");
            return NextResponse.json({ ok: true, provider_order_id: String(provider.order), status: "processing" });
        } catch (providerError) {
            console.error("[social/provider-approve] provider submission failed", providerError);
            await admin.from("social_orders").update({ status: "paid", admin_note: "تأیید انجام شد اما ارسال به FJPanel ناموفق بود." }).eq("id", order.id).eq("status", "processing").is("provider_order_id", null);
            return NextResponse.json({ error: "تأیید انجام شد اما ارسال به FJPanel ناموفق بود." }, { status: 502 });
        }
    } catch (error) {
        console.error("[social/provider-approve] unexpected error", error);
        return NextResponse.json({ error: "تأیید سفارش ناموفق بود." }, { status: 500 });
    }
}
