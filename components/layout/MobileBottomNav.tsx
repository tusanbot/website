"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, ListOrdered, UserRound, Settings, BriefcaseBusiness } from "lucide-react";
import { supabase } from "@/lib/supabase";

const items = [
    { href: "/", label: "صفحه اصلی", icon: Home },
    { href: "/orders", label: "سفارش‌ها", icon: ListOrdered },
    { href: "/services", label: "خدمات", icon: BriefcaseBusiness },
    { href: "/profile", label: "پروفایل", icon: UserRound },
    { href: "/settings", label: "تنظیمات", icon: Settings },
];

export default function MobileBottomNav() {
    const pathname = usePathname();
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        let mounted = true;
        supabase.auth.getUser().then(({ data }) => {
            if (mounted) setLoggedIn(Boolean(data.user));
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) setLoggedIn(Boolean(session?.user));
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <nav
            aria-label="منوی اصلی موبایل"
            className="fixed inset-x-3 bottom-3 z-50 lg:hidden"
        >
            <div className="mx-auto flex max-w-xl items-stretch justify-between rounded-[24px] border border-[var(--border)] bg-[var(--surface)]/95 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--surface)]/80">
                {items.map(({ href, label, icon: Icon }) => {
                    const active = href === "/"
                        ? pathname === "/"
                        : pathname === href || pathname.startsWith(`${href}/`);

                    const displayLabel = href === "/profile" && !loggedIn ? "ورود" : label;

                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[19px] px-1 py-2 text-[10px] font-bold transition-all duration-200 active:scale-95 ${
                                active
                                    ? "bg-[var(--primary)] text-white shadow-sm"
                                    : "text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text)]"
                            }`}
                        >
                            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                            <span className="truncate">{displayLabel}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
