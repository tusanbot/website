"use client";

import Link from "next/link";

export type AdminTab =
    | "dashboard"
    | "orders"
    | "services"
    | "users"
    | "messages"
    | "reports"
    | "settings";

type Props = {
    activeTab: AdminTab;
    unreadMessages: number;
    onTabChange: (tab: AdminTab) => void;
};

const menuItems: {
    id: AdminTab;
    label: string;
    icon: string;
    href?: string;
}[] = [
        {
            id: "dashboard",
            label: "داشبورد",
            icon: "📊",
        },
        {
            id: "orders",
            label: "سفارش‌ها",
            icon: "📋",
            href: "/admin/orders",
        },
        {
            id: "services",
            label: "خدمات",
            icon: "⚙️",
        },
        {
            id: "users",
            label: "کاربران",
            icon: "👥",
        },
        {
            id: "messages",
            label: "پیام‌ها",
            icon: "💬",
        },
        {
            id: "reports",
            label: "گزارش‌ها",
            icon: "📈",
        },
        {
            id: "settings",
            label: "تنظیمات",
            icon: "🔧",
        },
    ];

export default function AdminNavigation({
    activeTab,
    unreadMessages,
    onTabChange,
}: Props) {
    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-3 sm:px-6">
                <div className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-[#09967C] text-white flex items-center justify-center text-xl">
                            🖥️
                        </div>

                        <div className="hidden sm:block">
                            <div className="font-bold text-gray-800">
                                پنل مدیریت توسن
                            </div>

                            <div className="text-xs text-gray-400">
                                مدیریت کافی‌نت
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto scrollbar-hide">
                        <nav className="flex items-center justify-end gap-1 min-w-max">
                            {menuItems.map((item) => {
                                const isActive =
                                    activeTab === item.id;

                                if (item.href) {
                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            className={`relative flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${isActive
                                                    ? "bg-[#09967C] text-white shadow"
                                                    : "text-gray-600 hover:bg-gray-100"
                                                }`}
                                        >
                                            <span>
                                                {item.icon}
                                            </span>

                                            <span>
                                                {item.label}
                                            </span>

                                            {item.id ===
                                                "orders" &&
                                                unreadMessages >
                                                0 && (
                                                    <span className="min-w-5 h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center font-bold bg-red-500 text-white">
                                                        {unreadMessages.toLocaleString(
                                                            "fa-IR"
                                                        )}
                                                    </span>
                                                )}
                                        </Link>
                                    );
                                }

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() =>
                                            onTabChange(
                                                item.id
                                            )
                                        }
                                        className={`relative flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${isActive
                                                ? "bg-[#09967C] text-white shadow"
                                                : "text-gray-600 hover:bg-gray-100"
                                            }`}
                                    >
                                        <span>
                                            {item.icon}
                                        </span>

                                        <span>
                                            {item.label}
                                        </span>

                                        {item.id ===
                                            "messages" &&
                                            unreadMessages >
                                            0 && (
                                                <span
                                                    className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center font-bold ${isActive
                                                            ? "bg-white text-[#09967C]"
                                                            : "bg-red-500 text-white"
                                                        }`}
                                                >
                                                    {unreadMessages.toLocaleString(
                                                        "fa-IR"
                                                    )}
                                                </span>
                                            )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>
        </header>
    );
}