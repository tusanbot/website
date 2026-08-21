"use client";

import Link from "next/link";
import { motion } from "framer-motion";

function TelegramIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21.7 3.2 18.6 20c-.23 1.18-.86 1.47-1.75.92l-4.83-3.56-2.33 2.24c-.26.26-.48.48-.98.48l.35-4.93 8.97-8.1c.39-.35-.09-.55-.61-.2L6.34 13.57l-4.72-1.48c-1.03-.32-1.05-1.03.21-1.52L20.27 2.1c.87-.32 1.63.2 1.43 1.1Z" />
        </svg>
    );
}

function EitaaIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2.5c-5.25 0-9.5 4.1-9.5 9.17 0 2.55 1.1 4.86 2.86 6.5L4.4 21.5l4.24-1.73c1.05.4 2.18.61 3.36.61 5.25 0 9.5-4.1 9.5-9.17S17.25 2.5 12 2.5Z" fill="currentColor" />
            <path d="M8.15 9.05h7.7c.48 0 .87.39.87.87v1.08c0 .48-.39.87-.87.87h-3.02l-2.05 2.05a.75.75 0 0 1-1.28-.53v-1.52H8.15a.87.87 0 0 1-.87-.87V9.92c0-.48.39-.87.87-.87Z" fill="white" />
        </svg>
    );
}

function RubikaIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2.5c5.25 0 9.5 4.25 9.5 9.5s-4.25 9.5-9.5 9.5S2.5 17.25 2.5 12 6.75 2.5 12 2.5Z" fill="currentColor" />
            <path d="m8.1 8.25 7.8 3.75c.7.34.7 1.34 0 1.68l-7.8 3.75c-.64.31-1.35-.16-1.35-.87V9.12c0-.71.71-1.18 1.35-.87Z" fill="white" />
        </svg>
    );
}

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

    const socialLinks = [
        { label: "تلگرام", username: "@Tusan_admin", href: "https://t.me/Tusan_admin", Icon: TelegramIcon, className: "text-sky-500" },
        { label: "ایتا", username: "@Tusan_admin", href: "https://eitaa.com/Tusan_admin", Icon: EitaaIcon, className: "text-orange-500" },
        { label: "روبیکا", username: "@Tusan_admin", href: "https://rubika.ir/Tusan_admin", Icon: RubikaIcon, className: "text-rose-500" },
    ];

    return (
        <footer className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--background)]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-[var(--primary)]/8 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-400/6 blur-3xl" />
            </div>

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
                <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">🛡️</div>
                            <div>
                                <div className="text-2xl font-black text-[var(--text)]">توسن</div>
                                <div className="text-sm text-[var(--text-muted)]">خدمات آنلاین کافی‌نت</div>
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

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.5, delay: 0.05 }}
                    >
                        <h3 className="text-lg font-black text-[var(--text)]">دسترسی سریع</h3>
                        <ul className="mt-5 space-y-3">
                            {quickLinks.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-[var(--text-muted)] transition hover:text-[var(--primary)]">{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <h3 className="text-lg font-black text-[var(--text)]">حساب کاربری</h3>
                        <ul className="mt-5 space-y-3">
                            {accountLinks.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-[var(--text-muted)] transition hover:text-[var(--primary)]">{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                    >
                        <h3 className="text-lg font-black text-[var(--text)]">اطلاعات تماس</h3>

                        <div className="mt-5 space-y-4 text-[var(--text-muted)]">
                            <div className="flex items-start gap-3">
                                <span className="mt-1">📍</span>
                                <span>مراغه، خیابان ساسان(شهید مدرس)، کافی‌نت توسن</span>
                            </div>
                            <a href="tel:09940838154" className="flex items-center gap-3 transition hover:text-[var(--primary)]">
                                <span>📞</span><span dir="ltr">09940838154</span>
                            </a>
                            <a href="mailto:info@tusan.ir" className="flex items-center gap-3 transition hover:text-[var(--primary)]">
                                <span>✉️</span><span dir="ltr">info@tusan.ir</span>
                            </a>
                        </div>

                        <div className="mt-7 space-y-3">
                            {socialLinks.map(({ label, username, href, Icon, className }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 transition hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5"
                                    aria-label={`${label} ${username}`}
                                >
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] ${className}`}>
                                        <Icon size={20} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-xs text-[var(--text-muted)]">آیدی {label}</span>
                                        <span className="block font-bold" dir="ltr">{username}</span>
                                    </span>
                                </a>
                            ))}
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-8 text-sm text-[var(--text-muted)] lg:flex-row"
                >
                    <div>© {new Date().getFullYear().toLocaleString("fa-IR")} توسن — تمامی حقوق این وب‌سایت محفوظ است.</div>
                    <div className="flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-2 text-[var(--primary)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
                        سامانه آنلاین و فعال
                    </div>
                </motion.div>
            </div>
        </footer>
    );
}
