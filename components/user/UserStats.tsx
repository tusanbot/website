import { TusanStatCard } from "@/components/ui";

type UserStatsProps = {
    totalOrders: number;
    processingOrders: number;
    completedOrders: number;
    unreadMessages: number;
};

export default function UserStats({
    totalOrders,
    processingOrders,
    completedOrders,
    unreadMessages,
}: UserStatsProps) {
    const cards = [
        {
            title: "کل سفارش‌ها",
            value: totalOrders,
            icon: "📋",
        },
        {
            title: "در حال انجام",
            value: processingOrders,
            icon: "⏳",
        },
        {
            title: "تکمیل‌شده",
            value: completedOrders,
            icon: "✅",
        },
        {
            title: "پیام‌های جدید",
            value: unreadMessages,
            icon: "💬",
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <TusanStatCard
                    key={card.title}
                    title={card.title}
                    value={card.value.toLocaleString("fa-IR")}
                    icon={card.icon}
                />
            ))}
        </div>
    );
}