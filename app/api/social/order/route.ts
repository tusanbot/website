import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase server configuration is incomplete");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function parseQuantity(value: unknown) {
    const quantity = Number(value);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}

function calculatePrice(rate: number | null, quantity: number) {
    if (rate == null) return null;

    // FJPanel rate is stored in Toman and represents the provider price for ONE unit.
    // Customer price is exactly 2x the provider price.
    return rate * quantity * 2;
}

function makeTrackingCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `SOC-${timestamp}-${random}`;
}

function validTargetUrl(value: unknown) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
        const url = new URL(value.trim());
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

async function getUserId(request: NextRequest) {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return null;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

    const authClient = createClient(url, anonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: "برای ثبت سفارش ابتدا وارد حساب کاربری شوید." }, { status: 401 });
        }

        const body = await request.json().catch(() => null) as { serviceId?: unknown; link?: unknown; quantity?: unknown } | null;
        const serviceId = typeof body?.serviceId === "string" ? body.serviceId.trim() : "";
        const link = typeof body?.link === "string" ? body.link.trim() : "";
        const quantity = parseQuantity(body?.quantity);

        if (!serviceId) return NextResponse.json({ error: "سرویس انتخاب نشده است." }, { status: 400 });
        if (!validTargetUrl(link)) return NextResponse.json({ error: "لینک واردشده معتبر نیست." }, { status: 400 });
        if (!quantity) return NextResponse.json({ error: "تعداد سفارش معتبر نیست." }, { status: 400 });

        const admin = getAdminClient();
        const { data: service, error: serviceError } = await admin
            .from("social_services")
            .select("id, provider, provider_service_id, name, provider_rate, min_quantity, max_quantity, profit_type, profit_value, is_active")
            .eq("id", serviceId)
            .eq("is_active", true)
            .maybeSingle();

        if (serviceError) throw new Error(serviceError.message);
        if (!service) return NextResponse.json({ error: "این سرویس فعال نیست یا پیدا نشد." }, { status: 404 });
        if (quantity < service.min_quantity || quantity > service.max_quantity) {
            return NextResponse.json({ error: `تعداد باید بین ${service.min_quantity.toLocaleString("fa-IR")} و ${service.max_quantity.toLocaleString("fa-IR")} باشد.` }, { status: 400 });
        }

        const price = calculatePrice(
            service.provider_rate == null ? null : Number(service.provider_rate),
            quantity,
        );

        if (price == null || !Number.isFinite(price) || price < 0) {
            return NextResponse.json({ error: "قیمت این سرویس در حال حاضر قابل محاسبه نیست." }, { status: 409 });
        }

        const trackingCode = makeTrackingCode();
        const { data: order, error: orderError } = await admin
            .from("social_orders")
            .insert({
                tracking_code: trackingCode,
                user_id: userId,
                service_id: service.id,
                provider: service.provider || "fjpanel",
                link,
                quantity,
                // social_orders.price is stored in Toman. Convert to Rial only at the payment gateway boundary.
                price: Math.round(price * 100) / 100,
                status: "pending",
            })
            .select("id, tracking_code, service_id, quantity, price, status, created_at")
            .single();

        if (orderError) throw new Error(orderError.message);

        return NextResponse.json({ success: true, order });
    } catch (error) {
        console.error("[social/order]", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته در ایجاد سفارش" }, { status: 500 });
    }
}
