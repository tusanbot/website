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
    services?: {
        title?: string | null;
        category?: string | null;
        description?: string | null;
        icon?: string | null;
        price?: number | null;
    } | null;
};

type Tone = {
    label: string;
    card: string;
    badge: string;
    accent: string;
    bar: string;
    soft: string;
};

function getTone(target: string | null, now: number): Tone {
    if (!target) return { label: "زمان کافی", card: "border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/30", badge: "border-emerald-500/30 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", accent: "text-emerald-800 dark:text-emerald-200", bar: "bg-emerald-500", soft: "bg-emerald-500/10" };
    const diff = new Date(target).getTime() - now;
    const day = 86400000;
    if (diff <= day) return { label: "در آستانه پایان", card: "border-red-500/50 bg-red-50/90 dark:bg-red-950/30", badge: "border-red-500/30 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", accent: "text-red-800 dark:text-red-200", bar: "bg-red-500", soft: "bg-red-500/10" };
    if (diff <= 3 * day) return { label: "زمان محدود", card: "border-orange-500/50 bg-orange-50/90 dark:bg-orange-950/30", badge: "border-orange-500/30 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", accent: "text-orange-800 dark:text-orange-200", bar: "bg-orange-500", soft: "bg-orange-500/10" };
    if (diff <= 7 * day) return { label: "نزدیک به پایان", card: "border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/30", badge: "border-amber-500/30 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", accent: "text-amber-800 dark:text-amber-200", bar: "bg-amber-500", soft: "bg-amber-500/10" };
    return { label: "زمان کافی", card: "border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/30", badge: "border-emerald-500/30 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", accent: "text-emerald-800 dark:text-emerald-200", bar: "bg-emerald-500", soft: "bg-emerald-500/10" };
}

function formatRemaining(target: string | null, now: number) {
    if (!target) return "بدون محدودیت";
    const diff = new Date(target).getTime() - now;
    if (diff <= 0) return "پایان یافته";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff / 3600000) % 24);
    const minutes = Math.floor((diff / 60000) % 60);
    if (days > 0) return `${days.toLocaleString("fa-IR")} روز و ${hours.toLocaleString("fa-IR")} ساعت`;
    return `${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString("fa-IR")} دقیقه`;
}

function formatDate(value: string | null) {
    if (!value) return null;
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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
        const current = new Date().toISOString();
        const { data, error } = await supabase
            .from("services_announcements")
            .select(`id, title, summary, type, start_at, end_at, extended_end_at, button_label, service_id, priority, services(title, category, description, icon, price)`)
            .eq("is_active", true)
            .lte("start_at", current)
            .or(`end_at.is.null,end_at.gte.${current}`)
            .order("priority", { ascending: false })
            .order("start_at", { ascending: false })
            .limit(8);
        if (!error) setItems((data || []) as Announcement[]);
        setLoading(false);
    }

    return (
        <section className="relative py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeader title="ثبت‌نام‌ها و اطلاعیه‌های فعال" description="موس را روی هر اطلاعیه ببرید تا اطلاعات کامل خدمت با یک حرکت نرم نمایان شود." align="center" />

                {loading ? (
                    <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[330px] rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] animate-pulse" />)}
                    </div>
                ) : items.length === 0 ? (
                    <GlassPanel className="mt-8 p-10 text-center">
                        <div className="mb-4 text-5xl">📭</div>
                        <h3 className="text-xl font-black text-[var(--text)]">اطلاعیه فعالی وجود ندارد</h3>
                        <p className="mt-2 text-[var(--text-muted)]">به‌زودی ثبت‌نام‌ها و اطلاعیه‌های جدید در این بخش نمایش داده می‌شوند.</p>
                    </GlassPanel>
                ) : (
                    <>
                        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                            {items.map((item) => {
                                const targetDate = item.extended_end_at || item.end_at || null;
                                const tone = getTone(targetDate, now);
                                const remaining = formatRemaining(targetDate, now);
                                const endDate = formatDate(targetDate);
                                const startDate = formatDate(item.start_at);
                                const isOpen = openId === item.id;

                                return (
                                    <motion.article
                                        key={item.id}
                                        layout
                                        onMouseEnter={() => setOpenId(item.id)}
                                        onMouseLeave={() => setOpenId((current) => current === item.id ? null : current)}
                                        onClick={() => setOpenId((current) => current === item.id ? null : item.id)}
                                        className={`group relative h-[330px] cursor-pointer overflow-hidden rounded-[2rem] border-2 shadow-[0_18px_55px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(0,0,0,0.14)] ${tone.card}`}
                                    >
                                        <div className={`absolute inset-x-0 top-0 h-1.5 ${tone.bar}`} />

                                        {/* Front face: title, category and remaining time */}
                                        <div className="absolute inset-0 flex flex-col p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-3xl shadow-sm dark:bg-black/20">
                                                    {item.services?.icon || (item.type === "registration" ? "📝" : "📢")}
                                                </div>
                                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${tone.badge}`}>
                                                    {item.type === "registration" ? "ثبت‌نام فعال" : "اطلاعیه"}
                                                </span>
                                            </div>

                                            <div className="mt-5">
                                                {item.services?.category && <div className="text-xs font-bold text-[var(--text-muted)]">{item.services.category}</div>}
                                                <h3 className="mt-2 line-clamp-2 text-xl font-black leading-8 text-[var(--text)]">{item.title}</h3>
                                            </div>

                                            <div className="mt-auto">
                                                <div className={`rounded-2xl border border-white/60 bg-white/65 p-3 dark:border-white/10 dark:bg-black/15`}>
                                                    <div className="text-[11px] font-bold text-[var(--text-muted)]">زمان باقی‌مانده</div>
                                                    <div className={`mt-1 text-base font-black ${tone.accent}`}>{remaining}</div>
                                                </div>
                                                <div className="mt-3 text-center text-xs font-bold text-[var(--text-muted)] opacity-70 transition-opacity group-hover:opacity-100">
                                                    برای مشاهده جزئیات حرکت دهید ←
                                                </div>
                                            </div>
                                        </div>

                                        {/* Back face: slides upward over the front content, inspired by the requested RTL-style interaction */}
                                        <motion.div
                                            initial={false}
                                            animate={{ y: isOpen ? 0 : "100%" }}
                                            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                                            className="absolute inset-0 z-20 flex flex-col bg-[var(--surface)]/96 p-5 backdrop-blur-xl dark:bg-[var(--surface)]/95"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${tone.badge}`}>{tone.label}</span>
                                                {item.services?.category && <span className="truncate text-xs font-bold text-[var(--text-muted)]">{item.services.category}</span>}
                                            </div>

                                            <h3 className="mt-4 line-clamp-2 text-lg font-black leading-7 text-[var(--text)]">{item.services?.title || item.title}</h3>
                                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-muted)]">
                                                {item.summary || item.services?.description || "ثبت سفارش، بارگذاری مدارک و پیگیری آنلاین این خدمت از طریق پنل توسن."}
                                            </p>

                                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-[var(--text-muted)]">
                                                {item.services?.price != null && <div className={`rounded-xl p-2.5 ${tone.soft}`}><div>قیمت</div><div className="mt-0.5 font-black text-[var(--text)]">{Number(item.services.price).toLocaleString("fa-IR")} تومان</div></div>}
                                                {endDate && <div className={`rounded-xl p-2.5 ${tone.soft}`}><div>پایان</div><div className="mt-0.5 font-black text-[var(--text)]">{endDate}</div></div>}
                                                {startDate && <div className={`rounded-xl p-2.5 ${tone.soft}`}><div>شروع</div><div className="mt-0.5 font-black text-[var(--text)]">{startDate}</div></div>}
                                                <div className={`rounded-xl p-2.5 ${tone.soft}`}><div>مهلت</div><div className={`mt-0.5 font-black ${tone.accent}`}>{remaining}</div></div>
                                            </div>

                                            <div className="mt-auto pt-3" onClick={(event) => event.stopPropagation()}>
                                                <Link href={item.service_id ? `/services/${item.service_id}` : "/services"}>
                                                    <TusanButton className="w-full py-2.5 text-sm">{item.button_label || (item.type === "registration" ? "ثبت‌نام و مشاهده خدمت" : "مشاهده اطلاعیه")}</TusanButton>
                                                </Link>
                                            </div>
                                        </motion.div>
                                    </motion.article>
                                );
                            })}
                        </div>

                        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                            <span>روی کارت مکث کنید</span><span>•</span><span>در موبایل روی کارت ضربه بزنید</span>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
