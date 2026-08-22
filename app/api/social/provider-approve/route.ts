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
    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const admin = adminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "دسترسی مدیر لازم است." }, { status: 403 });

    const { data: order, error } = await admin.from("social_orders")
      .select("id,tracking_code,status,provider,provider_order_id,link,quantity,service_id,admin_approved")
      .eq("id", orderId).single();
    if (error || !order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
    if (order.status !== "paid") return NextResponse.json({ error: "فقط سفارش‌های پرداخت‌شده قابل تأیید هستند." }, { status: 409 });
    if (order.admin_approved) return NextResponse.json({ error: "این سفارش قبلاً تأیید شده است." }, { status: 409 });
    if (order.provider_order_id) return NextResponse.json({ error: "این سفارش قبلاً به سرویس‌دهنده ارسال شده است." }, { status: 409 });
    if (order.provider !== "fjpanel") return NextResponse.json({ error: "سرویس‌دهنده این سفارش FJPanel نیست." }, { status: 409 });

    const { data: service } = await admin.from("social_services")
      .select("provider_service_id,is_active")
      .eq("id", order.service_id).single();
    if (!service?.is_active || !service.provider_service_id) {
      return NextResponse.json({ error: "سرویس FJPanel برای این سفارش معتبر یا فعال نیست." }, { status: 409 });
    }

    const { error: approvalError } = await admin.from("social_orders").update({
      admin_approved: true,
      admin_approved_at: new Date().toISOString(),
      admin_approved_by: userId,
      status: "processing",
      admin_note: "سفارش توسط مدیر تأیید و برای FJPanel ارسال شد.",
    }).eq("id", order.id).eq("status", "paid").eq("admin_approved", false).is("provider_order_id", null);
    if (approvalError) return NextResponse.json({ error: approvalError.message }, { status: 500 });

    try {
      const provider = await addFJPanelOrder(String(service.provider_service_id), String(order.link), Number(order.quantity));
      const { error: providerUpdateError } = await admin.from("social_orders").update({
        provider_order_id: String(provider.order),
        provider_status: "submitted",
        status: "processing",
        admin_note: null,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id).is("provider_order_id", null);

      if (providerUpdateError) throw new Error(providerUpdateError.message);
      return NextResponse.json({ ok: true, provider_order_id: String(provider.order), status: "processing" });
    } catch (providerError) {
      await admin.from("social_orders").update({
        status: "paid",
        admin_note: providerError instanceof Error
          ? `سفارش تأیید شد اما ارسال به FJPanel ناموفق بود: ${providerError.message}`
          : "سفارش تأیید شد اما ارسال به FJPanel ناموفق بود.",
      }).eq("id", order.id);
      return NextResponse.json({ error: "تأیید انجام شد اما ارسال به FJPanel ناموفق بود." }, { status: 502 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Approval failed" }, { status: 500 });
  }
}
