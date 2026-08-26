"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { GlassPanel, TusanCard, PrimaryLinkButton, SectionHeader, TusanInput } from "@/components/ui";
import { SERVICE_TAXONOMY, getTaxonomySlug } from "@/lib/serviceTaxonomy";

const ServiceAnnouncementsSlider = dynamic(
  () => import("@/components/ServiceAnnouncementsSlider"),
  { ssr: false, loading: () => null }
);

type Service = { id: string; title: string; slug: string; category: string | null; description: string | null; price: number; icon: string | null; is_active: boolean; parent_service_id: string | null };

export default function ServicesCatalog({ services, initialCategory = "all" }: { services: Service[]; initialCategory?: string }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    services.forEach(service => {
      const slug = getTaxonomySlug(service.category);
      if (slug !== "other") counts.set(slug, (counts.get(slug) || 0) + 1);
    });
    return SERVICE_TAXONOMY.filter(item => counts.has(item.slug)).map(item => ({ ...item, count: counts.get(item.slug) || 0 }));
  }, [services]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter(service => {
      if (category !== "all" && getTaxonomySlug(service.category) !== category) return false;
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
      {categories.length > 0 && (
        <div className="mt-5">
          <label htmlFor="service-category" className="sr-only">دسته‌بندی خدمات</label>
          <select id="service-category" value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30">
            <option value="all">همه دسته‌ها</option>
            {categories.map(item => <option key={item.slug} value={item.slug}>{item.title} ({item.count.toLocaleString("fa-IR")})</option>)}
          </select>
        </div>
      )}
    </GlassPanel>
    <SectionHeader title="خدمات موجود" description="خدمات را بر اساس حوزه انتخاب کنید یا جستجو کنید." />
    {filtered.length === 0 ? <GlassPanel className="p-10 text-center"><div className="text-4xl">🔎</div><h2 className="font-black text-xl mt-4">خدمتی پیدا نشد</h2><p className="text-[var(--muted)] mt-2">عبارت جستجو یا دسته‌بندی دیگری را امتحان کنید.</p></GlassPanel> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map(service => <TusanCard key={service.id} className="p-6 flex flex-col h-full"><div className="flex items-start justify-between gap-3"><div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl">{service.icon || "📄"}</div>{service.category && <span className="rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-xs font-bold">{service.category}</span>}</div><h3 className="text-xl font-black mt-5">{service.title}</h3><p className="text-[var(--muted)] text-sm leading-7 mt-2 flex-1 line-clamp-3">{service.description || "ثبت سفارش آنلاین این خدمت از طریق توسن."}</p><div className="mt-5 flex items-center justify-between gap-3"><span className="font-bold text-[var(--primary)]">{service.price > 0 ? `${service.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}</span><PrimaryLinkButton href={`/services/${encodeURIComponent(service.slug)}`}>مشاهده خدمت ←</PrimaryLinkButton></div></TusanCard>)}</div>}
  </>;
}
