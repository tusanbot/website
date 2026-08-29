"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { GlassPanel, PrimaryLinkButton, SectionHeader } from "@/components/ui";
import { SERVICE_TAXONOMY, getTaxonomySlug } from "@/lib/serviceTaxonomy";

const ServiceAnnouncementsSlider = dynamic(() => import("@/components/ServiceAnnouncementsSlider"), { loading: () => null });

type Service = { id: string; title: string; slug: string | null; category: string | null; description: string | null; price: number; icon: string | null; is_active: boolean; parent_service_id: string | null };
type Props = { services: Service[]; initialCategory?: string; initialSearch?: string };

function getServiceHref(service: Service) {
  const identifier = service.slug?.trim() || service.id;
  return `/services/${encodeURIComponent(identifier)}`;
}

export default function ServicesCatalog({ services, initialCategory = "all", initialSearch = "" }: Props) {
  const search = initialSearch.trim();
  const category = initialCategory || "all";
  const counts = new Map<string, number>();
  services.forEach(service => { const slug = getTaxonomySlug(service.category); if (slug !== "other") counts.set(slug, (counts.get(slug) || 0) + 1); });
  const categories = SERVICE_TAXONOMY.filter(item => counts.has(item.slug)).map(item => ({ ...item, count: counts.get(item.slug) || 0 }));
  const q = search.toLocaleLowerCase("fa-IR");
  const filtered = services.filter(service => {
    if (category !== "all" && getTaxonomySlug(service.category) !== category) return false;
    if (!q) return true;
    return service.title.toLocaleLowerCase("fa-IR").includes(q) || service.category?.toLocaleLowerCase("fa-IR").includes(q) || service.description?.toLocaleLowerCase("fa-IR").includes(q);
  });

  return <>
    <ServiceAnnouncementsSlider />
    <GlassPanel className="p-4 sm:p-5">
      <form method="get" className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1"><label htmlFor="service-search" className="sr-only">جستجوی خدمت</label><div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2"><span aria-hidden="true">🔍</span><input id="service-search" name="q" defaultValue={search} placeholder="جستجوی خدمت..." className="w-full bg-transparent py-2 text-sm outline-none" /></div></div>
        <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] px-5 py-3 text-sm">{filtered.length.toLocaleString("fa-IR")} خدمت</div>
        <button type="submit" className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">جستجو</button>
        {category !== "all" && <input type="hidden" name="category" value={category} />}
      </form>
      {categories.length > 0 && <form method="get" className="mt-5"><label htmlFor="service-category" className="sr-only">دسته‌بندی خدمات</label><div className="flex gap-3"><select id="service-category" name="category" defaultValue={category} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"><option value="all">همه دسته‌ها</option>{categories.map(item => <option key={item.slug} value={item.slug}>{item.title} ({item.count.toLocaleString("fa-IR")})</option>)}</select>{search && <input type="hidden" name="q" value={search} />}</div></form>}
    </GlassPanel>
    <SectionHeader title="خدمات موجود" description="خدمات را بر اساس حوزه انتخاب کنید یا جستجو کنید." />
    {filtered.length === 0 ? <GlassPanel className="p-10 text-center"><div className="text-4xl">🔎</div><h2 className="font-black text-xl mt-4">خدمتی پیدا نشد</h2><p className="text-[var(--muted)] mt-2">عبارت جستجو یا دسته‌بندی دیگری را امتحان کنید.</p><Link href="/services" className="inline-block mt-5 font-bold text-[var(--primary)]">نمایش همه خدمات</Link></GlassPanel> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map(service => <article key={service.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm flex flex-col h-full"><div className="flex items-start justify-between gap-3"><div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl">{service.icon || "📄"}</div>{service.category && <span className="rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-xs font-bold">{service.category}</span>}</div><h3 className="text-xl font-black mt-5">{service.title}</h3><p className="text-[var(--muted)] text-sm leading-7 mt-2 flex-1">{service.description || "ثبت سفارش آنلاین این خدمت از طریق توسن."}</p><div className="mt-5 flex items-center justify-between gap-3"><span className="font-bold text-[var(--primary)]">{service.price > 0 ? `${service.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}</span><PrimaryLinkButton href={getServiceHref(service)}>مشاهده خدمت ←</PrimaryLinkButton></div></article>)}</div>}
  </>;
}
