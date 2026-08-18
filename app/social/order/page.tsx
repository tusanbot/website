"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Link2, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SocialService } from "@/lib/social/types";

export default function SocialOrderPage() {
    const [serviceId, setServiceId] = useState<string | null>(null);
    const [service, setService] = useState<SocialService | null>(null);
    const [link, setLink] = useState("");
    const [quantity, setQuantity] = useState("");
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setServiceId(params.get("service"));
    }, []);

    useEffect(() => {
        async function load() {
            if (!serviceId) {
                setLoading(false);
                return;
            }
            const [{ data }, { data: userData }] = await Promise.all([
                supabase.from("social_services").select("*").eq("id", serviceId).eq("is_active", true).single(),
                supabase.auth.getUser(),
            ]);
            setService((data || null) as SocialService | null);
            setUserEmail(userData.user?.email || null);
            setLoading(false);
        }
        load();
    }, [serviceId]);

    if (loading) return <main dir="rtl" className="min-h-screen page-background p-6 text-center">در حال دریافت سرویس...</main>;

    if (!service) return (
        <main dir="rtl" className="min-h-screen page-background p-6">
            <div className="max-w-xl mx-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
                <h1 className="text-2xl font-black">سرویس پیدا نشد</h1>
                <Link href="/social" className="mt-5 inline-flex items-center gap-2 text-[var(--primary)] font-bold">بازگشت به خدمات <ArrowRight size={18} /></Link>
            </div>
        </main>
    );

    const numericQuantity = Number(quantity);
    const validQuantity = Number.isInteger(numericQuantity) && numericQuantity >= service.min_quantity && numericQuantity <= service.max_quantity;

    return (
        <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/social" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--primary)] mb-5"><ArrowRight size={18} /> بازگشت به خدمات</Link>
                <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
                    <div className="p-6 sm:p-8 border-b border-[var(--border)] bg-gradient-to-l from-[var(--primary)]/10 to-transparent">
                        <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] p-2.5"><ShoppingCart size={22} /></div>
                        <h1 className="mt-4 text-2xl sm:text-3xl font-black">سفارش {service.name}</h1>
                        <p className="mt-2 text-[var(--text-muted)] leading-7">اطلاعات سفارش را وارد کنید. پرداخت و ثبت نهایی پس از فعال شدن درگاه انجام خواهد شد.</p>
                    </div>
                    <div className="p-6 sm:p-8 space-y-6">
                        <div>
                            <label className="block mb-2 font-bold">لینک هدف</label>
                            <div className="relative">
                                <Link2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" placeholder="https://..." className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-3 pr-10 pl-4 outline-none focus:border-[var(--primary)]" />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-2 font-bold">تعداد</label>
                            <input type="number" min={service.min_quantity} max={service.max_quantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-3 px-4 outline-none focus:border-[var(--primary)]" />
                            <p className="mt-2 text-xs text-[var(--text-muted)]">حداقل {service.min_quantity.toLocaleString("fa-IR")} و حداکثر {service.max_quantity.toLocaleString("fa-IR")}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                            {userEmail ? `حساب فعال: ${userEmail}` : "برای ثبت سفارش نهایی باید وارد حساب توسن شوید."}
                        </div>
                        <button type="button" disabled={!link.trim() || !validQuantity} className="w-full rounded-2xl bg-[var(--primary)] text-white py-3.5 font-black disabled:opacity-40 disabled:cursor-not-allowed">
                            ادامه و پرداخت — به‌زودی فعال می‌شود
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
