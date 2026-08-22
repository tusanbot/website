"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  created_at?: string | null;
  services?: {
    title?: string | null;
    category?: string | null;
    description?: string | null;
    icon?: string | null;
    price?: number | null;
    form_schema?: unknown;
  } | null;
};

type DisplayState = "announcement" | "pre-registration" | "registration" | "ended";

type Tone = {
  label: string;
  strong: string;
  soft: string;
  text: string;
  bar: string;
};

const DAY = 86400000;

function getDisplayState(item: Announcement, now: number): DisplayState {
  const start = item.start_at ? new Date(item.start_at).getTime() : null;
  const end = item.extended_end_at || item.end_at ? new Date(item.extended_end_at || item.end_at!).getTime() : null;

  // An ordinary announcement with no start date remains an announcement
  // until the admin removes/deactivates it.
  if (item.type === "announcement" && !item.service_id) return "announcement";

  // A linked announcement is converted to a registration when its start date arrives.
  if (item.type === "announcement" && item.service_id && start !== null && now < start) return "announcement";
  if (start === null) return item.type === "registration" ? "registration" : "announcement";

  const threeDaysBefore = start - 3 * DAY;
  if (now < threeDaysBefore) return "announcement";
  if (end !== null && now > end + 3 * DAY) return "ended";
  if (now < start) return "pre-registration";
  if (end !== null && now > end) return "ended";
  return "registration";
}

function getTone(state: DisplayState, item: Announcement, now: number): Tone {
  const base = (strong: string, soft: string, text: string, bar: string, label: string): Tone => ({ label, strong, soft, text, bar });
  if (state === "ended") return base("bg-red-950", "bg-red-50 dark:bg-red-950/35", "text-red-900 dark:text-red-300", "bg-red-700", "زمان ثبت‌نام به اتمام رسید");
  if (state === "pre-registration") return base("bg-amber-500", "bg-amber-50 dark:bg-amber-950/25", "text-amber-800 dark:text-amber-300", "bg-amber-400", "شروع ثبت‌نام نزدیک است");
  if (state === "announcement") return base("bg-slate-600", "bg-slate-50 dark:bg-slate-900/40", "text-slate-700 dark:text-slate-300", "bg-slate-400", "اطلاعیه");

  const target = item.extended_end_at || item.end_at;
  if (!target) return base("bg-emerald-600", "bg-emerald-50 dark:bg-emerald-950/25", "text-emerald-700 dark:text-emerald-300", "bg-emerald-400", "ثبت‌نام فعال");
  const diff = new Date(target).getTime() - now;
  if (diff <= DAY) return base("bg-red-600", "bg-red-50 dark:bg-red-950/25", "text-red-700 dark:text-red-300", "bg-red-400", "در آستانه پایان");
  if (diff <= 3 * DAY) return base("bg-orange-500", "bg-orange-50 dark:bg-orange-950/25", "text-orange-700 dark:text-orange-300", "bg-orange-400", "زمان محدود");
  if (diff <= 7 * DAY) return base("bg-amber-500", "bg-amber-50 dark:bg-amber-950/25", "text-amber-700 dark:text-amber-300", "bg-amber-400", "نزدیک به پایان");
  return base("bg-emerald-600", "bg-emerald-50 dark:bg-emerald-950/25", "text-emerald-700 dark:text-emerald-300", "bg-emerald-400", "ثبت‌نام فعال");
}

function remainingText(target: string | null, now: number, prefix = "") {
  if (!target) return "متعاقباً اعلام می‌شود";
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "زمان ثبت‌نام به اتمام رسید";
  const days = Math.floor(diff / DAY);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  if (days > 0) return `${prefix}${days.toLocaleString("fa-IR")} روز و ${hours.toLocaleString("fa-IR")} ساعت`;
  return `${prefix}${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString("fa-IR")} دقیقه`;
}

function progress(item: Announcement, state: DisplayState, now: number) {
  if (state === "ended") return 100;
  if (state === "announcement") return 0;
  if (state === "pre-registration" && item.start_at) {
    const start = new Date(item.start_at).getTime();
    return Math.max(3, Math.min(100, ((now - (start - 3 * DAY)) / (3 * DAY)) * 100));
  }
  const end = item.extended_end_at || item.end_at;
  if (!end || !item.start_at) return 55;
  const start = new Date(item.start_at).getTime();
  const endTime = new Date(end).getTime();
  return Math.max(4, Math.min(100, ((now - start) / Math.max(1, endTime - start)) * 100));
}

function formatDate(value: string | null) {
  if (!value) return "متعاقباً اعلام می‌شود";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function extractDocuments(schema: unknown): string[] {
  if (!schema) return [];
  const fields = Array.isArray(schema)
    ? schema
    : typeof schema === "object" && schema !== null && Array.isArray((schema as { fields?: unknown }).fields)
      ? (schema as { fields: unknown[] }).fields
      : [];
  return fields
    .filter((field): field is Record<string, unknown> => typeof field === "object" && field !== null)
    .filter((field) => field.type === "file" || field.type === "document" || field.type === "upload")
    .map((field) => String(field.label || field.name || "مدرک موردنیاز"))
    .slice(0, 5);
}

export default function ActiveAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAnnouncements();
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    const { data, error } = await supabase
      .from("services_announcements")
      .select(`id, title, summary, type, start_at, end_at, extended_end_at, button_label, service_id, priority, created_at, services(title, category, description, icon, price, form_schema)`)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error) {
      const current = Date.now();
      const visible = ((data || []) as Announcement[]).filter((item) => {
        const state = getDisplayState(item, current);
        return state !== "ended" || (item.extended_end_at && new Date(item.extended_end_at).getTime() >= current - 3 * DAY);
      });
      setItems(visible);
      setPage(0);
    }
    setLoading(false);
  }

  const pages = Math.max(1, Math.ceil(items.length / 4));
  const pageItems = useMemo(() => items.slice(page * 4, page * 4 + 4), [items, page]);

  function movePage(direction: 1 | -1) {
    if (items.length <= 4) return;
    setPage((current) => (current + direction + pages) % pages);
  }

  function onWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaX) < 10 && Math.abs(event.deltaY) < 10) return;
    event.preventDefault();
    movePage(event.deltaY > 0 || event.deltaX > 0 ? 1 : -1);
  }

  return (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader title="ثبت‌نام‌ها و اطلاعیه‌ها" description="اطلاعیه‌ها از زمان انتشار نمایش داده می‌شوند و ثبت‌نام‌ها سه روز پیش از شروع وارد شمارش معکوس می‌شوند." align="center" />

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[350px] rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <GlassPanel className="mt-8 p-10 text-center"><div className="mb-4 text-5xl">📭</div><h3 className="text-xl font-black text-[var(--text)]">اطلاعیه یا ثبت‌نامی وجود ندارد</h3><p className="mt-2 text-[var(--text-muted)]">موارد جدید به‌محض انتشار در این بخش نمایش داده می‌شوند.</p></GlassPanel>
        ) : (
          <div className="relative mt-8" onWheel={onWheel} ref={viewportRef}>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {pageItems.map((item) => {
                const state = getDisplayState(item, now);
                const tone = getTone(state, item, now);
                const target = item.extended_end_at || item.end_at;
                const startDate = formatDate(item.start_at);
                const endDate = formatDate(target);
                const docs = extractDocuments(item.services?.form_schema);
                const isOpen = openId === item.id;
                const serviceTitle = item.services?.title || item.title;
                const description = item.summary || item.services?.description;
                const countdown = state === "pre-registration" && item.start_at
                  ? remainingText(item.start_at, now, "شروع در ")
                  : state === "registration"
                    ? remainingText(target, now)
                    : state === "ended"
                      ? "زمان ثبت‌نام به اتمام رسید"
                      : "";

                return (
                  <motion.article
                    key={item.id}
                    onMouseEnter={() => setOpenId(item.id)}
                    onMouseLeave={() => setOpenId((current) => current === item.id ? null : current)}
                    onClick={() => setOpenId((current) => current === item.id ? null : item.id)}
                    className={`group relative h-[370px] cursor-pointer overflow-hidden rounded-[2rem] border border-black/10 shadow-[0_18px_55px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_75px_rgba(0,0,0,0.18)] ${tone.strong}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-black/15" />
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-white/45" />

                    <div className="relative z-10 flex h-full flex-col p-5 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-3xl shadow-lg">{item.services?.icon || (state === "announcement" ? "📢" : "📝")}</div>
                        <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-black/75 shadow-sm">
                          {state === "announcement" ? "اطلاعیه" : state === "pre-registration" ? "ثبت‌نام نزدیک است" : state === "ended" ? "زمان ثبت‌نام به اتمام رسید" : "ثبت‌نام فعال"}
                        </span>
                      </div>

                      <div className="mt-5">
                        {item.services?.category && <div className="text-xs font-bold text-white/80">{item.services.category}</div>}
                        <h3 className="mt-2 line-clamp-2 text-xl font-black leading-8">{item.title}</h3>
                      </div>

                      <div className="mt-auto rounded-2xl bg-black/15 p-3 backdrop-blur-sm">
                        {state === "announcement" ? (
                          <div className="text-center text-sm font-black text-white">{item.start_at ? `شروع: ${startDate}` : "تاریخ ثبت‌نام متعاقباً اعلام می‌شود"}</div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-white/90"><span>{state === "pre-registration" ? "شمارش معکوس شروع" : "زمان ثبت‌نام"}</span><span>{countdown}</span></div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/30"><motion.div initial={{ width: 0 }} animate={{ width: `${progress(item, state, now)}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-white" /></div>
                          </>
                        )}
                        <div className="mt-3 text-center text-[11px] font-bold text-white/75">برای مشاهده جزئیات مکث کنید ←</div>
                      </div>
                    </div>

                    <motion.div initial={false} animate={{ y: isOpen ? 0 : "100%" }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className={`absolute inset-0 z-20 flex flex-col rounded-[1.9rem] p-5 backdrop-blur-xl ${tone.soft} bg-opacity-95`}>
                      <div className="flex items-center justify-between gap-3"><span className={`rounded-full bg-white/90 px-3 py-1 text-[11px] font-black shadow-sm ${tone.text}`}>{tone.label}</span>{item.services?.category && <span className="truncate text-xs font-bold text-[var(--text-muted)]">{item.services.category}</span>}</div>
                      <h3 className="mt-3 line-clamp-2 text-lg font-black leading-7 text-[var(--text)]">{serviceTitle}</h3>
                      {description && <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-[var(--text-muted)]">{description}</p>}

                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-bold text-[var(--text-muted)]">
                        {item.services?.price != null && <div className="rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div>قیمت خدمت</div><div className="mt-0.5 font-black text-[var(--text)]">{Number(item.services.price).toLocaleString("fa-IR")} تومان</div></div>}
                        <div className="rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div>شروع ثبت‌نام</div><div className="mt-0.5 font-black text-[var(--text)]">{startDate}</div></div>
                        <div className="rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div>پایان ثبت‌نام</div><div className="mt-0.5 font-black text-[var(--text)]">{endDate}</div></div>
                        <div className="rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div>وضعیت</div><div className={`mt-0.5 font-black ${tone.text}`}>{tone.label}</div></div>
                      </div>

                      {docs.length > 0 && <div className="mt-2 rounded-xl bg-white/65 p-2.5 shadow-sm dark:bg-black/10"><div className="text-[10px] font-black text-[var(--text-muted)]">مدارک لازم</div><div className="mt-1 flex flex-wrap gap-1">{docs.map((doc) => <span key={doc} className="rounded-lg bg-white/75 px-2 py-1 text-[9px] font-bold text-[var(--text)] dark:bg-black/10">{doc}</span>)}</div></div>}

                      {state === "ended" && <div className="mt-2 rounded-xl bg-red-950 px-3 py-2 text-center text-[11px] font-black text-red-100">زمان ثبت‌نام به اتمام رسید</div>}
                      <div className="mt-auto pt-2" onClick={(event) => event.stopPropagation()}><Link href={item.service_id ? `/services/${item.service_id}` : "/services"}><TusanButton className="w-full py-2.5 text-sm">{item.button_label || (state === "announcement" ? "مشاهده اطلاعیه" : "مشاهده و ثبت سفارش")}</TusanButton></Link></div>
                    </motion.div>
                  </motion.article>
                );
              })}
            </div>

            {items.length > 4 && (
              <>
                <button type="button" aria-label="موارد بعدی" onClick={() => movePage(1)} className="absolute -left-3 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xl shadow-lg xl:flex">‹</button>
                <button type="button" aria-label="موارد قبلی" onClick={() => movePage(-1)} className="absolute -right-3 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xl shadow-lg xl:flex">›</button>
                <div className="mt-5 flex items-center justify-center gap-2">{Array.from({ length: pages }).map((_, index) => <button key={index} type="button" aria-label={`صفحه ${index + 1}`} onClick={() => setPage(index)} className={`h-2.5 rounded-full transition-all ${index === page ? "w-8 bg-[var(--primary)]" : "w-2.5 bg-[var(--border)]"}`} />)}</div>
                <p className="mt-2 text-center text-xs text-[var(--text-muted)]">برای مشاهده موارد بیشتر، موس را روی این بخش بچرخانید یا روی موبایل بکشید.</p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
