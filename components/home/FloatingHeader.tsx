"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TusanButton } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function FloatingHeader() {
    const [scrolled, setScrolled] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        function onScroll() {
            setScrolled(window.scrollY > 24);
        }

        window.addEventListener("scroll", onScroll);

        let mounted = true;

        async function loadSession() {
            const { data } = await supabase.auth.getSession();
            if (mounted) setIsAuthenticated(Boolean(data.session?.user));
        }

        loadSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) setIsAuthenticated(Boolean(session?.user));
        });

        return () => {
            mounted = false;
            window.removeEventListener("scroll", onScroll);
            subscription.unsubscribe();
        };
    }, []);

    async function handleLogout() {
        setLoggingOut(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            setLoggingOut(false);
            return;
        }
        setIsAuthenticated(false);
        setLoggingOut(false);
    }

    const links = [
        { label: "خدمات", href: "/services" },
        { label: "پیگیری سفارش", href: "/orders" },
        { label: "داشبورد", href: "/dashboard" },
        { label: "تماس با ما", href: "#footer" },
    ];

    return (
        <motion.header
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-x-0 top-0 z-50"
        >
            <div className="mx-auto max-w-7xl px-4 pt-4">
                <div className={`flex items-center justify-between rounded-2xl border transition-all duration-300 ${scrolled ? "border-white/10 bg-[var(--surface)]/80 backdrop-blur-xl shadow-xl px-5 py-3" : "border-transparent bg-transparent px-3 py-2"}`}>
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-xl">🛡️</div>
                        <div className="hidden sm:block">
                            <div className="font-black text-[var(--text)]">توسن</div>
                            <div className="text-xs text-[var(--text-muted)]">خدمات آنلاین کافی‌نت</div>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-6 md:flex">
                        {links.map((item) => (
                            <Link key={item.label} href={item.href} className="text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--primary)]">
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        {isAuthenticated ? (
                            <>
                                <Link href="/profile">
                                    <TusanButton variant="secondary" className="px-4 py-2 text-sm">پروفایل</TusanButton>
                                </Link>
                                <button type="button" onClick={handleLogout} disabled={loggingOut} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60">
                                    {loggingOut ? "در حال خروج..." : "خروج"}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login">
                                    <TusanButton variant="secondary" className="px-4 py-2 text-sm">ورود</TusanButton>
                                </Link>
                                <Link href="/register">
                                    <TusanButton className="px-4 py-2 text-sm">ثبت‌نام</TusanButton>
                                </Link>
                            </>
                        )}

                        <Link href="/services">
                            <TusanButton className="px-4 py-2 text-sm">ثبت سفارش</TusanButton>
                        </Link>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}