"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { TusanButton } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type PublicSettings = {
    site_name?: string;
    site_description?: string;
    assets?: { logoUrl?: string };
};

type NavItem = { label: string; href: string };

const sectionLinks: NavItem[] = [
    { label: "خدمات پرطرفدار", href: "#popular-services" },
    { label: "ابزارهای آنلاین", href: "#online-tools" },
    { label: "شبکه‌های اجتماعی", href: "#social-services" },
    { label: "روند سفارش", href: "#order-process" },
    { label: "سوالات متداول", href: "#faq" },
    { label: "قوانین و مقررات", href: "#rules" },
];

export default function FloatingHeader() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [settings, setSettings] = useState<PublicSettings>({});

    useEffect(() => {
        function onScroll() { setScrolled(window.scrollY > 24); }
        window.addEventListener("scroll", onScroll, { passive: true });
        let mounted = true;

        async function loadSession() {
            const { data } = await supabase.auth.getSession();
            if (mounted) setIsAuthenticated(Boolean(data.session?.user));
        }
        async function loadSettings() {
            try {
                const response = await fetch("/api/site-settings", { cache: "no-store" });
                const data = await response.json();
                if (mounted && response.ok && data.success) setSettings(data.settings || {});
            } catch {
                // Keep built-in fallback branding.
            }
        }

        void loadSession();
        void loadSettings();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
        if (!error) setIsAuthenticated(false);
        setLoggingOut(false);
    }

    function closeMobile() { setMobileOpen(false); }

    const siteName = settings.site_name || "توسن";
    const siteDescription = settings.site_description || "خدمات آنلاین کافی‌نت";
    const logoUrl = settings.assets?.logoUrl || "";

    const accountLinks = [
        { label: "خدمات", href: "/services" },
        { label: "پیگیری سفارش", href: "/orders" },
        { label: "تماس با ما", href: "#footer" },
    ];

    return (
        <motion.header initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="fixed inset-x-0 top-0 z-50">
            <div className="mx-auto max-w-7xl px-4 pt-4">
                <div className={`rounded-2xl border transition-all duration-300 ${scrolled ? "border-white/10 bg-[var(--surface)]/85 backdrop-blur-xl shadow-xl" : "border-transparent bg-transparent"}`}>
                    <div className={`flex items-center justify-between gap-3 ${scrolled ? "px-4 py-3" : "px-3 py-2"}`}>
                        <Link href="/" onClick={closeMobile} className="flex min-w-0 shrink-0 items-center gap-3">
                            <div className="flex h-11 w-auto min-w-[5.5rem] max-w-[9rem] items-center justify-center overflow-hidden rounded-2xl bg-[var(--primary)]/10">
                                {logoUrl ? <img src={logoUrl} alt={`لوگوی ${siteName}`} className="block h-full w-full object-contain" /> : <span className="text-xl">🛡️</span>}
                            </div>
                            <div className="hidden min-w-0 sm:block">
                                <div className="truncate font-black text-[var(--text)]">{siteName}</div>
                                <div className="truncate text-xs text-[var(--text-muted)]">{siteDescription}</div>
                            </div>
                        </Link>

                        <nav className="hidden flex-1 items-center justify-center gap-4 xl:flex">
                            {sectionLinks.map((item) => (
                                <a key={item.href} href={item.href} className="whitespace-nowrap text-xs font-black text-[var(--text-muted)] transition hover:text-[var(--primary)]">{item.label}</a>
                            ))}
                        </nav>

                        <nav className="hidden items-center gap-4 lg:flex xl:hidden">
                            {sectionLinks.slice(0, 3).map((item) => <a key={item.href} href={item.href} className="text-xs font-black text-[var(--text-muted)] hover:text-[var(--primary)]">{item.label}</a>)}
                        </nav>

                        <div className="flex items-center gap-2">
                            <div className="hidden md:flex items-center gap-2">
                                {isAuthenticated ? (
                                    <>
                                        <Link href="/profile"><TusanButton variant="secondary" className="px-3 py-2 text-sm">پروفایل</TusanButton></Link>
                                        <button type="button" onClick={handleLogout} disabled={loggingOut} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-60">{loggingOut ? "..." : "خروج"}</button>
                                    </>
                                ) : (
                                    <Link href="/login"><TusanButton variant="secondary" className="px-3 py-2 text-sm">ورود</TusanButton></Link>
                                )}
                                <Link href="/services"><TusanButton className="px-4 py-2 text-sm">ثبت سفارش</TusanButton></Link>
                            </div>
                            <button type="button" onClick={() => setMobileOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] lg:hidden" aria-label="منوی سایت" aria-expanded={mobileOpen}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
                        </div>
                    </div>

                    {mobileOpen && (
                        <div className="border-t border-[var(--border)] px-4 pb-4 pt-2 lg:hidden">
                            <div className="grid gap-1 sm:grid-cols-2">
                                {[...sectionLinks, ...accountLinks].map((item) => (
                                    <a key={`${item.href}-${item.label}`} href={item.href} onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]">{item.label}</a>
                                ))}
                            </div>
                            <Link href="/services" onClick={closeMobile} className="mt-2 block rounded-xl bg-[var(--primary)] px-4 py-3 text-center text-sm font-black text-white">ثبت سفارش</Link>
                        </div>
                    )}
                </div>
            </div>
        </motion.header>
    );
}
