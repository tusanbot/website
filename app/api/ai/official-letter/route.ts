import { NextRequest, NextResponse } from "next/server";
import { requireAiAccess } from "@/lib/ai/access";
import { generateWithGeminiApiKey } from "@/lib/ai/gemini";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

const TYPES: Record<string, string> = { request: "درخواست اداری", general: "نامه اداری عمومی", introduction: "معرفی‌نامه", complaint: "شکایت و اعتراض", thanks: "تقدیر و تشکر", leave: "درخواست مرخصی", custom: "نامه سفارشی" };
const TONES: Record<string, string> = { formal: "رسمی و محترمانه", veryFormal: "بسیار رسمی و سازمانی", respectful: "محترمانه و روان", concise: "رسمی، کوتاه و مستقیم" };

function buildPrompt(input: { action: string; type: string; recipient: string; sender: string; subject: string; tone: string; details: string; text: string }) {
  const type = TYPES[input.type] ?? TYPES.general;
  const tone = TONES[input.tone] ?? TONES.formal;
  const actions: Record<string, string> = { generate: "یک نامه کامل و آماده استفاده تولید کن.", improve: "متن موجود را بدون تغییر منظور اصلی، از نظر نگارشی و اداری بهبود بده.", formalize: "متن موجود را رسمی‌تر، حرفه‌ای‌تر و سازمانی‌تر بازنویسی کن.", shorten: "متن موجود را با حفظ نکات ضروری کوتاه و دقیق کن." };
  return `تو یک کارشناس حرفه‌ای نگارش مکاتبات اداری فارسی هستی. ${actions[input.action] ?? actions.generate}\n\nنوع نامه: ${type}\nگیرنده: ${input.recipient || "ذکر نشده"}\nفرستنده: ${input.sender || "ذکر نشده"}\nموضوع: ${input.subject || "ذکر نشده"}\nلحن: ${tone}\n\nتوضیحات کاربر:\n${input.details || "ندارد"}\n\nمتن موجود:\n${input.text || "ندارد"}\n\nقواعد:\n- متن را به فارسی معیار و با نیم‌فاصله مناسب بنویس.\n- از اطلاعاتی که کاربر نداده جعل نکن؛ در صورت نیاز از عبارت مناسب و قابل تکمیل استفاده کن.\n- ساختار نامه شامل عنوان/موضوع، خطاب مناسب، بدنه، درخواست یا نتیجه‌گیری و امضا باشد.\n- از زیاده‌گویی و عبارت‌های مصنوعی پرهیز کن.\n- فقط متن نهایی نامه را برگردان و درباره فرایند تولید توضیح نده.`;
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAiAccess();
    const bodySizeError = rejectOversizedJsonBody(request, 16 * 1024);
    if (bodySizeError) return bodySizeError;
    const rateLimitResponse = await checkRateLimit({ scope: "ai:official-letter", request, userId: access.rateLimitUserId, limit: 10, windowSeconds: 60 });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json() as Record<string, unknown>;
    const input = {
      action: typeof body.action === "string" ? body.action : "generate",
      type: typeof body.type === "string" ? body.type : "general",
      recipient: typeof body.recipient === "string" ? body.recipient.trim() : "",
      sender: typeof body.sender === "string" ? body.sender.trim() : "",
      subject: typeof body.subject === "string" ? body.subject.trim() : "",
      tone: typeof body.tone === "string" ? body.tone : "formal",
      details: typeof body.details === "string" ? body.details.trim() : "",
      text: typeof body.text === "string" ? body.text.trim() : "",
    };
    if (input.action === "generate" && !input.details && !input.subject) return NextResponse.json({ error: "موضوع یا توضیحات نامه را وارد کنید." }, { status: 400 });
    if (input.action !== "generate" && !input.text) return NextResponse.json({ error: "متن نامه را وارد کنید." }, { status: 400 });
    const result = await generateWithGeminiApiKey(access.apiKey, buildPrompt(input), access.model, { temperature: 0.35, maxOutputTokens: 1800, timeoutMs: 45000 });
    return NextResponse.json({ text: result.text, source: access.source });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_ACCESS_REQUIRED") return NextResponse.json({ error: "برای استفاده از هوش مصنوعی با حساب Google وارد شوید یا کلید API شخصی خود را وارد کنید." }, { status: 401 });
    if (error instanceof Error && error.message === "GEMINI_AUTH") return NextResponse.json({ error: "کلید Gemini معتبر نیست یا دسترسی لازم را ندارد." }, { status: 401 });
    if (error instanceof Error && error.message === "GEMINI_RATE_LIMIT") return NextResponse.json({ error: "سقف یا محدودیت درخواست Gemini پر شده است." }, { status: 429 });
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return NextResponse.json({ error: "زمان پاسخ Gemini تمام شد. دوباره تلاش کنید." }, { status: 504 });
    console.error("Official letter AI error", error);
    return NextResponse.json({ error: "تولید نامه انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}