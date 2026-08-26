import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin();
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "احراز هویت الزامی است." }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "نشست کاربر معتبر نیست." }, { status: 401 });
    }

    const bodySizeError = rejectOversizedJsonBody(request, 8 * 1024);
    if (bodySizeError) return bodySizeError;

    const rateLimitResponse = await checkRateLimit({
      scope: "payments:card-to-card:create",
      request,
      userId: user.id,
      limit: 5,
      windowSeconds: 60,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch((): null => null);
    const orderId = String(body?.orderId || "").trim();
    if (!orderId) return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,user_id,price,status")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });

    const amount = Number(order.price || 0);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "مبلغ سفارش معتبر نیست." }, { status: 400 });
    }
    if (["cancelled", "completed"].includes(order.status)) {
      return NextResponse.json({ error: "این سفارش دیگر قابل پرداخت نیست." }, { status: 409 });
    }

    const { data: existingPaid } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();
    if (existingPaid) return NextResponse.json({ error: "این سفارش قبلاً پرداخت شده است." }, { status: 409 });

    const { data: existing, error: existingError } = await supabase
      .from("payments")
      .select("id,status")
      .eq("order_id", order.id)
      .eq("method", "card_to_card")
      .in("status", ["pending", "awaiting_manual_verification"])
      .limit(1)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: "بررسی پرداخت ناموفق بود." }, { status: 500 });

    if (existing) {
      return NextResponse.json({ paymentId: existing.id, status: existing.status, idempotent: true });
    }

    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        user_id: user.id,
        amount,
        method: "card_to_card",
        gateway: "manual",
        status: "awaiting_manual_verification",
      })
      .select("id,status")
      .single();

    if (insertError || !payment) {
      if (insertError?.code === "23505") {
        const { data: concurrent } = await supabase
          .from("payments")
          .select("id,status")
          .eq("order_id", order.id)
          .eq("method", "card_to_card")
          .in("status", ["pending", "awaiting_manual_verification"])
          .limit(1)
          .maybeSingle();
        if (concurrent) return NextResponse.json({ paymentId: concurrent.id, status: concurrent.status, idempotent: true });
      }
      return NextResponse.json({ error: "ثبت پرداخت کارت به کارت ناموفق بود." }, { status: 500 });
    }

    return NextResponse.json({ paymentId: payment.id, status: payment.status });
  } catch (error) {
    console.error("[payments/card-to-card/create] unexpected error", error);
    return NextResponse.json({ error: "خطایی در ثبت پرداخت رخ داد." }, { status: 500 });
  }
}
