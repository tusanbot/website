"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import OrderStatus from "@/components/orders/OrderStatus";
import { getOrderStatus } from "@/lib/orderStatus";
import TusanIcon from "@/components/ui/TusanIcon";

import {
    GlassPanel,
    TusanCard,
    TusanButton,
    TusanInput,
    SectionHeader,
    TusanTable,
    TusanStatCard,
} from "@/components/ui";

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => { loadOrders(); }, []);

    async function loadOrders() {
        setLoading(true);
        setError("");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setError("برای مشاهده سفارش‌ها باید وارد حساب کاربری شوید."); return; }
            const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            if (profileError) throw new Error("خطا در بررسی دسترسی کاربر.");
            if (profile?.role !== "admin") { setError("شما دسترسی لازم برای مشاهده سفارش‌ها را ندارید."); return; }
            const { data, error: ordersError } = await supabase.from("orders").select(`*, services(title, icon), profiles(full_name, phone)`).order("created_at", { ascending: false });
            if (ordersError) throw new Error(ordersError.message);
            setOrders(data || []);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "خطایی هنگام دریافت سفارش‌ها رخ داد.");
        } finally { setLoading(false); }
    }

    const filteredOrders = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return orders.filter((order) => {
            if (statusFilter !== "all" && order.status !== statusFilter) return false;
            if (!normalizedSearch) return true;
            return [order.tracking_code, order.profiles?.full_name, order.profiles?.phone, order.services?.title]
                .map((v) => String(v || "").toLowerCase()).some((v) => v.includes(normalizedSearch));
        });
    }, [orders, search, statusFilter]);

    const statusOptions = [
        { value: "all", label: "همه سفارش‌ها" }, { value: "registered", label: "ثبت شده" },
        { value: "checking", label: "در حال بررسی" }, { value: "need_documents", label: "نیاز به مدارک" },
        { value: "processing", label: "در حال انجام" }, { value: "ready", label: "آماده تحویل" },
        { value: "completed", label: "تکمیل شده" }, { value: "cancelled", label: "لغو شده" },
    ];

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: orders.length };
        for (const order of orders) counts[order.status] = (counts[order.status] || 0) + 1;
        return counts;
    }, [orders]);

    if (loading) return (
        <div dir="rtl" className="min-h-screen bg-gray-100 flex items-center justify-center">
            <GlassPanel className="p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <TusanIcon name="clipboard" size={28} className="text-[var(--primary)]" />
                </div>
                <p className="mt-4 text-[var(--text-muted)]">در حال دریافت سفارش‌ها...</p>
            </GlassPanel>
        </div>
    );

    return (
        <div dir="rtl" className="min-h-screen page-background text-[var(--text)] p-6 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <SectionHeader title="مدیریت سفارش‌ها" description="مشاهده و مدیریت سفارش‌های ثبت‌شده توسط مشتریان" />
                    <Link href="/admin"><TusanButton variant="outline">← بازگشت به پنل مدیریت</TusanButton></Link>
                </div>
                {error && <GlassPanel className="p-4 mb-5 border-red-500/20 bg-red-500/10 text-red-600">{error}</GlassPanel>}
                {!error && <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <TusanStatCard title="کل سفارش‌ها" value={orders.length.toLocaleString("fa-IR")} icon={<TusanIcon name="📋" size={28} className="text-[var(--primary)]" />} />
                        <TusanStatCard title="در حال بررسی" value={(statusCounts.checking || 0).toLocaleString("fa-IR")} icon="🔎" />
                        <TusanStatCard title="در حال انجام" value={(statusCounts.processing || 0).toLocaleString("fa-IR")} icon="⚙️" />
                        <TusanStatCard title="تکمیل شده" value={(statusCounts.completed || 0).toLocaleString("fa-IR")} icon="✅" />
                    </div>
                    <GlassPanel className="p-5 mb-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold mb-2">جستجو</label><TusanInput icon="🔍" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="کد پیگیری، نام مشتری، شماره تماس یا نام خدمت..." clearable onClear={() => setSearch("")} /></div>
                            <div><label className="block text-sm font-bold mb-2">وضعیت سفارش</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]">{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label} ({(statusCounts[status.value] || 0).toLocaleString("fa-IR")})</option>)}</select></div>
                        </div>
                        {(search || statusFilter !== "all") && <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t"><p className="text-sm text-[var(--text-muted)]">تعداد نتایج: <span className="font-bold text-[var(--text)]">{filteredOrders.length.toLocaleString("fa-IR")}</span></p><button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="text-sm text-[var(--primary)] font-bold">پاک کردن فیلترها</button></div>}
                    </GlassPanel>
                    {orders.length === 0 && <GlassPanel className="p-10 text-center"><div className="text-5xl mb-4">📭</div><h2 className="text-lg font-bold">هنوز سفارشی ثبت نشده است</h2><p className="text-[var(--text-muted)] mt-2">سفارش‌های جدید مشتریان در این بخش نمایش داده می‌شوند.</p></GlassPanel>}
                    {orders.length > 0 && filteredOrders.length === 0 && <GlassPanel className="p-10 text-center"><div className="text-5xl mb-4">🔎</div><h2 className="text-lg font-bold">سفارشی با این مشخصات پیدا نشد</h2><p className="text-[var(--text-muted)] mt-2">عبارت جستجو یا فیلتر وضعیت را تغییر دهید.</p><div className="mt-5 flex justify-center"><TusanButton onClick={() => { setSearch(""); setStatusFilter("all"); }}>نمایش همه سفارش‌ها</TusanButton></div></GlassPanel>}
                    {filteredOrders.length > 0 && <TusanTable columns={[{ key: "tracking", title: "کد پیگیری" }, { key: "customer", title: "مشتری" }, { key: "service", title: "خدمت" }, { key: "status", title: "وضعیت" }, { key: "price", title: "مبلغ", align: "left" }, { key: "created", title: "تاریخ ثبت" }, { key: "actions", title: "عملیات", align: "left" }]} rows={filteredOrders.map((order) => ({
                        tracking: order.tracking_code || "---",
                        customer: <div className="flex flex-col"><span className="font-bold text-[var(--text)]">{order.profiles?.full_name || "---"}</span><span className="text-xs text-[var(--text-muted)]">{order.profiles?.phone || "---"}</span></div>,
                        service: <div className="flex items-center gap-2"><span className="text-xl">{order.services?.icon || "📋"}</span><span className="font-medium">{order.services?.title || "خدمت نامشخص"}</span></div>,
                        status: <OrderStatus status={order.status} />,
                        price: <span className="font-bold text-[var(--primary)]">{Number(order.price || 0).toLocaleString("fa-IR")} تومان</span>,
                        created: new Date(order.created_at).toLocaleDateString("fa-IR"),
                        actions: <Link href={`/admin/orders/${order.id}`}><TusanButton size="sm" variant="outline">مدیریت</TusanButton></Link>,
                    }))} />}
                </>}
            </div>
        </div>
    );
}
