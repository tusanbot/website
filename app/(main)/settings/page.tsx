"use client";

import Link from "next/link";
import { Settings, UserRound, Bell, ShieldCheck, Bot } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";

const items = [
    { href: "/profile", title: "حساب کاربری", description: "اطلاعات و مشخصات حساب", icon: UserRound },
    { href: "/profile/ai", title: "پروفایل هوش مصنوعی", description: "مدیریت API شخصی و مدل هوش مصنوعی", icon: Bot },
    { href: "/notifications", title: "اعلان‌ها", description: "مشاهده اعلان‌های حساب", icon: Bell },
    { href: "/profile", title: "امنیت حساب", description: "مدیریت تنظیمات حساب و ورود", icon: ShieldCheck },
];

export default function SettingsPage() {
    return (
        <section className="mx-auto max-w-3xl pb-4" dir="rtl">
            <div className="mb-6">
                <div className="mb-2 flex items-center gap-2 text-[var(--primary)]">
                    <Settings size={22} />
                    <span className="text-sm font-bold">تنظیمات</span>
                </div>
                <h1 className="text-2xl font-black">تنظیمات توسن</h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">دسترسی سریع به تنظیمات حساب، هوش مصنوعی و اعلان‌ها</p>
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

            <div className="mt-6 rounded-2xl border border-red-200/70 bg-red-50/60 p-4">
                <div className="mb-3">
                    <h2 className="font-black text-red-700">خروج از حساب</h2>
                    <p className="mt-1 text-sm text-red-600/80">برای پایان دادن به نشست فعلی، از حساب کاربری خارج شوید.</p>
                </div>
                <LogoutButton />
            </div>
        </section>
    );
}
