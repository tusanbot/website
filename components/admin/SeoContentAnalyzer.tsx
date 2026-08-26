"use client";

import { useState } from "react";

type Check = { id: string; label: string; status: "pass" | "warning" | "fail" | "info"; score: number; detail: string };
type Result = { score: number; checks: Check[]; critical: Check[]; warnings: Check[]; metrics: { wordCount: number; averageSentenceWords: number; focusKeyword: string | null; focusOccurrences: number; focusDensity: number; internalLinks: number; externalLinks: number; images: number; missingAlt: number; headings: Array<{ level: number; text: string }> }; ai?: { summary?: string; intent?: string; priority?: string; suggestions?: string[] } | null };

export default function SeoContentAnalyzer({ target, current }: { target: "blog" | "service"; current: Record<string, unknown> }) {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/seo/content-analyzer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, title: current.title, metaTitle: current.meta_title, metaDescription: current.meta_description, content: current.content || current.description, excerpt: current.excerpt, focusKeyword: current.focus_keyword || current.primary_keyword, seoKeywords: current.seo_keywords, url: current.url || current.slug }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تحلیل محتوا انجام نشد.");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "تحلیل محتوا انجام نشد."); }
    finally { setLoading(false); }
  }

  const label = (status: Check["status"]) => ({ pass: "خوب", warning: "نیازمند اصلاح", fail: "مشکل مهم", info: "اطلاعات" }[status]);
  const badge = (status: Check["status"]) => status === "pass" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "fail" ? "border-red-200 bg-red-50 text-red-700" : status === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-700";

  return <section dir="rtl" className="rounded-2xl border border-[#09967C]/25 bg-[#09967C]/5 p-4 space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black">تحلیل کیفیت محتوای SEO</h3><p className="mt-1 text-xs text-muted-foreground">تحلیل قبل از ذخیره؛ هیچ تغییری خودکار در فرم یا سایت ایجاد نمی‌شود.</p></div><button type="button" onClick={analyze} disabled={loading} className="rounded-xl bg-[#09967C] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{loading ? "در حال تحلیل..." : "تحلیل محتوای فعلی"}</button></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {result && <>
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-background p-4"><div className="text-xs text-muted-foreground">امتیاز کلی</div><div className="mt-1 text-3xl font-black">{result.score}/۱۰۰</div></div><div className="rounded-xl border bg-background p-4"><div className="text-xs text-muted-foreground">مشکلات مهم</div><div className="mt-1 text-2xl font-bold">{result.critical.length.toLocaleString("fa-IR")}</div></div><div className="rounded-xl border bg-background p-4"><div className="text-xs text-muted-foreground">هشدارها</div><div className="mt-1 text-2xl font-bold">{result.warnings.length.toLocaleString("fa-IR")}</div></div></div>
      <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border bg-background p-4"><h4 className="font-bold">بررسی‌ها</h4><div className="mt-3 space-y-2">{result.checks.map(check => <div key={check.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="font-medium">{check.label}</span><span className={`rounded-full border px-2 py-1 text-xs ${badge(check.status)}`}>{label(check.status)}</span></div><p className="mt-1 text-xs text-muted-foreground">{check.detail}</p></div>)}</div></div><div className="space-y-4"><div className="rounded-xl border bg-background p-4"><h4 className="font-bold">متریک‌های محتوا</h4><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div>کلمات: {result.metrics.wordCount.toLocaleString("fa-IR")}</div><div>جمله/میانگین: {result.metrics.averageSentenceWords.toLocaleString("fa-IR")}</div><div>لینک داخلی: {result.metrics.internalLinks.toLocaleString("fa-IR")}</div><div>لینک خارجی: {result.metrics.externalLinks.toLocaleString("fa-IR")}</div><div>تصاویر: {result.metrics.images.toLocaleString("fa-IR")}</div><div>Alt ناقص: {result.metrics.missingAlt.toLocaleString("fa-IR")}</div></div></div>{result.ai && <div className="rounded-xl border bg-background p-4"><h4 className="font-bold">تحلیل معنایی Gemini</h4>{result.ai.summary && <p className="mt-2 text-sm leading-7">{result.ai.summary}</p>}{result.ai.intent && <p className="mt-2 text-xs text-muted-foreground">Search Intent: {result.ai.intent}</p>}{(result.ai.suggestions || []).length > 0 && <ul className="mt-3 list-disc space-y-1 pr-5 text-sm leading-7">{result.ai.suggestions!.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>}</div></div>
      <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">امتیاز و قواعد این ابزار راهنمای داخلی هستند و جایگزین ارزیابی Google یا تضمین رتبه نیستند.</div>
    </>}
  </section>;
}
