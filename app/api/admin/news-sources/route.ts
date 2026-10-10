import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function requireManager() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "manager") return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { supabase };
}
export async function POST(request: NextRequest) {
  const auth = await requireManager();
  if (!auth.supabase) return auth.response;
  const body = await request.json().catch(() => null) as { name?: string; url?: string; category?: string; source_type?: string } | null;
  const name = body?.name?.trim().slice(0, 120);
  const sourceUrl = body?.url?.trim();
  const category = body?.category || "general";
  const sourceType = body?.source_type || "rss";
  if (!name || !sourceUrl || !["general", "education", "employment", "government", "registration", "finance", "exams"].includes(category) || !["rss", "website", "api"].includes(sourceType)) {
    return NextResponse.json({ error: "نام، نشانی و دسته‌بندی معتبر وارد کنید." }, { status: 400 });
  }
  let parsed: URL;
  try { parsed = new URL(sourceUrl); } catch { return NextResponse.json({ error: "نشانی منبع معتبر نیست." }, { status: 400 }); }
  if (!["https:", "http:"].includes(parsed.protocol)) return NextResponse.json({ error: "فقط نشانی HTTP یا HTTPS مجاز است." }, { status: 400 });
  const { data, error } = await auth.supabase.from("news_sources").insert({ name, url: parsed.toString(), category, source_type: sourceType, is_active: true }).select("id,name,url,category,source_type,is_active,last_checked_at,last_error").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "این منبع قبلاً ثبت شده است." : error.message }, { status: 400 });
  return NextResponse.json({ source: data }, { status: 201 });
}
