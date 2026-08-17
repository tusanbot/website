"use client";

import { useEffect, useMemo, useState } from "react";
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
    const [tick, setTick] = useState(Date.now());

    useEffect(() => {
        loadAnnouncements();

        const timer = setInterval(() => setTick(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

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

    const cards = useMemo(() => items, [items, tick]);

    return (
        <section className="relative py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeader
                    title="ثبت‌نام‌ها و اطلاعیه‌های فعال"
                    description="آخرین ثبت‌نام‌ها و اطلاعیه‌های مهم که هم‌اکنون در حال اجرا هستند."
                    align="center"
                />

                {loading ? (
                    <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-64 rounded-3xl border border-[var(--border)] bg-[var(--surface)] animate-pulse"
                            />
                        ))}
                    </div>
                ) : cards.length === 0 ? (
                    <GlassPanel className="mt-10 p-10 text-center">
                        <div className="text-5xl mb-4">📭</div>
                        <h3 className="text-xl font-black text-[var(--text)]">
                            اطلاعیه فعالی وجود ندارد
                        </h3>
                        <p className="mt-2 text-[var(--text-muted)]">
                            به‌زودی ثبت‌نام‌ها و اطلاعیه‌های جدید در این بخش نمایش داده می‌شوند.
                        </p>
                    </GlassPanel>
                ) : (
                    <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {cards.map((item, index) => {
                            const targetDate = item.extended_end_at || item.end_at;
                            const remaining = formatRemaining(targetDate);

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.25 }}
                                    transition={{
                                        duration: 0.5,
                                        delay: index * 0.08,
                                    }}
                                >
                                    <GlassPanel className="group relative h-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/85 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(9,150,124,0.18)]">
                                        <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                                            <div className="absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[var(--primary)]/10 blur-3xl" />
                                        </div>

                                        <div className="relative z-10 flex h-full flex-col">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">
                                                        {item.services?.icon ||
                                                            (item.type === "registration" ? "📝" : "📢")}
                                                    </div>

                                                    <div>
                                                        <div className="inline-flex items-center rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                                                            {item.type === "registration"
                                                                ? "ثبت‌نام فعال"
                                                                : "اطلاعیه"}
                                                        </div>

                                                        <h3 className="mt-2 text-lg font-black text-[var(--text)]">
                                                            {item.title}
                                                        </h3>
                                                    </div>
                                                </div>

                                                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                                                    #{(index + 1).toLocaleString("fa-IR")}
                                                </div>
                                            </div>

                                            <p className="mt-5 flex-1 leading-7 text-[var(--text-muted)]">
                                                {item.summary ||
                                                    "برای مشاهده جزئیات و شرایط ثبت‌نام روی دکمه زیر کلیک کنید."}
                                            </p>

                                            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                                                <div className="text-xs font-bold text-[var(--text-muted)]">
                                                    زمان باقی‌مانده
                                                </div>

                                                <div className="mt-2 text-xl font-black text-[var(--text)]">
                                                    {remaining}
                                                </div>

                                                {targetDate && remaining !== "پایان یافته" && (
                                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                                                        <motion.div
                                                            initial={{ width: "15%" }}
                                                            animate={{ width: "82%" }}
                                                            transition={{
                                                                duration: 1.4,
                                                                ease: "easeOut",
                                                            }}
                                                            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-emerald-400"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-6">
                                                <Link
                                                    href={
                                                        item.service_id
                                                            ? `/services/${item.service_id}`
                                                            : `/services`
                                                    }
                                                >
                                                    <TusanButton className="w-full">
                                                        {item.button_label ||
                                                            (item.type === "registration"
                                                                ? "ثبت‌نام"
                                                                : "مشاهده اطلاعیه")}
                                                    </TusanButton>
                                                </Link>
                                            </div>
                                        </div>
                                    </GlassPanel>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}