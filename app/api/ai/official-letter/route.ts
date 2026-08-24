import { NextResponse } from "next/server";
import { getAiProfile, getProfileApiKey } from "@/lib/ai/server";

const TYPES: Record<string, string> = {
  request: "درخواست اداری",
  general: "نامه اداری عمومی",
  introduction: "معرفی‌نامه",
  complaint: "شکایت و اعتراض",
  thanks: "تقدیر و تشکر",
  leave: "درخواست مرخصی",
  custom: "نامه سفارشی",
};

const TONES: Record<string, string> = {
  formal: "رسمی و محترمانه",
  veryFormal: "بسیار رسمی و سازمانی",
  respectful: "محترمانه و روان",
  concise: "رسمی، کوتاه و مستقیم",
};

function buildPrompt(input: { action: string; type: string; recipient: string; sender: string; subject: string; tone: string; details: string; text: string }) {
  const type = TYPES[input.type] ?? TYPES.general;
  const tone = TONES[input.tone] ?? TONES.formal;
  const actions: Record<string, string> = {
    generate: "یک نامه کامل و آماده استفاده تولید کن.",
    improve: "متن موجود را بدون تغییر منظور اصلی، از نظر نگارشی و اداری بهبود بده.",
    formalize: "متن موجود را رسمی‌تر، حرفه‌ای‌تر و سازمانی‌تر بازنویسی کن.",
    shorten: "متن موجود را با حفظ نکات ضروری کوتاه و دقیق کن.",
  };
  return `تو یک کارشناس حرفه‌ای نگارش مکاتبات اداری فارسی هستی. ${actions[input.action] ?? actions.generate}

نوع نامه: ${type}
گیرنده: ${input.recipient || "ذکر نشده"}
فرستنده: ${input.sender || "ذکر نشده"}
موضوع: ${input.subject || "ذکر نشده"}
لحن: ${tone}

توضیحات کاربر:
${input.details || "ندارد"}

متن موجود:
${input.text || "ندارد"}

قواعد:
- متن را به فارسی معیار و با نیم‌فاصله مناسب بنویس.
- از اطلاعاتی که کاربر نداده جعل نکن؛ در صورت نیاز از عبارت مناسب و قابل تکمیل استفاده کن.
- ساختار نامه شامل عنوان/موضوع، خطاب مناسب، بدنه، درخواست یا نتیجه‌گیری و امضا باشد.
- از زیاده‌گویی و عبارت‌های مصنوعی پرهیز کن.
- فقط متن نهایی نامه را برگردان و درباره فرایند تولید توضیح نده.`;
}

export async function POST(request: Request) {
  try {
    const session = await getAiProfile();
    if (!session) return NextResponse.json({ error: "AI_PROFILE_REQUIRED" }, { status: 401 });

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

    if (input.action === "generate" && !input.details && !input.subject) {
      return NextResponse.json({ error: "موضوع یا توضیحات نامه را وارد کنید." }, { status: 400 });
    }
    if (input.action !== "generate" && !input.text) {
      return NextResponse.json({ error: "متن نامه را وارد کنید." }, { status: 400 });
    }

    const apiKey = await getProfileApiKey(session.profile.id);
    const model = session.profile.model || "gemini-2.5-flash";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response: Response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 1800 },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) return NextResponse.json({ error: "کلید Gemini معتبر نیست یا دسترسی آن منقضی شده است." }, { status: 502 });
    if (response.status === 429) return NextResponse.json({ error: "سقف یا محدودیت درخواست Gemini پر شده است. کمی بعد دوباره تلاش کنید." }, { status: 429 });
    if (!response.ok) return NextResponse.json({ error: "Gemini در تولید پاسخ خطا داد. دوباره تلاش کنید." }, { status: 502 });

    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!text) return NextResponse.json({ error: "پاسخ قابل استفاده‌ای از Gemini دریافت نشد." }, { status: 502 });
    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return NextResponse.json({ error: "زمان پاسخ Gemini تمام شد. دوباره تلاش کنید." }, { status: 504 });
    if (error instanceof Error && error.message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "AI_PROFILE_REQUIRED" }, { status: 401 });
    console.error("Official letter AI error", error);
    return NextResponse.json({ error: "تولید نامه انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}
