"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ServiceAnnouncementsSlider from "@/components/ServiceAnnouncementsSlider";
import AnnouncementSlider from "@/components/AnnouncementSlider";
import ThemeToggle from "@/components/theme/ThemeToggle";
import FadeIn from "@/components/motion/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/motion/Stagger";
import { motion } from "motion/react";
import TiltCard from "@/components/ui/TiltCard";
import TusanIcon from "@/components/ui/TusanIcon";
import {
    TusanCard,
    GlassPanel,
    PrimaryLinkButton,
    StatusBadge,
    SectionHeader,
    TusanInput,
    TusanStatCard,
} from "@/components/ui";


type Service = {
    id: string;
    title: string;
    category: string;
    description: string;
    price: number;
    icon: string;
    is_active: boolean;
};



export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("همه");

    useEffect(() => {
        loadServices();
    }, []);

    async function loadServices() {
        setLoading(true);

        const { data, error } = await supabase
            .from("services")
            .select("*")
            .eq("is_active", true)
            .order("created_at", {
                ascending: false,
            });

        if (error) {
            console.error("خطا در دریافت خدمات:", error);
            setServices([]);
        } else {
            setServices(data || []);
        }

        setLoading(false);
    }





    const categories = useMemo(() => {
        const uniqueCategories = Array.from(
            new Set(
                services
                    .map((service) => service.category)
                    .filter(Boolean)
            )
        );

        return ["همه", ...uniqueCategories];
    }, [services]);


    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {
            همه: services.length,
        };

        services.forEach((service) => {
            if (service.category) {
                counts[service.category] =
                    (counts[service.category] || 0) + 1;
            }
        });

        return counts;
    }, [services]);

    const filteredServices = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return services.filter((service) => {
            const matchesCategory =
                selectedCategory === "همه" ||
                service.category === selectedCategory;

            if (!matchesCategory) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return (
                service.title
                    ?.toLowerCase()
                    .includes(normalizedSearch) ||
                service.category
                    ?.toLowerCase()
                    .includes(normalizedSearch) ||
                service.description
                    ?.toLowerCase()
                    .includes(normalizedSearch)
            );
        });
    }, [services, search, selectedCategory]);

    function clearFilters() {
        setSearch("");
        setSelectedCategory("همه");
    }

    function formatPrice(price: number | null | undefined) {
        if (!price || Number(price) <= 0) {
            return "تماس بگیرید";
        }

        return `${Number(price).toLocaleString("fa-IR")} تومان`;
    }



    if (loading) {
        return (


            <div
                dir="rtl"
                className="min-h-screen bg-[var(--background)] text-[var(--text)] transition-colors duration-300"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
                    <div className="bg-white rounded-3xl shadow-sm p-10">
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-2xl animate-pulse">
                                🛠️
                            </div>

                            <p className="text-gray-600 mt-4">
                                در حال دریافت خدمات...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (


        <div
            dir="rtl"
            className="min-h-screen page-background"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">

                {/* Header */}
                <FadeIn>
                    <section
                        className="relative overflow-hidden rounded-[32px] text-white shadow-[var(--shadow-lg)] reveal-up"
                        style={{
                            background:
                                "radial-gradient(circle at top right, var(--hero-start) 0%, var(--hero-mid) 38%, var(--hero-end) 100%)",
                        }}
                    >
                        {/* ambient glow */}
                        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-[color:var(--secondary)]/18 blur-3xl" />

                        {/* subtle grid */}
                        <div
                            className="absolute inset-0 opacity-[0.08]"
                            style={{
                                backgroundImage:
                                    "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
                                backgroundSize: "28px 28px",
                            }}
                        />

                        <div className="relative p-6 sm:p-8 lg:p-10">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                                <div className="max-w-3xl">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm backdrop-blur-md">
                                        <span>🛠️</span>
                                        <span>خدمات آنلاین توسن</span>
                                    </div>

                                    <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                                        خدمت موردنیاز خود را انتخاب کنید
                                    </h1>

                                    <p className="mt-4 max-w-2xl text-base sm:text-lg leading-8 text-white/80">
                                        ثبت سفارش آنلاین، پیگیری لحظه‌ای وضعیت درخواست و انجام خدمات کافی‌نت بدون مراجعه
                                        حضوری. همه چیز در یک پنل یکپارچه.
                                    </p>

                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <TusanStatCard
                                            title="خدمت فعال"
                                            value={services.length.toLocaleString("fa-IR")}
                                            icon="🛠️"
                                            className="float-soft"
                                        />

                                        <TusanStatCard
                                            title="ثبت سفارش"
                                            value="آنلاین"
                                            icon="⚡"
                                            className="float-soft-delay-1"
                                        />

                                        <TusanStatCard
                                            title="پشتیبانی"
                                            value="همه‌روزه"
                                            icon="📞"
                                            className="float-soft-delay-2"
                                        />
                                    </div>
                                </div>

                                <div className="lg:w-72">
                                    <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl float-soft-delay-3">
                                        <div className="text-sm text-white/70">دسترسی سریع</div>
                                        <div className="mt-2 text-2xl font-black">پنل کاربری</div>
                                        <p className="mt-2 text-sm leading-6 text-white/75">
                                            مشاهده سفارش‌ها، وضعیت درخواست‌ها و مدیریت اطلاعات حساب.
                                        </p>

                                        <Link
                                            href="/dashboard"
                                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-[#087d69] transition hover:bg-gray-50"
                                        >
                                            <span>ورود به داشبورد</span>
                                            <span>←</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </FadeIn>

                <ThemeToggle />

                <div className="reveal-up reveal-delay-1">
                    <ServiceAnnouncementsSlider />
                </div>

                {/* Search & Filters */}
                <GlassPanel className="p-4 sm:p-5">

                    <div className="flex flex-col lg:flex-row gap-4">



                        {/* Search */}
                        <div className="flex-1">
                            <TusanInput
                                icon="🔍"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="نام خدمت، دسته‌بندی یا توضیحات را جستجو کنید..."
                                clearable
                                onClear={() => setSearch("")}
                            />
                        </div>



                        {/* Result count */}
                        <div className="lg:w-auto flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-3">
                            <div className="text-sm text-[var(--muted)] whitespace-nowrap">
                                <span className="font-black text-[var(--primary)] text-lg">
                                    {filteredServices.length.toLocaleString("fa-IR")}
                                </span>{" "}
                                خدمت یافت شد
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    {categories.length > 1 && (
                        <div className="mt-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-bold text-gray-700">
                                    دسته‌بندی خدمات
                                </h2>

                                {(search || selectedCategory !== "همه") && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="text-sm font-bold text-[var(--primary)] hover:underline"
                                    >
                                        پاک کردن فیلترها
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                                {categories.map((category) => {
                                    const active =
                                        selectedCategory === category;

                                    return (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() =>
                                                setSelectedCategory(category)
                                            }
                                            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition ${active
                                                ? "bg-[var(--primary)] text-white shadow-md shadow-[color:color-mix(in_srgb,var(--primary)_20%,transparent)]"
                                                : "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-strong)] border border-[var(--border)]"

                                                }`}
                                        >
                                            <span>{category}</span>

                                            <span
                                                className={`text-xs min-w-5 h-5 px-1 rounded-md flex items-center justify-center ${active
                                                    ? "bg-white/20 text-white"
                                                    : "bg-white text-[var(--muted)]"
                                                    }`}
                                            >
                                                {(
                                                    categoryCounts[category] || 0
                                                ).toLocaleString("fa-IR")}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </GlassPanel>


                {/* Result header */}
                <SectionHeader
                    title="خدمات موجود"
                    description={
                        selectedCategory === "همه"
                            ? "تمام خدمات فعال را مشاهده کنید."
                            : `خدمات دسته «${selectedCategory}»`
                    }

                    action={
                        filteredServices.length > 0 ? (
                            <span className="hidden sm:block text-sm text-[var(--muted)]">
                                {filteredServices.length.toLocaleString("fa-IR")} مورد
                            </span>
                        ) : null
                    }
                />

                {/* Empty State */}
                {filteredServices.length === 0 ? (
                    <section className="bg-[var(--surface)] backdrop-blur rounded-3xl border border-[var(--border)] shadow-[var(--shadow-md)] p-10 sm:p-14 text-center transition-colors duration-300">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-4xl">
                            🔎
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black tusan-title mt-5">
                            خدمتی پیدا نشد
                        </h2>

                        <p className="text-[var(--muted)] mt-2 max-w-md mx-auto leading-7">
                            خدمت موردنظر با عبارت جستجو یا دسته‌بندی انتخاب‌شده پیدا نشد.
                            عبارت دیگری را امتحان کنید.
                        </p>

                        <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-6 bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
                        >
                            نمایش همه خدمات
                        </button>
                    </section>
                ) : (
                    <StaggerContainer
                        key={`${selectedCategory}-${search}`}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                        {filteredServices.map((service) => (
                            <StaggerItem key={service.id}>
                                <TiltCard>
                                    <TusanCard className="group overflow-hidden flex flex-col">
                                        <div className="p-5 sm:p-6 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="
    w-16 h-16 rounded-2xl
    bg-[var(--primary)]/10 border border-[color:color-mix(in_srgb,var(--primary)_10%,transparent)]
    flex items-center justify-center
    text-3xl shrink-0
    transition-all duration-300
    group-hover:scale-110
    group-hover:-translate-y-1
    group-hover:rotate-3
">
                                                    {service.icon || "📄"}
                                                </div>

                                                <StatusBadge variant="neutral">
                                                    {service.category || "عمومی"}
                                                </StatusBadge>
                                            </div>

                                            <h3 className="text-xl font-black tusan-title mt-5 leading-8">
                                                {service.title}
                                            </h3>

                                            <p className="text-[var(--muted)] text-sm leading-7 mt-2 line-clamp-3 min-h-[84px]">
                                                {service.description ||
                                                    "برای دریافت این خدمت می‌توانید سفارش خود را ثبت کنید."}
                                            </p>
                                        </div>

                                        <div className="border-t border-[var(--border)] bg-[var(--surface)] p-5">
                                            <div className="flex items-end justify-between gap-3 mb-4">
                                                <div>
                                                    <div className="text-xs text-[var(--muted)] mb-1">
                                                        هزینه خدمت
                                                    </div>

                                                    <div
                                                        className={`font-black ${service.price && Number(service.price) > 0
                                                            ? "tusan-title"
                                                            : "text-[var(--primary)]"
                                                            }`}
                                                    >
                                                        {formatPrice(service.price)}
                                                    </div>
                                                </div>

                                                <span className="text-xs text-[var(--muted)]">آنلاین</span>
                                            </div>

                                            <PrimaryLinkButton
                                                href={`/orders/new/${service.id}`}
                                                fullWidth
                                                className="group-hover:brightness-105"
                                            >
                                                <span>ثبت سفارش</span>
                                                <span>←</span>
                                            </PrimaryLinkButton>
                                        </div>
                                    </TusanCard>
                                </TiltCard>
                            </StaggerItem>
                        ))}
                    </StaggerContainer>
                )}

                {/* Bottom Navigation */}
                <nav className="tusan-surface tusan-surface-glow p-2">
                    <div className="grid grid-cols-3 gap-1">
                        <Link
                            href="/dashboard"
                            className="flex flex-col items-center justify-center py-3 rounded-2xl text-[var(--muted)] hover:bg-[var(--surface)] transition font-medium"
                        >
                            <span className="text-xl">🏠</span>
                            <span className="text-xs mt-1">داشبورد</span>
                        </Link>

                        <Link
                            href="/orders"
                            className="flex flex-col items-center justify-center py-3 rounded-2xl text-[var(--muted)] hover:bg-[var(--surface)] transition font-medium"
                        >
                            <TusanIcon name="clipboard" size={22} className="text-[var(--primary)]" />
                            <span className="text-xs mt-1">سفارش‌های من</span>
                        </Link>

                        <div className="flex flex-col items-center justify-center py-3 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
                            <span className="text-xl">🛠️</span>
                            <span className="text-xs mt-1">خدمات</span>
                        </div>
                    </div>
                </nav>
            </div>
        </div>
    );
}
