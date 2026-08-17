"use client";

import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";

export type OrderStatusStats = {
    registered: number;
    checking: number;
    need_documents: number;
    processing: number;
    ready: number;
    completed: number;
    cancelled: number;
};

type Props = {
    stats: OrderStatusStats;
    totalOrders: number;
};

const STATUS_LABELS: Record<
    keyof OrderStatusStats,
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

const STATUS_CLASSES: Record<
    keyof OrderStatusStats,
    string
> = {
    registered: "bg-blue-100 text-blue-700",
    checking: "bg-yellow-100 text-yellow-700",
    need_documents: "bg-orange-100 text-orange-700",
    processing: "bg-purple-100 text-purple-700",
    ready: "bg-cyan-100 text-cyan-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const CHART_COLORS = [
    "#3B82F6",
    "#EAB308",
    "#F97316",
    "#A855F7",
    "#06B6D4",
    "#22C55E",
    "#EF4444",
];

export default function AdminOrderStatus({
    stats,
    totalOrders,
}: Props) {
    const chartData = (
        Object.keys(stats) as Array<
            keyof OrderStatusStats
        >
    )
        .map((status) => ({
            name: STATUS_LABELS[status],
            value: stats[status],
            status,
        }))
        .filter((item) => item.value > 0);

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                        وضعیت سفارش‌ها
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        تفکیک سفارش‌ها بر اساس وضعیت فعلی
                    </p>
                </div>

                {chartData.length === 0 ? (
                    <div className="h-[320px] flex items-center justify-center text-gray-500">
                        هنوز سفارشی ثبت نشده است.
                    </div>
                ) : (
                    <div className="h-[320px]">
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    innerRadius={55}
                                    paddingAngle={3}
                                >
                                    {chartData.map(
                                        (entry, index) => (
                                            <Cell
                                                key={`cell-${entry.status}`}
                                                fill={
                                                    CHART_COLORS[
                                                    index %
                                                    CHART_COLORS.length
                                                    ]
                                                }
                                            />
                                        )
                                    )}
                                </Pie>

                                <Tooltip
                                    formatter={(value) =>
                                        Number(
                                            value
                                        ).toLocaleString(
                                            "fa-IR"
                                        )
                                    }
                                />

                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
                <div className="mb-5">
                    <h2 className="text-xl font-bold text-gray-800">
                        جزئیات وضعیت سفارش‌ها
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        تعداد سفارش‌ها در هر مرحله
                    </p>
                </div>

                <div className="space-y-3">
                    {(
                        Object.keys(stats) as Array<
                            keyof OrderStatusStats
                        >
                    ).map((status) => {
                        const count = stats[status];

                        const percentage =
                            totalOrders > 0
                                ? Math.round(
                                    (count /
                                        totalOrders) *
                                    100
                                )
                                : 0;

                        return (
                            <div
                                key={status}
                                className="border rounded-xl p-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CLASSES[status]}`}
                                    >
                                        {STATUS_LABELS[status]}
                                    </span>

                                    <strong className="text-gray-800">
                                        {count.toLocaleString(
                                            "fa-IR"
                                        )}
                                    </strong>
                                </div>

                                <div className="mt-3">
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#09967C] rounded-full transition-all"
                                            style={{
                                                width: `${percentage}%`,
                                            }}
                                        />
                                    </div>

                                    <div className="text-xs text-gray-400 mt-1 text-left">
                                        {percentage.toLocaleString(
                                            "fa-IR"
                                        )}
                                        ٪
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}