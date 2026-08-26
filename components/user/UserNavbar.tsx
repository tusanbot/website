"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/notifications/NotificationBell";
import { GlassPanel, TusanButton } from "@/components/ui";

const menuItems = [
    { title: "داشبورد", href: "/dashboard", icon: "🏠" },
    { title: "سفارش‌های من", href: "/orders", icon: "📋" },
    { title: "خدمات", href: "/services", icon: "🛍️" },
    { title: "پیام‌ها", href: "/messages", icon: "💬" },
    { title: "پروفایل", href: "/profile", icon: "👤" },
];

export default function UserNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="h-16 flex items-center justify-between gap-4">
                        <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold shadow-[var(--shadow-sm)]">ت</div>
                            <div className="font-bold text-[var(--text)]">کافی‌نت توسن</div>
                            <div className="text-xs text-[var(--text-muted)]">پنل کاربری</div>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            {menuItems.map((item) => {
                                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                return (
                                    <Link key={item.href} href={item.href} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"}`}>
                                        <span className="ml-1">{item.icon}</span>{item.title}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="flex items-center gap-2">
                            <NotificationBell />
                            <Link href="/services" className="hidden sm:block"><TusanButton icon={<span>＋</span>}>سفارش جدید</TusanButton></Link>
                            <button type="button" onClick={() => setOpen(!open)} className="md:hidden w-10 h-10 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center text-xl text-[var(--text)] border border-[var(--border)]" aria-label="منوی کاربری">☰</button>
                        </div>
                    </div>

                    {open && (
                        <GlassPanel className="md:hidden mt-2 p-3 border border-[var(--border)]">
                            <div className="space-y-1">
                                {menuItems.map((item) => {
                                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                    return (
                                        <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${active ? "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)]" : "text-[var(--text)] hover:bg-[var(--surface-muted)]"}`}>
                                            <span>{item.icon}</span>{item.title}
                                        </Link>
                                    );
                                })}
                                <Link href="/services" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface-muted)] text-[var(--text)] font-medium border border-[var(--border)]"><span>＋</span>سفارش جدید</Link>
                                <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text)] hover:bg-[var(--surface-muted)] font-medium"><span>🔔</span>اعلان‌ها</Link>
                                <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-medium transition-colors"><span>🚪</span>خروج از حساب</button>
                            </div>
                        </GlassPanel>
                    )}
                </div>
            </header>
            <div className="hidden md:block fixed right-0 bottom-0 z-40 w-1 h-24 bg-[var(--primary)] rounded-l-full shadow-[var(--shadow-sm)]" />
        </>
    );
}