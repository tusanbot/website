"use client";

import { TusanStatCard } from "@/components/ui";

type Stats = {
    totalRevenue: number;
    completedRevenue: number;
    averageOrderValue: number;
    completedOrders: number;
};

type Props = {
    stats: Stats;
};

function formatPrice(value: number) {
    return `${Number(value || 0).toLocaleString("fa-IR")} تومان`;
}

export default function AdminRevenueStats({
    stats,
}: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TusanStatCard
                title="درآمد کل"
                value={formatPrice(stats.totalRevenue)}
                icon="💰"
            />

            <TusanStatCard
                title="درآمد سفارش‌های تکمیل‌شده"
                value={`${formatPrice(stats.completedRevenue)}\n${stats.completedOrders.toLocaleString("fa-IR")} سفارش تکمیل‌شده`}
                icon="✅"
            />

            <TusanStatCard
                title="میانگین مبلغ سفارش تکمیل‌شده"
                value={formatPrice(stats.averageOrderValue)}
                icon="📊"
            />
        </div>
    );
}