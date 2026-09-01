import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });

  const { data, error } = await supabase.rpc("get_order_files_for_current_user", { p_order_id: orderId });
  if (error) {
    console.error("خطا در دریافت فایل‌های سفارش:", error);
    const status = error.message?.includes("دسترسی") ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "دسترسی به مدارک این سفارش مجاز نیست." : "دریافت فایل‌های سفارش ناموفق بود." }, { status });
  }

  return NextResponse.json({ files: data ?? [] });
}
