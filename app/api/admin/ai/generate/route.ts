import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { generateWithGeminiApiKey, parseGeminiJson } from "@/lib/ai/gemini";
import { getAdminAiToolAccess, markAdminAiToolUsed } from "@/lib/ai/tools";

const SERVICE_SCHEMA = `{"title":"","slug":"","category":"","description":"","icon":"","meta_title":"","meta_description":"","seo_keywords":[],"formSchema":[]}`;
const BLOG_SCHEMA = `{"title":"","slug":"","excerpt":"","content":"","meta_title":"","meta_description":"","seo_keywords":[],"headings":[],"faq":[]}`;

function cleanSlug(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  try {
    const body = await request.json() as { target?: string; instruction?: string; current?: Record<string, unknown>; toolId?: string };
    const target = body.target === "blog" ? "blog" : "service";
    const current = body.current || {};
    const schema = target === "blog" ? BLOG_SCHEMA : SERVICE_SCHEMA;
    let apiKey = process.env.TUSAN_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    let model = process.env.TUSAN_GEMINI_MODEL || "gemini-2.5-flash";
    let source: "tusan" | "admin_tool" = "tusan";
    let toolId: string | null = null;

    if (body.toolId) {
      const tool = await getAdminAiToolAccess(body.toolId);
      apiKey = tool.apiKey;
      model = tool.model;
      source = tool.source;
      toolId = tool.id;
    }
    if (!apiKey) return NextResponse.json({ error: "Credential هوش مصنوعی داخلی تنظیم نشده است." }, { status: 503 });

    const task = target === "blog"
      ? "برای وبلاگ کافی‌نت توسن یک پیش‌نویس حرفه‌ای و سئو محور تولید کن. موضوع را بر اساس هدف جست‌وجو و استراتژی محتوایی سایت تنظیم کن. یک کلمه کلیدی اصلی و کلیدواژه‌های مرتبط انتخاب کن، عنوان و slug مناسب بساز، H2/H3 منطقی ایجاد کن، محتوای HTML ساده و خوانا بنویس، meta title را ترجیحاً حدود 50 تا 60 کاراکتر و meta description را حدود 140 تا 160 کاراکتر نگه دار. در موضوعات زمان‌مند تاریخ و وضعیت را صریحاً مشخص کن و اطلاعات متغیر را قطعی و دائمی ننویس. در صورت مناسب بودن FAQ تولید کن. ادعای factual بدون منبع نساز و از keyword stuffing و تبلیغات اغراق‌آمیز پرهیز کن."
      : "برای یک خدمت کافی‌نت توسن یک پیش‌نویس حرفه‌ای و سئو محور تولید کن. عنوان، slug کوتاه و یکتا، دسته‌بندی، توضیحات، آیکون و متادیتای سئو بساز. meta title را ترجیحاً حدود 50 تا 60 کاراکتر و meta description را حدود 140 تا 160 کاراکتر نگه دار. یک کلمه کلیدی اصلی و چند کلیدواژه مرتبط بر اساس نیت جست‌وجوی کاربر پیشنهاد بده. اگر خدمت نیازمند ثبت اطلاعات است formSchema شامل فیلدهای منطقی با ساختار ساده {name,label,type,required,options} برگردان."
    const prompt = `${task}\n\n${source === "admin_tool" ? "راهنمای اختصاصی ابزار:\n" : ""}${body.toolId ? ((await getAdminAiToolAccess(body.toolId)).systemPrompt || "") : ""}\n\nورودی فعلی مدیر: ${JSON.stringify(current)}\n\nدستور تکمیلی: ${String(body.instruction || "").slice(0, 1200)}\n\nفقط JSON معتبر مطابق این ساختار برگردان و هیچ Markdown یا توضیح بیرونی ننویس:\n${schema}`;
    const result = await generateWithGeminiApiKey(apiKey, prompt, model);
    if (toolId) await markAdminAiToolUsed(toolId);
    const data = parseGeminiJson<Record<string, unknown>>(result.text);
    if (typeof data.slug === "string") data.slug = cleanSlug(data.slug);
    if (Array.isArray(data.seo_keywords)) data.seo_keywords = data.seo_keywords.map(String).filter(Boolean).slice(0, 12);
    if (Array.isArray(data.headings)) data.headings = data.headings.map(String).filter(Boolean).slice(0, 20);
    return NextResponse.json({ data, model: result.model, source, toolId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    if (message === "AI_TOOL_NOT_FOUND") return NextResponse.json({ error: "ابزار هوش مصنوعی پیدا نشد." }, { status: 404 });
    if (message === "AI_TOOL_DISABLED") return NextResponse.json({ error: "این ابزار هوش مصنوعی غیرفعال است." }, { status: 409 });
    if (message === "GEMINI_AUTH") return NextResponse.json({ error: "کلید Gemini معتبر نیست یا دسترسی لازم را ندارد." }, { status: 401 });
    if (message === "GEMINI_RATE_LIMIT") return NextResponse.json({ error: "سهمیه یا محدودیت درخواست Gemini پر شده است." }, { status: 429 });
    if (message === "GEMINI_EMPTY") return NextResponse.json({ error: "Gemini خروجی قابل استفاده‌ای برنگرداند." }, { status: 502 });
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return NextResponse.json({ error: "زمان پاسخ Gemini تمام شد." }, { status: 504 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "خروجی Gemini JSON معتبر نبود؛ دوباره تلاش کنید." }, { status: 502 });
    console.error("admin/ai/generate", error);
    return NextResponse.json({ error: "تولید محتوا انجام نشد." }, { status: 500 });
  }
}
