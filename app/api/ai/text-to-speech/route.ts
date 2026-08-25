import { NextRequest, NextResponse } from "next/server";
import { requireAiProfile } from "@/lib/ai/server";
import { generateSpeechWithGemini } from "@/lib/ai/gemini";

const MAX_CHARS = 8000;

export async function POST(req: NextRequest) {
  try {
    const session = await requireAiProfile();
    const profile = session.profile;
    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voice = typeof body.voice === "string" ? body.voice : "Kore";
    const speed = typeof body.speed === "number" ? body.speed : 1;
    if (!text) return NextResponse.json({ error: "متنی برای تبدیل به صوت وارد نشده است." }, { status: 400 });
    if (text.length > MAX_CHARS) return NextResponse.json({ error: `متن نمی‌تواند بیشتر از ${MAX_CHARS.toLocaleString("fa-IR")} کاراکتر باشد.` }, { status: 400 });
    if (speed < 0.5 || speed > 2) return NextResponse.json({ error: "سرعت باید بین ۰٫۵ تا ۲ باشد." }, { status: 400 });
    const result = await generateSpeechWithGemini(profile.id, text, voice, speed);
    return NextResponse.json({ audioBase64: result.audioBase64, mimeType: result.mimeType, model: result.model });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 500;
    if (error instanceof Error && error.message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "برای استفاده از ابزار هوش مصنوعی ابتدا پروفایل Gemini را فعال کنید." }, { status: 401 });
    if (status === 401 || status === 403) return NextResponse.json({ error: "کلید Gemini معتبر نیست یا دسترسی صوتی فعال نیست." }, { status: 401 });
    if (status === 429) return NextResponse.json({ error: "سهمیه Gemini پر شده است. کمی بعد دوباره تلاش کنید." }, { status: 429 });
    if (status === 504) return NextResponse.json({ error: "زمان پردازش تمام شد. دوباره تلاش کنید." }, { status: 504 });
    console.error("text-to-speech:", error);
    return NextResponse.json({ error: "تبدیل متن به صوت انجام نشد." }, { status: 502 });
  }
}
