"use client";

import { useEffect, useMemo, useState } from "react";

const SITE = "sc-domain:tusancn.ir";
type Row = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
type Data = { rows: Row[]; totals?: { clicks: number; impressions: number }; startDate?: string; endDate?: string; dimension?: string };
type Health = { score: number; status: string; generatedAt: string; metrics: { clicks: number; impressions: number; ctr: number; position: number; previousClicks: number; previousImpressions: number }; checks: { sitemapUrls: number; checkedUrls: number; brokenUrls: { url: string; status: number }[] }; alerts: { type: string; severity: string; title: string; detail: string }[] };
type Advice = { summary?: string; severity?: string; reason?: string; actions?: string[]; titleSuggestion?: string; metaDescriptionSuggestion?: string; keywordSuggestions?: string[]; headingSuggestions?: string[]; internalLinkSuggestions?: string[]; evidence?: string[] };

const n = (v: number) => Math.round(v).toLocaleString("fa-IR");
const pct = (v: number) => `${(v * 100).toFixed(1)}٪`;
const severityLabel = (v: string) => ({ excellent: "عالی", good: "خوب", warning: "نیازمند بررسی", critical: "بحرانی", info: "اطلاع", low: "کم", medium: "متوسط", high: "زیاد" }[v] || v);

export default function SeoDashboardPage() {
  const [dimension, setDimension] = useState<"page" | "query">("page");
  const [data, setData] = useState<Data>({ rows: [] });
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [error, setError] = useState("");
  const [healthError, setHealthError] = useState("");
  const [advisorTarget, setAdvisorTarget] = useState("");
  const [advisor, setAdvisor] = useState<Advice | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    fetch(`/api/admin/seo/gsc?siteUrl=${encodeURIComponent(SITE)}&dimension=${dimension}`, { cache: "no-store" })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "خطا در دریافت اطلاعات سرچ کنسول"); return d; })
      .then(d => active && setData(d)).catch(e => active && setError(e.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [dimension]);

  useEffect(() => {
    let active = true;
    setHealthLoading(true); setHealthError("");
    fetch("/api/admin/seo/health", { cache: "no-store" })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "خطا در پایش سلامت SEO"); return d; })
      .then(d => active && setHealth(d)).catch(e => active && setHealthError(e.message)).finally(() => active && setHealthLoading(false));
    return () => { active = false; };
  }, []);

  const insights = useMemo(() => {
    const rows = data.rows || [];
    return {
      opportunities: rows.filter(r => (r.position ?? 99) >= 4 && (r.position ?? 99) <= 20 && (r.impressions ?? 0) > 0).sort((a,b) => (b.impressions ?? 0) - (a.impressions ?? 0)).slice(0, 8),
      lowCtr: rows.filter(r => (r.impressions ?? 0) >= 1 && (r.ctr ?? 0) < 0.03).sort((a,b) => (b.impressions ?? 0) - (a.impressions ?? 0)).slice(0, 8),
    };
  }, [data.rows]);

  const avgPosition = useMemo(() => data.rows.length ? data.rows.reduce((a,r) => a + (r.position ?? 0), 0) / data.rows.length : 0, [data.rows]);
  const avgCtr = useMemo(() => data.rows.length ? data.rows.reduce((a,r) => a + (r.ctr ?? 0), 0) / data.rows.length : 0, [data.rows]);

  async function runAdvisor(target = advisorTarget) {
    if (!target) return;
    setAdvisorLoading(true); setAdvisorError(""); setAdvisor(null);
    try {
      const r = await fetch("/api/admin/seo/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dimension, target }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تحلیل SEO انجام نشد");
      setAdvisor(d.advice);
    } catch (e) { setAdvisorError(e instanceof Error ? e.message : "تحلیل SEO انجام نشد"); }
    finally { setAdvisorLoading(false); }
  }

  return <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-6">
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold">داشبورد سئو و Google Search Console</h1><p className="mt-2 text-sm text-muted-foreground">تحلیل ۲۸ روز اخیر، پایش سلامت و مشاوره هوشمند SEO.</p></div>
      <div className="flex rounded-lg border p-1"><button className={`rounded-md px-4 py-2 text-sm ${dimension === "page" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setDimension("page")}>صفحات</button><button className={`rounded-md px-4 py-2 text-sm ${dimension === "query" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setDimension("query")}>عبارت‌ها</button></div>
    </header>

    <section className="rounded-2xl border bg-card p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold">سلامت SEO</h2><p className="mt-1 text-sm text-muted-foreground">پایش داده Search Console، Sitemap و URLهای منتشرشده؛ بدون اعمال خودکار تغییرات.</p></div>{healthLoading ? <span className="text-sm text-muted-foreground">در حال پایش...</span> : health && <div className="text-right"><div className="text-3xl font-black">{health.score.toLocaleString("fa-IR")}/۱۰۰</div><div className="text-xs text-muted-foreground">وضعیت: {severityLabel(health.status)}</div></div>}</div>
      {healthError && <div className="mt-4 rounded-xl border border-destructive/40 p-4 text-sm">{healthError}</div>}
      {health && !healthLoading && <><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric title="کلیک فعلی" value={n(health.metrics.clicks)} /><Metric title="نمایش فعلی" value={n(health.metrics.impressions)} /><Metric title="URLهای Sitemap" value={n(health.checks.sitemapUrls)} /><Metric title="URLهای خراب" value={n(health.checks.brokenUrls.length)} /></div><div className="mt-5 grid gap-6 lg:grid-cols-2"><Box title="هشدارها">{health.alerts.length ? health.alerts.map((a,i)=><div key={i} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="font-medium">{a.title}</span><span className="text-xs text-muted-foreground">{severityLabel(a.severity)}</span></div><p className="mt-1 text-xs text-muted-foreground">{a.detail}</p></div>) : <Empty text="هشدار مهمی در بررسی فعلی پیدا نشد." />}</Box><Box title="URLهای خراب">{health.checks.brokenUrls.length ? health.checks.brokenUrls.map((u,i)=><div key={i} className="rounded-lg border p-3 text-sm"><div className="break-all">{u.url}</div><div className="mt-1 text-xs text-muted-foreground">HTTP {u.status || "خطای شبکه"}</div></div>) : <Empty text="در URLهای بررسی‌شده مورد خراب پیدا نشد." />}</Box></div></>}
    </section>

    {!loading && !error && <section className="rounded-2xl border bg-card p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold">مشاور هوشمند SEO</h2><p className="mt-1 text-sm text-muted-foreground">تحلیل داده واقعی GSC با پروفایل Gemini شما؛ هیچ تغییری خودکار منتشر نمی‌شود.</p></div><button disabled={advisorLoading || !advisorTarget} onClick={() => runAdvisor()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{advisorLoading ? "در حال تحلیل..." : "تحلیل با Gemini"}</button></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><select value={advisorTarget} onChange={e => setAdvisorTarget(e.target.value)} className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"><option value="">یک {dimension === "page" ? "صفحه" : "عبارت"} را انتخاب کنید...</option>{data.rows.slice(0,50).map((r,i)=><option key={i} value={r.keys?.[0] || ""}>{r.keys?.[0] || "—"}</option>)}</select></div>{advisorError && <div className="mt-4 rounded-xl border border-destructive/40 p-4 text-sm">{advisorError}</div>}{advisor && <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="space-y-4"><Box title="جمع‌بندی"><p className="text-sm leading-7">{advisor.summary || "—"}</p>{advisor.reason && <p className="mt-2 text-sm leading-7 text-muted-foreground">{advisor.reason}</p>}<div className="mt-3 text-xs text-muted-foreground">شدت: {severityLabel(advisor.severity || "info")}</div></Box><Box title="شواهد"><List items={advisor.evidence} /></Box><Box title="اقدامات پیشنهادی"><List items={advisor.actions} /></Box></div><div className="space-y-4"><Box title="Title پیشنهادی"><p className="text-sm leading-7">{advisor.titleSuggestion || "پیشنهادی ارائه نشد."}</p></Box><Box title="Meta Description پیشنهادی"><p className="text-sm leading-7">{advisor.metaDescriptionSuggestion || "پیشنهادی ارائه نشد."}</p></Box><Box title="Keywordها"><List items={advisor.keywordSuggestions} /></Box><Box title="Headingها و لینک داخلی"><List items={[...(advisor.headingSuggestions || []), ...(advisor.internalLinkSuggestions || [])]} /></Box></div></div>}</section>}

    {loading && <div className="rounded-xl border p-6">در حال دریافت اطلاعات...</div>}{error && <div className="rounded-xl border border-destructive/40 p-6 text-sm">{error}</div>}
    {!loading && !error && <><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric title="کلیک" value={n(data.totals?.clicks ?? 0)} /><Metric title="نمایش" value={n(data.totals?.impressions ?? 0)} /><Metric title="CTR میانگین" value={pct(avgCtr)} /><Metric title="جایگاه میانگین" value={avgPosition.toFixed(1)} /></section><section className="grid gap-6 lg:grid-cols-2"><Insight title="فرصت‌های رتبه ۴ تا ۲۰" rows={insights.opportunities} note="صفحات/عبارت‌هایی که با بهینه‌سازی محتوا و عنوان می‌توانند به نتایج بالاتر برسند." onAnalyze={setAdvisorTarget} /><Insight title="نمایش بالا، CTR پایین" rows={insights.lowCtr} note="برای این موارد بازبینی عنوان و توضیحات متا می‌تواند ارزشمند باشد." onAnalyze={setAdvisorTarget} /></section><section className="overflow-x-auto rounded-xl border"><div className="border-b p-4 font-semibold">داده‌های Search Console</div><table className="w-full text-sm"><thead><tr className="border-b text-right"><th className="p-3">{dimension === "page" ? "صفحه" : "عبارت جستجو"}</th><th className="p-3">کلیک</th><th className="p-3">نمایش</th><th className="p-3">CTR</th><th className="p-3">جایگاه</th></tr></thead><tbody>{data.rows.map((r,i)=><tr key={i} className="border-b last:border-0"><td className="max-w-md p-3 break-all">{r.keys?.join(" / ") || "—"}</td><td className="p-3">{n(r.clicks ?? 0)}</td><td className="p-3">{n(r.impressions ?? 0)}</td><td className="p-3">{pct(r.ctr ?? 0)}</td><td className="p-3">{(r.position ?? 0).toFixed(1)}</td></tr>)}</tbody></table></section><p className="text-xs text-muted-foreground">بازه: {data.startDate || "—"} تا {data.endDate || "—"} · داده‌ها از Google Search Console دریافت می‌شوند و پیشنهادها نیازمند بررسی انسانی هستند.</p></>}
  </main>;
}

function Metric({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border p-5"><div className="text-sm text-muted-foreground">{title}</div><div className="mt-2 text-3xl font-bold">{value}</div></div>; }
function Box({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-xl border p-5"><h3 className="font-semibold">{title}</h3><div className="mt-3 space-y-2">{children}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{text}</div>; }
function List({ items }: { items?: string[] }) { return items?.length ? <ul className="list-disc space-y-1 pr-5 text-sm leading-7">{items.map((x,i)=><li key={i}>{x}</li>)}</ul> : <Empty text="موردی ارائه نشد." />; }
function Insight({ title, note, rows, onAnalyze }: { title: string; note: string; rows: Row[]; onAnalyze: (target: string) => void }) { return <div className="rounded-xl border p-5"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{note}</p><div className="mt-4 space-y-2">{rows.length ? rows.map((r,i)=><div key={i} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="min-w-0 flex-1 truncate">{r.keys?.join(" / ") || "—"}</span><span className="shrink-0 text-xs text-muted-foreground">{n(r.impressions ?? 0)} نمایش · {(r.position ?? 0).toFixed(1)}</span><button onClick={() => onAnalyze(r.keys?.[0] || "")} className="shrink-0 rounded-md border px-2 py-1 text-xs">تحلیل AI</button></div>) : <Empty text="موردی در این دسته پیدا نشد." />}</div></div>; }
