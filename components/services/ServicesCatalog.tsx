"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { GlassPanel, PrimaryLinkButton } from "@/components/ui";

type Service = { id: string; title: string; slug: string | null; category: string | null; description: string | null; price: number; icon: string | null; is_active: boolean; parent_service_id: string | null };
type Props = { services: Service[]; initialCategory?: string; initialSearch?: string };

export default function ServicesCatalog({ services, initialCategory = "all", initialSearch = "" }: Props) {
  const ServiceAnnouncementsSlider = dynamic(() => import("@/components/ServiceAnnouncementsSlider"), { loading: () => null });
  const search = initialSearch.trim();
  const q = search.toLocaleLowerCase("fa-IR");
  const parents = services.filter(s => !s.parent_service_id);
  const childrenByParent = new Map<string, Service[]>();
  services.filter(s => s.parent_service_id).forEach(s => {
    const list = childrenByParent.get(s.parent_service_id!) || [];
    list.push(s);
    childrenByParent.set(s.parent_service_id!, list);
  });
  const visibleParents = parents.filter(parent => {
    if (initialCategory !== "all" && initialCategory && parent.id !== initialCategory && parent.category !== initialCategory) return false;
    if (!q) return true;
    const own = `${parent.title} ${parent.category || ""} ${parent.description || ""}`.toLocaleLowerCase("fa-IR");
    const kids = (childrenByParent.get(parent.id) || []).some(s => `${s.title} ${s.category || ""} ${s.description || ""}`.toLocaleLowerCase("fa-IR").includes(q));
    return own.includes(q) || kids;
  });
  const standalone = services.filter(s => !s.parent_service_id && !childrenByParent.has(s.id)).filter(s => {
    if (initialCategory !== "all" && initialCategory && s.category !== initialCategory && s.id !== initialCategory) return false;
    if (!q) return true;
    return `${s.title} ${s.category || ""} ${s.description || ""}`.toLocaleLowerCase("fa-IR").includes(q);
  });

  return <>
    <ServiceAnnouncementsSlider />
    <GlassPanel className="p-4 sm:p-5">
      <form method="get" className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1"><label htmlFor="service-search" className="sr-only">جستجوی خدمت</label><div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2"><span aria-hidden="true">🔍</span><input id="service-search" name="q" defaultValue={search} placeholder="جستجوی خدمت یا دسته‌بندی..." className="w-full bg-transparent py-2 text-sm outline-none" /></div></div>
        <button type="submit" className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">جستجو</button>
        {initialCategory !== "all" && <input type="hidden" name="category" value={initialCategory} />}
      </form>
      <p className="mt-3 text-xs text-[var(--text-muted)]">دسته‌بندی جداگانه حذف شده است؛ هر خدمت مادر اکنون نقش دسته‌بندی را دارد.</p>
    </GlassPanel>

    <section className="space-y-4" aria-labelledby="service-hierarchy-title">
      <div className="flex items-end justify-between gap-3"><div><h2 id="service-hierarchy-title" className="text-xl sm:text-2xl font-black">دسته‌بندی و خدمات</h2><p className="mt-1 text-sm text-[var(--text-muted)]">برای هر حوزه، خدمت مادر و زیرمجموعه‌های آن را یکجا ببینید.</p></div><span className="text-sm text-[var(--text-muted)]">{services.length.toLocaleString("fa-IR")} خدمت</span></div>
      {visibleParents.length === 0 && standalone.length === 0 ? <GlassPanel className="p-8 text-center"><div className="text-3xl">🔎</div><h2 className="font-black text-lg mt-3">خدمتی پیدا نشد</h2><p className="text-sm text-[var(--muted)] mt-1">عبارت جستجو را تغییر دهید.</p><Link href="/services" className="inline-block mt-4 font-bold text-[var(--primary)]">نمایش همه خدمات</Link></GlassPanel> : <div className="grid gap-4 lg:grid-cols-2">
        {visibleParents.map(parent => {
          const kids = (childrenByParent.get(parent.id) || []).filter(s => !q || `${s.title} ${s.category || ""} ${s.description || ""}`.toLocaleLowerCase("fa-IR").includes(q));
          return <article key={parent.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">{parent.icon || "📂"}</div><div className="min-w-0"><div className="text-xs font-bold text-[var(--primary)]">خدمت مادر</div><h3 className="mt-1 text-lg font-black">{parent.slug ? <Link href={`/services/${encodeURIComponent(parent.slug)}`} className="hover:text-[var(--primary)]">{parent.title}</Link> : parent.title}</h3></div></div>
            {kids.length > 0 && <div className="mt-4 border-t border-[var(--border)] pt-4"><div className="mb-2 text-xs font-bold text-[var(--text-muted)]">خدمات زیرمجموعه ({kids.length.toLocaleString("fa-IR")})</div><div className="grid gap-2 sm:grid-cols-2">{kids.map(child => child.slug ? <Link key={child.id} href={`/services/${encodeURIComponent(child.slug)}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 text-sm font-bold hover:border-[var(--primary)]/40">{child.icon || "📄"} {child.title}</Link> : <div key={child.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 text-sm font-bold">{child.icon || "📄"} {child.title}</div>)}</div></div>}
          </article>;
        })}
        {standalone.length > 0 && <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:col-span-2"><h3 className="text-lg font-black">خدمات مستقل</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{standalone.map(s => s.slug ? <Link key={s.id} href={`/services/${encodeURIComponent(s.slug)}`} className="rounded-xl border border-[var(--border)] p-3 text-sm font-bold hover:border-[var(--primary)]/40">{s.icon || "📄"} {s.title}</Link> : <div key={s.id} className="rounded-xl border border-[var(--border)] p-3 text-sm font-bold">{s.icon || "📄"} {s.title}</div>)}</div></article>}
      </div>}
    </section>
  </>;
}
