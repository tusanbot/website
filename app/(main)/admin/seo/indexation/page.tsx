"use client";

import { useEffect, useState } from "react";

type Item = { url: string; clicks?: number; impressions?: number; ctr?: number; position?: number };
type Report = {
  generatedAt: string;
  period: { startDate: string; endDate: string };
  summary: { sitemapUrls: number; urlsWithGscData: number; urlsWithoutGscData: number; gscUrlsOutsideSitemap: number; performanceCoveragePercent: number };
  noPerformanceData: string[];
  outsideSitemap: string[];
  opportunities: Item[];
  highImpressionLowCtr: Item[];
  limitations: string[];
};
type Inspection = {
  inspectedUrl: string;
  inspectionResultLink: string | null;
  indexStatus: { verdict: string | null; coverageState: string | null; indexingState: string | null; lastCrawlTime: string | null; pageFetchState: string | null; googleCanonical: string | null; userCanonical: string | null; robotsTxtState: string | null; crawledAs: string | null };
  mobileUsability: { verdict: string | null; issues: unknown[] };
  richResults: { verdict: string | null; detectedItems: unknown[] };
};

const fa = (n: number) => n.toLocaleString("fa-IR");
const verdict = (value: string | null) => value === "PASS" ? "موفق" : value === "FAIL" ? "ناموفق" : value || "نامشخص";

export default function IndexationMonitorPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inspectUrl, setInspectUrl] = useState("");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/seo/indexation", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "خطا در دریافت گزارش");
      setReport(data);
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در دریافت گزارش"); }
    finally { setLoading(false); }
  }

  async function inspect(url = inspectUrl) {
    const target = url.trim();
    if (!target) { setInspectionError("URL را وارد کنید."); return; }
    setInspectionLoading(true); setInspectionError(""); setInspection(null); setInspectUrl(target);
    try {
      const response = await fetch("/api/admin/seo/indexation/inspect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "خطا در URL Inspection");
      setInspection(data);
    } catch (e) { setInspectionError(e instanceof Error ? e.message : "خطا در بررسی URL"); }
    finally { setInspectionLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-6">
    <header className="rounded-2xl border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">پایش ایندکس و پوشش Sitemap</h1><p className="mt-2 text-sm text-muted-foreground">مقایسه URLهای Sitemap با داده عملکرد واقعی Google Search Console و بررسی وضعیت URL.</p></div>
        <button onClick={load} disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{loading ? "در حال بررسی..." : "به‌روزرسانی"}</button>
      </div>
    </header>

    {error && <div className="rounded-xl border border-destructive/40 p-5 text-sm">{error}</div>}
    {loading && !report && <div className="rounded-xl border p-6">در حال دریافت Sitemap و Search Console...</div>}

    {report && <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric title="URLهای Sitemap" value={fa(report.summary.sitemapUrls)} />
        <Metric title="URL با داده GSC" value={fa(report.summary.urlsWithGscData)} />
        <Metric title="بدون داده عملکرد" value={fa(report.summary.urlsWithoutGscData)} />
        <Metric title="خارج از Sitemap" value={fa(report.summary.gscUrlsOutsideSitemap)} />
        <Metric title="پوشش عملکردی" value={`${fa(report.summary.performanceCoveragePercent)}٪`} />
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-bold">بررسی واقعی وضعیت URL در Google</h2>
        <p className="mt-1 text-sm text-muted-foreground">این بخش از URL Inspection استفاده می‌کند و با «نداشتن داده عملکرد» فرق دارد.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={inspectUrl} onChange={e => setInspectUrl(e.target.value)} placeholder="https://www.tusancn.ir/..." className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" dir="ltr" />
          <button onClick={() => inspect()} disabled={inspectionLoading} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{inspectionLoading ? "در حال بررسی..." : "بررسی URL"}</button>
        </div>
        {inspectionError && <div className="mt-4 rounded-lg border border-destructive/40 p-4 text-sm">{inspectionError}</div>}
        {inspection && <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric title="وضعیت ایندکس" value={verdict(inspection.indexStatus.verdict)} />
            <Metric title="Indexing State" value={inspection.indexStatus.indexingState || "نامشخص"} />
            <Metric title="Crawl" value={inspection.indexStatus.lastCrawlTime ? new Date(inspection.indexStatus.lastCrawlTime).toLocaleString("fa-IR") : "ثبت نشده"} />
            <Metric title="Fetch" value={inspection.indexStatus.pageFetchState || "نامشخص"} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Info title="Canonical گوگل" value={inspection.indexStatus.googleCanonical || "ثبت نشده"} />
            <Info title="Canonical اعلام‌شده توسط سایت" value={inspection.indexStatus.userCanonical || "ثبت نشده"} />
            <Info title="Robots.txt" value={inspection.indexStatus.robotsTxtState || "نامشخص"} />
            <Info title="Mobile usability" value={verdict(inspection.mobileUsability.verdict)} />
          </div>
          {inspection.inspectionResultLink && <a href={inspection.inspectionResultLink} target="_blank" rel="noreferrer" className="inline-block text-sm underline">مشاهده نتیجه در Search Console</a>}
        </div>}
      </section>

      <section className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-bold">URLهای Sitemap بدون داده عملکرد GSC</h2><p className="mt-1 text-sm text-muted-foreground">این وضعیت به‌تنهایی به معنی ایندکس‌نشدن نیست؛ ممکن است URL جدید باشد یا در بازه انتخابی Impression نداشته باشد.</p><UrlList urls={report.noPerformanceData} empty="همه URLهای بررسی‌شده داده عملکرد دارند." onInspect={inspect} /></section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="فرصت‌های رتبه ۴ تا ۲۰"><ItemList items={report.opportunities} onInspect={inspect} /></Card>
        <Card title="Impression بالا و CTR پایین"><ItemList items={report.highImpressionLowCtr} onInspect={inspect} /></Card>
      </section>

      <section className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-bold">URLهای دارای داده GSC ولی خارج از Sitemap</h2><UrlList urls={report.outsideSitemap} empty="موردی پیدا نشد." onInspect={inspect} /></section>

      <section className="rounded-2xl border border-dashed p-5"><h2 className="font-semibold">محدودیت تحلیل</h2><ul className="mt-3 list-disc space-y-2 pr-5 text-sm text-muted-foreground">{report.limitations.map((x, i) => <li key={i}>{x}</li>)}</ul><p className="mt-4 text-xs text-muted-foreground">بازه داده: {report.period.startDate} تا {report.period.endDate} · آخرین بررسی: {new Date(report.generatedAt).toLocaleString("fa-IR")}</p></section>
    </>}
  </main>;
}

function Metric({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border p-5"><div className="text-sm text-muted-foreground">{title}</div><div className="mt-2 text-2xl font-bold break-words">{value}</div></div>; }
function Info({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">{title}</div><div className="mt-2 break-all text-sm" dir="ltr">{value}</div></div>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-bold">{title}</h2><div className="mt-4">{children}</div></div>; }
function UrlList({ urls, empty, onInspect }: { urls: string[]; empty: string; onInspect: (url: string) => void }) { return urls.length ? <div className="mt-4 max-h-96 space-y-2 overflow-auto">{urls.map((url, i) => <div key={i} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="break-all text-sm" dir="ltr">{url}</div><button onClick={() => onInspect(url)} className="shrink-0 self-start rounded-md border px-3 py-1 text-xs">Inspect</button></div>)}</div> : <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{empty}</div>; }
function ItemList({ items, onInspect }: { items: Item[]; onInspect: (url: string) => void }) { return items.length ? <div className="space-y-2">{items.map((item, i) => <div key={i} className="rounded-lg border p-3"><div className="break-all text-sm" dir="ltr">{item.url}</div><div className="mt-2 text-xs text-muted-foreground">Impression: {fa(item.impressions || 0)} · CTR: {((item.ctr || 0) * 100).toFixed(1)}٪ · Position: {(item.position || 0).toFixed(1)}</div><button onClick={() => onInspect(item.url)} className="mt-2 rounded-md border px-3 py-1 text-xs">بررسی در Google</button></div>)}</div> : <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">موردی پیدا نشد.</div>; }
