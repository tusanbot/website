"use client";
import { useState } from "react";
import { Plus, Rss, ExternalLink } from "lucide-react";

type Source = { id: string; name: string; url: string; category: string; source_type: string; is_active: boolean; last_checked_at: string | null; last_error: string | null };
const categories: Record<string,string> = { general: "عمومی", education: "آموزش و دانشگاه", employment: "استخدام", government: "خدمات دولتی", registration: "ثبت‌نام و فراخوان", finance: "وام و تسهیلات", exams: "آزمون‌ها" };
export default function NewsSourceManager({ initialSources }: { initialSources: Source[] }) {
  const [sources, setSources] = useState(initialSources);
  const [name, setName] = useState(""); const [url, setUrl] = useState(""); const [category, setCategory] = useState("general");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function addSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/news-sources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, url, category, source_type: "rss" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ثبت منبع ناموفق بود");
      setSources((current) => [data.source, ...current]); setName(""); setUrl(""); setMessage("منبع با موفقیت اضافه شد.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "خطا در ثبت منبع"); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
    <div className="flex items-center gap-2"><Rss size={19} className="text-[var(--primary)]"/><h2 className="text-lg font-black">منابع جمع‌آوری خودکار</h2></div>
    <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">در حال حاضر منابع RSS و Atom پشتیبانی می‌شوند. نشانی فید رسمی را وارد کنید؛ موارد تازه در صف بررسی مدیر قرار می‌گیرند.</p>
    <form onSubmit={addSource} className="mt-4 grid gap-3 md:grid-cols-4">
      <input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="نام منبع، مثلاً سازمان سنجش" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--primary)]"/>
      <input required type="url" value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://example.ir/feed" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--primary)] md:col-span-2"/>
      <select value={category} onChange={(e)=>setCategory(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm">{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
      <div className="md:col-span-4 flex flex-wrap items-center gap-3"><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Plus size={16}/> افزودن منبع RSS</button>{message&&<span className="text-sm text-[var(--text-muted)]" role="status">{message}</span>}</div>
    </form>
    <div className="mt-5 space-y-2">{sources.length ? sources.map((source)=><div key={source.id} className="flex flex-col justify-between gap-2 rounded-xl border border-[var(--border)] p-3 sm:flex-row sm:items-center"><div><div className="font-bold">{source.name}<span className="mr-2 text-xs font-normal text-[var(--text-muted)]">{categories[source.category]||"عمومی"}</span></div><a href={source.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-xs text-[var(--primary)]"><ExternalLink size={12}/>{source.url}</a>{source.last_error&&<p className="mt-1 text-xs text-red-600">آخرین خطا: {source.last_error}</p>}</div><span className={"shrink-0 rounded-full px-3 py-1 text-xs font-bold "+(source.is_active?"bg-emerald-50 text-emerald-700":"bg-gray-100 text-gray-600")}>{source.is_active?"فعال":"غیرفعال"}</span></div>) : <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-muted)]">هنوز منبعی ثبت نشده است.</p>}</div>
  </section>;
}
