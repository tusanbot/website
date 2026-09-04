"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { TusanButton } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type PublicSettings = {
    site_name?: string;
    site_description?: string;
    assets?: { logoUrl?: string };
};

type NavItem = { label: string; href: string };
type Service = { id: string; title: string; slug: string | null; category: string | null; icon: string | null; parent_service_id: string | null };

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
    const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
    const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [settings, setSettings] = useState<PublicSettings>({});
    const [services, setServices] = useState<Service[]>([]);

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
        async function loadServices() {
            const { data, error } = await supabase
                .from("services")
                .select("id,title,slug,category,icon,parent_service_id")
                .eq("is_active", true)
                .order("created_at", { ascending: false });
            if (mounted && !error) setServices((data || []) as Service[]);
        }

        void loadSession();
        void loadSettings();
        void loadServices();
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

    function closeMobile() {
        setMobileOpen(false);
        setMobileServicesOpen(false);
    }

    const siteName = settings.site_name || "توسن";
    const siteDescription = settings.site_description || "خدمات آنلاین کافی‌نت";
    const logoUrl = settings.assets?.logoUrl || "";
    const parents = useMemo(() => services.filter((service) => !service.parent_service_id).slice(0, 24), [services]);
    const childrenByParent = useMemo(() => {
        const map = new Map<string, Service[]>();
        services.filter((service) => service.parent_service_id).forEach((service) => {
            const list = map.get(service.parent_service_id!) || [];
            list.push(service);
            map.set(service.parent_service_id!, list);
        });
        return map;
    }, [services]);
    const standalone = useMemo(() => services.filter((service) => !service.parent_service_id && !service.category).slice(0, 8), [services]);

    const accountLinks = [
        { label: "پیگیری سفارش", href: "/orders" },
        { label: "تماس با ما", href: "#footer" },
    ];

    const serviceHref = (service: Service) => service.slug ? `/services/${encodeURIComponent(service.slug)}` : `/services?q=${encodeURIComponent(service.title)}`;

    const ServicesTrigger = ({ mobile = false }: { mobile?: boolean }) => (
        <button
            type="button"
            onClick={() => mobile ? setMobileServicesOpen((value) => !value) : setServicesMenuOpen((value) => !value)}
            className={mobile
                ? "flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-black text-[var(--text)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]"
                : "flex items-center gap-1 whitespace-nowrap text-xs font-black text-[var(--text-muted)] transition hover:text-[var(--primary)]"}
            aria-expanded={mobile ? mobileServicesOpen : servicesMenuOpen}
        >
            <span>خدمات</span><ChevronDown size={15} className={`transition-transform ${((mobile ? mobileServicesOpen : servicesMenuOpen) ? "rotate-180" : "")}`} />
        </button>
    );

    return (
        <motion.header initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="fixed inset-x-0 top-0 z-50">
            <div className="mx-auto max-w-7xl px-4 pt-4">
                <div className={`relative rounded-2xl border transition-all duration-300 ${scrolled || mobileOpen ? "border-[var(--border)] bg-[var(--surface)]/95 shadow-xl backdrop-blur-xl" : "border-transparent bg-transparent"}`}>
                    <div className={`flex items-center justify-between gap-3 ${scrolled ? "px-4 py-3" : "px-3 py-2"}`}>
                        <Link href="/" onClick={closeMobile} className="flex shrink-0 items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--primary)]/10 text-xl">
                                {logoUrl ? <img src={logoUrl} alt={`لوگوی ${siteName}`} className="h-full w-full object-contain p-1" /> : "🛡️"}
                            </div>
                            <div className="hidden sm:block">
                                <div className="font-black text-[var(--text)]">{siteName}</div>
                                <div className="text-xs text-[var(--text-muted)]">{siteDescription}</div>
                            </div>
                        </Link>

                        <nav className="hidden flex-1 items-center justify-center gap-4 xl:flex">
                            <div className="relative"><ServicesTrigger />{servicesMenuOpen && <MegaMenu parents={parents} childrenByParent={childrenByParent} serviceHref={serviceHref} close={() => setServicesMenuOpen(false)} />}</div>
                            {sectionLinks.map((item) => (
                                <a key={item.href} href={item.href} className="whitespace-nowrap text-xs font-black text-[var(--text-muted)] transition hover:text-[var(--primary)]">{item.label}</a>
                            ))}
                        </nav>

                        <nav className="hidden items-center gap-4 lg:flex xl:hidden">
                            <div className="relative"><ServicesTrigger />{servicesMenuOpen && <MegaMenu parents={parents.slice(0, 12)} childrenByParent={childrenByParent} serviceHref={serviceHref} close={() => setServicesMenuOpen(false)} compact />}</div>
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
                        <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 pb-4 pt-2 lg:hidden">
                            <ServicesTrigger mobile />
                            {mobileServicesOpen && <div className="mb-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-2"><Link href="/services" onClick={closeMobile} className="mb-1 block rounded-lg px-3 py-2 text-sm font-black text-[var(--primary)]">مشاهده همه خدمات ←</Link>{parents.slice(0, 10).map((service) => <Link key={service.id} href={serviceHref(service)} onClick={closeMobile} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[var(--text)] hover:bg-[var(--primary)]/5">{service.icon || "📂"}{service.title}</Link>)}</div>}
                            <div className="grid gap-1 sm:grid-cols-2">
                                {sectionLinks.map((item) => (
                                    <a key={item.href} href={item.href} onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-bold text-[var(--text)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]">{item.label}</a>
                                ))}
                                {accountLinks.map((item) => (
                                    <a key={`${item.href}-${item.label}`} href={item.href} onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm font-bold text-[var(--text)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]">{item.label}</a>
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

function MegaMenu({ parents, childrenByParent, serviceHref, close, compact = false }: { parents: Service[]; childrenByParent: Map<string, Service[]>; serviceHref: (service: Service) => string; close: () => void; compact?: boolean }) {
    const columns = parents.reduce<Service[][]>((groups, service, index) => {
        const column = Math.floor(index / (compact ? 4 : 6));
        if (!groups[column]) groups[column] = [];
        groups[column].push(service);
        return groups;
    }, []);

    return <div className={`absolute right-0 top-full mt-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 text-right shadow-2xl ${compact ? "w-[min(680px,calc(100vw-32px))]" : "w-[min(960px,calc(100vw-32px))]"}`}>
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3"><div><div className="text-xs font-black text-[var(--primary)]">کاتالوگ خدمات توسن</div><div className="mt-1 text-sm text-[var(--text-muted)]">دسته‌بندی یا خدمت موردنظر را انتخاب کنید.</div></div><button type="button" onClick={close} className="rounded-lg px-2 py-1 text-lg text-[var(--text-muted)]" aria-label="بستن منوی خدمات">×</button></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {columns.map((column, index) => <div key={index} className="space-y-3">{column.map((parent) => { const children = (childrenByParent.get(parent.id) || []).slice(0, 5); return <div key={parent.id}><Link href={serviceHref(parent)} onClick={close} className="flex items-center gap-2 text-sm font-black text-[var(--text)] hover:text-[var(--primary)]">{parent.icon || "📂"}<span className="truncate">{parent.title}</span></Link>{children.length > 0 && <div className="mr-6 mt-1 space-y-1">{children.map((child) => <Link key={child.id} href={serviceHref(child)} onClick={close} className="block truncate text-xs text-[var(--text-muted)] hover:text-[var(--primary)]">{child.title}</Link>)}</div>}</div>; })}</div>)}
        </div>
        <Link href="/services" onClick={close} className="mt-4 block rounded-xl bg-[var(--primary)] px-4 py-2.5 text-center text-sm font-black text-white">مشاهده همه خدمات ←</Link>
    </div>;
}
