"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppSidebar from "./AppSidebar";
import NotificationBell from "@/components/notifications/NotificationBell";
import SupportChatWidget from "@/components/home/SupportChatWidget";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton } from "@/components/ui";

type AdminAccess = "checking" | "allowed" | "denied";

function getPageTitle(pathname: string): string {
    if (pathname === "/" || pathname === "") return "خانه";
    if (pathname === "/services" || pathname.startsWith("/services/")) return "خدمات";
    if (pathname === "/orders" || pathname.startsWith("/orders/")) return "پیگیری سفارشات";
    if (pathname === "/articles" || pathname.startsWith("/articles/")) return "مقالات";
    if (pathname === "/auth" || pathname.startsWith("/auth/")) return "ورود و ثبت‌نام";
    if (pathname === "/profile" || pathname.startsWith("/profile/")) return "پروفایل کاربری";
    if (pathname === "/contact" || pathname.startsWith("/contact/")) return "تماس با ما";
    if (pathname === "/about" || pathname.startsWith("/about/")) return "درباره ما";
    if (pathname === "/tools" || pathname === "/tools/") return "ابزارهای کاربردی";
    if (pathname.startsWith("/tools/invoice")) return "فاکتور ساز";
    if (pathname.startsWith("/tools/pdf-to-word")) return "تبدیل PDF به Word";
    if (pathname.startsWith("/tools/")) return "ابزار کاربردی";
    if (pathname === "/social" || pathname.startsWith("/social/")) return "خدمات شبکه‌های اجتماعی";
    if (pathname.startsWith("/payment/")) return "پرداخت سفارش";
    if (pathname.startsWith("/admin")) return "مدیریت سایت";
    return "";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [adminAccess, setAdminAccess] = useState<AdminAccess>("checking");
    const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
    const pageTitle = getPageTitle(pathname);

    useEffect(() => {
        if (!isAdminRoute) { setAdminAccess("allowed"); return; }
        let active = true;
        async function checkAdminAccess() {
            setAdminAccess("checking");
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { if (active) setAdminAccess("denied"); return; }
                const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
                if (active) setAdminAccess(!error && profile?.role === "admin" ? "allowed" : "denied");
            } catch (error) {
                console.error("[AppLayout] admin access check failed", error);
                if (active) setAdminAccess("denied");
            }
        }
        checkAdminAccess();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { checkAdminAccess(); });
        return () => { active = false; subscription.unsubscribe(); };
    }, [isAdminRoute, pathname]);

    if (isAdminRoute && adminAccess !== "allowed") {
        return <div dir="rtl" className="min-h-screen bg-[var(--background)] text-[var(--text)] flex items-center justify-center p-6"><GlassPanel className="w-full max-w-md p-8 text-center">{adminAccess === "checking" ? <><div className="text-5xl mb-4">🔐</div><h1 className="text-xl font-black">در حال بررسی دسترسی...</h1><p className="mt-3 text-[var(--text-muted)]">لطفاً چند لحظه صبر کنید.</p></> : <><div className="text-5xl mb-4">⛔</div><h1 className="text-xl font-black">دسترسی غیرمجاز</h1><p className="mt-3 leading-7 text-[var(--text-muted)]">برای ورود به پنل مدیریت باید با حساب مدیر وارد شده باشید.</p><div className="mt-6 flex flex-col gap-3"><Link href="/auth?mode=login"><TusanButton className="w-full">ورود به حساب</TusanButton></Link><Link href="/" className="text-sm font-bold text-[var(--primary)] hover:underline">بازگشت به صفحه اصلی</Link></div></>}</GlassPanel></div>;
    }

    return <div dir="rtl" className="min-h-screen bg-[var(--background)] text-[var(--text)]"><div className="flex"><aside className="hidden lg:block w-72 p-4"><AppSidebar /></aside>{open && <><div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} /><aside className="fixed right-0 top-0 z-50 h-full w-72 lg:hidden"><AppSidebar mobile onClose={() => setOpen(false)} /></aside></>}<div className="flex-1 min-w-0"><header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur"><div className="flex h-16 items-center justify-between px-4 lg:px-6"><button type="button" className="lg:hidden rounded-xl border border-[var(--border)] px-3 py-2" onClick={() => setOpen(true)}>☰</button><div className="font-bold">{pageTitle || "توسن"}</div><NotificationBell /></div></header><main className="p-4 lg:p-6">{children}</main></div></div><SupportChatWidget /></div>;
}
