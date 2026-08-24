import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addFJPanelOrder } from "@/lib/social/fjpanel-orders";

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
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request); if (!userId) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });
    const body = await request.json().catch((): null => null) as { orderId?: unknown } | null;
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : ""; if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    const admin = adminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "دسترسی مدیر لازم است." }, { status: 403 });
    const { data: order, error } = await admin.from("social_orders").select("id,status,provider_order_id,link,quantity,service_id").eq("id", orderId).single();
    if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!["failed", "cancelled"].includes(String(order.status))) return NextResponse.json({ error: "Only failed or cancelled orders can be resent" }, { status: 409 });
    if (order.provider_order_id) return NextResponse.json({ error: "Provider order already exists; refusing duplicate submission" }, { status: 409 });
    const { data: service } = await admin.from("social_services").select("provider_service_id").eq("id", order.service_id).single();
    if (!service?.provider_service_id) return NextResponse.json({ error: "Provider service is not configured" }, { status: 409 });
    const provider = await addFJPanelOrder(String(service.provider_service_id), String(order.link), Number(order.quantity));
    const { error: updateError } = await admin.from("social_orders").update({ provider_order_id: String(provider.order), status: "processing", updated_at: new Date().toISOString() }).eq("id", order.id).is("provider_order_id", null);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ ok: true, provider_order_id: provider.order, status: "processing" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Resend failed" }, { status: 500 });
  }
}
