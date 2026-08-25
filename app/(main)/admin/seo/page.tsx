"use client";

import { useEffect, useMemo, useState } from "react";

const SITE = "sc-domain:tusancn.ir";
type Row = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
type Data = { rows: Row[]; totals?: { clicks: number; impressions: number }; startDate?: string; endDate?: string; dimension?: string };
type Health = { score: number; status: string; generatedAt: string; metrics: { clicks: number; impressions: number; ctr: number; position: number; previousClicks: number; previousImpressions: number }; checks: { sitemapUrls: number; checkedUrls: number; brokenUrls: { url: string; status: number }[] }; alerts: { type: string; severity: string; title: string; detail: string }[] };

const n = (v: number) => Math.round(v).toLocaleString("fa-IR");
const pct = (v: number) => `${(v * 100).toFixed(1)}٪`;
const severityLabel = (v: string) => ({ excellent: "عالی", good: "خوب", warning: "نیازمند بررسی", critical: "بحرانی", info: "اطلاع" }[v] || v);

export default function SeoDashboardPage() {
  const [dimension, setDimension] = useState<"page" | "query">("page");
  const [data, setData] = useState<Data>({ rows: [] });
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [error, setError] = useState("");
  const [healthError, setHealthError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    fetch(`/api/admin/seo/gsc?siteUrl=${encodeURIComponent(SITE)}&dimension=${dimension}`, { cache: "no-store" })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "خطا در دریافت اطلاعات سرچ کنسول"); return d; })
      .then(d => active && setData(d))
      .catch(e => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [dimension]);

  useEffect(() => {
    let active = true;
    setHealthLoading(true); setHealthError("");
    fetch("/api/admin/seo/health", { cache: "no-store" })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "خطا در پایش سلامت SEO"); return d; })
      .then(d => active && setHealth(d))
      .catch(e => active && setHealthError(e.message))
      .finally(() => active && setHealthLoading(false));
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

  return <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-6">
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold">داشبورد سئو و Google Search Console</h1><p className="mt-2 text-sm text-muted-foreground">تحلیل ۲۸ روز اخیر و پایش سلامت فنی و عملکردی SEO.</p></div>
      <div className="flex rounded-lg border p-1"><button className={`rounded-md px-4 py-2 text-sm ${dimension === "page" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setDimension("page")}>صفحات</button><button className={`rounded-md px-4 py-2 text-sm ${dimension === "query" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setDimension("query")}>عبارت‌ها</button></div>
    </header>

    <section className="rounded-2xl border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold">سلامت SEO</h2><p className="mt-1 text-sm text-muted-foreground">پایش داده Search Console، Sitemap و URLهای منتشرشده؛ بدون اعمال خودکار تغییرات.</p></div>{healthLoading ? <span className="text-sm text-muted-foreground">در حال پایش...</span> : health && <div className="text-right"><div className="text-3xl font-black">{health.score.toLocaleString("fa-IR")}/۱۰۰</div><div className="text-xs text-muted-foreground">وضعیت: {severityLabel(health.status)}</div></div>}</div>
      {healthError && <div className="mt-4 rounded-xl border border-destructive/40 p-4 text-sm">{healthError}</div>}
      {health && !healthLoading && <>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric title="کلیک فعلی" value={n(health.metrics.clicks)} /><Metric title="نمایش فعلی" value={n(health.metrics.impressions)} /><Metric title="URLهای Sitemap" value={n(health.checks.sitemapUrls)} /><Metric title="URLهای خراب" value={n(health.checks.brokenUrls.length)} /></div>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border p-5"><h3 className="font-semibold">هشدارها</h3><div className="mt-3 space-y-2">{health.alerts.length ? health.alerts.map((a,i)=><div key={i} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="font-medium">{a.title}</span><span className="text-xs text-muted-foreground">{severityLabel(a.severity)}</span></div><p className="mt-1 text-xs text-muted-foreground">{a.detail}</p></div>) : <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">هشدار مهمی در بررسی فعلی پیدا نشد.</div>}</div></div>
          <div className="rounded-xl border p-5"><h3 className="font-semibold">URLهای خراب</h3><div className="mt-3 space-y-2">{health.checks.brokenUrls.length ? health.checks.brokenUrls.map((u,i)=><div key={i} className="rounded-lg border p-3 text-sm"><div className="break-all">{u.url}</div><div className="mt-1 text-xs text-muted-foreground">HTTP {u.status || "خطای شبکه"}</div></div>) : <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">در URLهای بررسی‌شده مورد خراب پیدا نشد.</div>}</div></div>
        </div>
      </>}
    </section>

    {loading && <div className="rounded-xl border p-6">در حال دریافت اطلاعات...</div>}
    {error && <div className="rounded-xl border border-destructive/40 p-6 text-sm">{error}</div>}
    {!loading && !error && <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric title="کلیک" value={n(data.totals?.clicks ?? 0)} /><Metric title="نمایش" value={n(data.totals?.impressions ?? 0)} /><Metric title="CTR میانگین" value={pct(avgCtr)} /><Metric title="جایگاه میانگین" value={avgPosition.toFixed(1)} /></section>
      <section className="grid gap-6 lg:grid-cols-2"><Insight title="فرصت‌های رتبه ۴ تا ۲۰" rows={insights.opportunities} note="صفحات/عبارت‌هایی که با بهینه‌سازی محتوا و عنوان می‌توانند به نتایج بالاتر برسند." /><Insight title="نمایش بالا، CTR پایین" rows={insights.lowCtr} note="برای این موارد بازبینی عنوان و توضیحات متا می‌تواند ارزشمند باشد." /></section>
      <section className="overflow-x-auto rounded-xl border"><div className="border-b p-4 font-semibold">داده‌های Search Console</div><table className="w-full text-sm"><thead><tr className="border-b text-right"><th className="p-3">{dimension === "page" ? "صفحه" : "عبارت جستجو"}</th><th className="p-3">کلیک</th><th className="p-3">نمایش</th><th className="p-3">CTR</th><th className="p-3">جایگاه</th></tr></thead><tbody>{data.rows.map((r,i)=><tr key={i} className="border-b last:border-0"><td className="max-w-md p-3 break-all">{r.keys?.join(" / ") || "—"}</td><td className="p-3">{n(r.clicks ?? 0)}</td><td className="p-3">{n(r.impressions ?? 0)}</td><td className="p-3">{pct(r.ctr ?? 0)}</td><td className="p-3">{(r.position ?? 0).toFixed(1)}</td></tr>)}</tbody></table></section>
      <p className="text-xs text-muted-foreground">بازه: {data.startDate || "—"} تا {data.endDate || "—"} · داده‌ها از Google Search Console دریافت می‌شوند و پیشنهادها نیازمند بررسی انسانی هستند.</p>
    </>}
  </main>;
}

function Metric({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border p-5"><div className="text-sm text-muted-foreground">{title}</div><div className="mt-2 text-3xl font-bold">{value}</div></div>; }
function Insight({ title, note, rows }: { title: string; note: string; rows: Row[] }) { return <div className="rounded-xl border p-5"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{note}</p><div className="mt-4 space-y-2">{rows.length ? rows.map((r,i)=><div key={i} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="min-w-0 flex-1 truncate">{r.keys?.join(" / ") || "—"}</span><span className="shrink-0 text-xs text-muted-foreground">{n(r.impressions ?? 0)} نمایش · {(r.position ?? 0).toFixed(1)}</span></div>) : <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">موردی در این دسته پیدا نشد.</div>}</div></div>; }
