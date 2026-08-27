"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AnimatedTagRail from "@/components/home/AnimatedTagRail";
import { GlassPanel, TusanButton, SectionHeader } from "@/components/ui";

type Service = { id: string; title: string; price: number | null; icon: string | null; is_popular?: boolean };

export default function PopularServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadServices() {
      setLoading(true);
      const { data } = await supabase.from("services").select("id, title, price, icon, is_popular").eq("is_active", true).order("is_popular", { ascending: false }).order("created_at", { ascending: false }).limit(10);
      if (mounted) {
        setServices((data || []).map((item) => ({ id: item.id, title: item.title, price: item.price == null ? null : Number(item.price), icon: item.icon, is_popular: item.is_popular })));
        setLoading(false);
      }
    }
    void loadServices();
    return () => { mounted = false; };
  }, []);

  const railItems = services.map((service) => ({ id: service.id, title: service.title, href: `/services/${encodeURIComponent(service.id)}`, price: service.price, icon: <span aria-hidden="true" className="text-base">{service.icon || "📋"}</span> }));

  return (
    <section id="popular-services" className="relative scroll-mt-28 py-10 sm:py-12" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title="خدمات پرطرفدار توسن" description="خدمات محبوب را سریع ببینید و با یک کلیک وارد صفحه ثبت درخواست شوید." align="center" />
        {loading ? <div className="mt-5 h-16 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-label="در حال بارگذاری خدمات محبوب" /> : railItems.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 px-2 py-1 shadow-[var(--shadow-sm)] backdrop-blur">
            <AnimatedTagRail items={railItems} ariaLabel="خدمات پرطرفدار" speed={10} />
          </div>
        ) : <GlassPanel className="mt-5 p-6 text-center text-sm text-[var(--text-muted)]">در حال حاضر خدمت فعالی برای نمایش وجود ندارد.</GlassPanel>}
        <div className="mt-4 flex justify-center"><Link href="/services"><TusanButton variant="secondary" className="px-6 py-2 text-sm">مشاهده همه خدمات</TusanButton></Link></div>
      </div>
    </section>
  );
}
