import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { generateWithGemini, parseGeminiJson } from "@/lib/ai/gemini";
import { requireAiProfile } from "@/lib/ai/server";

const SERVICE_SCHEMA = `{"title":"","category":"","description":"","icon":"","formSchema":[]}`;
const BLOG_SCHEMA = `{"title":"","slug":"","excerpt":"","content":"","meta_title":"","meta_description":""}`;

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  try {
    const session = await requireAiProfile();
    const body = await request.json() as { target?: string; instruction?: string; current?: Record<string, unknown> };
    const target = body.target === "blog" ? "blog" : "service";
    const current = body.current || {};
    const schema = target === "blog" ? BLOG_SCHEMA : SERVICE_SCHEMA;
    const task = target === "blog"
      ? "برای وبلاگ کافی‌نت توسن یک پست فارسی حرفه‌ای و سئو شده تولید کن. عنوان جذاب، slug انگلیسی کوتاه، خلاصه، محتوای HTML ساده با H2/H3 در صورت نیاز، meta title و meta description بده. ادعاهای factual را بدون منبع نساز و از تبلیغات اغراق‌آمیز پرهیز کن."
      : "برای یک خدمت کافی‌نت توسن اطلاعات حرفه‌ای تولید کن: عنوان، دسته‌بندی، توضیحات روشن، یک آیکون emoji مناسب و در صورت نیاز formSchema شامل فیلدهای منطقی. فرم را فقط وقتی لازم است پیشنهاد بده و فیلدها را با ساختار ساده {name,label,type,required,options} برگردان.";
    const prompt = `${task}\n\nورودی فعلی مدیر: ${JSON.stringify(current)}\n\nدستور تکمیلی: ${body.instruction || ""}\n\nفقط JSON معتبر مطابق این ساختار برگردان و هیچ Markdown یا توضیح بیرونی ننویس:\n${schema}`;
    const result = await generateWithGemini(session.profile.id, prompt, session.profile.model || "gemini-2.5-flash");
    const data = parseGeminiJson<Record<string, unknown>>(result.text);
    return NextResponse.json({ data, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    if (message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "ابتدا پروفایل هوش مصنوعی را فعال کنید." }, { status: 401 });
    if (message === "GEMINI_AUTH") return NextResponse.json({ error: "کلید Gemini معتبر نیست یا دسترسی لازم را ندارد." }, { status: 401 });
    if (message === "GEMINI_RATE_LIMIT") return NextResponse.json({ error: "سهمیه یا محدودیت درخواست Gemini پر شده است." }, { status: 429 });
    if (message === "GEMINI_EMPTY") return NextResponse.json({ error: "Gemini خروجی قابل استفاده‌ای برنگرداند." }, { status: 502 });
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return NextResponse.json({ error: "زمان پاسخ Gemini تمام شد." }, { status: 504 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "خروجی Gemini JSON معتبر نبود؛ دوباره تلاش کنید." }, { status: 502 });
    console.error("admin/ai/generate", error);
    return NextResponse.json({ error: "تولید محتوا انجام نشد." }, { status: 500 });
  }
}
