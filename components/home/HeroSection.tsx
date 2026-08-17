"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FloatingBackground from "./FloatingBackground";
import { TusanButton } from "@/components/ui";
import { useScroll, useTransform } from "framer-motion";



export default function HeroSection() {
    const { scrollY } = useScroll();

    const backgroundY = useTransform(scrollY, [0, 600], [0, 180]);
    const contentY = useTransform(scrollY, [0, 600], [0, 80]);
    return (
        <section className="relative min-h-screen overflow-hidden">
            <motion.div style={{ y: backgroundY }} className="absolute inset-0">
                <FloatingBackground />
            </motion.div>


            <motion.div
                style={{ y: contentY }}

                className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-24 lg:px-8"
            >
                <div className="grid w-full items-center gap-14 lg:grid-cols-2">
                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="text-center lg:text-right"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.6 }}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--surface)]/80 px-4 py-2 text-sm font-bold text-[var(--primary)] shadow-sm backdrop-blur"
                        >
                            <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
                            خدمات آنلاین کافی‌نت توسن
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 22 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25, duration: 0.7 }}
                            className="mt-6 text-5xl font-black leading-tight text-[var(--text)] sm:text-6xl lg:text-7xl"
                        >
                            تمام خدمات کافی‌نت،
                            <span className="block bg-gradient-to-l from-[var(--primary)] via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                                آنلاین و بدون مراجعه حضوری
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.65 }}
                            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)] lg:mx-0"
                        >
                            ثبت‌نام‌های اینترنتی، خدمات دانشجویی، بیمه، مالیات، خودرو و ده‌ها
                            خدمت دیگر را سریع، امن و قابل پیگیری در توسن انجام دهید.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55, duration: 0.65 }}
                            className="mt-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start"
                        >
                            <Link href="/services">
                                <TusanButton className="w-full sm:w-auto px-8 py-3 text-base">
                                    ثبت سفارش
                                </TusanButton>
                            </Link>

                            <Link href="/orders">
                                <TusanButton
                                    variant="secondary"
                                    className="w-full sm:w-auto px-8 py-3 text-base"
                                >
                                    پیگیری سفارش
                                </TusanButton>
                            </Link>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7, duration: 0.6 }}
                            className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-[var(--text-muted)] lg:justify-start"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--primary)]">✔</span>
                                ثبت سفارش در کمتر از ۲ دقیقه
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[var(--primary)]">✔</span>
                                پیگیری آنلاین وضعیت سفارش
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[var(--primary)]">✔</span>
                                پشتیبانی سریع و امن
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Visual Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 28 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.75 }}
                        className="relative hidden lg:block"
                    >
                        <div className="absolute -top-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--primary)]/18 blur-3xl" />

                        <div className="relative rounded-[32px] border border-white/10 bg-[var(--surface)]/85 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl">
                            <div className="mb-6 flex items-center justify-between">
                                <div className="text-sm font-bold text-[var(--text-muted)]">
                                    پنل سفارش توسن
                                </div>

                                <div className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                                    آنلاین
                                </div>
                            </div>

                            <div className="space-y-4">
                                <FloatingItem
                                    icon="🎓"
                                    title="ثبت‌نام دانشگاه"
                                    subtitle="در حال انجام"
                                />

                                <FloatingItem
                                    icon="📄"
                                    title="اظهارنامه مالیاتی"
                                    subtitle="آماده تحویل"
                                />

                                <FloatingItem
                                    icon="🚗"
                                    title="خدمات خودرو"
                                    subtitle="در حال بررسی"
                                />

                                <FloatingItem
                                    icon="🛡️"
                                    title="خدمات بیمه"
                                    subtitle="ثبت‌شده"
                                />
                            </div>

                            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">
                                        سفارش‌های امروز
                                    </span>

                                    <span className="text-2xl font-black text-[var(--text)]">
                                        ۱۲۸
                                    </span>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "78%" }}
                                        transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
                                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-emerald-400"
                                    />
                                </div>

                                <div className="mt-2 text-xs text-[var(--text-muted)]">
                                    ۷۸٪ ظرفیت پردازش امروز تکمیل شده است.
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    delay: 1,
                    duration: 0.6,
                    repeat: Infinity,
                    repeatType: "reverse",
                }}
                className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
            >
                <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                    <span className="text-xs">اسکرول کنید</span>

                    <div className="flex h-10 w-6 justify-center rounded-full border border-[var(--border)]">
                        <div className="mt-2 h-2 w-2 rounded-full bg-[var(--primary)]" />
                    </div>
                </div>
            </motion.div>
        </section>
    );
}

function FloatingItem({
    icon,
    title,
    subtitle,
}: {
    icon: string;
    title: string;
    subtitle: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">
                    {icon}
                </div>

                <div>
                    <div className="font-bold text-[var(--text)]">{title}</div>
                    <div className="text-sm text-[var(--text-muted)]">{subtitle}</div>
                </div>
            </div>

            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.8)]" />
        </motion.div>
    );
}