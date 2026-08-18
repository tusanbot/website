import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { zibalGateway } from "@/lib/payments/zibal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin();
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "احراز هویت الزامی است." }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "نشست کاربر معتبر نیست." }, { status: 401 });
    }

    const body = await request.json();
    const orderId = String(body?.orderId || "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,user_id,price,status,tracking_code")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
    }

    const amount = Number(order.price || 0);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "مبلغ سفارش معتبر نیست." }, { status: 400 });
    }

    const { data: existingPaid } = await supabase
      .from("payments")
      .select("id,transaction_id")
      .eq("order_id", order.id)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();

    if (existingPaid) {
      return NextResponse.json({ error: "این سفارش قبلاً پرداخت شده است." }, { status: 409 });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        user_id: user.id,
        amount,
        method: "online",
        gateway: "zibal",
        status: "pending",
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      throw new Error(paymentError?.message || "رکورد پرداخت ایجاد نشد.");
    }

    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/api/payments/zibal/callback`;

    try {
      const result = await zibalGateway.createPayment({
        paymentId: payment.id,
        orderId: order.id,
        amount,
        callbackUrl,
        description: `پرداخت سفارش ${order.tracking_code || order.id}`,
      });

      const { error: updateError } = await supabase
        .from("payments")
        .update({
          authority: result.authority,
          status: "redirected",
        })
        .eq("id", payment.id)
        .eq("user_id", user.id);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({ paymentId: payment.id, paymentUrl: result.paymentUrl });
    } catch (gatewayError) {
      await supabase
        .from("payments")
        .update({ status: "failed", gateway_response: { message: gatewayError instanceof Error ? gatewayError.message : "Gateway error" } })
        .eq("id", payment.id);
      throw gatewayError;
    }
  } catch (error) {
    console.error("Zibal create payment error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطا در ایجاد پرداخت." }, { status: 500 });
  }
}
