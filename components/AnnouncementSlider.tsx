"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Announcement = {
    id: string;
    title: string;
    type: string;
    summary: string | null;
    content: string | null;
    start_at: string;
    end_at: string;
    documents: string[] | null;
    is_active: boolean;
    is_extendable: boolean;
    extended_end_at: string | null;
    button_label: string | null;
    service_id: string | null;
    priority: number;
    services?: {
        title: string;
        icon: string | null;
    } | null;
};



export default function AnnouncementSlider() {
    const [items, setItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        loadAnnouncements();
    }, []);

    useEffect(() => {
        if (items.length <= 1 || paused) return;

        const timer = setInterval(() => {
            setExpanded(false);
            setIndex((prev) => (prev + 1) % items.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [items, paused]);

    async function loadAnnouncements() {
        setLoading(true);

        const { data, error } = await supabase
            .from("services_announcements")
            .select(`
  *,
  services(
    title,
    icon
  )
`)
            .eq("is_active", true)
            .order("priority", { ascending: false })
            .order("start_at", { ascending: false });

        if (!error) {
            setItems((data || []) as Announcement[]);
        }

        setLoading(false);
    }

    const current = items[index];

    const progress = useMemo(() => {
        if (!current) return 0;

        const start = new Date(current.start_at).getTime();
        const end = new Date(current.extended_end_at || current.end_at).getTime();
        const now = Date.now();

        if (now <= start) return 0;
        if (now >= end) return 100;

        return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    }, [current]);

    const remaining = useMemo(() => {
        if (!current) return { text: "", color: "bg-green-500" };

        const end = new Date(current.extended_end_at || current.end_at).getTime();
        const diff = end - Date.now();

        if (diff <= 0) {
            return { text: "مهلت به پایان رسیده", color: "bg-red-500" };
        }

        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days <= 3) {
            return { text: `${days} روز باقی مانده`, color: "bg-red-500" };
        }

        if (days <= 7) {
            return { text: `${days} روز باقی مانده`, color: "bg-orange-500" };
        }

        return { text: `${days} روز باقی مانده`, color: "bg-green-500" };
    }, [current]);

    if (loading || !current) {
        return (
            <div className="bg-white/95 backdrop-blur rounded-3xl border border-white/60 shadow-[0_10px_30px_rgba(15,23,42,0.08)] p-6 text-center text-gray-500">
                در حال دریافت اطلاعیه‌ها...
            </div>
        );
    }

    return (
        <section className="bg-white/95 backdrop-blur rounded-3xl border border-white/60 shadow-[0_10px_30px_rgba(15,23,42,0.08)] overflow-hidden">
            <section
                className="bg-white/95 backdrop-blur rounded-3xl border border-white/60 shadow-[0_10px_30px_rgba(15,23,42,0.08)] overflow-hidden"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            ></section>
            <div className="p-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-[#09967C]/10 flex items-center justify-center text-xl">
                            📢
                        </div>

                        <div>
                            <h2 className="text-lg font-black text-gray-800">
                                ثبت‌نام‌ها و اطلاعیه‌های فعال
                            </h2>

                            <p className="text-sm text-gray-500 mt-1">
                                آخرین ثبت‌نام‌ها، اطلاعیه‌ها و مهلت‌های فعال
                            </p>
                        </div>
                        <div className="mt-5 rounded-2xl border border-gray-100 bg-gradient-to-l from-[#09967C]/5 to-white p-5 transition-all duration-500 ease-in-out"></div>
                    </div>

                    {items.length > 1 && (
                        <div className="flex items-center gap-2">
                            {items.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        setExpanded(false);
                                        setIndex(i);
                                    }}
                                    className={`w-2.5 h-2.5 rounded-full transition ${i === index ? "bg-[#09967C]" : "bg-gray-300"
                                        }`}
                                    aria-label={`اسلاید ${i + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-5 rounded-2xl border border-gray-100 bg-gradient-to-l from-[#09967C]/5 to-white p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="bg-[#09967C] text-white text-xs font-bold px-3 py-1 rounded-full">
                                    {current.type === "registration" ? "ثبت‌نام" : "اطلاعیه"}
                                </span>

                                {current.extended_end_at && (
                                    <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">
                                        تمدید شده
                                    </span>
                                )}
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-[#09967C]/10 flex items-center justify-center text-3xl shrink-0">
                                    {current.services?.icon || "📢"}
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-2xl font-black text-gray-800">
                                        {current.title}
                                    </h3>

                                    {current.services?.title && (
                                        <div className="mt-2 inline-flex items-center gap-2 bg-white border border-[#09967C]/20 text-[#09967C] text-sm font-bold px-3 py-1 rounded-full">
                                            <span>🛠️</span>
                                            <span>متصل به خدمت: {current.services.title}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {current.summary && (
                                <p className="text-gray-600 mt-3 leading-7">
                                    {current.summary}
                                </p>
                            )}

                            <div className="grid sm:grid-cols-2 gap-3 mt-5">
                                <div className="border rounded-xl p-3 bg-white">
                                    <div className="text-xs text-gray-500">شروع ثبت‌نام</div>
                                    <div className="font-bold mt-1">
                                        {new Date(current.start_at).toLocaleDateString("fa-IR")}
                                    </div>
                                </div>

                                <div className="border rounded-xl p-3 bg-white">
                                    <div className="text-xs text-gray-500">پایان ثبت‌نام</div>
                                    <div className="font-bold mt-1">
                                        {new Date(current.extended_end_at || current.end_at).toLocaleDateString("fa-IR")}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-500">وضعیت زمان</span>

                                    <div className="text-left">
                                        <div className="font-bold text-gray-700">
                                            {remaining.text}
                                        </div>

                                        <div className="text-xs text-gray-500 mt-1">
                                            {Math.round(progress)}٪ سپری شده
                                        </div>
                                    </div>
                                </div>

                                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${remaining.color}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="lg:w-72 border rounded-2xl bg-white p-4">
                            <h4 className="font-bold text-gray-800 mb-3">
                                مدارک موردنیاز
                            </h4>

                            {current.documents && current.documents.length > 0 ? (
                                <ul className="space-y-2 text-sm text-gray-600">
                                    {current.documents.map((doc, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-[#09967C]">•</span>
                                            <span>{doc}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    مدارکی ثبت نشده است.
                                </p>
                            )}

                            {current.content && (
                                <div className="mt-4 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setExpanded((v) => !v)}
                                        className="text-[#09967C] font-bold text-sm hover:underline"
                                    >
                                        {expanded ? "بستن اطلاعات بیشتر" : "اطلاعات بیشتر"}
                                    </button>

                                    {expanded && (
                                        <div className="mt-3 text-sm text-gray-600 leading-7 whitespace-pre-wrap">
                                            {current.content}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-5">
                                {current.service_id ? (
                                    <Link
                                        href={`/orders/new/${current.service_id}`}
                                        className="flex items-center justify-center w-full bg-[#09967C] text-white py-3 rounded-xl font-bold hover:bg-[#087d69] transition"
                                    >
                                        {current.button_label || "ثبت‌نام"}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        disabled
                                        className="flex items-center justify-center w-full border border-gray-300 text-gray-500 py-3 rounded-xl font-bold cursor-not-allowed bg-gray-50"
                                    >
                                        اطلاعیه
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}