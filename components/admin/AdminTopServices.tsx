"use client";

import { GlassPanel, TusanCard, SectionHeader } from "@/components/ui";

export type ServiceStat = {
    id: string;
    title: string;
    icon: string;
    orders: number;
    revenue: number;
};

type Props = {
    services: ServiceStat[];
};

function formatPrice(value: number) {
    return `${Number(value || 0).toLocaleString("fa-IR")} تومان`;
}

export default function AdminTopServices({
    services,
}: Props) {
    return (
        <GlassPanel className="p-6">
            <SectionHeader
                title="پُرسفارش‌ترین خدمات"
                description="۵ خدمتی که بیشترین سفارش را داشته‌اند"
            />

            {services.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-muted)]">
                    هنوز اطلاعاتی برای نمایش وجود ندارد.
                </div>
            ) : (
                <div className="space-y-3">
                    {services.map((service, index) => (
                        <TusanCard
                            key={service.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--text-secondary)]">
                                    {(index + 1).toLocaleString("fa-IR")}
                                </div>

                                <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-2xl">
                                    {service.icon}
                                </div>

                                <div>
                                    <div className="font-bold text-[var(--text)]">
                                        {service.title}
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)]">
                                        {service.orders.toLocaleString("fa-IR")} سفارش
                                    </div>
                                </div>
                            </div>

                            <div className="font-bold text-[var(--primary)]">
                                {formatPrice(service.revenue)}
                            </div>
                        </TusanCard>
                    ))}
                </div>
            )}
        </GlassPanel>
    );
}