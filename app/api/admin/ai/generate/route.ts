import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { generateWithGemini, parseGeminiJson } from "@/lib/ai/gemini";
import { requireAiProfile } from "@/lib/ai/server";

const SERVICE_SCHEMA = `{"title":"","slug":"","category":"","description":"","icon":"","meta_title":"","meta_description":"","seo_keywords":[],"formSchema":[],"seo_content":{"introduction":"","audience":"","steps":[],"tips":[],"faq":[]}}`;
const BLOG_SCHEMA = `{"title":"","slug":"","excerpt":"","content":"","meta_title":"","meta_description":"","seo_keywords":[],"headings":[],"faq":[]}`;

function cleanSlug(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function cleanSeoContent(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { introduction: "", audience: "", steps: [], tips: [], faq: [] };
  const input = value as Record<string, unknown>;
  const steps = Array.isArray(input.steps) ? input.steps.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)).map(item => ({ title: String(item.title || "").trim(), description: String(item.description || "").trim() })).filter(item => item.title || item.description).slice(0, 8) : [];
  const tips = Array.isArray(input.tips) ? input.tips.map(String).map(x => x.trim()).filter(Boolean).slice(0, 10) : [];
  const faq = Array.isArray(input.faq) ? input.faq.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)).map(item => ({ question: String(item.question || "").trim(), answer: String(item.answer || "").trim() })).filter(item => item.question && item.answer).slice(0, 10) : [];
  return { introduction: String(input.introduction || "").trim(), audience: String(input.audience || "").trim(), steps, tips, faq };
}

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
      ? "برای وبلاگ کافی‌نت توسن یک پیش‌نویس حرفه‌ای و سئو محور تولید کن. موضوع را بر اساس هدف جست‌وجو و استراتژی محتوایی سایت تنظیم کن. یک کلمه کلیدی اصلی و کلیدواژه‌های مرتبط انتخاب کن، عنوان و slug مناسب بساز، H2/H3 منطقی ایجاد کن، محتوای HTML ساده و خوانا بنویس، meta title را ترجیحاً حدود 50 تا 60 کاراکتر و meta description را حدود 140 تا 160 کاراکتر نگه دار. در موضوعات زمان‌مند تاریخ و وضعیت را صریحاً مشخص کن و اطلاعات متغیر را قطعی و دائمی ننویس. در صورت مناسب بودن FAQ تولید کن. ادعای factual بدون منبع نساز و از keyword stuffing و تبلیغات اغراق‌آمیز پرهیز کن."
      : "برای یک خدمت کافی‌نت توسن یک پیش‌نویس حرفه‌ای و سئو محور تولید کن. بر اساس عنوان، دسته‌بندی، توضیحات و Form Schema خدمت، محتوای صفحه را طوری بساز که با نیت جست‌وجوی کاربر و فرآیند واقعی سفارش هماهنگ باشد. عنوان، slug کوتاه و یکتا، دسته‌بندی، توضیحات، آیکون و متادیتای سئو بساز. meta title را ترجیحاً حدود 50 تا 60 کاراکتر و meta description را حدود 140 تا 160 کاراکتر نگه دار. یک کلمه کلیدی اصلی و چند کلیدواژه مرتبط بر اساس نیت جست‌وجوی کاربر پیشنهاد بده. formSchema شامل فیلدهای منطقی با ساختار ساده {name,label,type,required,options} برگردان. seo_content شامل introduction، audience، مراحل واقعی انجام خدمت، نکات مهم و FAQ باشد. مراحل و FAQ نباید اطلاعات حقوقی یا اداری ساختگی داشته باشند؛ اگر داده کافی نیست، متن محافظه‌کارانه و عمومی تولید کن."
    const prompt = `${task}\n\nورودی فعلی مدیر: ${JSON.stringify(current)}\n\nدستور تکمیلی: ${String(body.instruction || "").slice(0, 1200)}\n\nفقط JSON معتبر مطابق این ساختار برگردان و هیچ Markdown یا توضیح بیرونی ننویس:\n${schema}`;
    const result = await generateWithGemini(session.profile.id, prompt, session.profile.model || "gemini-2.5-flash");
    const data = parseGeminiJson<Record<string, unknown>>(result.text);
    if (typeof data.slug === "string") data.slug = cleanSlug(data.slug);
    if (Array.isArray(data.seo_keywords)) data.seo_keywords = data.seo_keywords.map(String).filter(Boolean).slice(0, 12);
    if (Array.isArray(data.headings)) data.headings = data.headings.map(String).filter(Boolean).slice(0, 20);
    if (target === "service") data.seo_content = cleanSeoContent(data.seo_content);
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
