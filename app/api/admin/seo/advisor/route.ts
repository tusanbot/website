import { NextResponse } from "next/server";
import { requireAiProfile } from "@/lib/ai/server";
import { generateWithGemini, parseGeminiJson } from "@/lib/ai/gemini";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const SITE = "sc-domain:tusancn.ir";

type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

function dates(daysAgo: number, length: number) {
  const end = new Date(); end.setDate(end.getDate() - daysAgo);
  const start = new Date(end); start.setDate(start.getDate() - length + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

async function queryGsc(token: string, dimension: "page" | "query", range: { startDate: string; endDate: string }) {
  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...range, dimensions: [dimension], rowLimit: 250, dataState: "final" }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "GSC_ERROR");
  return (data.rows || []) as GscRow[];
}

export async function POST(request: Request) {
  try {
    const session = await requireAiProfile();
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.profile.id).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const dimension = body.dimension === "query" ? "query" : "page";
    const target = typeof body.target === "string" ? body.target.trim() : "";
    if (!target) return NextResponse.json({ error: "صفحه یا عبارت برای تحلیل مشخص نشده است." }, { status: 400 });

    const token = process.env.GSC_API_TOKEN;
    if (!token) return NextResponse.json({ error: "اتصال Google Search Console پیکربندی نشده است." }, { status: 503 });

    const currentRange = dates(3, 28);
    const previousRange = dates(31, 28);
    const [currentRows, previousRows] = await Promise.all([queryGsc(token, dimension, currentRange), queryGsc(token, dimension, previousRange)]);
    const current = currentRows.find(r => r.keys?.[0] === target) || currentRows.find(r => r.keys?.[0]?.includes(target));
    const previous = previousRows.find(r => r.keys?.[0] === target) || previousRows.find(r => r.keys?.[0]?.includes(target));
    if (!current) return NextResponse.json({ error: "این مورد در داده ۲۸ روز اخیر Search Console پیدا نشد." }, { status: 404 });

    const prompt = `تو یک مشاور حرفه‌ای SEO برای سایت فارسی tusancn.ir هستی. فقط بر اساس داده‌های ارائه‌شده تحلیل کن و چیزی را به عنوان واقعیت قطعی بدون شواهد بیان نکن.\n\nنوع داده: ${dimension === "page" ? "صفحه" : "عبارت جستجو"}\nمورد: ${target}\n\nداده ۲۸ روز اخیر: ${JSON.stringify({ clicks: current.clicks || 0, impressions: current.impressions || 0, ctr: current.ctr || 0, position: current.position || 0 })}\nداده ۲۸ روز قبل: ${JSON.stringify(previous ? { clicks: previous.clicks || 0, impressions: previous.impressions || 0, ctr: previous.ctr || 0, position: previous.position || 0 } : null)}\n\nیک خروجی JSON معتبر و بدون markdown بده با این ساختار:\n{"summary":"...","severity":"info|low|medium|high","reason":"...","actions":["..."],"titleSuggestion":"...","metaDescriptionSuggestion":"...","keywordSuggestions":["..."],"headingSuggestions":["..."],"internalLinkSuggestions":["..."],"evidence":["..."]}\nاگر داده برای بخشی کافی نیست مقدار رشته خالی یا آرایه خالی بده. پیشنهادها باید برای یک سایت فارسی و با رعایت intent جستجو باشند.`;

    const result = await generateWithGemini(session.profile.id, prompt, session.profile.model || "gemini-2.5-flash", { temperature: 0.2, maxOutputTokens: 1400, timeoutMs: 30000 });
    let advice: unknown;
    try { advice = parseGeminiJson(result.text); } catch { return NextResponse.json({ error: "پاسخ ساختاریافته Gemini قابل پردازش نبود." }, { status: 502 }); }
    return NextResponse.json({ siteUrl: SITE, target, dimension, currentRange, previousRange, current, previous: previous || null, advice, model: result.model });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 500;
    if (error instanceof Error && error.message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "برای استفاده از مشاور SEO ابتدا پروفایل Gemini را فعال کنید." }, { status: 401 });
    if (status === 401) return NextResponse.json({ error: "کلید Gemini معتبر نیست یا دسترسی کافی ندارد." }, { status: 401 });
    if (status === 429) return NextResponse.json({ error: "سهمیه Gemini پر شده است. کمی بعد دوباره تلاش کنید." }, { status: 429 });
    console.error("seo advisor:", error);
    return NextResponse.json({ error: error instanceof Error && error.message === "GSC_ERROR" ? "دریافت داده Search Console انجام نشد." : "تحلیل SEO با هوش مصنوعی انجام نشد." }, { status: 502 });
  }
}
