"use client";

import { useMemo, useState } from "react";
import ServiceAnnouncementsSlider from "@/components/ServiceAnnouncementsSlider";
import { GlassPanel, TusanCard, PrimaryLinkButton, SectionHeader, TusanInput } from "@/components/ui";

type Service = { id: string; title: string; slug: string; category: string | null; description: string | null; price: number; icon: string | null; is_active: boolean; parent_service_id: string | null };

export default function ServicesCatalog({ services }: { services: Service[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("همه");
  const categories = useMemo(() => ["همه", ...Array.from(new Set(services.map(s => s.category).filter(Boolean) as string[]))], [services]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter(service => {
      if (category !== "همه" && service.category !== category) return false;
      if (!q) return true;
      return service.title.toLowerCase().includes(q) || service.category?.toLowerCase().includes(q) || service.description?.toLowerCase().includes(q);
    });
  }, [services, search, category]);

  return <>
    <ServiceAnnouncementsSlider />
    <GlassPanel className="p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1"><TusanInput icon="🔍" value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی خدمت..." clearable onClear={() => setSearch("")} /></div>
        <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] px-5 py-3 text-sm">{filtered.length.toLocaleString("fa-IR")} خدمت</div>
      </div>
      {categories.length > 1 && <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{categories.map(item => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition ${category === item ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"}`}>{item}</button>)}</div>}
    </GlassPanel>
    <SectionHeader title="خدمات موجود" description="خدمات مادر و خدمات مستقل را انتخاب کنید." />
    {filtered.length === 0 ? <GlassPanel className="p-10 text-center"><div className="text-4xl">🔎</div><h2 className="font-black text-xl mt-4">خدمتی پیدا نشد</h2><p className="text-[var(--muted)] mt-2">عبارت جستجو یا دسته‌بندی دیگری را امتحان کنید.</p></GlassPanel> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map(service => <TusanCard key={service.id} className="p-6 flex flex-col h-full"><div className="flex items-start justify-between gap-3"><div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl">{service.icon || "📄"}</div>{service.category && <span className="rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-xs font-bold">{service.category}</span>}</div><h3 className="text-xl font-black mt-5">{service.title}</h3><p className="text-[var(--muted)] text-sm leading-7 mt-2 flex-1 line-clamp-3">{service.description || "ثبت سفارش آنلاین این خدمت از طریق توسن."}</p><div className="mt-5 flex items-center justify-between gap-3"><span className="font-bold text-[var(--primary)]">{service.price > 0 ? `${service.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}</span><PrimaryLinkButton href={`/services/${encodeURIComponent(service.slug)}`}>مشاهده خدمت ←</PrimaryLinkButton></div></TusanCard>)}</div>}
  </>;
}
