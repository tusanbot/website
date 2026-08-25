"use client";

import { useEffect, useMemo, useState } from "react";

const SITE = "sc-domain:tusancn.ir";

type Row = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
type Totals = { clicks: number; impressions: number };

export default function SeoDashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/seo/gsc?siteUrl=${encodeURIComponent(SITE)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "خطا در دریافت اطلاعات سرچ کنسول");
        return data.rows || [];
      })
      .then((data) => active && setRows(data))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const totals = useMemo<Totals>(() => rows.reduce<Totals>((a, r) => ({
    clicks: a.clicks + (r.clicks ?? 0),
    impressions: a.impressions + (r.impressions ?? 0),
  }), { clicks: 0, impressions: 0 }), [rows]);

  return <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-6">
    <header><h1 className="text-2xl font-bold">داشبورد سئو و Google Search Console</h1><p className="mt-2 text-sm text-muted-foreground">عملکرد صفحات و عبارت‌های جستجو را برای تصمیم‌گیری محتوایی و بهینه‌سازی بررسی کنید.</p></header>
    {loading && <div className="rounded-xl border p-6">در حال دریافت اطلاعات...</div>}
    {error && <div className="rounded-xl border border-destructive/40 p-6 text-sm">{error}</div>}
    {!loading && !error && <>
      <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border p-5"><div className="text-sm text-muted-foreground">کلیک</div><div className="mt-2 text-3xl font-bold">{totals.clicks.toLocaleString("fa-IR")}</div></div><div className="rounded-xl border p-5"><div className="text-sm text-muted-foreground">نمایش</div><div className="mt-2 text-3xl font-bold">{totals.impressions.toLocaleString("fa-IR")}</div></div></section>
      <section className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead><tr className="border-b text-right"><th className="p-3">صفحه / عبارت</th><th className="p-3">کلیک</th><th className="p-3">نمایش</th><th className="p-3">CTR</th><th className="p-3">جایگاه</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-b last:border-0"><td className="p-3">{r.keys?.join(" / ") || "—"}</td><td className="p-3">{Math.round(r.clicks ?? 0).toLocaleString("fa-IR")}</td><td className="p-3">{Math.round(r.impressions ?? 0).toLocaleString("fa-IR")}</td><td className="p-3">{((r.ctr ?? 0) * 100).toFixed(1)}٪</td><td className="p-3">{(r.position ?? 0).toFixed(1)}</td></tr>)}</tbody></table></section>
    </>}
  </main>;
}
