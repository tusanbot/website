import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteUserAiProfile, getUserAiProfile, upsertUserAiProfile } from "@/lib/ai/profile";

export const runtime = "nodejs";

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });
    const profile = await getUserAiProfile(userId);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("AI profile GET failed", error);
    return NextResponse.json({ error: "دریافت تنظیمات هوش مصنوعی ناموفق بود." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });
    const body = await request.json();
    const provider = String(body.provider ?? "");
    const model = String(body.model ?? "");
    const apiKey = String(body.apiKey ?? "");
    if (!provider || !model || !apiKey) return NextResponse.json({ error: "ارائه‌دهنده، مدل و API Key الزامی است." }, { status: 400 });
    const profile = await upsertUserAiProfile(userId, provider, model, apiKey);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("AI profile PUT failed", error);
    const message = error instanceof Error && error.message.includes("AI_PROFILE_ENCRYPTION_KEY")
      ? "تنظیمات امنیتی سرور برای ذخیره امن API Key کامل نشده است."
      : "ذخیره تنظیمات هوش مصنوعی ناموفق بود.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });
    await deleteUserAiProfile(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("AI profile DELETE failed", error);
    return NextResponse.json({ error: "حذف تنظیمات هوش مصنوعی ناموفق بود." }, { status: 500 });
  }
}
