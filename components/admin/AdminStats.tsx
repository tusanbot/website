"use client";
import { TusanStatCard } from "@/components/ui";

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

type Props = {
    stats: Stats;
    loading: boolean;
};

export default function AdminStats({
    stats,
    loading,
}: Props) {
    const cards = [
        {
            title: "کل سفارش‌ها",
            value: stats.totalOrders.toLocaleString("fa-IR"),
            icon: "📋",
        },
        {
            title: "سفارش‌های امروز",
            value: stats.todayOrders.toLocaleString("fa-IR"),
            icon: "🆕",
        },
        {
            title: "در حال انجام",
            value: stats.processingOrders.toLocaleString("fa-IR"),
            icon: "⏳",
        },
        {
            title: "درآمد کل",
            value: `${Number(
                stats.totalRevenue
            ).toLocaleString("fa-IR")} تومان`,
            icon: "💰",
        },
        {
            title: "کاربران ثبت‌نام‌شده",
            value: stats.usersCount.toLocaleString("fa-IR"),
            icon: "👥",
        },
        {
            title: "پیام‌های خوانده‌نشده",
            value: stats.unreadMessages.toLocaleString("fa-IR"),
            icon: "💬",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card) => (
                <TusanStatCard
                    key={card.title}
                    title={card.title}
                    value={loading ? "..." : card.value}
                    icon={card.icon}
                />
            ))}
        </div>
    );
}