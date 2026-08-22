import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { zibalGateway } from "@/lib/payments/zibal";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZIBAL_START_URL = "https://gateway.zibal.ir/start";

function paymentUrl(authority: string) {
  return `${ZIBAL_START_URL}/${encodeURIComponent(authority)}`;
}

export async function POST(request: NextRequest) {
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

    const bodySizeError = rejectOversizedJsonBody(request, 8 * 1024);
    if (bodySizeError) return bodySizeError;

    const rateLimitResponse = await checkRateLimit({
      scope: "payments:zibal:create",
      request,
      userId: user.id,
      limit: 3,
      windowSeconds: 60,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => null);
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
      console.error("[payments/zibal/create] order lookup failed", orderError);
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

    // Treat an existing active payment as the canonical payment attempt for this order.
    // This prevents double gateway requests caused by double-clicks, retries or concurrent tabs.
    const { data: existingActive, error: existingActiveError } = await supabase
      .from("payments")
      .select("id,authority,status")
      .eq("order_id", order.id)
      .in("status", ["pending", "redirected"])
      .limit(1)
      .maybeSingle();

    if (existingActiveError) {
      console.error("[payments/zibal/create] active payment lookup failed", existingActiveError);
      return NextResponse.json({ error: "بررسی درخواست پرداخت ناموفق بود." }, { status: 500 });
    }

    if (existingActive) {
      if (existingActive.status === "redirected" && existingActive.authority) {
        return NextResponse.json({
          paymentId: existingActive.id,
          paymentUrl: paymentUrl(String(existingActive.authority)),
          idempotent: true,
        });
      }

      return NextResponse.json(
        { error: "درخواست پرداخت دیگری برای این سفارش در حال ایجاد است. چند لحظه بعد دوباره تلاش کنید." },
        { status: 409 }
      );
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
      if (paymentError?.code === "23505") {
        const { data: concurrentPayment } = await supabase
          .from("payments")
          .select("id,authority,status")
          .eq("order_id", order.id)
          .in("status", ["pending", "redirected"])
          .limit(1)
          .maybeSingle();

        if (concurrentPayment?.status === "redirected" && concurrentPayment.authority) {
          return NextResponse.json({
            paymentId: concurrentPayment.id,
            paymentUrl: paymentUrl(String(concurrentPayment.authority)),
            idempotent: true,
          });
        }

        return NextResponse.json(
          { error: "درخواست پرداخت دیگری برای این سفارش در حال ایجاد است. چند لحظه بعد دوباره تلاش کنید." },
          { status: 409 }
        );
      }

      console.error("[payments/zibal/create] payment insert failed", paymentError);
      return NextResponse.json({ error: "ایجاد درخواست پرداخت ناموفق بود." }, { status: 500 });
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
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (updateError) {
        console.error("[payments/zibal/create] payment update failed", updateError);
        throw new Error("payment_update_failed");
      }

      return NextResponse.json({ paymentId: payment.id, paymentUrl: result.paymentUrl });
    } catch (gatewayError) {
      console.error("[payments/zibal/create] gateway error", gatewayError);
      await supabase
        .from("payments")
        .update({ status: "failed", gateway_response: { message: "gateway_error" } })
        .eq("id", payment.id)
        .eq("status", "pending");

      return NextResponse.json(
        { error: "ارتباط با درگاه پرداخت ناموفق بود. لطفاً دوباره تلاش کنید." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[payments/zibal/create] unexpected error", error);
    return NextResponse.json({ error: "خطایی در ایجاد پرداخت رخ داد." }, { status: 500 });
  }
}
