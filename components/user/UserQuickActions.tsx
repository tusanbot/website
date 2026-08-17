import Link from "next/link";
import { TusanCard } from "@/components/ui";

const actions = [
    {
        title: "ثبت سفارش جدید",
        description: "خدمت موردنظر خود را انتخاب کنید",
        icon: "➕",
        href: "/services",
    },
    {
        title: "سفارش‌های من",
        description: "وضعیت سفارش‌های خود را ببینید",
        icon: "📋",
        href: "/orders",
    },
    {
        title: "پیام‌ها",
        description: "پیام‌های مربوط به سفارش‌ها",
        icon: "💬",
        href: "/messages",
    },
    {
        title: "پروفایل",
        description: "اطلاعات حساب کاربری",
        icon: "👤",
        href: "/profile",
    },
];

export default function UserQuickActions() {
    return (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {actions.map((action) => (
                <Link
                    key={action.href}
                    href={action.href}
                    className="block"
                >
                    <TusanCard className="p-5 h-full hover:-translate-y-1 transition-all duration-300">
                        <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-2xl">
                            {action.icon}
                        </div>

                        <h3 className="font-bold text-[var(--text)] mt-4">
                            {action.title}
                        </h3>

                        <p className="text-sm text-[var(--text-muted)] mt-1 leading-6">
                            {action.description}
                        </p>
                    </TusanCard>
                </Link>
            ))}
        </div>
    );
}