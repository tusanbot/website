"use client";

import { useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/components/ui";

type Stats = {
    orders: number;
    users: number;
    services: number;
    messages: number;
};

function CountUp({
    value,
    suffix = "",
}: {
    value: number;
    suffix?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (!isInView) return;

        const duration = 1200;
        const start = performance.now();

        function frame(now: number) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(value * eased));

            if (progress < 1) {
                requestAnimationFrame(frame);
            }
        }

        requestAnimationFrame(frame);
    }, [isInView, value]);

    return (
        <span ref={ref}>
            {display.toLocaleString("fa-IR")}
            {suffix}
        </span>
    );
}

export default function StatsSection() {
    const [stats, setStats] = useState<Stats>({
        orders: 0,
        users: 0,
        services: 0,
        messages: 0,
    });

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        const [ordersRes, usersRes, servicesRes, messagesRes] = await Promise.all([
            supabase.from("orders").select("id", { count: "exact", head: true }),
            supabase.from("profiles").select("id", { count: "exact", head: true }),
            supabase.from("services").select("id", { count: "exact", head: true }),
            supabase
                .from("messages")
                .select("id", { count: "exact", head: true })
                .eq("read_by_admin", false),
        ]);

        setStats({
            orders: ordersRes.count || 0,
            users: usersRes.count || 0,
            services: servicesRes.count || 0,
            messages: messagesRes.count || 0,
        });
    }

    const cards = [
        {
            icon: "📋",
            title: "سفارش ثبت‌شده",
            value: stats.orders,
            color: "from-emerald-500 to-teal-400",
        },
        {
            icon: "👥",
            title: "کاربر فعال",
            value: stats.users,
            color: "from-cyan-500 to-blue-400",
        },
        {
            icon: "🧩",
            title: "خدمت قابل ارائه",
            value: stats.services,
            color: "from-violet-500 to-fuchsia-400",
        },
        {
            icon: "💬",
            title: "پیام در انتظار بررسی",
            value: stats.messages,
            color: "from-amber-500 to-orange-400",
        },
    ];

    return (
        <section className="relative py-24 overflow-hidden">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)]/10 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeader
                    title="اعتماد مشتریان به توسن"
                    description="هر روز کاربران بیشتری خدمات خود را از طریق توسن ثبت و پیگیری می‌کنند."
                    align="center"
                />

                <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card, index) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 28 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.25 }}
                            transition={{
                                duration: 0.5,
                                delay: index * 0.08,
                            }}
                            whileHover={{ y: -6, scale: 1.02 }}
                            className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur"
                        >
                            {/* Hover glow */}
                            <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                                <div
                                    className={`absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-br ${card.color} opacity-15 blur-3xl`}
                                />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl">
                                        {card.icon}
                                    </div>

                                    <div
                                        className={`h-2 w-2 rounded-full bg-gradient-to-r ${card.color} shadow-[0_0_14px_rgba(9,150,124,0.8)]`}
                                    />
                                </div>

                                <div className="mt-6 text-4xl font-black text-[var(--text)]">
                                    <CountUp value={card.value} suffix="+" />
                                </div>

                                <div className="mt-2 text-sm font-bold text-[var(--text-muted)]">
                                    {card.title}
                                </div>

                                <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: "82%" }}
                                        viewport={{ once: true }}
                                        transition={{
                                            duration: 1.2,
                                            delay: 0.2 + index * 0.08,
                                            ease: "easeOut",
                                        }}
                                        className={`h-full rounded-full bg-gradient-to-r ${card.color}`}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom trust strip */}
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 backdrop-blur"
                >
                    <div className="flex flex-col items-center justify-between gap-4 text-center lg:flex-row lg:text-right">
                        <div>
                            <div className="text-xl font-black text-[var(--text)]">
                                پردازش سریع، پیگیری آنلاین و امنیت اطلاعات
                            </div>
                            <p className="mt-2 text-[var(--text-muted)]">
                                توسن با زیرساخت آنلاین، امکان ثبت سفارش و پیگیری وضعیت خدمات را در
                                هر ساعت از شبانه‌روز فراهم می‌کند.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-5 py-3 text-[var(--primary)]">
                            <span className="text-2xl">⚡</span>
                            <span className="font-bold">پاسخ‌گویی سریع و آنلاین</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}