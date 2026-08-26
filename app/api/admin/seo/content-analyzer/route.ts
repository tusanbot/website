import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { requireAiProfile } from "@/lib/ai/server";
import { generateWithGemini, parseGeminiJson } from "@/lib/ai/gemini";

type ContentInput = { target?: "blog" | "service"; title?: string; metaTitle?: string; metaDescription?: string; content?: string; excerpt?: string; focusKeyword?: string; seoKeywords?: string[]; url?: string };

type Check = { id: string; label: string; status: "pass" | "warning" | "fail" | "info"; score: number; detail: string };

function plain(value: unknown) {
  return String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}
function words(text: string) { return text ? text.split(/\s+/).filter(Boolean) : []; }
function norm(text: string) { return text.toLocaleLowerCase("fa-IR").replace(/[\u200c]/g, " ").replace(/[\u0640]/g, "").replace(/[ًٌٍَُِّْ]/g, "").trim(); }
function count(text: string, term: string) { if (!term) return 0; const hay = norm(text); const needle = norm(term); return hay.split(needle).length - 1; }
function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }
function htmlMetric(html: string) {
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => ({ level: Number(m[1]), text: plain(m[2]) }));
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  const images = [...html.matchAll(/<img\b([^>]*)>/gi)].map(m => m[1]);
  const internal = links.filter(h => h.startsWith("/") || h.includes("tusancn.ir")).length;
  const external = links.length - internal;
  const missingAlt = images.filter(attrs => !/\balt=["'][^"']*["']/i.test(attrs) || /alt=["']\s*["']/i.test(attrs)).length;
  return { headings, links: links.length, internal, external, images: images.length, missingAlt };
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  try {
    const body = (await request.json()) as ContentInput;
    const target = body.target === "blog" ? "blog" : "service";
    const title = plain(body.title);
    const metaTitle = plain(body.metaTitle);
    const metaDescription = plain(body.metaDescription);
    const content = plain(body.content || body.excerpt);
    const focus = plain(body.focusKeyword || body.seoKeywords?.[0]);
    const metrics = htmlMetric(String(body.content || ""));
    const ws = words(content).length;
    const sentences = Math.max(1, (content.match(/[.!؟?؛]+/g) || []).length);
    const avgSentence = ws / sentences;
    const focusCount = count(`${title} ${metaTitle} ${metaDescription} ${content}`, focus);
    const density = focus && ws ? (count(content, focus) / ws) * 100 : 0;

    const checks: Check[] = [
      { id: "title", label: "عنوان اصلی", status: title.length >= 20 && title.length <= 65 ? "pass" : title ? "warning" : "fail", score: title ? (title.length >= 20 && title.length <= 65 ? 100 : 60) : 0, detail: title ? `طول عنوان ${title.length} کاراکتر است.` : "عنوان اصلی خالی است." },
      { id: "meta-title", label: "SEO Title", status: metaTitle.length >= 45 && metaTitle.length <= 65 ? "pass" : metaTitle ? "warning" : "fail", score: metaTitle ? (metaTitle.length >= 45 && metaTitle.length <= 65 ? 100 : 60) : 0, detail: metaTitle ? `طول SEO Title برابر ${metaTitle.length} کاراکتر است.` : "SEO Title تنظیم نشده است." },
      { id: "meta-description", label: "Meta Description", status: metaDescription.length >= 120 && metaDescription.length <= 165 ? "pass" : metaDescription ? "warning" : "fail", score: metaDescription ? (metaDescription.length >= 120 && metaDescription.length <= 165 ? 100 : 60) : 0, detail: metaDescription ? `طول Meta Description برابر ${metaDescription.length} کاراکتر است.` : "Meta Description تنظیم نشده است." },
      { id: "content-length", label: "حجم محتوا", status: ws >= 300 ? "pass" : ws >= 150 ? "warning" : "fail", score: ws >= 600 ? 100 : ws >= 300 ? 85 : ws >= 150 ? 55 : 20, detail: `${ws.toLocaleString("fa-IR")} کلمه در متن قابل تحلیل شناسایی شد.` },
      { id: "headings", label: "ساختار Heading", status: metrics.headings.some(h => h.level === 2) && metrics.headings.every(h => h.level >= 2) ? "pass" : metrics.headings.length ? "warning" : "fail", score: metrics.headings.length ? (metrics.headings.some(h => h.level === 2) ? 100 : 65) : 0, detail: `${metrics.headings.length.toLocaleString("fa-IR")} عنوان H2-H6 شناسایی شد.` },
      { id: "focus-keyword", label: "کلمه کلیدی اصلی", status: focus ? (focusCount >= 3 ? "pass" : "warning") : "warning", score: focus ? (focusCount >= 3 ? 100 : 55) : 35, detail: focus ? `«${focus}» در بخش‌های قابل تحلیل ${focusCount.toLocaleString("fa-IR")} بار دیده شد.` : "کلمه کلیدی اصلی مشخص نشده است." },
      { id: "keyword-density", label: "تراکم کلمه کلیدی", status: !focus ? "info" : density <= 2.5 ? "pass" : density <= 4 ? "warning" : "fail", score: !focus ? 50 : density <= 2.5 ? 100 : density <= 4 ? 60 : 20, detail: focus ? `تراکم تقریبی ${density.toFixed(2)}٪ است؛ این شاخص فقط راهنمایی است.` : "برای محاسبه تراکم، کلمه کلیدی اصلی لازم است." },
      { id: "internal-links", label: "لینک داخلی", status: metrics.internal >= 1 ? "pass" : "warning", score: metrics.internal >= 2 ? 100 : metrics.internal === 1 ? 80 : 35, detail: `${metrics.internal.toLocaleString("fa-IR")} لینک داخلی و ${metrics.external.toLocaleString("fa-IR")} لینک خارجی شناسایی شد.` },
      { id: "image-alt", label: "Alt تصاویر", status: metrics.images === 0 ? "info" : metrics.missingAlt === 0 ? "pass" : "fail", score: metrics.images === 0 ? 60 : metrics.missingAlt === 0 ? 100 : 25, detail: metrics.images ? `${metrics.missingAlt.toLocaleString("fa-IR")} تصویر بدون Alt مناسب شناسایی شد.` : "تصویری در HTML تحلیل‌شده پیدا نشد." },
      { id: "readability", label: "خوانایی فارسی", status: avgSentence <= 25 ? "pass" : avgSentence <= 35 ? "warning" : "fail", score: avgSentence <= 20 ? 100 : avgSentence <= 25 ? 85 : avgSentence <= 35 ? 60 : 30, detail: `میانگین تقریبی ${avgSentence.toFixed(1)} کلمه در جمله است.` },
      { id: "cta", label: "CTA", status: /(ثبت|دریافت|مشاهده|شروع|تماس|رزرو|درخواست|استعلام|خرید|سفارش)/i.test(content) ? "pass" : "warning", score: /(ثبت|دریافت|مشاهده|شروع|تماس|رزرو|درخواست|استعلام|خرید|سفارش)/i.test(content) ? 100 : 55, detail: /(ثبت|دریافت|مشاهده|شروع|تماس|رزرو|درخواست|استعلام|خرید|سفارش)/i.test(content) ? "نشانه‌ای از دعوت به اقدام در متن پیدا شد." : "دعوت به اقدام واضح در متن پیدا نشد." },
    ];
    const score = clamp(checks.reduce((sum, item) => sum + item.score, 0) / checks.length);
    const critical = checks.filter(x => x.status === "fail");
    const warnings = checks.filter(x => x.status === "warning");

    let ai: { summary?: string; intent?: string; suggestions?: string[]; priority?: string } | null = null;
    if (body.url || body.focusKeyword || content.length > 0) {
      try {
        const session = await requireAiProfile();
        const prompt = `محتوای ${target === "blog" ? "مقاله وبلاگ" : "خدمت"} سایت فارسی tusancn.ir را از نظر کیفیت SEO و Search Intent بررسی کن. فقط بر اساس متن و متریک‌های داده‌شده نتیجه بده و ادعای رتبه/ایندکس نساز. JSON معتبر بده: {"summary":"","intent":"","priority":"low|medium|high","suggestions":[""]}. عنوان: ${title}\nSEO Title: ${metaTitle}\nMeta Description: ${metaDescription}\nFocus keyword: ${focus}\nWord count: ${ws}\nHeadings: ${JSON.stringify(metrics.headings.slice(0, 20))}\nInternal links: ${metrics.internal}\nExternal links: ${metrics.external}\nText: ${content.slice(0, 7000)}`;
        const result = await generateWithGemini(session.profile.id, prompt, session.profile.model || "gemini-2.5-flash", { temperature: 0.15, maxOutputTokens: 900, timeoutMs: 30000 });
        ai = parseGeminiJson(result.text);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message !== "AI_PROFILE_REQUIRED") console.warn("seo content analyzer AI skipped", message);
      }
    }
    return NextResponse.json({ target, score, checks, critical, warnings, metrics: { wordCount: ws, sentences, averageSentenceWords: Number(avgSentence.toFixed(1)), focusKeyword: focus || null, focusOccurrences: focusCount, focusDensity: Number(density.toFixed(2)), headings: metrics.headings, links: metrics.links, internalLinks: metrics.internal, externalLinks: metrics.external, images: metrics.images, missingAlt: metrics.missingAlt }, ai });
  } catch (error) {
    console.error("admin/seo/content-analyzer", error);
    return NextResponse.json({ error: "تحلیل محتوا انجام نشد." }, { status: 500 });
  }
}
