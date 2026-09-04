"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/components/ui";

type SocialService = {
  id: string;
  platform_id: string;
  title: string;
  price: number;
  description: string | null;
  slug: string | null;
};

type SocialPlatform = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export default function SocialServicesPreview() {
  const [items, setItems] = useState<SocialService[]>([]);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [selected, setSelected] = useState<SocialService | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [travel, setTravel] = useState(0);

  useEffect(() => {
    supabase
      .from("social_services_public")
      .select("id,platform_id,title,price,description,slug")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(16)
      .then(({ data }) => setItems((data || []) as SocialService[]));

    fetch("/api/social/catalog", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        setPlatforms(
          ((payload?.platforms || []) as SocialPlatform[])
            .filter((platform) => platform.is_active)
            .sort((a, b) => a.sort_order - b.sort_order),
        );
      })
      .catch(() => setPlatforms([]));
  }, []);

  useEffect(() => {
    const measure = () => setTravel((ref.current?.scrollWidth || 0) / 2);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items]);

  useAnimationFrame((_, delta) => {
    if (selected || !travel) return;
    const next = x.get() + delta * 0.03;
    x.set(next > travel ? next - travel : next);
  });

  return (
    <section id="social-services" className="relative scroll-mt-28 py-7 sm:py-9" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeader
          title="خدمات شبکه‌های اجتماعی"
          description="سرویس‌های محبوب را در ریل ببینید و برای ورود مستقیم به خدمات هر پلتفرم، از بخش زیر انتخاب کنید."
          align="center"
        />

        {/* The rail remains a service ticker; only the section below it is platform navigation. */}
        <div className="relative mt-5 w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/70 py-3">
          <motion.div ref={ref} style={{ x }} className="flex w-max gap-3 px-3" dir="ltr">
            {[...items, ...items].map((service, index) => (
              <button
                key={`${service.id}-${index}`}
                type="button"
                onClick={() => setSelected(service)}
                dir="rtl"
                className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-6 py-3 text-sm font-black whitespace-nowrap text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {service.title}
                {service.price > 0 && <span className="mr-2 text-[var(--primary)]">{service.price.toLocaleString("fa-IR")} تومان</span>}
              </button>
            ))}
          </motion.div>
        </div>

        <div className="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/70 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h3 className="text-sm sm:text-base font-black text-[var(--text)]">پلتفرم‌ها</h3>
            <Link href="/social" className="text-xs font-bold text-[var(--primary)] hover:underline">
              همه پلتفرم‌ها
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {platforms.map((platform) => (
              <Link
                key={platform.id}
                href={`/social?platform=${encodeURIComponent(platform.id)}`}
                className="flex min-h-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-center text-sm font-black text-[var(--text)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {platform.name}
              </Link>
            ))}
          </div>
        </div>

        {selected && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <button type="button" aria-label="بستن" className="absolute inset-0 cursor-default" onClick={() => setSelected(null)} />
            <div className="relative w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
              <div className="text-lg font-black text-[var(--text)]">{selected.title}</div>
              {selected.description && <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{selected.description}</p>}
              {selected.price > 0 && <div className="mt-4 text-sm font-black text-[var(--primary)]">{selected.price.toLocaleString("fa-IR")} تومان</div>}
              <Link
                href={`/social?service=${encodeURIComponent(selected.slug || selected.id)}`}
                onClick={() => setSelected(null)}
                className="mt-5 block rounded-2xl bg-[var(--primary)] px-4 py-3 text-center text-sm font-black text-white"
              >
                مشاهده خدمات
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
