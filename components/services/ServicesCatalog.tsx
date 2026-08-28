"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { GlassPanel, PrimaryLinkButton } from "@/components/ui";
import { SERVICE_TAXONOMY, getTaxonomySlug } from "@/lib/serviceTaxonomy";

const ServiceAnnouncementsSlider = dynamic(() => import("@/components/ServiceAnnouncementsSlider"), { loading: () => null });

type Service = { id: string; title: string; slug: string; category: string | null; description: string | null; price: number; icon: string | null; is_active: boolean; parent_service_id: string | null };
type Props = { services: Service[]; initialCategory?: string; initialSearch?: string };

export default function ServicesCatalog({ services, initialCategory = "all", initialSearch = "" }: Props) {
  const search = initialSearch.trim();
  const category = initialCategory || "all";
  const counts = new Map<string, number>();
  services.forEach((service) => { const slug = getTaxonomySlug(service.category); if (slug !== "other") counts.set(slug, (counts.get(slug) || 0) + 1); });
  const categories = SERVICE_TAXONOMY.filter((item) => counts.has(item.slug)).map((item) => ({ ...item, count: counts.get(item.slug) || 0 }));
  const q = search.toLocaleLowerCase("fa-IR");
  const filtered = services.filter((service) => {
    if (category !== "all" && getTaxonomySlug(service.category) !== category) return false;
    if (!q) return true;
    return service.title.toLocaleLowerCase("fa-IR").includes(q) || service.category?.toLocaleLowerCase("fa-IR").includes(q) || service.description?.toLocaleLowerCase("fa-IR").includes(q);
  });

  return <div className="space-y-5">
    <ServiceAnnouncementsSlider />
    <GlassPanel className="overflow-hidden rounded-3xl p-3 sm:p-4">
      <form method="get" className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="service-search" className="sr-only">جستجوی خدمت</label>
        <div className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[var(--primary)]/50 focus-within:ring-2 focus-within:ring-[var(--primary)]/10">
          <span aria-hidden="true" className="text-lg">🔍</span>
          <input id="service-search" name="q" defaultValue={search} placeholder="نام خدمت، دسته‌بندی یا موضوع موردنظر..." className="w-full bg-transparent text-sm outline-none" />
          {search && <Link href={category === "all" ? "/services" : `/services?category=${encodeURIComponent(category)}`} className="shrink-0 text-xs font-bold text-[var(--muted)]">پاک کردن</Link>}
        </div>
        {category !== "all" && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="min-h-12 rounded-2xl bg-[var(--primary)] px-6 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5">جستجو</button>
      </form>
      {categories.length > 0 && <div className="mt-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="flex min-w-max gap-2" role="list" aria-label="دسته‌بندی خدمات"><CategoryLink href="/services" active={category === "all"}>همه <span>{services.length.toLocaleString("fa-IR")}</span></CategoryLink>{categories.map((item) => <CategoryLink key={item.slug} href={`/services?category=${encodeURIComponent(item.slug)}${search ? `&q=${encodeURIComponent(search)}` : ""}`} active={category === item.slug}>{item.title} <span>{item.count.toLocaleString("fa-IR")}</span></CategoryLink>)}</div></div>}
    </GlassPanel>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-bold text-[var(--primary)]">کاتالوگ خدمات</div><h2 className="mt-1 text-2xl font-black text-[var(--text)]">{category === "all" ? "همه خدمات" : categories.find((item) => item.slug === category)?.title || "خدمات"}</h2></div><div className="text-sm text-[var(--muted)]">{filtered.length.toLocaleString("fa-IR")} خدمت</div></div>
    {filtered.length === 0 ? <GlassPanel className="rounded-3xl p-10 text-center"><div className="text-4xl">🔎</div><h2 className="mt-4 text-xl font-black">خدمتی پیدا نشد</h2><p className="mt-2 text-sm text-[var(--muted)]">عبارت جستجو یا دسته‌بندی دیگری را امتحان کنید.</p><Link href="/services" className="mt-5 inline-block font-bold text-[var(--primary)]">نمایش همه خدمات</Link></GlassPanel> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((service) => <article key={service.id} className="group flex min-h-[190px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[var(--primary)]/35 hover:shadow-md"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-2xl transition group-hover:scale-105">{service.icon || "📄"}</div><div className="min-w-0 flex-1"><h3 className="truncate text-base font-black text-[var(--text)]">{service.title}</h3>{service.category && <span className="mt-1 inline-block text-[11px] font-bold text-[var(--muted)]">{service.category}</span>}</div></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{service.description || "ثبت سفارش آنلاین این خدمت از طریق توسن."}</p><div className="mt-auto flex items-center justify-between gap-2 pt-3"><span className="text-sm font-black text-[var(--primary)]">{service.price > 0 ? `${service.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}</span><PrimaryLinkButton href={`/services/${encodeURIComponent(service.slug)}`}>مشاهده ←</PrimaryLinkButton></div></article>)}</div>}
  </div>;
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`rounded-full border px-3.5 py-2 text-xs font-black transition ${active ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--primary)]/40 hover:-translate-y-0.5"}`}>{children}</Link>;
}