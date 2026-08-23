import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_KEYS = new Set(["business", "social", "display", "orders", "announcements", "pricing"]);

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  const { data, error } = await supabaseAdmin().from("site_settings").select("site_name,site_description,theme,primary_color,primary_dark,radius,font_family,config,updated_at").limit(1).single();
  if (error) return NextResponse.json({ success: false, error: "دریافت تنظیمات ناموفق بود." }, { status: 500 });
  return NextResponse.json({ success: true, settings: data });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ success: false, error: "اطلاعات درخواست نامعتبر است." }, { status: 400 });
    const current = await supabaseAdmin().from("site_settings").select("id,config").limit(1).single();
    if (current.error) throw current.error;
    const update: Record<string, unknown> = {};
    for (const key of ["site_name", "site_description", "theme", "primary_color", "primary_dark", "radius", "font_family"]) {
      if (key in body && typeof body[key] === "string") update[key] = body[key];
    }
    const nextConfig: Record<string, unknown> = current.data?.config || {};
    if (body.config && typeof body.config === "object" && !Array.isArray(body.config)) {
      for (const [key, value] of Object.entries(body.config)) if (ALLOWED_KEYS.has(key)) nextConfig[key] = value;
    }
    update.config = nextConfig;
    update.updated_at = new Date().toISOString();
    const { error } = await supabaseAdmin().from("site_settings").update(update).eq("id", current.data.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/site-settings] update failed", { adminId: admin.id, error });
    return NextResponse.json({ success: false, error: "ذخیره تنظیمات ناموفق بود." }, { status: 500 });
  }
}
