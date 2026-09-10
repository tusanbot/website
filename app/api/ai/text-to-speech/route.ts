import { NextRequest, NextResponse } from "next/server";
import { requireAiAccess } from "@/lib/ai/access";
import { generateSpeechWithGeminiApiKey } from "@/lib/ai/gemini";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

const MAX_CHARS = 8000;
const VOICES = new Set([
  "Puck", "Fenrir", "Zephyr", "Laomedeia", "Sadachbia", "Leda", "Achird", "Zubenelgenubi",
  "Kore", "Charon", "Alnilam", "Gacrux", "Aoede", "Callirrhoe", "Sulafat", "Achernar",
]);
const STYLES: Record<string, string> = {
  energetic: "با انرژی بالا، ریتم تند و جذاب، شاد و مناسب اجرای محتوای شبکه‌های اجتماعی",
  reels: "سریع، گیرا، با تأکید روی کلمات مهم و شروع بسیار جذاب، مناسب ویدئوی کوتاه",
  advertising: "متقاعدکننده، پرانرژی و حرفه‌ای، با تأکید طبیعی روی مزایا و دعوت به اقدام",
  friendly: "طبیعی، گرم، دوستانه و محاوره‌ای؛ مثل صحبت مستقیم با مخاطب",
  educational: "شفاف، منظم و قابل‌فهم، با مکث‌های طبیعی و تأکید روی نکات مهم",
  news: "جدی، دقیق و حرفه‌ای با بیان واضح و کنترل‌شده",
  podcast: "طبیعی، داستان‌گو، گرم و شنیدنی با ریتم متعادل",
  story: "احساسی، داستان‌گو و پویا، با تغییر طبیعی در تأکید و ریتم",
};

export async function POST(req: NextRequest) {
  try {
    const access = await requireAiAccess();
    const bodySizeError = rejectOversizedJsonBody(req, 12 * 1024);
    if (bodySizeError) return bodySizeError;
    const rateLimitResponse = await checkRateLimit({ scope: "ai:text-to-speech", request: req, userId: access.rateLimitUserId, limit: 5, windowSeconds: 60 });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voice = typeof body.voice === "string" && VOICES.has(body.voice) ? body.voice : "Puck";
    const style = typeof body.style === "string" && STYLES[body.style] ? STYLES[body.style] : STYLES.energetic;
    const speed = typeof body.speed === "number" ? body.speed : 1;
    if (!text) return NextResponse.json({ error: "متنی برای تبدیل به صوت وارد نشده است." }, { status: 400 });
    if (text.length > MAX_CHARS) return NextResponse.json({ error: `متن نمی‌تواند بیشتر از ${MAX_CHARS.toLocaleString("fa-IR")} کاراکتر باشد.` }, { status: 400 });
    if (speed < 0.5 || speed > 2) return NextResponse.json({ error: "سرعت باید بین ۰٫۵ تا ۲ باشد." }, { status: 400 });
    const result = await generateSpeechWithGeminiApiKey(access.apiKey, text, voice, speed, style);
    return NextResponse.json({ audioBase64: result.audioBase64, mimeType: result.mimeType, model: result.model, source: access.source });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 500;
    if (error instanceof Error && error.message === "AI_ACCESS_REQUIRED") return NextResponse.json({ error: "برای استفاده از هوش مصنوعی با حساب Google وارد شوید یا کلید API شخصی خود را وارد کنید." }, { status: 401 });
    if (status === 401 || status === 403) return NextResponse.json({ error: "کلید Gemini معتبر نیست یا دسترسی صوتی فعال نیست." }, { status: 401 });
    if (status === 429) return NextResponse.json({ error: "سهمیه Gemini پر شده است. کمی بعد دوباره تلاش کنید." }, { status: 429 });
    if (status === 504) return NextResponse.json({ error: "زمان پردازش تمام شد. دوباره تلاش کنید." }, { status: 504 });
    console.error("text-to-speech:", error);
    return NextResponse.json({ error: "تبدیل متن به صوت انجام نشد." }, { status: 502 });
  }
}
