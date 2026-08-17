"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlassPanel, TusanButton } from "@/components/ui";

export default function FinalCTA() {
    return (
        <section className="relative overflow-hidden py-24">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-emerald-500 to-teal-600" />

            <motion.div
                animate={{
                    x: [0, 40, -30, 0],
                    y: [0, -30, 20, 0],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute -top-24 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
            />

            <motion.div
                animate={{
                    x: [0, -30, 25, 0],
                    y: [0, 25, -20, 0],
                }}
                transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute bottom-[-6rem] left-[-4rem] h-96 w-96 rounded-full bg-white/10 blur-3xl"
            />

            {/* Grid overlay */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
          `,
                    backgroundSize: "48px 48px",
                }}
            />

            <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
                <GlassPanel className="overflow-hidden rounded-[36px] border border-white/15 bg-slate-900/30 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:p-12">
                    <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.25 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white">
                                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                آماده شروع هستید؟
                            </div>

                            <h2 className="mt-6 text-4xl font-black leading-tight text-white sm:text-5xl">
                                همین حالا سفارش خود را در توسن ثبت کنید
                            </h2>

                            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-100">
                                ثبت سفارش کمتر از دو دقیقه زمان می‌برد. مدارک را آنلاین ارسال
                                کنید، وضعیت سفارش را لحظه‌ای پیگیری کنید و بدون مراجعه غیرضروری
                                خدمت خود را دریافت کنید.
                            </p>

                            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                <Link href="/services">
                                    <TusanButton className="w-full bg-white text-[var(--primary)] hover:bg-white/90 sm:w-auto">
                                        شروع ثبت سفارش
                                    </TusanButton>
                                </Link>

                                <Link href="/orders">
                                    <TusanButton
                                        variant="secondary"
                                        className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
                                    >
                                        پیگیری سفارش
                                    </TusanButton>
                                </Link>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-4 text-sm text-white/85">
                                <div className="flex items-center gap-2">
                                    <span>✔</span>
                                    ثبت سفارش ۲۴ ساعته
                                </div>

                                <div className="flex items-center gap-2">
                                    <span>✔</span>
                                    پشتیبانی سریع
                                </div>

                                <div className="flex items-center gap-2">
                                    <span>✔</span>
                                    امنیت اطلاعات
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 24 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.25 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="grid gap-4"
                        >
                            <StatCard value="۲ دقیقه" label="زمان ثبت سفارش" />
                            <StatCard value="آنلاین" label="پیگیری وضعیت سفارش" />
                            <StatCard value="امن" label="نگهداری اطلاعات و مدارک" />
                        </motion.div>
                    </div>
                </GlassPanel>
            </div>
        </section>
    );
}

function StatCard({
    value,
    label,
}: {
    value: string;
    label: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-white/15 bg-slate-900/25 p-5 backdrop-blur"
        >
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="mt-2 text-sm text-slate-200">{label}</div>
        </motion.div>
    );
}