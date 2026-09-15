"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, BarChart3, CheckCircle2, ChevronLeft,
  CircleHelp, ExternalLink, FileSearch, Gauge, Info, LayoutDashboard, MousePointerClick,
  Search, Sparkles, Target, TrendingUp, Users, XCircle,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SITE = "sc-domain:tusancn.ir";
type Row = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
type Trend = { date: string; clicks: number; impressions: number };
type Data = {
  rows: Row[]; totals?: { clicks: number; impressions: number }; metrics?: { clicks: number; impressions: number; ctr: number; position: number };
  previousMetrics?: { clicks: number; impressions: number; ctr: number; position: number }; trend?: Trend[];
  startDate?: string; endDate?: string; previousStartDate?: string; previousEndDate?: string; dimension?: string;
};
type Health = { score: number; status: string; generatedAt: string; metrics: { clicks: number; impressions: number; ctr: number; position: number; previousClicks: number; previousImpressions: number }; checks: { sitemapUrls: number; checkedUrls: number; brokenUrls: { url: string; status: number }[] }; alerts: { type: string; severity: string; title: string; detail: string }[] };
type Advice = { summary?: string; severity?: string; reason?: string; actions?: string[]; titleSuggestion?: string; metaDescriptionSuggestion?: string; keywordSuggestions?: string[]; headingSuggestions?: string[]; internalLinkSuggestions?: string[]; evidence?: string[] };

const n = (v: number) => Math.round(v).toLocaleString("fa-IR");
const pct = (v: number) => `${(v * 100).toFixed(1)}٪`;
const signedPct = (current: number, previous: number) => previous ? ((current - previous) / previous) * 100 : null;
const positionChange = (current: number, previous: number) => previous ? previous - current : null;
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

  const rows = useMemo(() => [...(data.rows || [])].sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0)), [data.rows]);
  const opportunities = useMemo(() => rows.filter(r => (r.position ?? 99) >= 4 && (r.position ?? 99) <= 20 && (r.impressions ?? 0) > 0).slice(0, 8), [rows]);
  const lowCtr = useMemo(() => rows.filter(r => (r.impressions ?? 0) >= 20 && (r.ctr ?? 0) < 0.03).slice(0, 8), [rows]);
  const metrics = data.metrics || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const previous = data.previousMetrics || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

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

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-background to-background pb-12">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="relative overflow-hidden rounded-3xl border bg-gradient-to-l from-emerald-700 via-teal-700 to-cyan-800 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur"><Sparkles className="h-4 w-4" />مرکز کنترل سئو</div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">سئو و Google Search Console</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">اینجا به‌جای نمایش عددهای خام، وضعیت ورود سایت از گوگل، روند دیده‌شدن صفحات، فرصت‌های رشد و مشکلات فنی را به زبان ساده می‌بینید.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/80"><span className="rounded-lg bg-white/10 px-3 py-2">Property: tusancn.ir</span><span className="rounded-lg bg-white/10 px-3 py-2">بازه تحلیل: ۲۸ روز اخیر</span><span className="rounded-lg bg-white/10 px-3 py-2">داده‌ها با تأخیر گوگل</span></div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur lg:min-w-72"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-5 w-5" /> اتصال Search Console</div><p className="mt-2 text-xs leading-6 text-white/75">داده‌ها مستقیماً از Property سایت دریافت می‌شوند.</p><a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white underline underline-offset-4">باز کردن Search Console <ExternalLink className="h-3.5 w-3.5" /></a></div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={<MousePointerClick />} title="کلیک از گوگل" value={n(metrics.clicks)} change={signedPct(metrics.clicks, previous.clicks)} help="تعداد دفعاتی که کاربران از نتایج جستجوی گوگل وارد سایت شده‌اند." />
          <Kpi icon={<Search />} title="نمایش در گوگل" value={n(metrics.impressions)} change={signedPct(metrics.impressions, previous.impressions)} help="تعداد دفعاتی که یکی از صفحات سایت در نتایج جستجو دیده شده است." />
          <Kpi icon={<Target />} title="نرخ کلیک (CTR)" value={pct(metrics.ctr)} change={signedPct(metrics.ctr, previous.ctr)} help="از هر ۱۰۰ بار نمایش سایت در گوگل، چند بار روی نتیجه کلیک شده است." />
          <Kpi icon={<TrendingUp />} title="جایگاه میانگین" value={metrics.position ? metrics.position.toFixed(1) : "—"} positionChange={positionChange(metrics.position, previous.position)} help="جایگاه میانگین نتایج سایت. عدد کمتر یعنی رتبه بهتر." />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <Panel icon={<Activity />} title="روند ورود از گوگل" description="تغییرات روزانه کلیک و نمایش را در ۲۸ روز اخیر ببینید.">
            {loading ? <Skeleton className="h-72" /> : error ? <ErrorBox text={error} /> : <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trend || []} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v, name) => [n(Number(v)), name === "clicks" ? "کلیک" : "نمایش"]} labelFormatter={v => `تاریخ: ${v}`} /><Line type="monotone" dataKey="impressions" name="نمایش" stroke="#0f766e" strokeWidth={3} dot={false} /><Line type="monotone" dataKey="clicks" name="کلیک" stroke="#0891b2" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div>}
          </Panel>
          <Panel icon={<Gauge />} title="سلامت کلی سایت" description="یک امتیاز خلاصه برای بررسی‌های فنی و سئویی.">
            {healthLoading ? <Skeleton className="h-72" /> : healthError ? <ErrorBox text={healthError} /> : health ? <HealthCard health={health} /> : <Empty text="اطلاعات سلامت موجود نیست." />}
          </Panel>
        </section>

        <section className="rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div><div className="flex items-center gap-2"><LayoutDashboard className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">تحلیل عملکرد</h2><Help text="صفحات و عبارت‌ها دو زاویه متفاوت از عملکرد سایت در گوگل هستند." /></div><p className="mt-1 text-sm text-muted-foreground">برای بررسی دقیق‌تر، بین صفحات سایت و عبارت‌هایی که کاربران جستجو کرده‌اند جابه‌جا شوید.</p></div>
            <div className="flex rounded-xl border bg-muted/40 p-1"><Tab active={dimension === "page"} onClick={() => setDimension("page")} icon={<FileSearch />}>صفحات</Tab><Tab active={dimension === "query"} onClick={() => setDimension("query")} icon={<Search />}>عبارت‌های جستجو</Tab></div>
          </div>
          <div className="grid gap-4 border-b bg-muted/20 p-5 sm:grid-cols-3 sm:p-6"><Mini title={dimension === "page" ? "صفحات دارای داده" : "عبارت‌های دارای داده"} value={n(rows.length)} /><Mini title="بازه فعلی" value={`${data.startDate || "—"} تا ${data.endDate || "—"}`} /><Mini title="منبع" value="Google Search Console" /></div>
          {loading ? <div className="p-6"><Skeleton className="h-64" /></div> : error ? <div className="p-6"><ErrorBox text={error} /></div> : <DataTable rows={rows} dimension={dimension} onAnalyze={target => { setAdvisorTarget(target); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }} />}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <InsightPanel icon={<TrendingUp />} title="فرصت‌های رشد رتبه" description="مواردی که الان معمولاً بین رتبه ۴ تا ۲۰ هستند و با بهینه‌سازی می‌توانند کلیک بیشتری بگیرند." rows={opportunities} empty="در داده فعلی فرصت مشخصی پیدا نشد." onAnalyze={target => { setAdvisorTarget(target); runAdvisor(target); }} />
          <InsightPanel icon={<AlertTriangle />} title="نمایش زیاد، کلیک کم" description="این موارد زیاد دیده می‌شوند اما کاربران کمتر روی آن‌ها کلیک می‌کنند؛ عنوان و توضیحات متا ارزش بررسی دارند." rows={lowCtr} empty="مورد قابل توجهی پیدا نشد." onAnalyze={target => { setAdvisorTarget(target); runAdvisor(target); }} />
        </section>

        <section className="overflow-hidden rounded-3xl border bg-gradient-to-l from-slate-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-300" /><h2 className="text-xl font-bold">مشاور هوشمند SEO</h2></div><p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">یک صفحه یا عبارت را انتخاب کنید تا بر اساس داده واقعی Search Console، پیشنهاد عملی برای عنوان، Meta Description، Heading و لینک‌سازی داخلی دریافت کنید. هیچ تغییری خودکار منتشر نمی‌شود.</p></div><div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60"><CircleHelp className="mb-1 inline h-4 w-4" /> پیشنهادها نیازمند بررسی انسانی هستند.</div></div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row"><select value={advisorTarget} onChange={e => setAdvisorTarget(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none"><option value="" className="text-black">یک {dimension === "page" ? "صفحه" : "عبارت"} را انتخاب کنید...</option>{rows.slice(0, 50).map((r, i) => <option key={i} value={r.keys?.[0] || ""} className="text-black">{r.keys?.[0] || "—"}</option>)}</select><button disabled={advisorLoading || !advisorTarget} onClick={() => runAdvisor()} className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">{advisorLoading ? "در حال تحلیل..." : "تحلیل با Gemini"}</button></div>
          {advisorError && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm">{advisorError}</div>}
          {advisor && <div className="mt-6 grid gap-4 lg:grid-cols-2"><AdviceBox title="جمع‌بندی" text={advisor.summary || "—"} /><AdviceBox title="چرا این پیشنهاد؟" text={advisor.reason || "—"} /><AdviceList title="اقدامات پیشنهادی" items={advisor.actions} /><AdviceBox title="Title پیشنهادی" text={advisor.titleSuggestion || "پیشنهادی ارائه نشد."} /><AdviceBox title="Meta Description پیشنهادی" text={advisor.metaDescriptionSuggestion || "پیشنهادی ارائه نشد."} /><AdviceList title="Keyword / Heading / لینک داخلی" items={[...(advisor.keywordSuggestions || []), ...(advisor.headingSuggestions || []), ...(advisor.internalLinkSuggestions || [])]} /></div>}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Guide icon={<MousePointerClick />} title="کلیک یعنی چه؟" text="کاربر نتیجه سایت را در گوگل دیده و روی آن کلیک کرده است. این مهم‌ترین معیار برای سنجش ورود واقعی از جستجو است." />
          <Guide icon={<BarChart3 />} title="نمایش یعنی چه؟" text="هر بار که نتیجه سایت در صفحه نتایج گوگل نمایش داده شده یک نمایش ثبت می‌شود؛ حتی اگر کاربر روی آن کلیک نکند." />
          <Guide icon={<Target />} title="CTR چرا مهم است؟" text="CTR نشان می‌دهد از نمایش‌های گوگل چند درصد به کلیک تبدیل شده‌اند. CTR پایین معمولاً ارزش بررسی عنوان و Meta Description را دارد." />
        </section>

        <footer className="rounded-2xl border bg-card p-4 text-xs leading-6 text-muted-foreground">داده‌های Search Console با تأخیر چندروزه از سمت گوگل ارائه می‌شوند. اعداد این صفحه برای تحلیل و تصمیم‌گیری هستند و به‌تنهایی تضمین‌کننده رتبه آینده نیستند.</footer>
      </div>
    </main>
  );
}

function Kpi({ icon, title, value, change, positionChange, help }: { icon: React.ReactNode; title: string; value: string; change?: number | null; positionChange?: number | null; help: string }) {
  const good = positionChange !== undefined ? (positionChange ?? 0) > 0 : (change ?? 0) > 0;
  return <div className="group rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><div className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</div><Help text={help} /></div><div className="mt-4 text-sm text-muted-foreground">{title}</div><div className="mt-1 text-3xl font-black tracking-tight">{value}</div>{(change !== undefined || positionChange !== undefined) && <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${good ? "text-emerald-600" : "text-rose-600"}`}>{good ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}{positionChange !== undefined ? `${Math.abs(positionChange ?? 0).toFixed(1)} رتبه بهتر` : `${Math.abs(change ?? 0).toFixed(1)}٪ نسبت به دوره قبل`}</div>}</div>;
}
function Panel({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) { return <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</div><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div>{children}</section>; }
function HealthCard({ health }: { health: Health }) { const status = health.score >= 80 ? "emerald" : health.score >= 60 ? "amber" : "rose"; return <div className="flex h-72 flex-col items-center justify-center"><div className={`relative flex h-40 w-40 items-center justify-center rounded-full border-[12px] ${status === "emerald" ? "border-emerald-500/25" : status === "amber" ? "border-amber-500/25" : "border-rose-500/25"}`}><div className="text-center"><div className="text-4xl font-black">{health.score.toLocaleString("fa-IR")}</div><div className="text-xs text-muted-foreground">از ۱۰۰</div></div></div><div className="mt-4 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{severityLabel(health.status)}</div><div className="mt-1 text-center text-xs text-muted-foreground">{health.checks.checkedUrls.toLocaleString("fa-IR")} URL بررسی شده · {health.checks.brokenUrls.length.toLocaleString("fa-IR")} مشکل</div></div>; }
function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) { return <button onClick={onClick} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-background"}`}>{icon}{children}</button>; }
function Mini({ title, value }: { title: string; value: string }) { return <div><div className="text-xs text-muted-foreground">{title}</div><div className="mt-1 truncate text-sm font-bold">{value}</div></div>; }
function DataTable({ rows, dimension, onAnalyze }: { rows: Row[]; dimension: string; onAnalyze: (target: string) => void }) { return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/30"><tr className="text-right text-xs text-muted-foreground"><th className="px-5 py-3">{dimension === "page" ? "صفحه سایت" : "عبارت جستجو"}</th><th className="px-5 py-3">کلیک</th><th className="px-5 py-3">نمایش</th><th className="px-5 py-3">CTR</th><th className="px-5 py-3">جایگاه</th><th className="px-5 py-3">اقدام</th></tr></thead><tbody>{rows.slice(0, 50).map((r, i) => <tr key={i} className="border-t transition hover:bg-muted/20"><td className="max-w-lg px-5 py-4"><div className="truncate font-medium" title={r.keys?.[0]}>{r.keys?.[0] || "—"}</div></td><td className="px-5 py-4 font-semibold">{n(r.clicks ?? 0)}</td><td className="px-5 py-4">{n(r.impressions ?? 0)}</td><td className="px-5 py-4">{pct(r.ctr ?? 0)}</td><td className="px-5 py-4">{(r.position ?? 0).toFixed(1)}</td><td className="px-5 py-4"><button onClick={() => onAnalyze(r.keys?.[0] || "")} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted">تحلیل</button></td></tr>)}</tbody></table>{!rows.length && <Empty text="در این بازه داده‌ای برای نمایش وجود ندارد." />}</div>; }
function InsightPanel({ icon, title, description, rows, empty, onAnalyze }: { icon: React.ReactNode; title: string; description: string; rows: Row[]; empty: string; onAnalyze: (target: string) => void }) { return <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">{icon}</div><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div><div className="mt-5 space-y-2">{rows.length ? rows.map((r,i) => <div key={i} className="flex items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold" title={r.keys?.[0]}>{r.keys?.[0] || "—"}</div><div className="mt-1 text-xs text-muted-foreground">{n(r.impressions ?? 0)} نمایش · CTR {pct(r.ctr ?? 0)} · رتبه {(r.position ?? 0).toFixed(1)}</div></div><button onClick={() => onAnalyze(r.keys?.[0] || "")} className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15">بررسی</button></div>) : <Empty text={empty} />}</div></section>; }
function Guide({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-2xl border bg-card p-5"><div className="mb-3 flex items-center gap-2 text-primary">{icon}<h3 className="font-bold text-foreground">{title}</h3></div><p className="text-sm leading-7 text-muted-foreground">{text}</p></div>; }
function AdviceBox({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><h3 className="text-sm font-bold text-cyan-200">{title}</h3><p className="mt-2 text-sm leading-7 text-white/75">{text}</p></div>; }
function AdviceList({ title, items }: { title: string; items?: string[] }) { return <AdviceBox title={title} text={items?.length ? items.join("\n• ") : "موردی ارائه نشد."} />; }
function Help({ text }: { text: string }) { return <span title={text} className="inline-flex cursor-help text-muted-foreground"><CircleHelp className="h-4 w-4" /></span>; }
function Skeleton({ className = "" }: { className?: string }) { return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />; }
function ErrorBox({ text }: { text: string }) { return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-800"><XCircle className="ml-2 inline h-4 w-4" />{text}</div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{text}</div>; }
