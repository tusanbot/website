"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/ui";

const features = [
    {
        icon: "⚡",
        title: "سرعت بالا",
        description:
            "ثبت سفارش، بررسی مدارک و انجام خدمات در کوتاه‌ترین زمان ممکن با فرآیندهای بهینه و آنلاین.",
        highlight: "تحویل سریع",
    },
    {
        icon: "🔒",
        title: "امنیت اطلاعات",
        description:
            "اطلاعات و مدارک شما به‌صورت امن نگهداری می‌شود و فقط برای انجام خدمت مورد استفاده قرار می‌گیرد.",
        highlight: "حفظ حریم خصوصی",
    },
    {
        icon: "📱",
        title: "پیگیری آنلاین",
        description:
            "در هر لحظه وضعیت سفارش خود را از طریق پنل کاربری مشاهده کنید و بدون تماس تلفنی از روند انجام کار مطلع شوید.",
        highlight: "شفافیت کامل",
    },
    {
        icon: "🎧",
        title: "پشتیبانی واقعی",
        description:
            "در صورت نیاز به راهنمایی یا تکمیل مدارک، تیم توسن در کنار شماست تا فرآیند بدون دغدغه انجام شود.",
        highlight: "همراهی تا پایان",
    },
];

export default function FeaturesSection() {
    return (
        <section className="relative py-24 overflow-hidden">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-[var(--primary)]/10 blur-3xl" />
                <div className="absolute left-0 bottom-10 h-80 w-80 rounded-full bg-emerald-400/8 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeader
                    title="چرا توسن را انتخاب کنیم؟"
                    description="ترکیبی از سرعت، امنیت، شفافیت و پشتیبانی که تجربه‌ای مطمئن از خدمات آنلاین کافی‌نت ایجاد می‌کند."
                    align="center"
                />

                <div className="mt-14 grid gap-6 md:grid-cols-2">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 28 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.25 }}
                            transition={{
                                duration: 0.55,
                                delay: index * 0.08,
                            }}
                            whileHover={{ y: -6 }}
                            className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-7 shadow-[0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur"
                        >
                            {/* Hover glow */}
                            <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                                <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--primary)]/12 blur-3xl" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-start justify-between gap-4">
                                    <motion.div
                                        whileHover={{ rotate: -6, scale: 1.08 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl"
                                    >
                                        {feature.icon}
                                    </motion.div>

                                    <div className="rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                                        {feature.highlight}
                                    </div>
                                </div>

                                <h3 className="mt-6 text-2xl font-black text-[var(--text)]">
                                    {feature.title}
                                </h3>

                                <p className="mt-3 leading-8 text-[var(--text-muted)]">
                                    {feature.description}
                                </p>

                                <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: "100%" }}
                                        viewport={{ once: true }}
                                        transition={{
                                            duration: 1.1,
                                            delay: 0.25 + index * 0.08,
                                            ease: "easeOut",
                                        }}
                                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-emerald-400"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom trust panel */}
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/85 p-8 backdrop-blur"
                >
                    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                        <div>
                            <h3 className="text-2xl font-black text-[var(--text)]">
                                تجربه‌ای متفاوت از خدمات آنلاین کافی‌نت
                            </h3>

                            <p className="mt-3 leading-8 text-[var(--text-muted)]">
                                از اولین ثبت سفارش تا تحویل نهایی، همه چیز در توسن برای راحتی،
                                سرعت و اطمینان شما طراحی شده است. بدون صف، بدون مراجعه غیرضروری
                                و با امکان پیگیری لحظه‌ای.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-center">
                                <div className="text-3xl font-black text-[var(--primary)]">
                                    ۲۴/۷
                                </div>
                                <div className="mt-2 text-sm font-bold text-[var(--text)]">
                                    ثبت سفارش آنلاین
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-center">
                                <div className="text-3xl font-black text-[var(--primary)]">
                                    ۱۰۰٪
                                </div>
                                <div className="mt-2 text-sm font-bold text-[var(--text)]">
                                    پیگیری آنلاین
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-center">
                                <div className="text-3xl font-black text-[var(--primary)]">
                                    سریع
                                </div>
                                <div className="mt-2 text-sm font-bold text-[var(--text)]">
                                    پردازش خدمات
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-center">
                                <div className="text-3xl font-black text-[var(--primary)]">
                                    امن
                                </div>
                                <div className="mt-2 text-sm font-bold text-[var(--text)]">
                                    نگهداری اطلاعات
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}