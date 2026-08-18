import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { zibalGateway } from "@/lib/payments/zibal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getParam(url: URL, name: string) {
  return url.searchParams.get(name) || "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authority = getParam(url, "trackId") || getParam(url, "trackid") || getParam(url, "authority");
  const orderId = getParam(url, "orderId");

  if (!authority) {
    return NextResponse.redirect(new URL("/orders?payment=failed&reason=missing_authority", url.origin));
  }

  try {
    const supabase = supabaseAdmin();
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id,order_id,user_id,amount,status,authority")
      .eq("gateway", "zibal")
      .eq("authority", authority)
      .single();

    if (paymentError || !payment) {
      return NextResponse.redirect(new URL("/orders?payment=failed&reason=payment_not_found", url.origin));
    }

    if (payment.status === "paid") {
      return NextResponse.redirect(new URL(`/orders/${payment.order_id}?payment=success`, url.origin));
    }

    if (orderId && orderId !== payment.order_id) {
      return NextResponse.redirect(new URL(`/orders/${payment.order_id}?payment=failed&reason=order_mismatch`, url.origin));
    }

    const result = await zibalGateway.verifyPayment(authority, Number(payment.amount));

    if (!result.success) {
      await supabase
        .from("payments")
        .update({ status: "failed", gateway_response: result.raw ?? null })
        .eq("id", payment.id)
        .neq("status", "paid");

      return NextResponse.redirect(new URL(`/orders/${payment.order_id}?payment=failed`, url.origin));
    }

    const { data: paidPayment, error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        status: "paid",
        transaction_id: result.transactionId || null,
        gateway_response: result.raw ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .neq("status", "paid")
      .select("id")
      .maybeSingle();

    if (updatePaymentError) throw new Error(updatePaymentError.message);

    if (paidPayment) {
      // Only a verified payment is allowed to move the order forward.
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({ status: "checking", updated_at: new Date().toISOString() })
        .eq("id", payment.order_id)
        .in("status", ["registered", "checking"]);

      if (orderUpdateError) throw new Error(orderUpdateError.message);
    }

    return NextResponse.redirect(new URL(`/orders/${payment.order_id}?payment=success`, url.origin));
  } catch (error) {
    console.error("Zibal callback error:", error);
    return NextResponse.redirect(new URL("/orders?payment=failed&reason=server_error", url.origin));
  }
}
