import Link from "next/link";
import { Settings, UserRound, Bell, ShieldCheck } from "lucide-react";

const items = [
    { href: "/profile", title: "حساب کاربری", description: "اطلاعات و مشخصات حساب", icon: UserRound },
    { href: "/notifications", title: "اعلان‌ها", description: "مشاهده اعلان‌های حساب", icon: Bell },
    { href: "/profile", title: "امنیت حساب", description: "مدیریت تنظیمات حساب و ورود", icon: ShieldCheck },
];

export default function SettingsPage() {
    return (
        <section className="mx-auto max-w-3xl" dir="rtl">
            <div className="mb-6">
                <div className="mb-2 flex items-center gap-2 text-[var(--primary)]">
                    <Settings size={22} />
                    <span className="text-sm font-bold">تنظیمات</span>
                </div>
                <h1 className="text-2xl font-black">تنظیمات توسن</h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">دسترسی سریع به تنظیمات حساب و اعلان‌ها</p>
            </div>

            <div className="grid gap-3">
                {items.map(({ href, title, description, icon: Icon }) => (
                    <Link
                        key={`${href}-${title}`}
                        href={href}
                        className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                            <Icon size={21} />
                        </span>
                        <span className="min-w-0">
                            <span className="block font-black">{title}</span>
                            <span className="mt-1 block text-sm text-[var(--text-muted)]">{description}</span>
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
