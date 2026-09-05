import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { encryptApiKey, hashApiKey } from "@/lib/ai/crypto";
import { validateGeminiKey } from "@/lib/ai/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cleanSlug(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  const { data, error } = await supabaseAdmin().from("ai_tools").select("id,name,slug,description,provider,model,active,rate_limit,system_prompt,created_at,updated_at,last_used_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "دریافت ابزارهای هوش مصنوعی انجام نشد." }, { status: 500 });
  return NextResponse.json({ tools: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name || "").trim().slice(0, 120);
    const slug = cleanSlug(body.slug || name);
    const apiKey = String(body.apiKey || "").trim();
    if (!name || !slug || apiKey.length < 20) return NextResponse.json({ error: "نام، slug و کلید API معتبر الزامی است." }, { status: 400 });
    const validation = await validateGeminiKey(apiKey);
    if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("ai_tools").insert({
      name,
      slug,
      description: String(body.description || "").trim().slice(0, 500) || null,
      provider: "gemini",
      model: String(body.model || validation.model).trim().slice(0, 120) || validation.model,
      encrypted_api_key: encryptApiKey(apiKey),
      active: body.active !== false,
      rate_limit: Math.min(10000, Math.max(1, Number(body.rateLimit) || 30)),
      system_prompt: String(body.systemPrompt || "").trim().slice(0, 12000) || null,
      created_by: admin.id,
    }).select("id,name,slug,description,provider,model,active,rate_limit,system_prompt,created_at,updated_at,last_used_at").single();
    if (error || !data) {
      if (error?.code === "23505") return NextResponse.json({ error: "این slug قبلاً استفاده شده است." }, { status: 409 });
      return NextResponse.json({ error: "ساخت ابزار هوش مصنوعی انجام نشد." }, { status: 500 });
    }
    void hashApiKey;
    return NextResponse.json({ tool: data }, { status: 201 });
  } catch (error) {
    console.error("admin/ai/tools POST", error);
    return NextResponse.json({ error: "داده ارسالی معتبر نیست." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "شناسه ابزار الزامی است." }, { status: 400 });
    const db = supabaseAdmin();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = String(body.name).trim().slice(0, 120);
    if (body.slug !== undefined) updates.slug = cleanSlug(body.slug);
    if (body.description !== undefined) updates.description = String(body.description || "").trim().slice(0, 500) || null;
    if (body.model !== undefined) updates.model = String(body.model).trim().slice(0, 120);
    if (body.active !== undefined) updates.active = Boolean(body.active);
    if (body.rateLimit !== undefined) updates.rate_limit = Math.min(10000, Math.max(1, Number(body.rateLimit) || 30));
    if (body.systemPrompt !== undefined) updates.system_prompt = String(body.systemPrompt || "").trim().slice(0, 12000) || null;
    if (body.apiKey !== undefined && String(body.apiKey).trim()) {
      const apiKey = String(body.apiKey).trim();
      const validation = await validateGeminiKey(apiKey);
      if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });
      updates.encrypted_api_key = encryptApiKey(apiKey);
      if (body.model === undefined) updates.model = validation.model;
    }
    const { data, error } = await db.from("ai_tools").update(updates).eq("id", id).select("id,name,slug,description,provider,model,active,rate_limit,system_prompt,created_at,updated_at,last_used_at").single();
    if (error || !data) {
      if (error?.code === "23505") return NextResponse.json({ error: "این slug قبلاً استفاده شده است." }, { status: 409 });
      return NextResponse.json({ error: "ویرایش ابزار انجام نشد." }, { status: 500 });
    }
    return NextResponse.json({ tool: data });
  } catch (error) {
    console.error("admin/ai/tools PATCH", error);
    return NextResponse.json({ error: "ویرایش ابزار انجام نشد." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "شناسه ابزار الزامی است." }, { status: 400 });
  const { error } = await supabaseAdmin().from("ai_tools").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "حذف ابزار انجام نشد." }, { status: 500 });
  return NextResponse.json({ success: true });
}
