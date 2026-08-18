"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Instagram, MessageCircle, Play, Search, Send, Sparkles, Users, Music2, AtSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SocialCategory, SocialPlatform, SocialService } from "@/lib/social/types";

const iconMap: Record<string, typeof Instagram> = {
    instagram: Instagram,
    youtube: Play,
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
            setPlatforms((platformData || []) as SocialPlatform[]);
            setCategories((categoryData || []) as SocialCategory[]);
            setServices((serviceData || []) as SocialService[]);
            setLoading(false);
        }
        loadCatalog();
    }, []);

    const visibleCategories = useMemo(() => {
        if (!selectedPlatform) return categories;
        return categories.filter((category) => category.platform_id === selectedPlatform);
    }, [categories, selectedPlatform]);

    const visibleServices = useMemo(() => {
        return services.filter((service) => {
            const platformMatch = !selectedPlatform || service.platform_id === selectedPlatform;
            const categoryMatch = !selectedCategory || service.category_id === selectedCategory;
            const searchMatch = !search.trim() || service.name.toLowerCase().includes(search.trim().toLowerCase());
            return platformMatch && categoryMatch && searchMatch;
        });
    }, [services, selectedPlatform, selectedCategory, search]);

    function selectPlatform(id: string) {
        setSelectedPlatform(id);
        setSelectedCategory("");
    }

    return (
        <main dir="rtl" className="min-h-screen page-background text-[var(--text)]">
            <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-10">
                <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10 shadow-sm">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/10 px-4 py-2 text-sm font-bold text-[var(--primary)]">
                            <Sparkles size={17} /> خدمات شبکه‌های اجتماعی
                        </div>
                        <h1 className="mt-5 text-3xl sm:text-5xl font-black leading-tight">رشد و مدیریت شبکه‌های اجتماعی، ساده و سریع</h1>
                        <p className="mt-4 text-[var(--text-muted)] leading-8">سرویس موردنظر را انتخاب کنید، مشخصات سفارش را وارد کنید و در ادامه سفارش خود را پیگیری کنید.</p>
                    </div>

                    <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            ["ثبت سفارش آنلاین", CheckCircle2],
                            ["تنوع سرویس", Users],
                            ["پیگیری سفارش", Search],
                            ["پرداخت امن", CheckCircle2],
                        ].map(([label, Icon]) => {
                            const ItemIcon = Icon as typeof CheckCircle2;
                            return <div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm font-bold flex items-center gap-2"><ItemIcon size={18} className="text-[var(--primary)]" />{label}</div>;
                        })}
                    </div>
                </div>

                <div className="mt-8 flex flex-col lg:flex-row gap-6">
                    <aside className="lg:w-72 shrink-0 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 h-fit">
                        <h2 className="font-black text-lg px-2 mb-3">شبکه اجتماعی</h2>
                        <div className="space-y-2">
                            <button type="button" onClick={() => selectPlatform("")} className={`w-full rounded-2xl px-4 py-3 text-right font-bold transition ${!selectedPlatform ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--background)]"}`}>همه شبکه‌ها</button>
                            {platforms.map((platform) => {
                                const Icon = iconMap[platform.icon || ""] || MessageCircle;
                                return <button key={platform.id} type="button" onClick={() => selectPlatform(platform.id)} className={`w-full rounded-2xl px-4 py-3 text-right font-bold flex items-center gap-3 transition ${selectedPlatform === platform.id ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--background)]"}`}><Icon size={20} /><span>{platform.name}</span></button>;
                            })}
                        </div>
                    </aside>

                    <section className="flex-1 min-w-0">
                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                            <div className="relative">
                                <Search size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی سرویس..." className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-3.5 pr-11 pl-4 outline-none focus:border-[var(--primary)]" />
                            </div>
                            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                <button type="button" onClick={() => setSelectedCategory("")} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${!selectedCategory ? "bg-[var(--primary)] text-white" : "bg-[var(--background)]"}`}>همه دسته‌ها</button>
                                {visibleCategories.map((category) => <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${selectedCategory === category.id ? "bg-[var(--primary)] text-white" : "bg-[var(--background)]"}`}>{category.name}</button>)}
                            </div>
                        </div>

                        {loading ? (
                            <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-muted)]">در حال دریافت سرویس‌ها...</div>
                        ) : visibleServices.length === 0 ? (
                            <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center"><div className="text-4xl">🔎</div><h3 className="mt-4 font-black text-xl">سرویسی پیدا نشد</h3><p className="mt-2 text-[var(--text-muted)]">فیلترها یا عبارت جستجو را تغییر دهید.</p></div>
                        ) : (
                            <div className="mt-6 grid sm:grid-cols-2 gap-4">
                                {visibleServices.map((service) => (
                                    <div key={service.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:-translate-y-0.5 transition shadow-sm">
                                        <div className="flex items-start justify-between gap-4"><div><h3 className="font-black text-lg leading-7">{service.name}</h3>{service.description && <p className="mt-2 text-sm text-[var(--text-muted)] leading-6">{service.description}</p>}</div><div className="shrink-0 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] p-3"><Users size={20} /></div></div>
                                        <div className="mt-5 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-[var(--background)] p-3"><span className="text-[var(--text-muted)] block">حداقل</span><strong className="mt-1 block">{service.min_quantity.toLocaleString("fa-IR")}</strong></div><div className="rounded-xl bg-[var(--background)] p-3"><span className="text-[var(--text-muted)] block">حداکثر</span><strong className="mt-1 block">{service.max_quantity.toLocaleString("fa-IR")}</strong></div></div>
                                        <Link href={`/social/order?service=${service.id}`} className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white py-3 font-black hover:opacity-90 transition">سفارش سرویس <ArrowLeft size={18} /></Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </section>
        </main>
    );
}
