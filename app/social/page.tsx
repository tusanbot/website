"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Play, Search, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Platform = { id: string; name: string; slug: string; icon: string | null };
type Category = { id: string; name: string; platform_id: string };
type Service = { id: string; name: string; description: string | null; platform_id: string; category_id: string | null; provider_rate: number | null; min_quantity: number | null; max_quantity: number | null; is_active: boolean };

const themes: Record<string, { card: string; icon: string; accent: string }> = {
  instagram: { card: "border-pink-300/60", icon: "text-fuchsia-600 bg-pink-500/10", accent: "bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400" },
  telegram: { card: "border-sky-300/60", icon: "text-sky-500 bg-sky-500/10", accent: "bg-sky-500" },
  youtube: { card: "border-red-300/60", icon: "text-red-600 bg-red-500/10", accent: "bg-red-600" },
  tiktok: { card: "border-black/20 dark:border-white/20", icon: "text-black dark:text-white bg-black/10", accent: "bg-black" },
  eitaa: { card: "border-orange-300/60", icon: "text-orange-500 bg-orange-500/10", accent: "bg-orange-500" },
  rubika: { card: "border-rose-300/60", icon: "text-rose-500 bg-rose-500/10", accent: "bg-rose-500" },
};

function PlatformIcon({ slug }: { slug: string }) {
  if (slug === "telegram") return <Send size={28} />;
  if (slug === "youtube" || slug === "tiktok") return <Play size={28} />;
  return <MessageCircle size={28} />;
}

export default function SocialServicesPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [platform, setPlatform] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: c }, { data: s }] = await Promise.all([
        supabase.from("social_platforms").select("id,name,slug,icon").eq("is_active", true).order("sort_order"),
        supabase.from("social_categories").select("id,name,platform_id").eq("is_active", true).order("sort_order"),
        supabase.from("social_services").select("id,name,description,platform_id,category_id,provider_rate,min_quantity,max_quantity,is_active").eq("is_active", true).order("sort_order"),
      ]);
      setPlatforms((p || []) as Platform[]); setCategories((c || []) as Category[]); setServices((s || []) as Service[]); setLoading(false);
    }
    void load();
  }, []);

  const visibleCategories = useMemo(() => categories.filter(c => !platform || c.platform_id === platform), [categories, platform]);
  const visibleServices = useMemo(() => services.filter(s => (!platform || s.platform_id === platform) && (!category || s.category_id === category) && (!query || `${s.name} ${s.description || ""}`.toLowerCase().includes(query.toLowerCase()))), [services, platform, category, query]);

  return (
    <main dir="rtl" className="min-h-screen page-background text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="font-bold text-[var(--primary)]">مرکز خدمات توسن</p><h1 className="mt-2 text-3xl sm:text-4xl font-black">خدمات شبکه‌های اجتماعی</h1><p className="mt-3 text-[var(--text-muted)]">سرویس موردنظر را انتخاب کنید و سفارش خود را ثبت کنید.</p></div>
            <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 font-bold">بازگشت به سایت <ArrowLeft size={18} /></Link>
          </div>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {platforms.map(p => { const t = themes[p.slug] || { card: "border-[var(--border)]", icon: "text-[var(--primary)] bg-[var(--primary)]/10", accent: "bg-[var(--primary)]" }; return <button key={p.id} onClick={() => { setPlatform(platform === p.id ? "" : p.id); setCategory(""); }} className={`relative overflow-hidden rounded-2xl border ${t.card} ${platform === p.id ? "ring-2 ring-[var(--primary)]" : ""} bg-[var(--background)] p-4 text-center`}><span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${t.icon}`}><PlatformIcon slug={p.slug} /></span><span className="mt-3 block font-black">{p.name}</span></button>; })}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="جستجوی سرویس..." className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-3.5 pr-11 pl-4 outline-none focus:border-[var(--primary)]" /></div>
            <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 outline-none"><option value="">همه دسته‌بندی‌ها</option>{visibleCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
        </div>
        <section className="mt-8">
          {loading ? <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">در حال دریافت سرویس‌ها...</div> : visibleServices.length === 0 ? <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">سرویسی مطابق فیلترهای انتخابی پیدا نشد.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleServices.map(s => <article key={s.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="text-lg font-black">{s.name}</h2>{s.description && <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{s.description}</p>}<div className="mt-5 flex items-end justify-between gap-3"><div><div className="text-xs text-[var(--text-muted)]">قیمت پایه</div><div className="mt-1 font-black text-[var(--primary)]">{s.provider_rate == null ? "استعلام" : `${new Intl.NumberFormat("fa-IR").format(s.provider_rate)} تومان`}</div></div><Link href={`/social/order?service=${encodeURIComponent(s.id)}`} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-black text-white">سفارش</Link></div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
