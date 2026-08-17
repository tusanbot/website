"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton, SectionHeader } from "@/components/ui";

type Service = {
    id: string;
    title: string;
    category: string | null;
    description: string | null;
    icon: string | null;
};

export default function PopularServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadServices();
    }, []);

    async function loadServices() {
        setLoading(true);

        const { data } = await supabase
            .from("services")
            .select("id, title, category, description, icon")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(8);

        setServices((data || []) as Service[]);
        setLoading(false);
    }

    return (
        <section className="relative py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeader
                    title="خدمات محبوب توسن"
                    description="پرکاربردترین خدماتی که کاربران هر روز از طریق توسن به‌صورت آنلاین ثبت و پیگیری می‌کنند."
                    align="center"
                />

                {loading ? (
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-72 rounded-3xl border border-[var(--border)] bg-[var(--surface)] animate-pulse"
                            />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                            {services.map((service, index) => (
                                <motion.div
                                    key={service.id}
                                    initial={{ opacity: 0, y: 26 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.2 }}
                                    transition={{
                                        duration: 0.45,
                                        delay: index * 0.06,
                                    }}
                                >
                                    <Link href={`/services/${service.id}`}>
                                        <GlassPanel className="group relative h-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-6 transition duration-300 hover:-translate-y-2 hover:shadow-[0_22px_70px_rgba(9,150,124,0.18)]">
                                            {/* Glow */}
                                            <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                                                <div className="absolute -top-20 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-[var(--primary)]/12 blur-3xl" />
                                            </div>

                                            <div className="relative z-10 flex h-full flex-col">
                                                <motion.div
                                                    whileHover={{ rotate: -6, scale: 1.08 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl"
                                                >
                                                    {service.icon || "📋"}
                                                </motion.div>

                                                <div className="mt-6">
                                                    <div className="inline-flex items-center rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                                                        {service.category || "خدمات آنلاین"}
                                                    </div>

                                                    <h3 className="mt-3 text-xl font-black text-[var(--text)]">
                                                        {service.title}
                                                    </h3>

                                                    <p className="mt-3 line-clamp-3 leading-7 text-[var(--text-muted)]">
                                                        {service.description ||
                                                            "ثبت سفارش، بارگذاری مدارک و پیگیری آنلاین این خدمت از طریق پنل توسن."}
                                                    </p>
                                                </div>

                                                <div className="mt-auto pt-6">
                                                    <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3">
                                                        <span className="text-sm font-bold text-[var(--text)]">
                                                            ثبت سفارش
                                                        </span>

                                                        <span className="text-[var(--primary)] transition-transform duration-300 group-hover:translate-x-1">
                                                            ←
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassPanel>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-10 flex justify-center">
                            <Link href="/services">
                                <TusanButton variant="secondary" className="px-8 py-3">
                                    مشاهده همه خدمات
                                </TusanButton>
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}