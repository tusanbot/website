"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, PackageSearch, CreditCard, XCircle, Eye, RefreshCw, CheckCircle2, Clock3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SocialOrder } from "@/lib/social/types";

const statusLabels: Record<SocialOrder["status"], string> = {
    pending: "در انتظار",
    awaiting_payment: "در انتظار پرداخت",
    paid: "پرداخت شده",
    processing: "در حال انجام",
    partial: "انجام بخشی از سفارش",
    completed: "تکمیل شده",
    cancelled: "لغو شده",
    failed: "پرداخت ناموفق",
};

const timeline = [
    { key: "created", label: "ثبت سفارش" },
    { key: "paid", label: "پرداخت" },
    { key: "processing", label: "ارسال و پردازش" },
    { key: "completed", label: "تکمیل سفارش" },
] as const;

function timelineIndex(status: SocialOrder["status"]) {
    if (status === "pending" || status === "awaiting_payment" || status === "failed" || status === "cancelled") return 0;
    if (status === "paid") return 1;
    if (status === "processing" || status === "partial") return 2;
    return 3;
}

export default function SocialOrdersPage() {
    const [orders, setOrders] = useState<SocialOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [paymentResult, setPaymentResult] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    async function load() {
        const { data, error } = await supabase.from("social_orders").select("*").order("created_at", { ascending: false });
        if (!error) setOrders((data || []) as SocialOrder[]);
        setLoading(false);
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setPaymentResult(params.get("payment"));
        load();
    }, []);

    async function authHeaders() {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("برای انجام این عملیات ابتدا وارد حساب کاربری شوید.");
        return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    }

    async function pay(order: SocialOrder) {
        setBusyId(order.id); setActionError(null);
        try {
            const response = await fetch("/api/social/payment/request", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ orderId: order.id }) });
            const result = await response.json();
            if (!response.ok || !result.paymentUrl) throw new Error(result.error || "ایجاد پرداخت ناموفق بود.");
            window.location.href = result.paymentUrl;
        } catch (error) { setActionError(error instanceof Error ? error.message : "پرداخت ناموفق بود."); setBusyId(null); }
    }

    async function cancel(order: SocialOrder) {
        if (!window.confirm("آیا از لغو این سفارش مطمئن هستید؟")) return;
        setBusyId(order.id); setActionError(null);
        try {
            const response = await fetch("/api/social/order/cancel", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ orderId: order.id }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "لغو سفارش ناموفق بود.");
            await load();
        } catch (error) { setActionError(error instanceof Error ? error.message : "لغو سفارش ناموفق بود."); }
        finally { setBusyId(null); }
    }

    const paymentMessage = paymentResult === "success"
        ? { text: "پرداخت با موفقیت تأیید شد.", className: "border-emerald-200 bg-emerald-50 text-emerald-800" }
        : paymentResult === "cancelled"
            ? { text: "پرداخت لغو شد. سفارش شما در وضعیت در انتظار پرداخت باقی مانده و می‌توانید دوباره پرداخت کنید.", className: "border-amber-200 bg-amber-50 text-amber-800" }
            : paymentResult === "failed"
                ? { text: "پرداخت ناموفق بود. سفارش شما به سرویس‌دهنده ارسال نشده است.", className: "border-red-200 bg-red-50 text-red-800" }
                : null;

    return (
        <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6">
            <div className="max-w-5xl mx-auto">
                <Link href="/social" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--primary)] mb-5"><ArrowRight size={18} /> خدمات شبکه‌های اجتماعی</Link>
                <div className="flex items-end justify-between gap-4 mb-6">
                    <div><h1 className="text-3xl font-black">سفارش‌های اجتماعی من</h1><p className="mt-2 text-[var(--text-muted)]">مدیریت پرداخت، لغو و پیگیری مراحل سفارش‌های شبکه‌های اجتماعی</p></div>
                    <PackageSearch className="hidden sm:block text-[var(--primary)]" size={36} />
                </div>

                {paymentMessage && <div className={`mb-6 rounded-2xl border p-4 font-bold ${paymentMessage.className}`}>{paymentMessage.text}</div>}
                {actionError && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-800 p-4 font-bold">{actionError}</div>}

                {loading ? <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">در حال دریافت سفارش‌ها...</div> : orders.length === 0 ? (
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center"><div className="text-5xl">📦</div><p className="mt-4 font-bold">هنوز سفارش اجتماعی ثبت نکرده‌اید.</p><Link href="/social" className="mt-5 inline-flex rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 font-bold">مشاهده خدمات</Link></div>
                ) : (
                    <div className="space-y-4">{orders.map((order) => {
                        const index = timelineIndex(order.status);
                        const canPay = ["pending", "awaiting_payment", "failed", "cancelled"].includes(order.status);
                        const canCancel = ["pending", "awaiting_payment", "failed"].includes(order.status) && !order.provider_order_id;
                        const isOpen = openId === order.id;
                        return <article key={order.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div><div className="font-black text-lg">{order.tracking_code}</div><div className="mt-1 text-sm text-[var(--text-muted)]" dir="ltr">{order.link}</div></div>
                                <span className="w-fit rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1.5 text-sm font-bold">{statusLabels[order.status] || order.status}</span>
                            </div>
                            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"><div><span className="text-[var(--text-muted)]">تعداد</span><strong className="block mt-1">{order.quantity.toLocaleString("fa-IR")}</strong></div><div><span className="text-[var(--text-muted)]">مبلغ</span><strong className="block mt-1">{order.price.toLocaleString("fa-IR")} تومان</strong></div><div><span className="text-[var(--text-muted)]">سرویس‌دهنده</span><strong className="block mt-1">{order.provider}</strong></div><div><span className="text-[var(--text-muted)]">تاریخ</span><strong className="block mt-1">{new Date(order.created_at).toLocaleDateString("fa-IR")}</strong></div></div>
                            <div className="mt-5 flex flex-wrap gap-2">
                                {canPay && <button onClick={() => pay(order)} disabled={busyId === order.id} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 font-bold disabled:opacity-50">{busyId === order.id ? <RefreshCw size={17} className="animate-spin" /> : order.status === "awaiting_payment" ? <CreditCard size={17} /> : <CreditCard size={17} />} {order.status === "awaiting_payment" ? "ادامه پرداخت" : "پرداخت سفارش"}</button>}
                                {canCancel && <button onClick={() => cancel(order)} disabled={busyId === order.id} className="inline-flex items-center gap-2 rounded-xl border border-red-200 text-red-700 px-4 py-2.5 font-bold disabled:opacity-50"><XCircle size={17} /> لغو سفارش</button>}
                                <button onClick={() => setOpenId(isOpen ? null : order.id)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 font-bold"><Eye size={17} /> {isOpen ? "بستن جزئیات" : "جزئیات و مراحل"}</button>
                            </div>
                            {isOpen && <div className="mt-5 border-t border-[var(--border)] pt-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-6"><div><span className="text-[var(--text-muted)]">وضعیت سرویس‌دهنده</span><strong className="block mt-1">{order.provider_status || "هنوز گزارشی دریافت نشده"}</strong></div><div><span className="text-[var(--text-muted)]">شناسه سرویس‌دهنده</span><strong className="block mt-1" dir="ltr">{order.provider_order_id || "—"}</strong></div></div>
                                <div className="grid grid-cols-4 gap-1">{timeline.map((step, i) => <div key={step.key} className="relative text-center"><div className={`mx-auto h-9 w-9 rounded-full flex items-center justify-center ${i <= index ? "bg-[var(--primary)] text-white" : "bg-[var(--border)] text-[var(--text-muted)]"}`}>{i <= index ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}</div><div className="mt-2 text-xs sm:text-sm font-bold">{step.label}</div></div>)}</div>
                                {order.status === "partial" && <div className="mt-4 rounded-xl bg-amber-50 text-amber-800 p-3 text-sm font-bold">بخشی از سفارش انجام شده و ادامه پردازش توسط سرویس‌دهنده در حال پیگیری است.</div>}
                                {order.admin_note && <div className="mt-4 rounded-xl bg-[var(--background)] p-3 text-sm"><span className="font-bold">یادداشت:</span> {order.admin_note}</div>}
                            </div>}
                            {order.provider_order_id && <div className="mt-4 text-xs text-[var(--text-muted)] flex items-center gap-1">شناسه سفارش سرویس‌دهنده: <span dir="ltr">{order.provider_order_id}</span><ExternalLink size={13} /></div>}
                        </article>;
                    })}</div>
                )}
            </div>
        </main>
    );
}
