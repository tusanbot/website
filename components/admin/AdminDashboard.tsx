"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAdminUnreadMessagesCount } from "@/lib/notifications";
import AdminNavigation, { type AdminTab } from "@/components/admin/AdminNavigation";
import AdminStats from "@/components/admin/AdminStats";
import AdminOrderTrend from "@/components/admin/AdminOrderTrend";
import AdminRevenueStats from "@/components/admin/AdminRevenueStats";
import AdminOrderStatus, { type OrderStatusStats } from "@/components/admin/AdminOrderStatus";
import AdminTopServices, { type ServiceStat } from "@/components/admin/AdminTopServices";
import AdminRecentOrders, { type RecentOrder } from "@/components/admin/AdminRecentOrders";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminMessages from "@/components/admin/AdminMessages";
import AdminReports from "@/components/admin/AdminReports";
import AdminSettings from "@/components/admin/AdminSettings";
import { GlassPanel, TusanButton, SectionHeader } from "@/components/ui";

type Stats = {
    totalOrders: number;
    todayOrders: number;
    processingOrders: number;
    totalRevenue: number;
    completedRevenue: number;
    averageOrderValue: number;
    usersCount: number;
    unreadMessages: number;
    completedOrders: number;
};

type TrendItem = { date: string; orders: number };

const DEFAULT_STATS: Stats = {
    totalOrders: 0,
    todayOrders: 0,
    processingOrders: 0,
    totalRevenue: 0,
    completedRevenue: 0,
    averageOrderValue: 0,
    usersCount: 0,
    unreadMessages: 0,
    completedOrders: 0,
};

const DEFAULT_ORDER_STATUSES: OrderStatusStats = {
    registered: 0,
    checking: 0,
    need_documents: 0,
    processing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
};

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
    const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
    const [orderStatuses, setOrderStatuses] = useState<OrderStatusStats>(DEFAULT_ORDER_STATUSES);
    const [trendDays, setTrendDays] = useState(7);
    const [trendData, setTrendData] = useState<TrendItem[]>([]);
    const [serviceStats, setServiceStats] = useState<ServiceStat[]>([]);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadDashboard(); }, []);
    useEffect(() => { loadTrend(trendDays); }, [trendDays]);

    async function loadDashboard() {
        setLoading(true);
        try {
            const todayString = new Date().toISOString().split("T")[0];
            const [totalOrdersRes, todayOrdersRes, processingOrdersRes, revenueRes, usersRes, unreadMessages, ordersStatusRes, completedRevenueRes, recentOrdersRes] = await Promise.all([
                supabase.from("orders").select("id", { count: "exact", head: true }),
                supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", `${todayString}T00:00:00`).lte("created_at", `${todayString}T23:59:59`),
                supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["checking", "processing", "need_documents"]),
                supabase.from("orders").select("price"),
                supabase.from("profiles").select("id", { count: "exact", head: true }),
                getAdminUnreadMessagesCount(),
                supabase.from("orders").select("status"),
                supabase.from("orders").select("price").eq("status", "completed"),
                supabase.from("orders").select(`id, tracking_code, status, price, created_at, services(title, icon), profiles(full_name)`).order("created_at", { ascending: false }).limit(8),
            ]);

            const allRevenue = revenueRes.data?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
            const completedRevenue = completedRevenueRes.data?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
            const completedOrders = completedRevenueRes.data?.length || 0;
            const statusCounts: OrderStatusStats = { ...DEFAULT_ORDER_STATUSES };
            ordersStatusRes.data?.forEach((order) => {
                const status = order.status as keyof OrderStatusStats;
                if (status in statusCounts) statusCounts[status]++;
            });

            const formattedRecentOrders: RecentOrder[] = (recentOrdersRes.data || []).map((order: any) => ({
                id: order.id,
                tracking_code: order.tracking_code,
                status: order.status,
                price: order.price,
                created_at: order.created_at,
                serviceTitle: order.services?.title || "خدمت نامشخص",
                serviceIcon: order.services?.icon || "📋",
                customerName: order.profiles?.full_name || "---",
            }));

            setStats({
                totalOrders: totalOrdersRes.count || 0,
                todayOrders: todayOrdersRes.count || 0,
                processingOrders: processingOrdersRes.count || 0,
                totalRevenue: allRevenue,
                completedRevenue,
                averageOrderValue: completedOrders > 0 ? completedRevenue / completedOrders : 0,
                usersCount: usersRes.count || 0,
                unreadMessages,
                completedOrders,
            });
            setOrderStatuses(statusCounts);
            setRecentOrders(formattedRecentOrders);
            await loadServiceStats();
            await loadTrend(trendDays);
        } catch (error) {
            console.error("خطا در دریافت اطلاعات داشبورد:", error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTrend(days: number) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days + 1);
        start.setHours(0, 0, 0, 0);
        const { data, error } = await supabase.from("orders").select("created_at").gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
        if (error) { console.error("خطا در دریافت روند سفارش‌ها:", error); return; }
        const result: TrendItem[] = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            const key = date.toISOString().split("T")[0];
            result.push({ date: date.toLocaleDateString("fa-IR", { month: "numeric", day: "numeric" }), orders: data?.filter((order) => order.created_at.startsWith(key)).length || 0 });
        }
        setTrendData(result);
    }

    async function loadServiceStats() {
        const { data, error } = await supabase.from("orders").select(`id, price, services(id, title, icon)`);
        if (error) { console.error("خطا در دریافت آمار خدمات:", error); return; }
        const map = new Map<string, ServiceStat>();
        data?.forEach((order: any) => {
            const service = order.services;
            if (!service?.id) return;
            const existing = map.get(service.id);
            if (existing) {
                existing.orders += 1;
                existing.revenue += Number(order.price || 0);
            } else {
                map.set(service.id, { id: service.id, title: service.title, icon: service.icon || "📋", orders: 1, revenue: Number(order.price || 0) });
            }
        });
        setServiceStats(Array.from(map.values()).sort((a, b) => b.orders - a.orders).slice(0, 5));
    }

    function renderDashboard() {
        return (
            <div className="space-y-6">
                <AdminStats stats={stats} loading={loading} />
                <AdminOrderTrend data={trendData} days={trendDays} onDaysChange={setTrendDays} />
                <AdminRevenueStats stats={stats} />
                <AdminOrderStatus stats={orderStatuses} totalOrders={stats.totalOrders} />
                <AdminTopServices services={serviceStats} />
                <AdminRecentOrders orders={recentOrders} />

                <GlassPanel className="p-6 border-[var(--primary)]/20">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black">📱 مدیریت شبکه‌های اجتماعی</h2>
                            <p className="text-[var(--text-muted)] mt-1">مدیریت کاتالوگ خدمات اجتماعی، همگام‌سازی FJPanel و سفارش‌های این بخش.</p>
                        </div>
                        <Link href="/admin/social" className="shrink-0">
                            <TusanButton>ورود به مدیریت شبکه‌های اجتماعی</TusanButton>
                        </Link>
                    </div>
                </GlassPanel>
            </div>
        );
    }

    function renderTabContent() {
        if (activeTab === "dashboard") return renderDashboard();
        if (activeTab === "orders") return <GlassPanel className="p-8"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h2 className="text-xl font-bold">مدیریت سفارش‌ها</h2><p className="text-[var(--text-muted)] mt-1">مشاهده، جستجو، فیلتر و مدیریت سفارش‌های مشتریان</p></div><Link href="/admin/orders"><TusanButton>ورود به مدیریت سفارش‌ها</TusanButton></Link></div></GlassPanel>;
        if (activeTab === "services") return <GlassPanel className="p-8"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h2 className="text-xl font-bold">مدیریت خدمات</h2><p className="text-[var(--text-muted)] mt-1">مدیریت خدمات و فرم‌های قابل ارائه</p></div><Link href="/admin/services"><TusanButton>ورود به مدیریت خدمات</TusanButton></Link></div></GlassPanel>;
        if (activeTab === "users") return <AdminUsers />;
        if (activeTab === "messages") return <AdminMessages />;
        if (activeTab === "reports") return <AdminReports />;
        if (activeTab === "settings") return <AdminSettings />;
        return null;
    }

    function getPageTitle() {
        switch (activeTab) {
            case "dashboard": return "داشبورد مدیریت";
            case "orders": return "مدیریت سفارش‌ها";
            case "services": return "مدیریت خدمات";
            case "social": return "مدیریت شبکه‌های اجتماعی";
            case "users": return "مدیریت کاربران";
            case "messages": return "پیام‌ها";
            case "reports": return "گزارش‌ها";
            case "settings": return "تنظیمات";
            default: return "داشبورد مدیریت";
        }
    }

    function getPageDescription() {
        switch (activeTab) {
            case "dashboard": return "نمای کلی عملکرد کافی‌نت";
            case "orders": return "مشاهده و مدیریت سفارش‌های مشتریان";
            case "services": return "مدیریت خدمات و فرم‌های قابل ارائه";
            case "social": return "مدیریت کاتالوگ و سفارش‌های خدمات شبکه‌های اجتماعی";
            case "users": return "مدیریت کاربران ثبت‌نام‌شده";
            case "messages": return "مدیریت پیام‌های مشتریان";
            case "reports": return "گزارش‌های مالی و عملکردی";
            case "settings": return "تنظیمات پنل مدیریت";
            default: return "";
        }
    }

    return (
        <div dir="rtl" className="min-h-screen page-background text-[var(--text)] transition-colors duration-300">
            <AdminNavigation activeTab={activeTab} unreadMessages={stats.unreadMessages} onTabChange={setActiveTab} />
            <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-6">
                <div className="mb-5"><SectionHeader title={getPageTitle()} description={getPageDescription()} /></div>
                {renderTabContent()}
            </main>
        </div>
    );
}
