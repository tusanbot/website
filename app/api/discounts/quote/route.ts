import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { evaluateDiscounts } from "@/lib/discounts/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "برای بررسی تخفیف ابتدا وارد حساب شوید." }, { status: 401 });

    const body = await request.json() as { serviceId?: string; originalAmount?: number; code?: string | null };
    if (!body.serviceId) return NextResponse.json({ error: "خدمت مشخص نشده است." }, { status: 400 });

    const result = await evaluateDiscounts({
      userId: user.id,
      serviceId: body.serviceId,
      originalAmount: Number(body.originalAmount || 0),
      code: body.code,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "خطا در بررسی تخفیف." }, { status: 400 });
  }
}
