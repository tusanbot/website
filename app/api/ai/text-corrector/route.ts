import { NextRequest, NextResponse } from 'next/server';
import { requireAiProfile } from '@/lib/ai/server';

const prompts: Record<string,string> = {
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
    const profile = await requireAiProfile();
    if (!profile) return NextResponse.json({ error: 'AI_PROFILE_REQUIRED' }, { status: 401 });
    const body = await req.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'grammar';
    if (!text) return NextResponse.json({ error: 'متنی برای پردازش ارسال نشده است.' }, { status: 400 });
    const instruction = prompts[mode] ?? prompts.grammar;
    const apiKey = profile.apiKey;
    const model = profile.model || 'gemini-2.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${instruction}\n\nفقط متن نهایی را برگردان و هیچ توضیح اضافه‌ای ننویس.\n\nمتن:\n${text}` }] }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 401 || response.status === 403) return NextResponse.json({ error: 'کلید Gemini معتبر نیست یا دسترسی آن کافی نیست.' }, { status: 401 });
    if (response.status === 429) return NextResponse.json({ error: 'سهمیه یا محدودیت درخواست Gemini پر شده است. کمی بعد دوباره تلاش کنید.' }, { status: 429 });
    if (!response.ok) return NextResponse.json({ error: 'خطا در ارتباط با Gemini.' }, { status: 502 });
    const data = await response.json();
    const output = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('').trim();
    if (!output) return NextResponse.json({ error: 'Gemini متن قابل استفاده‌ای برنگرداند.' }, { status: 502 });
    return NextResponse.json({ text: output });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') return NextResponse.json({ error: 'زمان پاسخ Gemini تمام شد. دوباره تلاش کنید.' }, { status: 504 });
    return NextResponse.json({ error: 'پردازش متن انجام نشد.' }, { status: 500 });
  }
}
