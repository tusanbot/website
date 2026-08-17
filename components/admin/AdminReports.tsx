"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    GlassPanel,
    TusanButton,
    SectionHeader,
    TusanStatCard,
} from "@/components/ui";

type Period = 7 | 30 | 90 | 365;

type Order = {
    id: string;
    status: string;
    price: number | null;
    created_at: string;
    service_id: string | null;
    services?: {
        title?: string | null;
        icon?: string | null;
    } | null;
};

const STATUS_LABELS: Record<
    string,
    string
> = {
    registered: "ثبت‌شده",
    checking: "در حال بررسی",
    need_documents: "نیازمند مدارک",
    processing: "در حال انجام",
    ready: "آماده",
    completed: "تکمیل‌شده",
    cancelled: "لغوشده",
};

function formatPrice(
    value: number
) {
    return `${Number(
        value || 0
    ).toLocaleString(
        "fa-IR"
    )} تومان`;
}

export default function AdminReports() {
    const [period, setPeriod] =
        useState<Period>(30);

    const [orders, setOrders] =
        useState<Order[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        loadReports();
    }, [period]);

    async function loadReports() {
        setLoading(true);
        setError("");

        const end =
            new Date();

        const start =
            new Date();

        start.setDate(
            start.getDate() -
            period
        );

        start.setHours(
            0,
            0,
            0,
            0
        );

        const {
            data,
            error,
        } = await supabase
            .from("orders")
            .select(`
                id,
                status,
                price,
                created_at,
                service_id,
                services(
                    title,
                    icon
                )
            `)
            .gte(
                "created_at",
                start.toISOString()
            )
            .lte(
                "created_at",
                end.toISOString()
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                }
            );

        if (error) {
            console.error(
                error
            );

            setError(
                "خطا در دریافت گزارش‌ها."
            );

            setOrders([]);
        } else {
            setOrders(
                (data ||
                    []) as Order[]
            );
        }

        setLoading(false);
    }

    const report = useMemo(() => {
        const totalOrders =
            orders.length;

        const completedOrders =
            orders.filter(
                (order) =>
                    order.status ===
                    "completed"
            ).length;

        const cancelledOrders =
            orders.filter(
                (order) =>
                    order.status ===
                    "cancelled"
            ).length;

        const activeOrders =
            orders.filter(
                (order) =>
                    ![
                        "completed",
                        "cancelled",
                    ].includes(
                        order.status
                    )
            ).length;

        const totalRevenue =
            orders.reduce(
                (
                    sum,
                    order
                ) =>
                    sum +
                    Number(
                        order.price ||
                        0
                    ),
                0
            );

        const completedRevenue =
            orders
                .filter(
                    (order) =>
                        order.status ===
                        "completed"
                )
                .reduce(
                    (
                        sum,
                        order
                    ) =>
                        sum +
                        Number(
                            order.price ||
                            0
                        ),
                    0
                );

        const averageOrderValue =
            completedOrders >
                0
                ? completedRevenue /
                completedOrders
                : 0;

        const statusCounts: Record<
            string,
            number
        > = {};

        orders.forEach(
            (order) => {
                statusCounts[
                    order.status
                ] =
                    (statusCounts[
                        order.status
                    ] || 0) + 1;
            }
        );

        const servicesMap =
            new Map<
                string,
                {
                    title: string;
                    icon: string;
                    orders: number;
                    revenue: number;
                }
            >();

        orders.forEach(
            (order) => {
                const id =
                    order.service_id ||
                    "unknown";

                const existing =
                    servicesMap.get(
                        id
                    );

                if (
                    existing
                ) {
                    existing.orders++;
                    existing.revenue +=
                        Number(
                            order.price ||
                            0
                        );
                } else {
                    servicesMap.set(
                        id,
                        {
                            title:
                                order
                                    .services
                                    ?.title ||
                                "خدمت نامشخص",

                            icon:
                                order
                                    .services
                                    ?.icon ||
                                "📋",

                            orders: 1,

                            revenue:
                                Number(
                                    order.price ||
                                    0
                                ),
                        }
                    );
                }
            }
        );

        const topServices =
            Array.from(
                servicesMap.values()
            )
                .sort(
                    (a, b) =>
                        b.orders -
                        a.orders
                )
                .slice(
                    0,
                    5
                );

        return {
            totalOrders,
            completedOrders,
            cancelledOrders,
            activeOrders,
            totalRevenue,
            completedRevenue,
            averageOrderValue,
            statusCounts,
            topServices,
        };
    }, [orders]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <GlassPanel className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <SectionHeader
                        title="گزارش‌ها"
                        description="تحلیل سفارش‌ها و درآمد در بازه زمانی انتخاب‌شده"
                    />

                    <div className="flex flex-wrap gap-2">
                        {[7, 30, 90, 365].map((item) => (
                            <TusanButton
                                key={item}
                                type="button"
                                variant={period === item ? "primary" : "secondary"}
                                size="sm"
                                onClick={() => setPeriod(item as Period)}
                            >
                                {item === 7
                                    ? "۷ روز"
                                    : item === 30
                                        ? "۳۰ روز"
                                        : item === 90
                                            ? "۹۰ روز"
                                            : "یک سال"}
                            </TusanButton>
                        ))}
                    </div>
                </div>
            </GlassPanel>

            {loading ? (
                <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
                    در حال محاسبه گزارش‌ها...
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">
                    {error}
                </div>
            ) : (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <TusanStatCard
                            title="کل سفارش‌ها"
                            value={report.totalOrders.toLocaleString("fa-IR")}
                            icon="📋"
                        />

                        <TusanStatCard
                            title="تکمیل‌شده"
                            value={report.completedOrders.toLocaleString("fa-IR")}
                            icon="✅"
                        />

                        <TusanStatCard
                            title="در حال انجام"
                            value={report.activeOrders.toLocaleString("fa-IR")}
                            icon="⏳"
                        />

                        <TusanStatCard
                            title="لغوشده"
                            value={report.cancelledOrders.toLocaleString("fa-IR")}
                            icon="❌"
                        />
                    </div>

                    {/* Revenue */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <TusanStatCard
                            title="درآمد کل"
                            value={formatPrice(report.totalRevenue)}
                            icon="💰"
                        />

                        <TusanStatCard
                            title="درآمد سفارش‌های تکمیل‌شده"
                            value={formatPrice(report.completedRevenue)}
                            icon="💵"
                        />

                        <TusanStatCard
                            title="میانگین سفارش تکمیل‌شده"
                            value={formatPrice(report.averageOrderValue)}
                            icon="📈"
                        />
                    </div>

                    {/* Status */}
                    <GlassPanel className="p-6">
                        <SectionHeader
                            title="وضعیت سفارش‌ها"
                            description="تفکیک سفارش‌ها بر اساس وضعیت فعلی"
                        />

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                            {Object.entries(report.statusCounts).map(([status, count]) => {
                                const percentage =
                                    report.totalOrders > 0
                                        ? Math.round((count / report.totalOrders) * 100)
                                        : 0;

                                return (
                                    <GlassPanel key={status} className="p-4">
                                        <div className="flex justify-between gap-3">
                                            <span className="text-sm text-[var(--text-secondary)]">
                                                {STATUS_LABELS[status] || status}
                                            </span>

                                            <strong>
                                                {count.toLocaleString("fa-IR")}
                                            </strong>
                                        </div>

                                        <div className="h-2 bg-[var(--surface)] rounded-full mt-3 overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--primary)] rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>

                                        <div className="text-xs text-[var(--text-muted)] mt-2">
                                            {percentage.toLocaleString("fa-IR")}٪
                                        </div>
                                    </GlassPanel>
                                );
                            })}
                        </div>
                    </GlassPanel>

                    {/* Top Services */}
                    <GlassPanel className="p-6">
                        <SectionHeader
                            title="پُرسفارش‌ترین خدمات"
                            description="خدمات بر اساس تعداد سفارش در این بازه"
                        />

                        {report.topServices.length === 0 ? (
                            <div className="text-center text-[var(--text-muted)] py-10">
                                اطلاعاتی وجود ندارد.
                            </div>
                        ) : (
                            <div className="space-y-3 mt-5">
                                {report.topServices.map((service, index) => (
                                    <GlassPanel
                                        key={`${service.title}-${index}`}
                                        className="p-4 flex items-center gap-4"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-[var(--surface)] flex items-center justify-center font-bold">
                                            {(index + 1).toLocaleString("fa-IR")}
                                        </div>

                                        <div className="text-2xl">
                                            {service.icon}
                                        </div>

                                        <div className="flex-1">
                                            <div className="font-bold">
                                                {service.title}
                                            </div>

                                            <div className="text-sm text-[var(--text-secondary)]">
                                                {service.orders.toLocaleString("fa-IR")} سفارش
                                            </div>
                                        </div>

                                        <div className="font-bold text-[var(--primary)]">
                                            {formatPrice(service.revenue)}
                                        </div>
                                    </GlassPanel>
                                ))}
                            </div>
                        )}
                    </GlassPanel>
                </>
            )}
        </div>
    );
}

