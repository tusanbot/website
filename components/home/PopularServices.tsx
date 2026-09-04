"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/components/ui";
import { getTaxonomySlug } from "@/lib/serviceTaxonomy";

type Service = { id: string; title: string; slug: string | null; category: string | null; description: string | null; price: number };

const importantCategories = [
  ["vehicle", "خدمات خودرو"],
  ["real-estate", "خدمات املاک و اسکان"],
  ["education", "خدمات دانشجویی و دانشگاهی"],
  ["social-security", "خدمات تأمین اجتماعی"],
  ["government", "خدمات انتظامی و دولتی"],
  ["tax", "خدمات مالیاتی"],
  ["banking", "خدمات بانکی و مالی"],
  ["legal", "خدمات قضایی و حقوقی"],
  ["insurance", "خدمات بیمه"],
  ["business", "خدمات کسب‌وکار و اصناف"],
] as const;

export default function PopularServices() {
  const [services, setServices] = useState<Service[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [travel, setTravel] = useState(0);

  useEffect(() => {
    supabase
      .from("services")
      .select("id,title,slug,category,description,price")
      .eq("is_active", true)
      .order("is_popular", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setServices((data || []) as Service[]));
  }, []);

  useEffect(() => {
    const measure = () => setTravel((rail.current?.scrollWidth || 0) / 2);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [services]);

  useAnimationFrame((_, delta) => {
    if (!travel) return;
    const next = x.get() + delta * 0.035;
    x.set(next > travel ? next - travel : next);
  });

  return (
    <section id="popular-services" className="relative scroll-mt-28 py-7 sm:py-9" dir="rtl">
      <div className="mx-auto max-w-[88rem] px-2 sm:px-4 lg:px-6">
        <SectionHeader
          title="خدمات محبوب توسن"
          description="خدمات محبوب را ببینید و دسته‌بندی اصلی موردنظر را انتخاب کنید."
          align="center"
        />

        {/* The service ticker remains a service ticker; category navigation lives below it. */}
        <div
          className="relative mt-5 w-full overflow-hidden rounded-3xl border border-[var(--primary)]/20 bg-[var(--primary)] py-3.5 shadow-sm"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12px 12px,rgba(255,255,255,.07) 1.2px,transparent 1.5px),radial-gradient(circle at 42px 32px,rgba(255,255,255,.045) 1px,transparent 1.4px)",
            backgroundSize: "54px 44px",
          }}
        >
          <motion.div ref={rail} style={{ x }} className="flex w-max gap-5 px-5" dir="ltr">
            {[...services, ...services].map((service, index) => (
              <Link
                key={`${service.id}-${index}`}
                href={service.slug ? `/services/${encodeURIComponent(service.slug)}` : `/services?category=${encodeURIComponent(getTaxonomySlug(service.category))}`}
                dir="rtl"
                className="shrink-0 rounded-full border border-white/70 bg-white px-7 py-3.5 text-sm font-black whitespace-nowrap text-slate-900 shadow-sm transition hover:bg-white/90"
              >
                {service.title}
                {service.price > 0 && <span className="mr-2 text-[var(--primary)]">{service.price.toLocaleString("fa-IR")} تومان</span>}
              </Link>
            ))}
          </motion.div>
        </div>

        <div className="mt-5">
          <div className="mb-3 text-center text-sm font-black text-[var(--text-muted)]">دسته‌بندی‌های اصلی خدمات</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {importantCategories.map(([slug, title]) => (
              <Link
                key={slug}
                href={`/services?category=${encodeURIComponent(slug)}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-xs font-black text-[var(--text)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {title}
              </Link>
            ))}
          </div>
          <Link
            href="/services"
            className="mx-auto mt-3 block w-fit rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5"
          >
            مشاهده همه خدمات ←
          </Link>
        </div>
      </div>
    </section>
  );
}
