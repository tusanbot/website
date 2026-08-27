"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton, TusanCard, SectionHeader } from "@/components/ui";

type PaymentMethod = "online" | "card_to_card";

export default function PaymentPage() {
    const params = useParams(); const router = useRouter(); const orderId = params.id as string;
    const [order, setOrder] = useState<any>(null); const [method, setMethod] = useState<PaymentMethod>("online");
    const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");

    useEffect(() => { if (orderId) loadOrder(); }, [orderId]);

    async function loadOrder() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { data, error: orderError } = await supabase.from("orders")
            .select("id,tracking_code,status,price,created_at,services(title,icon)")
            .eq("id", orderId).eq("user_id", user.id).single();
        if (orderError || !data) { setError("سفارش پیدا نشد."); setLoading(false); return; }
        setOrder(data); setLoading(false);
    }

    async function continuePayment() {
        setSubmitting(true); setError("");
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session?.access_token) { router.push("/login"); return; }
            const user = session.user;

            if (method === "card_to_card") {
                const response = await fetch("/api/payments/card-to-card/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify({ orderId }),
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result?.paymentId) throw new Error(result?.error || "ثبت پرداخت کارت به کارت ناموفق بود.");
                router.push(`/orders/${orderId}`); return;
            }

            const response = await fetch("/api/payments/zibal/create", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ orderId }),
            });
            const result = await response.json();
            if (!response.ok || !result?.paymentUrl) throw new Error(result?.error || "ایجاد پرداخت آنلاین ناموفق بود.");
            window.location.href = result.paymentUrl;
        } catch (err: any) { console.error(err); setError(err?.message || "خطایی هنگام ایجاد پرداخت رخ داد."); }
        finally { setSubmitting(false); }
    }

    if (loading) return <div dir="rtl" className="min-h-screen page-background p-6"><GlassPanel className="max-w-2xl mx-auto p-8 text-center">در حال دریافت صورتحساب...</GlassPanel></div>;
    if (!order) return <div dir="rtl" className="min-h-screen page-background p-6"><GlassPanel className="max-w-2xl mx-auto p-8 text-center"><div className="text-4xl mb-4">⚠️</div><p>{error || "سفارش پیدا نشد."}</p><Link href="/orders"><TusanButton className="mt-5">بازگشت به سفارش‌ها</TusanButton></Link></GlassPanel></div>;

    const amount = Number(order.price || 0);
    const cardNumber = "شماره کارت را در تنظیمات پرداخت وارد کنید"; const accountOwner = "نام صاحب حساب را در تنظیمات پرداخت وارد کنید";
    return <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]"><div className="max-w-2xl mx-auto space-y-5">
        <SectionHeader title="تکمیل سفارش و پرداخت" description="روش پرداخت صورتحساب خود را انتخاب کنید." />
        <GlassPanel className="p-6"><div className="flex items-center justify-between gap-4"><div><div className="font-bold text-lg">{order.services?.icon || "📋"} {order.services?.title || "سفارش"}</div><div className="text-sm text-[var(--text-muted)] mt-1">کد پیگیری: {order.tracking_code}</div></div><div className="text-left"><div className="text-sm text-gray-500">مبلغ صورتحساب</div><div className="font-bold text-xl">{amount.toLocaleString("fa-IR")} تومان</div></div></div></GlassPanel>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>}
        <div className="grid gap-4">
            <button type="button" onClick={() => setMethod("online")} className={`text-right rounded-2xl border-2 p-5 transition ${method === "online" ? "border-[#09967C] bg-[#09967C]/5" : "border-gray-200 bg-white"}`}><div className="font-bold text-lg">💳 پرداخت آنلاین</div><div className="text-sm text-gray-500 mt-2">پرداخت امن از طریق درگاه زیبال</div></button>
            <button type="button" onClick={() => setMethod("card_to_card")} className={`text-right rounded-2xl border-2 p-5 transition ${method === "card_to_card" ? "border-[#09967C] bg-[#09967C]/5" : "border-gray-200 bg-white"}`}><div className="font-bold text-lg">🏦 کارت به کارت</div><div className="text-sm text-gray-500 mt-2">واریز مبلغ و ارسال رسید برای بررسی مدیریت</div></button>
        </div>
        {method === "card_to_card" && <TusanCard className="p-6 border border-amber-200 bg-amber-50"><h2 className="font-bold text-lg mb-4">اطلاعات واریز</h2><div className="space-y-3"><div><div className="text-sm text-gray-500">شماره کارت</div><div className="font-bold mt-1">{cardNumber}</div></div><div><div className="text-sm text-gray-500">به نام</div><div className="font-bold mt-1">{accountOwner}</div></div><div><div className="text-sm text-gray-500">مبلغ صورتحساب</div><div className="font-bold mt-1">{amount.toLocaleString("fa-IR")} تومان</div></div></div><div className="mt-5 rounded-xl bg-white border border-amber-200 p-4 leading-7 text-sm">برای نهایی شدن سفارش، مبلغ صورتحساب را حداکثر تا <strong>۲۴ ساعت آینده</strong> واریز کنید. پس از واریز، رسید پرداخت را از بخش «سفارش‌های من» برای همین سفارش آپلود نمایید. پس از بررسی رسید توسط مدیریت، پرداخت تأیید و سفارش وارد مرحله انجام خواهد شد.</div></TusanCard>}
        <div className="flex gap-3"><TusanButton type="button" onClick={continuePayment} disabled={submitting} fullWidth>{submitting ? "در حال پردازش..." : method === "online" ? "پرداخت آنلاین" : "ثبت انتخاب کارت به کارت"}</TusanButton><Link href="/orders"><TusanButton type="button" variant="secondary">بعداً</TusanButton></Link></div>
    </div></div>;
}