"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    Clock3,
    CreditCard,
    HelpCircle,
    Link2,
    MessageCircle,
    Play,
    Search,
    Send,
    Sparkles,
    Users,
    Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { PublicSocialService, SocialCategory, SocialPlatform } from "@/lib/social/types";

const iconMap: Record<string, LucideIcon> = {
    instagram: MessageCircle,
    youtube: Play,
    telegram: Send,
    send: Send,
    tiktok: Play,
    "music-2": Play,
    "at-sign": MessageCircle,
    "message-circle": MessageCircle,
    "message-square": MessageCircle,
    "play-square": Play,
};

type PlatformTheme = {
    soft: string;
    border: string;
    hoverBorder: string;
    icon: string;
    active: string;
    activeIcon: string;
    accent: string;
};

const defaultPlatformTheme: PlatformTheme = {
    soft: "bg-[var(--primary)]/10",
    border: "border-[var(--border)]",
    hoverBorder: "hover:border-[var(--primary)]",
    icon: "text-[var(--primary)]",
    active: "bg-[var(--primary)] text-white border-[var(--primary)]",
    activeIcon: "bg-white/15 text-white",
    accent: "bg-[var(--primary)]",
};

const platformThemes: Record<string, PlatformTheme> = {
    instagram: {
        soft: "bg-pink-500/10",
        border: "border-pink-300/60",
        hoverBorder: "hover:border-pink-400",
        icon: "text-fuchsia-600",
        active: "bg-gradient-to-br from-fuchsia-600 via-pink-500 to-orange-400 text-white border-pink-400",
        activeIcon: "bg-white/20 text-white",
        accent: "bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400",
    },
    telegram: {
        soft: "bg-sky-500/10",
        border: "border-sky-300/60",
        hoverBorder: "hover:border-sky-400",
        icon: "text-sky-500",
        active: "bg-sky-500 text-white border-sky-500",
        activeIcon: "bg-white/20 text-white",
        accent: "bg-sky-500",
    },
    youtube: {
        soft: "bg-red-500/10",
        border: "border-red-300/60",
        hoverBorder: "hover:border-red-400",
        icon: "text-red-600",
        active: "bg-red-600 text-white border-red-600",
        activeIcon: "bg-white/20 text-white",
        accent: "bg-red-600",
    },
    tiktok: {
        soft: "bg-black/10",
        border: "border-black/20 dark:border-white/20",
        hoverBorder: "hover:border-black/50 dark:hover:border-white/40",
        icon: "text-black dark:text-white",
        active: "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white",
        activeIcon: "bg-white/15 dark:bg-black/10",
        accent: "bg-black dark:bg-white",
    },
    eitaa: {
        soft: "bg-orange-500/10",
        border: "border-orange-300/60",
        hoverBorder: "hover:border-orange-400",
        icon: "text-orange-500",
        active: "bg-orange-500 text-white border-orange-500",
        activeIcon: "bg-white/20 text-white",
        accent: "bg-orange-500",
    },
    rubika: {
        soft: "bg-rose-500/10",
        border: "border-rose-300/60",
        hoverBorder: "hover:border-rose-400",
        icon: "text-rose-500",
        active: "bg-rose-500 text-white border-rose-500",
        activeIcon: "bg-white/20 text-white",
        accent: "bg-rose-500",
    },
    aparat: {
        soft: "bg-red-500/10",
        border: "border-red-300/60",
        hoverBorder: "hover:border-red-400",
        icon: "text-red-500",
        active: "bg-red-500 text-white border-red-500",
        activeIcon: "bg-white/20 text-white",
        accent: "bg-red-500",
    },
    x: {
        soft: "bg-black/10",
        border: "border-black/20 dark:border-white/20",
        hoverBorder: "hover:border-black/50 dark:hover:border-white/40",
        icon: "text-black dark:text-white",
        active: "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white",
        activeIcon: "bg-white/15 dark:bg-black/10",
        accent: "bg-black dark:bg-white",
    },
};

function getPlatformTheme(platform?: SocialPlatform | null): PlatformTheme {
    if (!platform) return defaultPlatformTheme;
    return platformThemes[platform.slug.toLowerCase()] || platformThemes[platform.icon || ""] || defaultPlatformTheme;
}

const featureItems: Array<{ label: string; Icon: LucideIcon }> = [
    { label: "ثبت سفارش آنلاین", Icon: CheckCircle2 },
    { label: "تنوع سرویس", Icon: Users },
    { label: "پیگیری سفارش", Icon: Clock3 },
    { label: "پرداخت امن", Icon: CreditCard },
];

const steps = [
    { number: "۱", title: "سرویس را انتخاب کنید", text: "شبکه اجتماعی و نوع خدمات موردنیازتان را انتخاب کنید." },
    { number: "۲", title: "لینک را وارد کنید", text: "لینک صفحه، پست یا محتوای موردنظر را ثبت کنید." },
    { number: "۳", title: "تعداد را مشخص کنید", text: "تعداد دلخواه را در محدوده مجاز سرویس تعیین کنید." },
    { number: "۴", title: "پرداخت و پیگیری", text: "پرداخت را انجام دهید و وضعیت سفارش را پیگیری کنید." },
];

const faqItems = [
    {
        question: "سفارش‌ها از کجا پیگیری می‌شوند؟",
        answer: "سفارش‌های این بخش با همان حساب کاربری توسن ثبت می‌شوند و در بخش اختصاصی سفارش‌های شبکه‌های اجتماعی قابل پیگیری خواهند بود.",
    },
    {
        question: "آیا قیمت و ظرفیت سرویس‌ها ثابت است؟",
        answer: "خیر. قیمت، حداقل و حداکثر هر سرویس از کاتالوگ سرویس‌ها دریافت می‌شود و می‌تواند برای هر سرویس متفاوت باشد.",
    },
    {
        question: "برای سفارش چه چیزی لازم است؟",
        answer: "بسته به سرویس، معمولاً فقط لینک صفحه یا محتوا و تعداد موردنیاز لازم است. اطلاعات حساس حساب کاربری خود را وارد نکنید.",
    },
];

function formatNumber(value: number) {
    return new Intl.NumberFormat("fa-IR").format(value);
}

function serviceRate(service: PublicSocialService) {
    if (service.customer_unit_price == null) return null;
    const value = Number(service.customer_unit_price);
    return Number.isFinite(value) ? value : null;
}

export default function SocialServicesPage() {
    const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
    const [categories, setCategories] = useState<SocialCategory[]>([]);
    const [services, setServices] = useState<PublicSocialService[]>([]);
    const [selectedPlatform, setSelectedPlatform] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCatalog() {
            setLoading(true);
            const [{ data: platformData }, { data: categoryData }, { data: serviceData }] = await Promise.all([
                supabase.from("social_platforms").select("*").eq("is_active", true).order("sort_order"),
                supabase.from("social_categories").select("*").eq("is_active", true).order("sort_order"),
                supabase.from("social_services_public").select("*").order("sort_order"),
            ]);
            setPlatforms((platformData || []) as SocialPlatform[]);
            setCategories((categoryData || []) as SocialCategory[]);
            setServices((serviceData || []) as PublicSocialService[]);
            setLoading(false);
        }
        loadCatalog();
    }, []);

    const visibleCategories = useMemo(() => {
        if (!selectedPlatform) return categories;
        return categories.filter((category) => category.platform_id === selectedPlatform);
    }, [categories, selectedPlatform]);

    const visibleServices = useMemo(() => {
        const query = search.trim().toLowerCase();
        return services.filter((service) => {
            const platformMatch = !selectedPlatform || service.platform_id === selectedPlatform;
            const categoryMatch = !selectedCategory || service.category_id === selectedCategory;
            const searchMatch = !query || `${service.name} ${service.description || ""}`.toLowerCase().includes(query);
            return platformMatch && categoryMatch && searchMatch;
        });
    }, [services, selectedPlatform, selectedCategory, search]);

    const popularServices = useMemo(() => services.slice(0, 4), [services]);

    function selectPlatform(id: string) {
        setSelectedPlatform(id);
        setSelectedCategory("");
    }

    function scrollToCatalog() {
        document.getElementById("social-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
        <main dir="rtl" className="min-h-screen page-background text-[var(--text)]">
            <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-7 pb-12">
                <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9 shadow-sm">
                    <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[var(--primary)]/10 blur-3xl" />
                    <div className="relative max-w-4xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/10 px-4 py-2 text-sm font-black text-[var(--primary)]">
                            <Sparkles size={17} /> مرکز خدمات شبکه‌های اجتماعی توسن
                        </div>
                        <h1 className="mt-5 max-w-3xl text-3xl sm:text-5xl font-black leading-[1.35]">
                            رشد شبکه‌های اجتماعی،
                            <span className="block text-[var(--primary)]">ساده، سریع و قابل پیگیری</span>
                        </h1>
                        <p className="mt-4 max-w-2xl text-[var(--text-muted)] leading-8">
                            سرویس موردنظرتان را انتخاب کنید، مشخصات سفارش را وارد کنید و تمام مراحل را از پنل توسن پیگیری کنید.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button type="button" onClick={scrollToCatalog} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3.5 font-black text-white shadow-sm hover:opacity-90 transition">
                                شروع سفارش <ArrowLeft size={18} />
                            </button>
                            <Link href="/orders" className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-3.5 font-black hover:border-[var(--primary)] transition">
                                پیگیری سفارش‌ها <Clock3 size={18} className="text-[var(--primary)]" />
                            </Link>
                        </div>
                    </div>

                    <div className="relative mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {featureItems.map(({ label, Icon }) => (
                            <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/80 p-4 text-sm font-bold flex items-center gap-2">
                                <Icon size={18} className="shrink-0 text-[var(--primary)]" />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>

                <section className="mt-10" aria-labelledby="platforms-title">
                    <div className="flex items-end justify-between gap-4 mb-4">
                        <div>
                            <p className="text-sm font-bold text-[var(--primary)]">یک شبکه را انتخاب کنید</p>
                            <h2 id="platforms-title" className="mt-1 text-2xl font-black">خدمات برای پلتفرم‌های محبوب</h2>
                        </div>
                        <button type="button" onClick={() => selectPlatform("")} className="hidden sm:inline-flex text-sm font-bold text-[var(--primary)]">مشاهده همه</button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {platforms.length === 0 && !loading ? (
                            <div className="col-span-full rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">هنوز شبکه‌ای برای نمایش ثبت نشده است.</div>
                        ) : (
                            platforms.map((platform) => {
                                const Icon = iconMap[platform.icon || platform.slug] || MessageCircle;
                                const theme = getPlatformTheme(platform);
                                const active = selectedPlatform === platform.id;
                                return (
                                    <button key={platform.id} type="button" onClick={() => { selectPlatform(platform.id); scrollToCatalog(); }} className={`group relative overflow-hidden rounded-3xl border p-5 text-right transition hover:-translate-y-0.5 ${active ? theme.active : `${theme.border} bg-[var(--surface)] ${theme.hoverBorder}`}`}>
                                        <div className={`absolute inset-x-0 top-0 h-1 ${theme.accent}`} />
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? theme.activeIcon : `${theme.soft} ${theme.icon}`}`}><Icon size={25} /></div>
                                        <div className="mt-4 font-black text-lg">{platform.name}</div>
                                        <div className={`mt-1 text-xs leading-6 ${active ? "text-white/75" : "text-[var(--text-muted)]"}`}>{platform.description || "مشاهده و سفارش خدمات"}</div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="mt-10" aria-labelledby="popular-title">
                    <div className="flex items-end justify-between gap-4 mb-4">
                        <div>
                            <p className="text-sm font-bold text-[var(--primary)]">شروع سریع</p>
                            <h2 id="popular-title" className="mt-1 text-2xl font-black">خدمات پرطرفدار</h2>
                        </div>
                        <button type="button" onClick={scrollToCatalog} className="text-sm font-bold text-[var(--primary)]">همه سرویس‌ها ←</button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {popularServices.map((service) => {
                            const rate = serviceRate(service);
                            const platform = platforms.find((item) => item.id === service.platform_id);
                            const theme = getPlatformTheme(platform);
                            return (
                                <Link key={service.id} href={`/social/order?service=${service.id}`} className={`relative overflow-hidden rounded-3xl border bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 ${theme.border} ${theme.hoverBorder} shadow-sm`}>
                                    <div className={`absolute inset-x-0 top-0 h-1 ${theme.accent}`} />
                                    <div className="flex items-center justify-between gap-3">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${theme.soft} ${theme.icon}`}><Zap size={21} /></div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.soft} ${theme.icon}`}>{platform?.name || "محبوب"}</span>
                                    </div>
                                    <h3 className="mt-4 font-black leading-7">{service.name}</h3>
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">{service.service_type}</p>
                                    <div className="mt-4 flex items-center justify-between text-xs">
                                        <span className="text-[var(--text-muted)]">از {formatNumber(service.min_quantity)}</span>
                                        {rate != null && <strong>{formatNumber(Math.round(rate))} ریال</strong>}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                <section id="social-catalog" className="mt-12 scroll-mt-8" aria-labelledby="catalog-title">
                    <div className="mb-5">
                        <p className="text-sm font-bold text-[var(--primary)]">کاتالوگ خدمات</p>
                        <h2 id="catalog-title" className="mt-1 text-2xl font-black">سرویس موردنظر را پیدا کنید</h2>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-5">
                        <aside className="lg:w-64 shrink-0 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 h-fit lg:sticky lg:top-5">
                            <div className="flex items-center justify-between px-2 mb-3">
                                <h3 className="font-black">شبکه اجتماعی</h3>
                                {selectedPlatform && <button type="button" onClick={() => selectPlatform("")} className="text-xs font-bold text-[var(--primary)]">پاک کردن</button>}
                            </div>
                            <div className="space-y-1.5">
                                <button type="button" onClick={() => selectPlatform("")} className={`w-full rounded-2xl px-4 py-3 text-right font-bold transition ${!selectedPlatform ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--background)]"}`}>همه شبکه‌ها</button>
                                {platforms.map((platform) => {
                                    const Icon = iconMap[platform.icon || platform.slug] || MessageCircle;
                                    const theme = getPlatformTheme(platform);
                                    return <button key={platform.id} type="button" onClick={() => selectPlatform(platform.id)} className={`w-full rounded-2xl px-4 py-3 text-right font-bold flex items-center gap-3 transition ${selectedPlatform === platform.id ? theme.active : `hover:bg-[var(--background)] ${theme.icon}`}`}><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${theme.soft}`}><Icon size={18} /></span><span>{platform.name}</span></button>;
                                })}
                            </div>
                        </aside>

                        <div className="flex-1 min-w-0">
                            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                                <div className="relative">
                                    <Search size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی نام سرویس یا نوع خدمت..." className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-3.5 pr-11 pl-4 outline-none focus:border-[var(--primary)]" />
                                </div>
                                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                    <button type="button" onClick={() => setSelectedCategory("")} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${!selectedCategory ? "bg-[var(--primary)] text-white" : "bg-[var(--background)]"}`}>همه دسته‌ها</button>
                                    {visibleCategories.map((category) => <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${selectedCategory === category.id ? "bg-[var(--primary)] text-white" : "bg-[var(--background)]"}`}>{category.name}</button>)}
                                </div>
                            </div>

                            {loading ? (
                                <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-muted)]">در حال دریافت سرویس‌ها...</div>
                            ) : visibleServices.length === 0 ? (
                                <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"><Search size={27} /></div>
                                    <h3 className="mt-4 font-black text-xl">سرویسی پیدا نشد</h3>
                                    <p className="mt-2 text-[var(--text-muted)]">فیلترها یا عبارت جستجو را تغییر دهید.</p>
                                </div>
                            ) : (
                                <div className="mt-5 grid sm:grid-cols-2 gap-4">
                                    {visibleServices.map((service) => {
                                        const rate = serviceRate(service);
                                        const platform = platforms.find((item) => item.id === service.platform_id);
                                        const theme = getPlatformTheme(platform);
                                        return (
                                            <div key={service.id} className={`relative overflow-hidden rounded-3xl border bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 shadow-sm ${theme.border} ${theme.hoverBorder}`}>
                                                <div className={`absolute inset-x-0 top-0 h-1 ${theme.accent}`} />
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${theme.soft} ${theme.icon}`}>{platform?.name || "خدمات اجتماعی"}</div>
                                                        <h3 className="font-black text-lg leading-7">{service.name}</h3>
                                                        {service.description && <p className="mt-2 text-sm text-[var(--text-muted)] leading-6 line-clamp-2">{service.description}</p>}
                                                    </div>
                                                    <div className={`shrink-0 rounded-2xl p-3 ${theme.soft} ${theme.icon}`}><Users size={20} /></div>
                                                </div>
                                                <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                                                    <div className="rounded-xl bg-[var(--background)] p-3"><span className="text-[var(--text-muted)] block">حداقل سفارش</span><strong className="mt-1 block">{formatNumber(service.min_quantity)}</strong></div>
                                                    <div className="rounded-xl bg-[var(--background)] p-3"><span className="text-[var(--text-muted)] block">حداکثر سفارش</span><strong className="mt-1 block">{formatNumber(service.max_quantity)}</strong></div>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between gap-3">
                                                    <div>
                                                        <span className="block text-xs text-[var(--text-muted)]">قیمت واحد</span>
                                                        <strong className="mt-1 block">{rate == null ? "استعلامی" : `${formatNumber(Math.round(rate))} ریال`}</strong>
                                                    </div>
                                                    <Link href={`/social/order?service=${service.id}`} className={`inline-flex items-center justify-center gap-2 rounded-2xl text-white px-4 py-3 font-black hover:opacity-90 transition ${theme.accent}`}>سفارش <ArrowLeft size={17} /></Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="mt-14" aria-labelledby="steps-title">
                    <div className="text-center max-w-2xl mx-auto">
                        <p className="text-sm font-bold text-[var(--primary)]">سفارش در چند قدم</p>
                        <h2 id="steps-title" className="mt-1 text-2xl font-black">چطور سفارش بدهم؟</h2>
                    </div>
                    <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {steps.map((step) => (
                            <div key={step.number} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-white font-black">{step.number}</div>
                                <h3 className="mt-4 font-black">{step.title}</h3>
                                <p className="mt-2 text-sm text-[var(--text-muted)] leading-7">{step.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-14 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8" aria-labelledby="orders-title">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-bold text-[var(--primary)]">حساب کاربری توسن</p>
                            <h2 id="orders-title" className="mt-1 text-2xl font-black">سفارش‌های شبکه‌های اجتماعی</h2>
                            <p className="mt-2 text-sm text-[var(--text-muted)] leading-7">سفارش‌های این بخش با همان حساب کاربری شما ثبت و در بخش اختصاصی خدمات اجتماعی نگهداری می‌شوند.</p>
                        </div>
                        <Link href="/social/orders" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 font-black text-white hover:opacity-90 transition">مشاهده سفارش‌ها <ArrowLeft size={18} /></Link>
                    </div>
                    <div className="mt-6 grid sm:grid-cols-3 gap-3">
                        <div className="rounded-2xl bg-[var(--background)] p-4"><CheckCircle2 size={20} className="text-[var(--primary)]" /><p className="mt-2 text-sm font-bold">ثبت با پروفایل فعلی</p></div>
                        <div className="rounded-2xl bg-[var(--background)] p-4"><Link2 size={20} className="text-[var(--primary)]" /><p className="mt-2 text-sm font-bold">پیگیری با کد سفارش</p></div>
                        <div className="rounded-2xl bg-[var(--background)] p-4"><CreditCard size={20} className="text-[var(--primary)]" /><p className="mt-2 text-sm font-bold">پرداخت از حساب توسن</p></div>
                    </div>
                </section>

                <section className="mt-14 max-w-3xl mx-auto" aria-labelledby="faq-title">
                    <div className="text-center">
                        <p className="text-sm font-bold text-[var(--primary)]">راهنما</p>
                        <h2 id="faq-title" className="mt-1 text-2xl font-black">سوالات متداول</h2>
                    </div>
                    <div className="mt-6 space-y-3">
                        {faqItems.map((item) => (
                            <details key={item.question} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black">
                                    <span className="flex items-center gap-3"><HelpCircle size={19} className="text-[var(--primary)]" />{item.question}</span>
                                    <ChevronDown size={19} className="shrink-0 transition group-open:rotate-180" />
                                </summary>
                                <p className="mt-3 pr-8 text-sm leading-7 text-[var(--text-muted)]">{item.answer}</p>
                            </details>
                        ))}
                    </div>
                </section>
            </section>
        </main>
    );
}
