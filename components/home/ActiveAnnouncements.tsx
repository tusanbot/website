"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton, SectionHeader } from "@/components/ui";

type Announcement = {
  id: string;
  title: string;
  summary: string | null;
  type: "registration" | "announcement";
  start_at: string | null;
  end_at: string | null;
  extended_end_at: string | null;
  button_label: string | null;
  service_id: string | null;
  priority: number | null;
  services?: { title?: string | null; category?: string | null; description?: string | null; icon?: string | null; price?: number | null; form_schema?: unknown } | null;
};

type Tone = { label: string; strong: string; soft: string; text: string; bar: string };

function getTone(target: string | null, now: number): Tone {
  const base = (strong: string, soft: string, text: string, bar: string, label: string): Tone => ({ label, strong, soft, text, bar });
  if (!target) return base("bg-emerald-500", "bg-emerald-50 dark:bg-emerald-950/25", "text-emerald-700 dark:text-emerald-300", "bg-emerald-400", "زمان کافی");
  const diff = new Date(target).getTime() - now;
  const day = 86400000;
  if (diff <= day) return base("bg-red-500", "bg-red-50 dark:bg-red-950/25", "text-red-700 dark:text-red-300", "bg-red-400", "در آستانه پایان");
  if (diff <= 3 * day) return base("bg-orange-500", "bg-orange-50 dark:bg-orange-950/25", "text-orange-700 dark:text-orange-300", "bg-orange-400", "زمان محدود");
  if (diff <= 7 * day) return base("bg-amber-500", "bg-amber-50 dark:bg-amber-950/25", "text-amber-700 dark:text-amber-300", "bg-amber-400", "نزدیک به پایان");
  return base("bg-emerald-500", "bg-emerald-50 dark:bg-emerald-950/25", "text-emerald-700 dark:text-emerald-300", "bg-emerald-400", "زمان کافی");
}

function remainingParts(target: string | null, now: number) {
  if (!target) return { text: "بدون محدودیت", percent: 100 };
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { text: "پایان یافته", percent: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const text = days > 0 ? `${days.toLocaleString("fa-IR")} روز و ${hours.toLocaleString("fa-IR")} ساعت` : `${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString("fa-IR")} دقیقه`;
  return { text, percent: Math.max(4, Math.min(100, (diff / (30 * 86400000)) * 100)) };
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function extractDocuments(schema: unknown): string[] {
  if (!schema) return [];
  const fields = Array.isArray(schema) ? schema : typeof schema === "object" && schema !== null && Array.isArray((schema as { fields?: unknown }).fields) ? (schema as { fields: unknown[] }).fields : [];
  return fields.filter((field): field is Record<string, unknown> => typeof field === "object" && field !== null).filter((field) => field.type === "file" || field.type === "document" || field.type === "upload").map((field) => String(field.label || field.name || "مدرک موردنیاز")).slice(0, 5);
}

export default function ActiveAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    const current = new Date();
    const currentIso = current.toISOString();
    // Fetch the current period plus the next 31 days so a scheduled item
    // crossing into the next month is already available to the UI. It is
    // displayed only once its own start_at has actually arrived.
    const futureLimit = new Date(current.getTime() + 31 * 86400000).toISOString();
    const { data, error } = await supabase
      .from("services_announcements")
      .select(`id, title, summary, type, start_at, end_at, extended_end_at, button_label, service_id, priority, services(title, category, description, icon, price, form_schema)`)
      .eq("is_active", true)
      .or(`start_at.is.null,start_at.lte.${futureLimit}`)
      .or(`end_at.is.null,end_at.gte.${currentIso}`)
      .order("priority", { ascending: false })
      .order("start_at", { ascending: true })
      .limit(20);

    if (!error) {
      const visible = ((data || []) as Announcement[]).filter((item) => {
        if (!item.start_at) return true;
        return new Date(item.start_at).getTime() <= current.getTime();
      }).slice(0, 8);
      setItems(visible);
    }
    setLoading(false);
  }

  return (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader title="ثبت‌نام‌ها و اطلاعیه‌های فعال" description="موس را روی هر اطلاعیه ببرید تا اطلاعات کامل خدمت با یک حرکت نرم نمایان شود." align="center" />
        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[350px] rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <GlassPanel className="mt-8 p-10 text-center"><div className="mb-4 text-5xl">📭</div><h3 className="text-xl font-black text-[var(--text)]">اطلاعیه فعالی وجود ندارد</h3><p className="mt-2 text-[var(--text-muted)]">به‌زودی ثبت‌نام‌ها و اطلاعیه‌های جدید در این بخش نمایش داده می‌شوند.</p></GlassPanel>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => {
              const targetDate = item.extended_end_at || item.end_at || null;
              const tone = getTone(targetDate, now);
              const remaining = remainingParts(targetDate, now);
              const endDate = formatDate(targetDate);
              const startDate = formatDate(item.start_at);
              const docs = extractDocuments(item.services?.form_schema);
              const isOpen = openId === item.id;
              const serviceTitle = item.services?.title || item.title;
              const description = item.summary || item.services?.description;
              return (
                <motion.article key={item.id} onMouseEnter={() => setOpenId(item.id)} onMouseLeave={() => setOpenId((current) => current === item.id ? null : current)} onClick={() => setOpenId((current) => current === item.id ? null : item.id)} className={`group relative h-[350px] cursor-pointer overflow-hidden rounded-[2rem] border border-black/5 shadow-[0_18px_55px_rgba(0,0,0,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_75px_rgba(0,0,0,0.16)] ${tone.strong}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" /><div className="absolute inset-x-0 top-0 h-1.5 bg-white/45" />
                  <div className="relative z-10 flex h-full flex-col p-5 text-white">
                    <div className="flex items-start justify-between gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-3xl shadow-lg">{item.services?.icon || (item.type === "registration" ? "📝" : "📢")}</div><span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-black text-black/75 shadow-sm">{item.type === "registration" ? "ثبت‌نام فعال" : "اطلاعیه"}</span></div>
                    <div className="mt-5">{item.services?.category && <div className="text-xs font-bold text-white/80">{item.services.category}</div>}<h3 className="mt-2 line-clamp-2 text-xl font-black leading-8">{item.title}</h3></div>
                    <div className="mt-auto rounded-2xl bg-black/15 p-3 backdrop-blur-sm"><div className="flex items-center justify-between gap-2 text-xs font-bold text-white/85"><span>زمان باقی‌مانده</span><span>{remaining.text}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/30"><motion.div initial={{ width: 0 }} animate={{ width: `${remaining.percent}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-white" /></div><div className="mt-3 text-center text-[11px] font-bold text-white/75">برای مشاهده جزئیات مکث کنید ←</div></div>
                  </div>
                  <motion.div initial={false} animate={{ y: isOpen ? 0 : "100%" }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className={`absolute inset-0 z-20 flex flex-col rounded-[1.9rem] p-5 backdrop-blur-xl ${tone.soft} bg-opacity-95`}>
                    <div className="flex items-center justify-between gap-3"><span className={`rounded-full bg-white/90 px-3 py-1 text-[11px] font-black shadow-sm ${tone.text}`}>{tone.label}</span>{item.services?.category && <span className="truncate text-xs font-bold text-[var(--text-muted)]">{item.services.category}</span>}</div>
                    <h3 className="mt-3 line-clamp-2 text-lg font-black leading-7 text-[var(--text)]">{serviceTitle}</h3>{description && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{description}</p>}
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-bold text-[var(--text-muted)]">{item.services?.price != null && <div className="rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div>قیمت خدمت</div><div className="mt-0.5 font-black text-[var(--text)]">{Number(item.services.price).toLocaleString("fa-IR")} تومان</div></div>}{endDate && <div className="rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div>پایان ثبت‌نام</div><div className="mt-0.5 font-black text-[var(--text)]">{endDate}</div></div>}{startDate && <div className="rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div>شروع ثبت‌نام</div><div className="mt-0.5 font-black text-[var(--text)]">{startDate}</div></div>}<div className="rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div>زمان باقی‌مانده</div><div className={`mt-0.5 font-black ${tone.text}`}>{remaining.text}</div></div></div>
                    {docs.length > 0 && <div className="mt-2 rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div className="text-[10px] font-black text-[var(--text-muted)]">مدارک لازم</div><div className="mt-1 flex flex-wrap gap-1">{docs.map((doc) => <span key={doc} className="rounded-lg bg-white/75 px-2 py-1 text-[9px] font-bold text-[var(--text)] dark:bg-black/10">{doc}</span>)}</div></div>}
                    <div className="mt-auto pt-2" onClick={(event) => event.stopPropagation()}><Link href={item.service_id ? `/services/${item.service_id}` : "/services"}><TusanButton className="w-full py-2.5 text-sm">{item.button_label || (item.type === "registration" ? "ثبت‌نام و مشاهده خدمت" : "مشاهده اطلاعیه")}</TusanButton></Link></div>
                  </motion.div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
