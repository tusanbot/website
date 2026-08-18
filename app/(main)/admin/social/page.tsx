"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Package, RefreshCw, Settings2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SocialOrder, SocialPlatform, SocialService } from "@/lib/social/types";

export default function SocialAdminPage() {
    const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
    const [services, setServices] = useState<SocialService[]>([]);
    const [orders, setOrders] = useState<SocialOrder[]>([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        const [{ data: platformData }, { data: serviceData }, { data: orderData }] = await Promise.all([
            supabase.from("social_platforms").select("*").order("sort_order"),
            supabase.from("social_services").select("*").order("sort_order"),
            supabase.from("social_orders").select("*").order("created_at", { ascending: false }).limit(50),
        ]);
        setPlatforms((platformData || []) as SocialPlatform[]);
        setServices((serviceData || []) as SocialService[]);
        setOrders((orderData || []) as SocialOrder[]);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    const activeServices = useMemo(() => services.filter((service) => service.is_active).length, [services]);
    const activeOrders = useMemo(() => orders.filter((order) => ["pending", "awaiting_payment", "paid", "processing", "partial"].includes(order.status)).length, [orders]);

    return (
        <main dir="rtl" className="min-h-screen page-background text-[var(--text)] p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] mb-2"><ArrowRight size={16} /> پنل مدیریت</Link><h1 className="text-3xl font-black">مدیریت خدمات شبکه‌های اجتماعی</h1><p className="mt-2 text-[var(--text-muted)]">کاتالوگ، سرویس‌ها و سفارش‌های این ماژول مستقل را مدیریت کنید.</p></div>
                    <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-bold hover:border-[var(--primary)]"><RefreshCw size={17} /> بروزرسانی</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Stat icon={<Settings2 size={20} />} title="پلتفرم‌ها" value={platforms.length} />
                    <Stat icon={<CheckCircle2 size={20} />} title="سرویس‌های فعال" value={activeServices} />
                    <Stat icon={<Package size={20} />} title="سفارش‌های فعال" value={activeOrders} />
                </div>
                <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)]"><h2 className="font-black text-xl">کاتالوگ سرویس‌ها</h2><p className="text-sm text-[var(--text-muted)] mt-1">در این مرحله سرویس‌های نمونه نمایش داده می‌شوند؛ اتصال Sync با FJPanel در فاز بعد اضافه خواهد شد.</p></div>
                    {loading ? <div className="p-10 text-center text-[var(--text-muted)]">در حال دریافت...</div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px]"><thead><tr className="bg-[var(--background)] text-sm"><th className="p-4 text-right">نام</th><th className="p-4 text-right">Provider</th><th className="p-4 text-right">شناسه Provider</th><th className="p-4 text-right">محدوده</th><th className="p-4 text-right">وضعیت</th></tr></thead><tbody>{services.map((service) => <tr key={service.id} className="border-t border-[var(--border)]"><td className="p-4 font-bold">{service.name}</td><td className="p-4">{service.provider}</td><td className="p-4" dir="ltr">{service.provider_service_id || "هنوز Sync نشده"}</td><td className="p-4">{service.min_quantity.toLocaleString("fa-IR")} تا {service.max_quantity.toLocaleString("fa-IR")}</td><td className="p-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${service.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{service.is_active ? "فعال" : "غیرفعال"}</span></td></tr>)}</tbody></table></div>}
                </section>
                <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)]"><h2 className="font-black text-xl">آخرین سفارش‌های اجتماعی</h2></div>
                    {orders.length === 0 ? <div className="p-10 text-center text-[var(--text-muted)]">هنوز سفارشی ثبت نشده است.</div> : <div className="divide-y divide-[var(--border)]">{orders.map((order) => <div key={order.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><strong>{order.tracking_code}</strong><div className="text-sm text-[var(--text-muted)] mt-1" dir="ltr">{order.link}</div></div><div className="text-sm">{order.quantity.toLocaleString("fa-IR")} عدد · {order.price.toLocaleString("fa-IR")} تومان · <b>{order.status}</b></div></div>)}</div>}
                </section>
            </div>
        </main>
    );
}

function Stat({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center gap-2 text-[var(--primary)]">{icon}<span className="text-sm font-bold text-[var(--text-muted)]">{title}</span></div><div className="mt-3 text-3xl font-black">{value.toLocaleString("fa-IR")}</div></div>;
}
