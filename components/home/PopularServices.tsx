"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton, SectionHeader } from "@/components/ui";

type Service = { id: string; title: string; slug: string | null; category: string | null; description: string | null; icon: string | null; is_popular?: boolean };

export default function PopularServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void loadServices(); }, []);
  async function loadServices() {
    setLoading(true);
    const { data } = await supabase.from("services").select("id,title,slug,category,description,icon,is_popular").eq("is_active", true).order("is_popular", { ascending: false }).order("created_at", { ascending: false }).limit(8);
    setServices((data || []) as Service[]);
    setLoading(false);
  }
  return <section id="popular-services" className="relative scroll-mt-28 py-10 sm:py-12" dir="rtl">
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <SectionHeader title="خدمات پرطرفدار توسن" description="خدماتی که بیشتر مورد توجه کاربران قرار گرفته‌اند؛ انتخاب کنید و سفارش خود را آنلاین ثبت کنید." align="center" />
      {loading ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-56 rounded-3xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />)}</div> : services.length > 0 ? <>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{services.map((service, index) => {
          const href = service.slug ? `/services/${encodeURIComponent(service.slug)}` : `/services?category=${encodeURIComponent(service.category || "all")}`;
          return <motion.div key={service.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.35, delay: index * 0.04 }}>
            <Link href={href} className="block h-full"><GlassPanel className="group relative h-full min-h-56 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/25">
              <div className="relative z-10 flex h-full flex-col"><div className="flex items-center justify-between gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">{service.icon || "📋"}</div>{service.is_popular && <span className="rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">⭐ محبوب</span>}</div>
                <div className="mt-4"><div className="inline-flex items-center rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">{service.category || "خدمات آنلاین"}</div><h3 className="mt-2 text-lg font-black text-[var(--text)]">{service.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{service.description || "ثبت سفارش و پیگیری آنلاین این خدمت از طریق توسن."}</p></div>
                <div className="mt-auto pt-4"><div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-2.5"><span className="text-sm font-bold text-[var(--text)]">ثبت سفارش</span><span className="text-[var(--primary)]">←</span></div></div>
              </div>
            </GlassPanel></Link>
          </motion.div>;
        })}</div>
        <div className="mt-6 flex justify-center"><Link href="/services"><TusanButton variant="secondary" className="px-7 py-2.5">مشاهده همه خدمات</TusanButton></Link></div>
      </> : <GlassPanel className="mt-6 p-8 text-center text-[var(--text-muted)]">در حال حاضر خدمت فعالی برای نمایش وجود ندارد.</GlassPanel>}
    </div>
  </section>;
}
