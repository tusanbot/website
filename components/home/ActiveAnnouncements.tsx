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
        price?: number | null;
    } | null;
};

type Tone = { label: string; card: string; badge: string; accent: string; bar: string };

function getTone(target: string | null, now: number): Tone {
    if (!target) return { label: "زمان کافی", card: "border-emerald-500/60 bg-emerald-100 dark:bg-emerald-950/40", badge: "border-emerald-500/40 bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", accent: "text-emerald-800 dark:text-emerald-200", bar: "bg-emerald-500" };
    const diff = new Date(target).getTime() - now;
    const day = 86400000;
    if (diff <= day) return { label: "در آستانه پایان", card: "border-red-500/60 bg-red-100 dark:bg-red-950/40", badge: "border-red-500/40 bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200", accent: "text-red-800 dark:text-red-200", bar: "bg-red-500" };
    if (diff <= 3 * day) return { label: "زمان محدود", card: "border-orange-500/60 bg-orange-100 dark:bg-orange-950/40", badge: "border-orange-500/40 bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200", accent: "text-orange-800 dark:text-orange-200", bar: "bg-orange-500" };
    if (diff <= 7 * day) return { label: "نزدیک به پایان", card: "border-amber-500/60 bg-amber-100 dark:bg-amber-950/40", badge: "border-amber-500/40 bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200", accent: "text-amber-800 dark:text-amber-200", bar: "bg-amber-500" };
    return { label: "زمان کافی", card: "border-emerald-500/60 bg-emerald-100 dark:bg-emerald-950/40", badge: "border-emerald-500/40 bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", accent: "text-emerald-800 dark:text-emerald-200", bar: "bg-emerald-500" };
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
    const [activeIndex, setActiveIndex] = useState(0);
    const [now, setNow] = useState(Date.now());
    const wheelLock = useRef(false);
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        loadAnnouncements();
        const timer = setInterval(() => setNow(Date.now()), 60000);
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
            .select(`id, title, summary, type, start_at, end_at, extended_end_at, button_label, service_id, priority, services(title, category, description, icon, price)`)
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
            return next < 0 ? items.length - 1 : next >= items.length ? 0 : next;
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
        <section className="relative py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeader title="ثبت‌نام‌ها و اطلاعیه‌های فعال" description="آخرین ثبت‌نام‌ها و اطلاعیه‌های مهم را با حرکت بین پنل‌ها مشاهده کنید." align="center" />
                {loading ? (
                    <div className="mx-auto mt-8 h-64 w-full rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
                ) : items.length === 0 ? (
                    <GlassPanel className="mt-8 p-10 text-center">
                        <div className="mb-4 text-5xl">📭</div>
                        <h3 className="text-xl font-black text-[var(--text)]">اطلاعیه فعالی وجود ندارد</h3>
                        <p className="mt-2 text-[var(--text-muted)]">به‌زودی ثبت‌نام‌ها و اطلاعیه‌های جدید در این بخش نمایش داده می‌شوند.</p>
                    </GlassPanel>
                ) : (
                    <div className="mt-8 w-full select-none" onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                        <div className={`relative w-full overflow-hidden rounded-[2rem] border-2 shadow-[0_20px_70px_rgba(0,0,0,0.10)] transition-colors duration-500 ${tone?.card}`}>
                            <div className={`absolute inset-x-0 top-0 h-2 ${tone?.bar}`} />
                            <motion.div key={item.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="grid min-h-[280px] gap-6 p-6 sm:p-8 lg:grid-cols-[100px_minmax(0,1fr)_250px] lg:items-center lg:p-10">
                                <div className="flex items-start gap-4 lg:block">
                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/80 text-4xl shadow-sm dark:bg-black/20">{item.services?.icon || (item.type === "registration" ? "📝" : "📢")}</div>
                                    <div className="mt-0 lg:mt-4">
                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${tone?.badge}`}>{item.type === "registration" ? "ثبت‌نام فعال" : "اطلاعیه"}</span>
                                        <div className={`mt-2 text-sm font-black ${tone?.accent}`}>{tone?.label}</div>
                                    </div>
                                </div>

                                <div className="min-w-0">
                                    {item.services?.category && <span className="inline-flex rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-bold text-[var(--text-muted)] dark:border-white/10 dark:bg-black/10">{item.services.category}</span>}
                                    <h3 className="mt-3 text-2xl font-black text-[var(--text)] sm:text-3xl">{item.title}</h3>
                                    <p className="mt-3 max-w-3xl leading-7 text-[var(--text-muted)]">{item.summary || item.services?.description || "ثبت سفارش، بارگذاری مدارک و پیگیری آنلاین این خدمت از طریق پنل توسن."}</p>
                                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-[var(--text-muted)]">
                                        {item.services?.title && <span className="rounded-xl border border-white/60 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-black/10">خدمت: {item.services.title}</span>}
                                        {item.services?.price != null && <span className="rounded-xl border border-white/60 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-black/10">قیمت: {Number(item.services.price).toLocaleString("fa-IR")} تومان</span>}
                                        {startDate && <span className="rounded-xl border border-white/60 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-black/10">شروع: {startDate}</span>}
                                        {endDate && <span className="rounded-xl border border-white/60 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-black/10">پایان: {endDate}</span>}
                                    </div>
                                </div>

                                <div className="flex min-w-0 flex-col gap-3">
                                    <div className="rounded-2xl border border-white/60 bg-white/75 p-4 text-center shadow-sm dark:border-white/10 dark:bg-black/20">
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
                                <button type="button" onClick={() => changeActive(-1)} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--text)] hover:border-[var(--primary)]">قبلی</button>
                                <div className="flex items-center gap-2" role="tablist">
                                    {items.map((entry, index) => <button key={entry.id} type="button" onClick={() => setActiveIndex(index)} className={`h-2 rounded-full transition-all ${index === activeIndex ? `w-8 ${tone?.bar}` : "w-2 bg-[var(--border)]"}`} aria-label={`نمایش ${entry.title}`} aria-selected={index === activeIndex} role="tab" />)}
                                </div>
                                <button type="button" onClick={() => changeActive(1)} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--text)] hover:border-[var(--primary)]">بعدی</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
