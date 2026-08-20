"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Link2, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SocialService } from "@/lib/social/types";

function formatNumber(value: number) {
    return new Intl.NumberFormat("fa-IR").format(value);
}

function calculatePrice(service: SocialService, quantity: number) {
    if (service.provider_rate == null || !Number.isFinite(Number(service.provider_rate))) return null;

    // FJPanel rate is stored in Toman and, for this catalog, represents the
    // provider price for ONE unit. Our selling price is exactly 2x provider price.
    const base = Number(service.provider_rate) * quantity;
    return base * 2;
}

export default function SocialOrderPage() {
    const [serviceId, setServiceId] = useState<string | null>(null);
    const [service, setService] = useState<SocialService | null>(null);
    const [link, setLink] = useState("");
    const [quantity, setQuantity] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<{ trackingCode: string; price: number } | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setServiceId(params.get("service"));
    }, []);

    useEffect(() => {
        async function load() {
            // Keep the loading state until the URL parameter has been read.
            // This prevents the transient "service not found" screen on first render.
            if (!serviceId) return;

            setLoading(true);
            const [{ data, error: serviceError }, { data: userData }] = await Promise.all([
                supabase.from("social_services").select("*").eq("id", serviceId).eq("is_active", true).maybeSingle(),
                supabase.auth.getUser(),
            ]);

            if (serviceError) setError("دریافت اطلاعات سرویس ناموفق بود.");
            setService((data || null) as SocialService | null);
            setUserEmail(userData.user?.email || null);
            setLoading(false);
        }
        load();
    }, [serviceId]);

    const numericQuantity = Number(quantity);
    const validQuantity = !!service && Number.isSafeInteger(numericQuantity) && numericQuantity >= service.min_quantity && numericQuantity <= service.max_quantity;
    const price = useMemo(() => service && validQuantity ? calculatePrice(service, numericQuantity) : null, [service, validQuantity, numericQuantity]);

    async function submitOrder() {
        setError("");
        if (!service || !validQuantity || !link.trim()) return;
        setSubmitting(true);

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) {
                setError("برای ثبت سفارش ابتدا وارد حساب کاربری شوید.");
                return;
            }

            const response = await fetch("/api/social/order", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ serviceId: service.id, link: link.trim(), quantity: numericQuantity }),
            });

            const result = await response.json().catch(() => null);
            if (!response.ok) throw new Error(result?.error || "ثبت سفارش ناموفق بود.");

            const order = result.order;
            const paymentResponse = await fetch("/api/social/payment/request", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ orderId: order.id }),
            });
            const paymentResult = await paymentResponse.json().catch(() => null);
            if (!paymentResponse.ok || !paymentResult?.paymentUrl) {
                throw new Error(paymentResult?.error || "ایجاد پرداخت ناموفق بود.");
            }

            window.location.href = paymentResult.paymentUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : "خطای ناشناخته در ثبت سفارش");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <main dir="rtl" className="min-h-screen page-background p-6 text-center">در حال دریافت سرویس...</main>;

    if (!service) return (
        <main dir="rtl" className="min-h-screen page-background p-6">
            <div className="max-w-xl mx-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
                <h1 className="text-2xl font-black">سرویس پیدا نشد</h1>
                <Link href="/social" className="mt-5 inline-flex items-center gap-2 text-[var(--primary)] font-bold">بازگشت به خدمات <ArrowRight size={18} /></Link>
            </div>
        </main>
    );

    if (success) return (
        <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
                <div className="rounded-[2rem] border border-emerald-200 bg-[var(--surface)] p-8 sm:p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600"><CheckCircle2 size={34} /></div>
                    <h1 className="mt-5 text-2xl sm:text-3xl font-black">پیش‌سفارش با موفقیت ایجاد شد</h1>
                    <p className="mt-3 text-[var(--text-muted)] leading-7">سفارش شما ثبت شده و تا زمان فعال شدن پرداخت، در وضعیت انتظار پرداخت قرار دارد.</p>
                    <div className="mt-7 grid sm:grid-cols-2 gap-3 text-right">
                        <div className="rounded-2xl bg-[var(--background)] p-4"><span className="block text-xs text-[var(--text-muted)]">کد پیگیری</span><strong className="mt-1 block font-black ltr">{success.trackingCode}</strong></div>
                        <div className="rounded-2xl bg-[var(--background)] p-4"><span className="block text-xs text-[var(--text-muted)]">مبلغ سفارش</span><strong className="mt-1 block">{formatNumber(Math.round(success.price))} تومان</strong></div>
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <Link href="/social" className="flex-1 rounded-2xl border border-[var(--border)] px-5 py-3 font-black text-center">بازگشت به خدمات</Link>
                        <Link href="/social/orders" className="flex-1 rounded-2xl bg-[var(--primary)] px-5 py-3 font-black text-white text-center">مشاهده سفارش‌ها</Link>
                    </div>
                </div>
            </div>
        </main>
    );

    return (
        <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/social" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--primary)] mb-5"><ArrowRight size={18} /> بازگشت به خدمات</Link>
                <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
                    <div className="p-6 sm:p-8 border-b border-[var(--border)] bg-gradient-to-l from-[var(--primary)]/10 to-transparent">
                        <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] p-2.5"><ShoppingCart size={22} /></div>
                        <h1 className="mt-4 text-2xl sm:text-3xl font-black">سفارش {service.name}</h1>
                        <p className="mt-2 text-[var(--text-muted)] leading-7">لینک و تعداد را وارد کنید. قیمت نهایی در همین صفحه محاسبه می‌شود.</p>
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
                            <p className="mt-2 text-xs text-[var(--text-muted)]">حداقل {formatNumber(service.min_quantity)} و حداکثر {formatNumber(service.max_quantity)}</p>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                            <div className="flex items-center justify-between gap-4"><span className="text-[var(--text-muted)]">قیمت سفارش</span><strong className="text-xl">{price == null ? "—" : `${formatNumber(Math.round(price))} تومان`}</strong></div>
                            {service.provider_rate != null && <p className="mt-2 text-xs text-[var(--text-muted)]">قیمت پایه: {formatNumber(Math.round(Number(service.provider_rate)))} تومان برای هر واحد · قیمت فروش: ۲ برابر</p>}
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                            {userEmail ? `حساب فعال: ${userEmail}` : "برای ثبت سفارش باید وارد حساب توسن شوید."}
                        </div>

                        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">{error}</div>}

                        <button type="button" onClick={submitOrder} disabled={!link.trim() || !validQuantity || submitting || !userEmail} className="w-full rounded-2xl bg-[var(--primary)] text-white py-3.5 font-black disabled:opacity-40 disabled:cursor-not-allowed">
                            {submitting ? "در حال انتقال به درگاه..." : "ثبت سفارش و پرداخت"}
                        </button>
                        <p className="text-center text-xs text-[var(--text-muted)]">مبلغ سفارش در سایت به تومان محاسبه می‌شود و هنگام ارسال به درگاه زیبال به ریال تبدیل خواهد شد.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
