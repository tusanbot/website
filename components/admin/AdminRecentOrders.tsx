"use client";

import Link from "next/link";
import OrderStatus from "@/components/orders/OrderStatus";
import { GlassPanel, TusanCard, SectionHeader, TusanButton } from "@/components/ui";

export type RecentOrder = {
    id: string;
    tracking_code: string | null;
    status: string;
    price: number | null;
    created_at: string;
    serviceTitle: string;
    serviceIcon: string;
    customerName: string;
};

type Props = {
    orders: RecentOrder[];
};

const ORDER_STATUS_LABELS: Record<string, string> = {
    registered: "ثبت‌شده",
    checking: "در حال بررسی",
    need_documents: "نیازمند مدارک",
    processing: "در حال انجام",
    ready: "آماده",
    completed: "تکمیل‌شده",
    cancelled: "لغوشده",
};

function formatPrice(value: number) {
    return `${Number(value || 0).toLocaleString("fa-IR")} تومان`;
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export default function AdminRecentOrders({
    orders,
}: Props) {
    return (
        <GlassPanel className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <SectionHeader
                    title="آخرین سفارش‌ها"
                    description="جدیدترین سفارش‌های ثبت‌شده"
                />

                <Link href="/admin/orders">
                    <TusanButton variant="outline" size="sm">
                        مشاهده همه سفارش‌ها
                    </TusanButton>
                </Link>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-muted)]">
                    هنوز سفارشی ثبت نشده است.
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <Link
                            key={order.id}
                            href={`/admin/orders/${order.id}`}
                            className="block"
                        >
                            <TusanCard className="p-4 hover:-translate-y-0.5 transition-all duration-300">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-2xl">
                                            {order.serviceIcon}
                                        </div>

                                        <div>
                                            <div className="font-bold text-[var(--text)]">
                                                {order.serviceTitle}
                                            </div>
                                            <div className="text-sm text-[var(--text-muted)] mt-1">
                                                مشتری: {order.customerName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-sm text-[var(--text-muted)]">
                                        {order.tracking_code
                                            ? `کد پیگیری: ${order.tracking_code}`
                                            : "بدون کد پیگیری"}
                                    </div>

                                    <OrderStatus status={order.status} />

                                    <div className="font-bold text-[var(--text)]">
                                        {formatPrice(Number(order.price || 0))}
                                    </div>

                                    <div className="text-sm text-[var(--text-muted)]">
                                        {formatDate(order.created_at)}
                                    </div>
                                </div>
                            </TusanCard>
                        </Link>
                    ))}
                </div>
            )}
        </GlassPanel>
    );
}