"use client";

import { useEffect, useRef, useState } from "react";
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
    } | null;
};

type Tone = {
    label: string;
    card: string;
    badge: string;
    accent: string;
    bar: string;
};

function getTone(target: string | null, now: number): Tone {
    if (!target) return { label: "زمان کافی", card: "border-emerald-500/30 bg-emerald-500/10", badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", accent: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" };
    const diff = new Date(target).getTime() - now;
    const day = 1000 * 60 * 60 * 24;
    if (diff <= day) return { label: "در آستانه پایان", card: "border-red-500/35 bg-red-500/10", badge: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300", accent: "text-red-700 dark:text-red-300", bar: "bg-red-500" };
    if (diff <= 3 * day) return { label: "زمان محدود", card: "border-orange-500/35 bg-orange-500/10", badge: "border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300", accent: "text-orange-700 dark:text-orange-300", bar: "bg-orange-500" };
    if (diff <= 7 * day) return { label: "نزدیک به پایان", card: "border-amber-500/35 bg-amber-500/10", badge: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300", accent: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500" };
    return { label: "زمان کافی", card: "border-emerald-500/30 bg-emerald-500/10", badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", accent: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" };
}

function formatRemaining(target: string | null, now: number) {
    if (!target) return "بدون محدودیت";
    const diff = new Date(target).getTime() - now;
    if (diff <= 0) return "پایان یافته";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
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
    const [activeIndex, setActiveIndex] = useState(0);
    const [now, setNow] = useState(Date.now());
    const wheelLock = useRef(false);
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        loadAnnouncements();
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (activeIndex >= items.length && items.length > 0) setActiveIndex(items.length - 1);
    }, [activeIndex, items.length]);

    async function loadAnnouncements() {
        setLoading(true);
        const current = new Date().toISOString();
        const { data, error } = await supabase
            .from("services_announcements")
            .select(`id, title, summary, type, start_at, end_at, extended_end_at, button_label, service_id, priority, services(title, category, description, icon)`)
            .eq("is_active", true)
            .lte("start_at", current)
            .or(`end_at.is.null,end_at.gte.${current}`)
            .order("priority", { ascending: false })
            .order("start_at", { ascending: false })
            .limit(6);
        if (!error) setItems((data || []) as Announcement[]);
        setLoading(false);
    }

    function changeActive(direction: 1 | -1) {
        if (items.length < 2) return;
        setActiveIndex((current) => {
            const next = current + direction;
            if (next < 0) return items.length - 1;
            if (next >= items.length) return 0;
            return next;
        });
    }

    function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
        if (items.length < 2 || wheelLock.current) return;
        const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        if (Math.abs(delta) < 10) return;
        wheelLock.current = true;
        changeActive(delta > 0 ? 1 : -1);
        window.setTimeout(() => { wheelLock.current = false; }, 450);
    }

    function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) { touchStartX.current = event.touches[0]?.clientX ?? null; }

    function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
        if (touchStartX.current === null) return;
        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const distance = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(distance) >= 45) changeActive(distance < 0 ? 1 : -1);
    }

    const item = items[activeIndex];
    const targetDate = item?.extended_end_at || item?.end_at || null;
    const tone = item ? getTone(targetDate, now) : null;
    const remaining = item ? formatRemaining(targetDate, now) : "";
    const endDate = item ? formatDate(targetDate) : null;
    const startDate = item ? formatDate(item.start_at) : null;

    return (
        <section className="relative py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeader title="ثبت‌نام‌ها و اطلاعیه‌های فعال" description="آخرین ثبت‌نام‌ها و اطلاعیه‌های مهم را با حرکت بین پنل‌ها مشاهده کنید." align="center" />
                {loading ? (
                    <div className="mx-auto mt-10 h-64 w-full rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
                ) : items.length === 0 ? (
                    <GlassPanel className="mt-10 p-10 text-center">
                        <div className="mb-4 text-5xl">📭</div>
                        <h3 className="text-xl font-black text-[var(--text)]">اطلاعیه فعالی وجود ندارد</h3>
                        <p className="mt-2 text-[var(--text-muted)]">به‌زودی ثبت‌نام‌ها و اطلاعیه‌های جدید در این بخش نمایش داده می‌شوند.</p>
                    </GlassPanel>
                ) : (
                    <div className="mt-10 w-full select-none" onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} aria-label="پنل اطلاعیه‌ها و ثبت‌نام‌های فعال">
                        <div className={`relative overflow-hidden rounded-[2rem] border shadow-[0_20px_70px_rgba(0,0,0,0.08)] transition-colors duration-500 ${tone?.card}`}>
                            <div className={`absolute inset-x-0 top-0 h-1 ${tone?.bar}`} />
                            <motion.div key={item.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="grid min-h-[260px] gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:p-10">
                                <div className="flex items-start gap-4 lg:block">
                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/70 text-4xl shadow-sm dark:bg-black/15">{item.services?.icon || (item.type === "registration" ? "📝" : "📢")}</div>
                                    <div className="mt-0 lg:mt-4">
                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${tone?.badge}`}>{item.type === "registration" ? "ثبت‌نام فعال" : "اطلاعیه"}</span>
                                        <div className={`mt-2 text-sm font-black ${tone?.accent}`}>{tone?.label}</div>
                                    </div>
                                </div>

                                <div className="min-w-0">
                                    {item.services?.category && <span className="inline-flex rounded-full border border-[var(--border)] bg-white/60 px-3 py-1 text-xs font-bold text-[var(--text-muted)] dark:bg-black/10">{item.services.category}</span>}
                                    <h3 className="mt-3 text-2xl font-black text-[var(--text)] sm:text-3xl">{item.title}</h3>
                                    <p className="mt-3 max-w-3xl leading-7 text-[var(--text-muted)]">{item.summary || item.services?.description || "ثبت سفارش، بارگذاری مدارک و پیگیری آنلاین این خدمت از طریق پنل توسن."}</p>
                                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-[var(--text-muted)]">
                                        {item.services?.title && item.services.title !== item.title && <span className="rounded-xl border border-[var(--border)] bg-white/50 px-3 py-2 dark:bg-black/10">خدمت: {item.services.title}</span>}
                                        {startDate && <span className="rounded-xl border border-[var(--border)] bg-white/50 px-3 py-2 dark:bg-black/10">شروع: {startDate}</span>}
                                        {endDate && <span className="rounded-xl border border-[var(--border)] bg-white/50 px-3 py-2 dark:bg-black/10">پایان: {endDate}</span>}
                                    </div>
                                </div>

                                <div className="flex min-w-[230px] flex-col gap-3 lg:items-stretch">
                                    <div className="rounded-2xl border border-white/50 bg-white/60 p-4 text-center shadow-sm dark:border-white/10 dark:bg-black/10">
                                        <div className="text-xs font-bold text-[var(--text-muted)]">زمان باقی‌مانده</div>
                                        <div className={`mt-1 text-xl font-black ${tone?.accent}`}>{remaining}</div>
                                    </div>
                                    <Link href={item.service_id ? `/services/${item.service_id}` : "/services"}>
                                        <TusanButton className="w-full">{item.button_label || (item.type === "registration" ? "ثبت‌نام" : "مشاهده اطلاعیه")}</TusanButton>
                                    </Link>
                                </div>
                            </motion.div>
                        </div>

                        {items.length > 1 && (
                            <div className="mt-5 flex items-center justify-center gap-3">
                                <button type="button" onClick={() => changeActive(-1)} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--text)] hover:border-[var(--primary)]" aria-label="مورد قبلی">قبلی</button>
                                <div className="flex items-center gap-2" role="tablist" aria-label="انتخاب اطلاعیه">
                                    {items.map((entry, index) => <button key={entry.id} type="button" onClick={() => setActiveIndex(index)} className={`h-2 rounded-full transition-all ${index === activeIndex ? `w-8 ${tone?.bar}` : "w-2 bg-[var(--border)]"}`} aria-label={`نمایش ${entry.title}`} aria-selected={index === activeIndex} role="tab" />)}
                                </div>
                                <button type="button" onClick={() => changeActive(1)} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--text)] hover:border-[var(--primary)]" aria-label="مورد بعدی">بعدی</button>
                            </div>
                        )}
                        {items.length > 1 && <p className="mt-3 text-center text-xs font-bold text-[var(--text-muted)]">با چرخ موس یا کشیدن پنل در گوشی بین اطلاعیه‌ها جابه‌جا شوید.</p>}
                    </div>
                )}
            </div>
        </section>
    );
}
