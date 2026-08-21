"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, PackageSearch, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { SocialOrder } from "@/lib/social/types";

const statusLabels: Record<SocialOrder["status"], string> = {
    pending: "در انتظار",
    awaiting_payment: "در انتظار پرداخت",
    paid: "پرداخت شده",
    processing: "در حال انجام",
    partial: "انجام بخشی از سفارش",
    completed: "تکمیل شده",
    cancelled: "پرداخت لغو شده",
    failed: "پرداخت ناموفق",
};

export default function SocialOrdersPage() {
    const searchParams = useSearchParams();
    const paymentResult = searchParams.get("payment");
    const [orders, setOrders] = useState<SocialOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data, error } = await supabase.from("social_orders").select("*").order("created_at", { ascending: false });
            if (!error) setOrders((data || []) as SocialOrder[]);
            setLoading(false);
        }
        load();
    }, [paymentResult]);

    const paymentMessage = paymentResult === "success"
        ? { text: "پرداخت با موفقیت تأیید شد.", className: "border-emerald-200 bg-emerald-50 text-emerald-800" }
        : paymentResult === "cancelled"
            ? { text: "پرداخت لغو شد. سفارش ثبت شده اما هیچ مبلغی از شما دریافت نشده است.", className: "border-amber-200 bg-amber-50 text-amber-800" }
            : paymentResult === "failed"
                ? { text: "پرداخت ناموفق بود. سفارش شما به سرویس‌دهنده ارسال نشده است.", className: "border-red-200 bg-red-50 text-red-800" }
                : null;

    return (
        <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6">
            <div className="max-w-5xl mx-auto">
                <Link href="/social" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--primary)] mb-5"><ArrowRight size={18} /> خدمات شبکه‌های اجتماعی</Link>
                <div className="flex items-end justify-between gap-4 mb-6">
                    <div><h1 className="text-3xl font-black">سفارش‌های اجتماعی من</h1><p className="mt-2 text-[var(--text-muted)]">سفارش‌های این بخش مستقل از سفارش‌های خدمات کافی‌نت نگهداری می‌شوند.</p></div>
                    <PackageSearch className="hidden sm:block text-[var(--primary)]" size={36} />
                </div>

                {paymentMessage && <div className={`mb-6 rounded-2xl border p-4 font-bold ${paymentMessage.className}`}>{paymentMessage.text}</div>}

                {loading ? <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">در حال دریافت سفارش‌ها...</div> : orders.length === 0 ? (
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center"><div className="text-5xl">📦</div><p className="mt-4 font-bold">هنوز سفارش اجتماعی ثبت نکرده‌اید.</p><Link href="/social" className="mt-5 inline-flex rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 font-bold">مشاهده خدمات</Link></div>
                ) : (
                    <div className="space-y-3">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><div className="font-black">{order.tracking_code}</div><div className="mt-1 text-sm text-[var(--text-muted)]" dir="ltr">{order.link}</div></div><span className="w-fit rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1.5 text-sm font-bold">{statusLabels[order.status] || order.status}</span></div><div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"><div><span className="text-[var(--text-muted)]">تعداد</span><strong className="block mt-1">{order.quantity.toLocaleString("fa-IR")}</strong></div><div><span className="text-[var(--text-muted)]">مبلغ</span><strong className="block mt-1">{order.price.toLocaleString("fa-IR")} تومان</strong></div><div><span className="text-[var(--text-muted)]">سرویس‌دهنده</span><strong className="block mt-1">{order.provider}</strong></div><div><span className="text-[var(--text-muted)]">تاریخ</span><strong className="block mt-1">{new Date(order.created_at).toLocaleDateString("fa-IR")}</strong></div></div>{order.provider_order_id && <div className="mt-4 text-xs text-[var(--text-muted)] flex items-center gap-1">شناسه سفارش سرویس‌دهنده: <span dir="ltr">{order.provider_order_id}</span><ExternalLink size={13} /></div>}{["failed", "cancelled"].includes(order.status) && <Link href={`/social?retryOrder=${encodeURIComponent(order.id)}`} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold hover:bg-[var(--surface-muted)]"><RotateCcw size={16} /> تلاش مجدد پرداخت</Link>}</article>)}</div>
                )}
            </div>
        </main>
    );
}
