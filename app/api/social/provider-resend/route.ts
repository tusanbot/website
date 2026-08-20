import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addFJPanelOrder } from "@/lib/social/fjpanel-orders";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const orderId = String(body?.orderId || "");
    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const { data: order, error } = await supabase.from("social_orders").select("id,status,provider_order_id,link,quantity,service_id").eq("id", orderId).single();
    if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!["failed", "cancelled"].includes(String(order.status))) return NextResponse.json({ error: "Only failed or cancelled orders can be resent" }, { status: 409 });
    if (order.provider_order_id) return NextResponse.json({ error: "Provider order already exists; refusing duplicate submission" }, { status: 409 });

    const { data: service } = await supabase.from("social_services").select("provider_service_id").eq("id", order.service_id).single();
    if (!service?.provider_service_id) return NextResponse.json({ error: "Provider service is not configured" }, { status: 409 });

    const provider = await addFJPanelOrder(String(service.provider_service_id), String(order.link), Number(order.quantity));
    const { error: updateError } = await supabase.from("social_orders").update({ provider_order_id: String(provider.order), status: "processing", updated_at: new Date().toISOString() }).eq("id", order.id).is("provider_order_id", null);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ ok: true, provider_order_id: provider.order, status: "processing" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Resend failed" }, { status: 500 });
  }
}
