"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Layers3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SERVICE_TAXONOMY, getTaxonomySlug } from "@/lib/serviceTaxonomy";
import AnimatedTagRail from "@/components/home/AnimatedTagRail";
import { SectionHeader } from "@/components/ui";

type Service = { id: string; title: string; category: string | null; icon: string | null; parent_service_id: string | null };
type CategoryItem = { id: string; title: string; description: string; count: number; services: Service[]; href: string };

const icons = ["📂", "🚗", "💳", "📄", "🎓", "🏠", "⚖️", "🧾", "💻", "🎨", "🌐", "✈️"];

export default function ServiceCategoriesRail() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase.from("services").select("id,title,category,icon,parent_service_id").eq("is_active", true).is("parent_service_id", null).order("created_at", { ascending: false });
      if (mounted) { setServices(data || []); setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const categories = useMemo<CategoryItem[]>(() => {
    return SERVICE_TAXONOMY.map((taxonomy, index) => {
      const matching = services.filter(service => getTaxonomySlug(service.category) === taxonomy.slug);
      return { id: taxonomy.slug, title: taxonomy.title, description: taxonomy.description, count: matching.length, services: matching.slice(0, 6), href: `/services?category=${encodeURIComponent(taxonomy.slug)}`, icon: icons[index % icons.length] } as CategoryItem & { icon: string };
    }).filter(category => category.count > 0) as CategoryItem[];
  }, [services]);

  const items = categories.map((category) => ({
    id: category.id,
    title: category.title,
    href: category.href,
    icon: <span aria-hidden="true" className="text-base">{(category as CategoryItem & { icon: string }).icon}</span>,
    panel: <span aria-hidden="true" />,
  }));

  return (
    <section id="service-categories" className="relative py-8 sm:py-10" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title="دسته‌بندی خدمات" description="روی هر دسته بروید تا خدمات زیرمجموعه را سریع ببینید." align="center" />
        {loading ? <div className="mt-5 h-16 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" /> : categories.length ? (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 px-2 py-1 shadow-[var(--shadow-sm)] backdrop-blur">
            <AnimatedTagRail
              items={items}
              ariaLabel="دسته‌بندی خدمات"
              speed={10}
              renderPanel={(item) => {
                const category = categories.find(value => value.id === item.id);
                if (!category) return null;
                return (
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div><div className="flex items-center gap-2 text-base font-black"><Layers3 size={18} className="text-[var(--primary)]" />{category.title}</div><p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">{category.description}</p></div>
                      <span className="shrink-0 rounded-full bg-[var(--primary)]/10 px-2 py-1 text-xs font-bold text-[var(--primary)]">{category.count.toLocaleString("fa-IR")} خدمت</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {category.services.map(service => <Link key={service.id} href={`/services/${encodeURIComponent(service.id)}`} className="group flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"><span>{service.icon || "📋"}</span><span className="min-w-0 flex-1 truncate">{service.title}</span><ArrowLeft size={13} className="shrink-0 text-[var(--primary)] transition group-hover:-translate-x-0.5" /></Link>)}
                    </div>
                    <Link href={category.href} className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-black text-white">مشاهده همه خدمات این دسته <ChevronDown size={14} className="rotate-90" /></Link>
                  </div>
                );
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
