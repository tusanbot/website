"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Play, MessageCircle, ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { GlassPanel, SectionHeader } from "@/components/ui";

type Platform = { id: string; name: string; slug: string; icon: string | null };
type SocialService = { platform_id: string };

const themes: Record<string, { soft: string; border: string; icon: string; accent: string }> = {
  instagram: { soft: "bg-pink-500/10", border: "border-pink-300/60", icon: "text-fuchsia-600", accent: "from-fuchsia-600 via-pink-500 to-orange-400" },
  telegram: { soft: "bg-sky-500/10", border: "border-sky-300/60", icon: "text-sky-500", accent: "from-sky-400 to-sky-600" },
  youtube: { soft: "bg-red-500/10", border: "border-red-300/60", icon: "text-red-600", accent: "from-red-500 to-red-700" },
  tiktok: { soft: "bg-black/10", border: "border-black/20 dark:border-white/20", icon: "text-black dark:text-white", accent: "from-slate-800 to-black" },
  eitaa: { soft: "bg-orange-500/10", border: "border-orange-300/60", icon: "text-orange-500", accent: "from-orange-400 to-orange-600" },
  rubika: { soft: "bg-rose-500/10", border: "border-rose-300/60", icon: "text-rose-500", accent: "from-rose-400 to-rose-600" },
  aparat: { soft: "bg-red-500/10", border: "border-red-300/60", icon: "text-red-500", accent: "from-red-500 to-red-700" },
};

function PlatformIcon({ slug }: { slug: string }) {
  const props = { size: 30, strokeWidth: 2.2 };
  if (slug === "telegram") return <Send {...props} />;
  if (slug === "tiktok") return <Play {...props} />;
  return <MessageCircle {...props} />;
}

export default function SocialServicesPreview() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [services, setServices] = useState<SocialService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: platformData }, { data: serviceData }] = await Promise.all([
        supabase.from("social_platforms").select("id,name,slug,icon").eq("is_active", true).order("sort_order").limit(3),
        supabase.from("social_services").select("platform_id").eq("is_active", true),
      ]);
      setPlatforms((platformData || []) as Platform[]);
      setServices((serviceData || []) as SocialService[]);
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <section id="social-services" className="relative scroll-mt-28 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader title="خدمات شبکه‌های اجتماعی" description="خدمات افزایش تعامل و رشد شبکه‌های اجتماعی را از توسن، آنلاین و با امکان پیگیری سفارش دریافت کنید." align="center" />
        {loading ? (
          <div className="mt-10 grid gap-6 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 rounded-3xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />)}</div>
        ) : platforms.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {platforms.map((platform, index) => {
              const theme = themes[platform.slug] || { soft: "bg-[var(--primary)]/10", border: "border-[var(--border)]", icon: "text-[var(--primary)]", accent: "from-[var(--primary)] to-emerald-600" };
              const count = services.filter(s => s.platform_id === platform.id).length;
              return <motion.div key={platform.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.45, delay: index * 0.08 }}>
                <Link href={`/social?platform=${encodeURIComponent(platform.slug)}`} className="block h-full">
                  <GlassPanel className={`group relative h-full min-h-64 overflow-hidden rounded-3xl border ${theme.border} bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-2 hover:shadow-[0_22px_70px_rgba(9,150,124,0.16)]`}>
                    <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${theme.accent}`} />
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${theme.soft} ${theme.icon}`}><PlatformIcon slug={platform.slug} /></div>
                    <div className="mt-6"><div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]"><Sparkles size={14} /> خدمات شبکه اجتماعی</div><h3 className="mt-2 text-2xl font-black text-[var(--text)]">{platform.name}</h3><p className="mt-3 leading-7 text-[var(--text-muted)]">{count > 0 ? `${count.toLocaleString("fa-IR")} سرویس فعال برای این پلتفرم` : "مشاهده سرویس‌های فعال این پلتفرم"}</p></div>
                    <div className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3"><span className="text-sm font-black text-[var(--text)]">مشاهده خدمات</span><ArrowLeft size={17} className="text-[var(--primary)] transition-transform group-hover:-translate-x-1" /></div>
                  </GlassPanel>
                </Link>
              </motion.div>;
            })}
          </div>
        ) : <div className="mt-10 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">خدمات شبکه‌های اجتماعی به‌زودی در این بخش نمایش داده می‌شود.</div>}
        <div className="mt-8 flex justify-center"><Link href="/social" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-6 py-3.5 font-black text-white transition hover:opacity-90">مشاهده همه خدمات شبکه‌های اجتماعی <ArrowLeft size={18} /></Link></div>
      </div>
    </section>
  );
}
