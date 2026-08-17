"use client";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

import { GlassPanel, SectionHeader } from "@/components/ui";

type TrendItem = {
    date: string;
    orders: number;
};

type Props = {
    data: TrendItem[];
    days: number;
    onDaysChange: (days: number) => void;
};

export default function AdminOrderTrend({
    data,
    days,
    onDaysChange,
}: Props) {
    return (
        <GlassPanel className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <SectionHeader
                    title="روند سفارش‌ها"
                    description="تعداد سفارش‌های ثبت‌شده در بازه انتخابی"
                />

                <div className="flex bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1">
                    {[7, 30, 90].map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => onDaysChange(item)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${days === item
                                    ? "bg-[var(--primary)] text-white shadow"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                                }`}
                        >
                            {item === 7 ? "۷ روز" : item === 30 ? "۳۰ روز" : "۹۰ روز"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[320px]">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                        اطلاعاتی برای نمایش وجود ندارد.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />

                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={{ stroke: "var(--border)" }}
                            />

                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={{ stroke: "var(--border)" }}
                            />

                            <Tooltip
                                formatter={(value) => Number(value).toLocaleString("fa-IR")}
                            />

                            <Line
                                type="monotone"
                                dataKey="orders"
                                name="تعداد سفارش"
                                stroke="var(--primary)"
                                strokeWidth={3}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </GlassPanel>
    );
}