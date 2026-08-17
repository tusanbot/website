"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HomeFooter() {
    const quickLinks = [
        { label: "صفحه اصلی", href: "/" },
        { label: "خدمات", href: "/services" },
        { label: "ثبت سفارش", href: "/services" },
        { label: "پیگیری سفارش", href: "/orders" },
    ];

    const accountLinks = [
        { label: "ورود", href: "/login" },
        { label: "ثبت‌نام", href: "/register" },
        { label: "پروفایل", href: "/profile" },
        { label: "داشبورد", href: "/dashboard" },
    ];

    return (
        <footer className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--background)]">
            {/* Background effects */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-[var(--primary)]/8 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-400/6 blur-3xl" />
            </div>

            {/* Grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(9,150,124,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(9,150,124,0.15) 1px, transparent 1px)
          `,
                    backgroundSize: "56px 56px",
                }}
            />

            <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
                    {/* Brand */}
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">
                                🛡️
                            </div>

                            <div>
                                <div className="text-2xl font-black text-[var(--text)]">
                                    توسن
                                </div>

                                <div className="text-sm text-[var(--text-muted)]">
                                    خدمات آنلاین کافی‌نت
                                </div>
                            </div>
                        </div>

                        <p className="mt-5 leading-8 text-[var(--text-muted)]">
                            توسن یک پلتفرم مدرن برای ثبت سفارش، ارسال مدارک و پیگیری آنلاین
                            خدمات کافی‌نت است. هدف ما ارائه خدمات سریع، امن و قابل اعتماد برای
                            کاربران است.
                        </p>

                        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-2 text-sm font-bold text-[var(--primary)]">
                            <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
                            پشتیبانی آنلاین فعال
                        </div>
                    </motion.div>

                    {/* Quick links */}
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.5, delay: 0.05 }}
                    >
                        <h3 className="text-lg font-black text-[var(--text)]">
                            دسترسی سریع
                        </h3>

                        <ul className="mt-5 space-y-3">
                            {quickLinks.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-[var(--text-muted)] transition hover:text-[var(--primary)]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Account */}
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <h3 className="text-lg font-black text-[var(--text)]">
                            حساب کاربری
                        </h3>

                        <ul className="mt-5 space-y-3">
                            {accountLinks.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-[var(--text-muted)] transition hover:text-[var(--primary)]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Contact */}
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                    >
                        <h3 className="text-lg font-black text-[var(--text)]">
                            اطلاعات تماس
                        </h3>

                        <div className="mt-5 space-y-4 text-[var(--text-muted)]">
                            <div className="flex items-start gap-3">
                                <span className="mt-1">📍</span>
                                <span>مراغه، خیابان ...، کافی‌نت توسن</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span>📞</span>
                                <span>041-00000000</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span>📱</span>
                                <span>09140000000</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span>✉️</span>
                                <span>info@tusan.ir</span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-3">
                            {[
                                { label: "Telegram", icon: "📨" },
                                { label: "Instagram", icon: "📷" },
                                { label: "WhatsApp", icon: "💬" },
                                { label: "Rubika", icon: "🔷" },
                            ].map((item) => (
                                <motion.a
                                    key={item.label}
                                    href="#"
                                    whileHover={{ y: -3, scale: 1.08 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xl transition hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/10"
                                    aria-label={item.label}
                                >
                                    {item.icon}
                                </motion.a>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Bottom bar */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-8 text-sm text-[var(--text-muted)] lg:flex-row"
                >
                    <div>
                        © {new Date().getFullYear().toLocaleString("fa-IR")} توسن — تمامی
                        حقوق این وب‌سایت محفوظ است.
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-2 text-[var(--primary)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
                        سامانه آنلاین و فعال
                    </div>
                </motion.div>
            </div>
        </footer>
    );
}