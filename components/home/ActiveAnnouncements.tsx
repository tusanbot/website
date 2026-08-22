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
        icon?: string | null;
    } | null;
};

function formatRemaining(target: string | null) {
    if (!target) return "بدون محدودیت";

    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return "پایان یافته";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) {
        return `${days.toLocaleString("fa-IR")} روز و ${hours.toLocaleString(
            "fa-IR"
        )} ساعت`;
    }

    return `${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString(
        "fa-IR"
    )} دقیقه`;
}

export default function ActiveAnnouncements() {
    const [items, setItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [tick, setTick] = useState(Date.now());
    const wheelLock = useRef(false);
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        loadAnnouncements();

        const timer = setInterval(() => setTick(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (activeIndex >= items.length && items.length > 0) {
            setActiveIndex(items.length - 1);
        }
    }, [activeIndex, items.length]);

    async function loadAnnouncements() {
        setLoading(true);

        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from("services_announcements")
            .select(
                `
          id,
          title,
          summary,
          type,
          start_at,
          end_at,
          extended_end_at,
          button_label,
          service_id,
          priority,
          services(
            title,
            icon
          )
        `
            )
            .eq("is_active", true)
            .lte("start_at", now)
            .or(`end_at.is.null,end_at.gte.${now}`)
            .order("priority", { ascending: false })
            .order("start_at", { ascending: false })
            .limit(6);

        if (!error) {
            setItems((data || []) as Announcement[]);
        }

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

        const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX)
            ? event.deltaY
            : event.deltaX;

        if (Math.abs(delta) < 10) return;

        wheelLock.current = true;
        changeActive(delta > 0 ? 1 : -1);
        window.setTimeout(() => {
            wheelLock.current = false;
        }, 450);
    }

    function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
        touchStartX.current = event.touches[0]?.clientX ?? null;
    }

    function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
        if (touchStartX.current === null) return;

        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const distance = endX - touchStartX.current;
        touchStartX.current = null;

        if (Math.abs(distance) < 45) return;
        changeActive(distance < 0 ? 1 : -1);
    }

    return (
        <section className="relative py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeader
                    title="ثبت‌نام‌ها و اطلاعیه‌های فعال"
                    description="آخرین ثبت‌نام‌ها و اطلاعیه‌های مهم را با حرکت بین پنل‌ها مشاهده کنید."
                    align="center"
                />

                {loading ? (
                    <div className="mt-10 h-[360px] rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
                ) : items.length === 0 ? (
                    <GlassPanel className="mt-10 p-10 text-center">
                        <div className="mb-4 text-5xl">📭</div>
                        <h3 className="text-xl font-black text-[var(--text)]">
                            اطلاعیه فعالی وجود ندارد
                        </h3>
                        <p className="mt-2 text-[var(--text-muted)]">
                            به‌زودی ثبت‌نام‌ها و اطلاعیه‌های جدید در این بخش نمایش داده می‌شوند.
                        </p>
                    </GlassPanel>
                ) : (
                    <div
                        className="mt-10 select-none"
                        onWheel={handleWheel}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        aria-label="پنل اطلاعیه‌ها و ثبت‌نام‌های فعال"
                    >
                        <div className="hidden h-[390px] gap-3 overflow-hidden rounded-[2rem] lg:flex">
                            {items.map((item, index) => {
                                const isActive = index === activeIndex;
                                const targetDate = item.extended_end_at || item.end_at;
                                const remaining = formatRemaining(targetDate);

                                return (
                                    <motion.button
                                        key={item.id}
                                        type="button"
                                        layout
                                        onClick={() => setActiveIndex(index)}
                                        animate={{ flexGrow: isActive ? 5 : 1 }}
                                        transition={{ duration: 0.45, ease: "easeInOut" }}
                                        className={`relative min-w-0 overflow-hidden rounded-[2rem] border text-right outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                                            isActive
                                                ? "border-[var(--primary)]/30 bg-[var(--surface)] shadow-[0_20px_70px_rgba(9,150,124,0.16)]"
                                                : "border-[var(--border)] bg-[var(--surface-secondary)] hover:border-[var(--primary)]/30"
                                        }`}
                                        aria-label={item.title}
                                        aria-expanded={isActive}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-transparent" />

                                        <div className="relative flex h-full min-w-0 flex-col p-5">
                                            <div className={`flex items-center ${isActive ? "justify-between" : "justify-center"} gap-3`}>
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">
                                                    {item.services?.icon || (item.type === "registration" ? "📝" : "📢")}
                                                </div>

                                                {isActive && (
                                                    <span className="rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                                                        {item.type === "registration" ? "ثبت‌نام فعال" : "اطلاعیه"}
                                                    </span>
                                                )}
                                            </div>

                                            {!isActive ? (
                                                <div className="flex min-h-0 flex-1 items-center justify-center pt-4">
                                                    <span className="line-clamp-2 text-center text-sm font-black text-[var(--text)] [writing-mode:vertical-rl] rotate-180">
                                                        {item.title}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="mt-5 flex min-h-0 flex-1 flex-col">
                                                    <h3 className="text-2xl font-black text-[var(--text)]">
                                                        {item.title}
                                                    </h3>

                                                    <p className="mt-3 line-clamp-3 leading-7 text-[var(--text-muted)]">
                                                        {item.summary || "برای مشاهده جزئیات و شرایط، روی دکمه زیر کلیک کنید."}
                                                    </p>

                                                    <div className="mt-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                                                        <div className="text-xs font-bold text-[var(--text-muted)]">زمان باقی‌مانده</div>
                                                        <div className="mt-1 text-lg font-black text-[var(--text)]">{remaining}</div>
                                                        {targetDate && remaining !== "پایان یافته" && (
                                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                                                                <motion.div
                                                                    initial={{ width: "15%" }}
                                                                    animate={{ width: "82%" }}
                                                                    transition={{ duration: 1.1, ease: "easeOut" }}
                                                                    className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-emerald-400"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <Link href={item.service_id ? `/services/${item.service_id}` : "/services"} className="mt-4">
                                                        <TusanButton className="w-full">
                                                            {item.button_label || (item.type === "registration" ? "ثبت‌نام" : "مشاهده اطلاعیه")}
                                                        </TusanButton>
                                                    </Link>
                                                </div>
                                            )}

                                            <div className={`mt-4 text-xs font-bold text-[var(--text-muted)] ${isActive ? "text-center" : "text-center"}`}>
                                                {isActive ? `${(index + 1).toLocaleString("fa-IR")} از ${items.length.toLocaleString("fa-IR")}` : (index + 1).toLocaleString("fa-IR")}
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>

                        <div className="lg:hidden">
                            <motion.div
                                key={items[activeIndex]?.id}
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {(() => {
                                    const item = items[activeIndex];
                                    const targetDate = item.extended_end_at || item.end_at;
                                    const remaining = formatRemaining(targetDate);

                                    return (
                                        <GlassPanel className="overflow-hidden rounded-[2rem] border border-[var(--primary)]/20 p-6 shadow-[0_20px_70px_rgba(9,150,124,0.12)]">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">
                                                    {item.services?.icon || (item.type === "registration" ? "📝" : "📢")}
                                                </div>
                                                <span className="rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                                                    {item.type === "registration" ? "ثبت‌نام فعال" : "اطلاعیه"}
                                                </span>
                                            </div>

                                            <h3 className="mt-5 text-2xl font-black text-[var(--text)]">{item.title}</h3>
                                            <p className="mt-3 leading-7 text-[var(--text-muted)]">
                                                {item.summary || "برای مشاهده جزئیات و شرایط، روی دکمه زیر کلیک کنید."}
                                            </p>

                                            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                                                <div className="text-xs font-bold text-[var(--text-muted)]">زمان باقی‌مانده</div>
                                                <div className="mt-1 text-xl font-black text-[var(--text)]">{remaining}</div>
                                            </div>

                                            <Link href={item.service_id ? `/services/${item.service_id}` : "/services"} className="mt-5 block">
                                                <TusanButton className="w-full">
                                                    {item.button_label || (item.type === "registration" ? "ثبت‌نام" : "مشاهده اطلاعیه")}
                                                </TusanButton>
                                            </Link>
                                        </GlassPanel>
                                    );
                                })()}
                            </motion.div>

                            <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="انتخاب اطلاعیه">
                                {items.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setActiveIndex(index)}
                                        className={`h-2 rounded-full transition-all ${index === activeIndex ? "w-8 bg-[var(--primary)]" : "w-2 bg-[var(--border)]"}`}
                                        aria-label={`نمایش ${item.title}`}
                                        aria-selected={index === activeIndex}
                                        role="tab"
                                    />
                                ))}
                            </div>
                        </div>

                        {items.length > 1 && (
                            <div className="mt-5 hidden items-center justify-center gap-2 text-xs font-bold text-[var(--text-muted)] lg:flex">
                                <span>روی پنل کلیک کنید</span>
                                <span>•</span>
                                <span>با چرخ موس بین موارد جابه‌جا شوید</span>
                            </div>
                        )}

                        {items.length > 1 && (
                            <div className="mt-5 flex items-center justify-center gap-3 lg:hidden">
                                <button
                                    type="button"
                                    onClick={() => changeActive(-1)}
                                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--text)]"
                                    aria-label="مورد قبلی"
                                >
                                    قبلی
                                </button>
                                <span className="text-xs font-bold text-[var(--text-muted)]">با لمس و کشیدن جابه‌جا شوید</span>
                                <button
                                    type="button"
                                    onClick={() => changeActive(1)}
                                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--text)]"
                                    aria-label="مورد بعدی"
                                >
                                    بعدی
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
