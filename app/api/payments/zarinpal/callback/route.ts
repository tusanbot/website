import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { zarinpalGateway } from "@/lib/payments/zarinpal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://tusancn.ir").replace(/\/+$/, "");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authority = url.searchParams.get("Authority") || url.searchParams.get("authority") || "";
  const status = (url.searchParams.get("Status") || "").toUpperCase();
  if (!authority) return NextResponse.redirect(new URL("/orders?payment=failed&reason=missing_authority", PUBLIC_SITE_URL));

  try {
    const supabase = supabaseAdmin();
    const { data: payment, error: paymentError } = await supabase.from("payments")
      .select("id,order_id,user_id,amount,status,authority,gateway")
      .eq("gateway", "zarinpal").eq("authority", authority).single();
    if (paymentError || !payment) return NextResponse.redirect(new URL("/orders?payment=failed&reason=payment_not_found", PUBLIC_SITE_URL));
    if (payment.status === "paid") return NextResponse.redirect(new URL(`/orders/${payment.order_id}?payment=success`, PUBLIC_SITE_URL));

    if (status !== "OK") {
      await supabase.from("payments").update({ status: "failed", gateway_response: { callback_status: status || "unknown" } })
        .eq("id", payment.id).neq("status", "paid");
      return NextResponse.redirect(new URL(`/orders/${payment.order_id}?payment=failed`, PUBLIC_SITE_URL));
    }

    const result = await zarinpalGateway.verifyPayment(authority, Number(payment.amount));
    if (!result.success) {
      await supabase.from("payments").update({ status: "failed", gateway_response: result.raw ?? null })
        .eq("id", payment.id).neq("status", "paid");
      return NextResponse.redirect(new URL(`/orders/${payment.order_id}?payment=failed`, url.origin));
    }

    const { data: paidPayment, error: updatePaymentError } = await supabase.from("payments").update({
      status: "paid", transaction_id: result.transactionId || null, gateway_response: result.raw ?? null, paid_at: new Date().toISOString(),
    }).eq("id", payment.id).neq("status", "paid").select("id").maybeSingle();
    if (updatePaymentError) throw new Error(updatePaymentError.message);

    if (paidPayment) {
      const { error: orderUpdateError } = await supabase.from("orders").update({ status: "checking", updated_at: new Date().toISOString() })
        .eq("id", payment.order_id).in("status", ["pending_payment", "registered", "checking"]);
      if (orderUpdateError) throw new Error(orderUpdateError.message);
    }

    return NextResponse.redirect(new URL(`/orders/${payment.order_id}?payment=success`, url.origin));
  } catch (error) {
    console.error("ZarinPal callback error:", error);
    return NextResponse.redirect(new URL("/orders?payment=failed&reason=server_error", PUBLIC_SITE_URL));
  }
}
