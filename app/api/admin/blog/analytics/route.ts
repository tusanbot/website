import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "manager") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
  }
  const rawDays = Number(request.nextUrl.searchParams.get("days") || "30");
  const days = Number.isFinite(rawDays) ? Math.max(7, Math.min(365, Math.trunc(rawDays))) : 30;
  const { data, error } = await supabase.rpc("blog_admin_analytics", { p_days: days });
  if (error) return NextResponse.json({ error: "دریافت آمار وبلاگ ناموفق بود" }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
