"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Instagram, MessageCircle, Play, Search, Send, Sparkles, Users, Youtube, Music2, AtSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SocialCategory, SocialPlatform, SocialService } from "@/lib/social/types";

const iconMap: Record<string, typeof Instagram> = {
    instagram: Instagram,
    youtube: Youtube,
    send: Send,
    "music-2": Music2,
    "at-sign": AtSign,
    "message-circle": MessageCircle,
    "message-square": MessageCircle,
    "play-square": Play,
};

export default function SocialServicesPage() {
    const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
    const [categories, setCategories] = useState<SocialCategory[]>([]);
    const [services, setServices] = useState<SocialService[]>([]);
    const [selectedPlatform, setSelectedPlatform] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCatalog() {
            setLoading(true);
            const [{ data: platformData }, { data: categoryData }, { data: serviceData }] = await Promise.all([
                supabase.from("social_platforms").select("*").eq("is_active", true).order("sort_order"),
                supabase.from("social_categories").select("*").eq("is_active", true).order("sort_order"),
                supabase.from("social_services").select("*").eq("is_active", true).order("sort_order"),
            ]);
            const nextPlatforms = (platformData || []) as SocialPlatform[];
            setPlatforms(nextPlatforms);
            setCategories((categoryData || []) as SocialCategory[]);
            setServices((serviceData || []) as SocialService[]);
            if (nextPlatforms[0]) setSelectedPlatform(nextPlatforms[0].id);
            setLoading(false);
        }
        loadCatalog();
    }, []);

    const platformCategories = useMemo(
        () => categories.filter((category) => category.platform_id === selectedPlatform),
        [categories, selectedPlatform]
    );

    useEffect(() => {
        setSelectedCategory("");
    }, [selectedPlatform]);

    const visibleServices = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("fa-IR");
        return services.filter((service) => {
            const matchesPlatform = service.platform_id === selectedPlatform;
            const matchesCategory = !selectedCategory || service.category_id === selectedCategory;
            const matchesSearch = !query || `${service.name} ${service.description || ""}`.toLocaleLowerCase("fa-IR").includes(query);
            return matchesPlatform && matchesCategory && matchesSearch;
        });
    }, [services, selectedPlatform, selectedCategory, search]);

    return (
        <main dir="rtl" className="min-h-screen page-background text-[var(--text)]">
            <section className="relative overflow-hidden border-b border-[var(--border)]">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/15 via-transparent to-blue-500/10" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-3 py-1.5 text-sm font-bold text-[var(--primary)]">
                                <Sparkles size={16} />
                                خدمات دیجیتال توسن
                            </div>
                            <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight">خدمات شبکه‌های اجتماعی</h1>
                            <p className="mt-4 text-[var(--text-muted)] text-base sm:text-lg leading-8">
                                سرویس‌های منتخب شبکه‌های اجتماعی را از یکجا انتخاب کنید، سفارش دهید و بعداً وضعیت سفارش را از حساب توسن پیگیری کنید.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3 text-sm">
                                {[
                                    "ثبت سفارش آنلاین",
                                    "حساب کاربری مشترک توسن",
                                    "پیگیری سفارش",
                                ].map((item) => (
                                    <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] px-3 py-2">
                                        <CheckCircle2 size={16} className="text-[var(--primary)]" />
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <Link href="/social/orders" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white px-5 py-3 font-bold shadow-lg hover:opacity-90 transition">
                            سفارش‌های من
                            <ArrowLeft size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {platforms.map((platform) => {
                        const Icon = iconMap[platform.icon || ""] || Users;
                        const active = selectedPlatform === platform.id;
                        return (
                            <button key={platform.id} type="button" onClick={() => setSelectedPlatform(platform.id)} className={`group rounded-2xl border p-4 text-center transition ${active ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-sm" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40"}`}>
                                <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl ${active ? "bg-[var(--primary)] text-white" : "bg-[var(--primary)]/10 text-[var(--primary)]"}`}>
                                    <Icon size={22} />
                                </span>
                                <span className="mt-2 block text-sm font-bold">{platform.name}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-5">
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-1">
                        <button type="button" onClick={() => setSelectedCategory("")} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold border ${!selectedCategory ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
                            همه خدمات
                        </button>
                        {platformCategories.map((category) => (
                            <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold border ${selectedCategory === category.id ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
                                {category.name}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full lg:w-80">
                        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی سرویس..." className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 pr-10 pl-4 outline-none focus:border-[var(--primary)]" />
                    </div>
                </div>

                {loading ? (
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-muted)]">در حال دریافت خدمات...</div>
                ) : visibleServices.length === 0 ? (
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                        <div className="text-4xl">🔎</div>
                        <p className="mt-3 font-bold">سرویسی با این مشخصات پیدا نشد.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {visibleServices.map((service) => (
                            <article key={service.id} className="group rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="font-black text-lg leading-8">{service.name}</h2>
                                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{service.description}</p>
                                    </div>
                                    <span className="rounded-xl bg-[var(--primary)]/10 p-2.5 text-[var(--primary)]"><Users size={20} /></span>
                                </div>
                                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-2xl bg-[var(--background)] p-3"><span className="block text-[var(--text-muted)]">حداقل</span><strong>{service.min_quantity.toLocaleString("fa-IR")}</strong></div>
                                    <div className="rounded-2xl bg-[var(--background)] p-3"><span className="block text-[var(--text-muted)]">حداکثر</span><strong>{service.max_quantity.toLocaleString("fa-IR")}</strong></div>
                                </div>
                                <div className="mt-5 flex items-center justify-between gap-3">
                                    <span className="text-xs text-[var(--text-muted)]">قیمت پس از اتصال سرویس‌دهنده محاسبه می‌شود</span>
                                    <Link href={`/social/order?service=${service.id}`} className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 text-sm font-bold hover:opacity-90 transition">
                                        سفارش
                                        <ArrowLeft size={16} />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
