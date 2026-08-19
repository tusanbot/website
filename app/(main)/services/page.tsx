"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ServiceAnnouncementsSlider from "@/components/ServiceAnnouncementsSlider";
import { GlassPanel, TusanCard, PrimaryLinkButton, SectionHeader, TusanInput } from "@/components/ui";

type Service = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  price: number;
  icon: string | null;
  is_active: boolean;
  parent_service_id: string | null;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("همه");

  useEffect(() => { loadServices(); }, []);

  async function loadServices() {
    setLoading(true);
    const { data, error } = await supabase.from("services")
      .select("id,title,category,description,price,icon,is_active,parent_service_id")
      .eq("is_active", true).is("parent_service_id", null)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); setServices([]); }
    else setServices((data || []).map((item: any) => ({ ...item, price: Number(item.price || 0) })));
    setLoading(false);
  }

  const categories = useMemo(() => ["همه", ...Array.from(new Set(services.map(s => s.category).filter(Boolean) as string[]))], [services]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter(service => {
      if (category !== "همه" && service.category !== category) return false;
      if (!q) return true;
      return service.title.toLowerCase().includes(q) || service.category?.toLowerCase().includes(q) || service.description?.toLowerCase().includes(q);
    });
  }, [services, search, category]);

  if (loading) return <div dir="rtl" className="min-h-screen page-background p-6"><GlassPanel className="max-w-6xl mx-auto p-10 text-center text-[var(--muted)]">در حال دریافت خدمات...</GlassPanel></div>;

  return <div dir="rtl" className="min-h-screen page-background text-[var(--text)]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <section className="rounded-[32px] p-7 sm:p-10 text-white shadow-lg" style={{ background: "radial-gradient(circle at top right, var(--hero-start) 0%, var(--hero-mid) 38%, var(--hero-end) 100%)" }}>
        <div className="max-w-3xl"><div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm">🛠️ خدمات آنلاین توسن</div><h1 className="mt-5 text-3xl sm:text-4xl font-black">خدمت موردنیاز خود را انتخاب کنید</h1><p className="mt-4 text-white/80 leading-8">خدمات مادر در اینجا نمایش داده می‌شوند و خدمات زیرمجموعه پس از ورود به خدمت مادر قابل انتخاب هستند.</p></div>
      </section>

      <ServiceAnnouncementsSlider />

      <GlassPanel className="p-4 sm:p-5"><div className="flex flex-col lg:flex-row gap-4"><div className="flex-1"><TusanInput icon="🔍" value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی خدمت..." clearable onClear={() => setSearch("")} /></div><div className="flex items-center justify-center rounded-2xl border border-[var(--border)] px-5 py-3 text-sm">{filtered.length.toLocaleString("fa-IR")} خدمت</div></div>
        {categories.length > 1 && <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{categories.map(item => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition ${category === item ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"}`}>{item}</button>)}</div>}
      </GlassPanel>

      <SectionHeader title="خدمات موجود" description="خدمات مادر و خدمات مستقل را انتخاب کنید." />
      {filtered.length === 0 ? <GlassPanel className="p-10 text-center"><div className="text-4xl">🔎</div><h2 className="font-black text-xl mt-4">خدمتی پیدا نشد</h2><p className="text-[var(--muted)] mt-2">عبارت جستجو یا دسته‌بندی دیگری را امتحان کنید.</p></GlassPanel> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(service => <TusanCard key={service.id} className="p-6 flex flex-col h-full"><div className="flex items-start justify-between gap-3"><div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl">{service.icon || "📄"}</div>{service.category && <span className="rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-xs font-bold">{service.category}</span>}</div><h3 className="text-xl font-black mt-5">{service.title}</h3><p className="text-[var(--muted)] text-sm leading-7 mt-2 flex-1 line-clamp-3">{service.description || "ثبت سفارش آنلاین این خدمت از طریق توسن."}</p><div className="mt-5 flex items-center justify-between gap-3"><span className="font-bold text-[var(--primary)]">{service.price > 0 ? `${service.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}</span><Link href={`/services/${service.id}`}><PrimaryLinkButton>مشاهده خدمت ←</PrimaryLinkButton></Link></div></TusanCard>)}
      </div>}
    </div>
  </div>;
}
