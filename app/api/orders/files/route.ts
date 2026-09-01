import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function authorizeOrder(orderId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "احراز هویت لازم است.", status: 401 as const };

  const customer = await supabase.rpc("get_customer_order_detail", { p_order_id: orderId });
  if (customer.data) return { user: userData.user };

  const staff = await supabase.rpc("get_staff_order_detail", { p_order_id: orderId });
  if (staff.data) return { user: userData.user };

  return { error: "دسترسی به مدارک این سفارش مجاز نیست.", status: 403 as const };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });

  const auth = await authorizeOrder(orderId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("order_files")
    .select("id,order_id,file_title,file_name,file_path,file_type,file_size,uploaded_by,created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "دریافت فایل‌های سفارش ناموفق بود." }, { status: 500 });
  return NextResponse.json({ files: data ?? [] });
}
