import { NextRequest, NextResponse } from 'next/server';
import { generateWithGemini } from '@/lib/ai/gemini';
import { requireAiProfile } from '@/lib/ai/server';
import { checkRateLimit, rejectOversizedJsonBody } from '@/lib/security/rateLimit';

const prompts: Record<string, string> = {
  grammar: 'غلط‌های املایی و دستوری فارسی را اصلاح کن؛ معنی و لحن متن را حفظ کن.',
  punctuation: 'علائم نگارشی فارسی، نقطه، ویرگول، دو نقطه، علامت سؤال و پاراگراف‌بندی را اصلاح کن.',
  spacing: 'فاصله‌گذاری و نیم‌فاصله‌های فارسی را استاندارد کن؛ به کلمات و معنی دست نزن.',
  smooth: 'متن فارسی را روان و طبیعی کن، بدون تغییر غیرضروری در معنا.',
  formal: 'متن را به فارسی رسمی و اداری تبدیل کن، بدون افزودن اطلاعات جدید.',
  colloquial: 'متن را به فارسی محاوره‌ای روان تبدیل کن، بدون تغییر معنا.',
  summarize: 'متن را به‌صورت دقیق و فشرده خلاصه کن و نکات اصلی را حفظ کن.',
};

export async function POST(req: NextRequest) {
  try {
    const session = await requireAiProfile();
    const bodySizeError = rejectOversizedJsonBody(req, 16 * 1024);
    if (bodySizeError) return bodySizeError;
    const rateLimitResponse = await checkRateLimit({ scope: 'ai:text-corrector', request: req, userId: session.profile.id, limit: 10, windowSeconds: 60 });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await req.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'grammar';
    if (!text) return NextResponse.json({ error: 'متنی برای پردازش ارسال نشده است.' }, { status: 400 });
    const instruction = prompts[mode] ?? prompts.grammar;
    const result = await generateWithGemini(session.profile.id, `${instruction}\n\nفقط متن نهایی را برگردان و هیچ توضیح اضافه‌ای ننویس.\n\nمتن:\n${text}`, session.profile.model || 'gemini-2.5-flash');
    return NextResponse.json({ text: result.text });
  } catch (error) {
    if (error instanceof Error && error.message === 'AI_PROFILE_REQUIRED') return NextResponse.json({ error: 'AI_PROFILE_REQUIRED' }, { status: 401 });
    if (error instanceof Error && error.message === 'GEMINI_AUTH') return NextResponse.json({ error: 'کلید Gemini معتبر نیست یا دسترسی آن کافی نیست.' }, { status: 401 });
    if (error instanceof Error && error.message === 'GEMINI_RATE_LIMIT') return NextResponse.json({ error: 'سهمیه یا محدودیت درخواست Gemini پر شده است. کمی بعد دوباره تلاش کنید.' }, { status: 429 });
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return NextResponse.json({ error: 'زمان پاسخ Gemini تمام شد. دوباره تلاش کنید.' }, { status: 504 });
    console.error('text-corrector:', error);
    return NextResponse.json({ error: 'پردازش متن انجام نشد.' }, { status: 500 });
  }
}