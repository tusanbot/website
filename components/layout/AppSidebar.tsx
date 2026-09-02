"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlassPanel, TusanButton } from "@/components/ui";

type UserRole = "guest" | "user" | "admin";
type StaffRole = "order_manager" | "support_operator";

export default function AppSidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const [role, setRole] = useState<UserRole>("guest");
    const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");

    useEffect(() => { loadUser(); }, []);

    async function loadUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setRole("guest"); setStaffRoles([]); return; }
        setEmail(user.email || "");
        const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
        setRole(profile?.role === "admin" ? "admin" : "user");
        setFullName(profile?.full_name || "");
        const { data: assignments } = await supabase.from("staff_role_assignments").select("status, staff_roles(code)").eq("user_id", user.id).eq("status", "approved");
        const codes = (assignments || []).map((item: any) => item.staff_roles?.code).filter((code: unknown): code is StaffRole => code === "order_manager" || code === "support_operator");
        setStaffRoles([...new Set(codes)]);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/auth?mode=login");
        router.refresh();
        onClose?.();
    }

    const publicItems = [
        { href: "/", label: "خانه", icon: "🏠" },
        { href: "/services", label: "خدمات", icon: "📋" },
        { href: "/orders", label: "پیگیری سفارش", icon: "🔎" },
    ];
    const userItems = [
        { href: "/dashboard", label: "داشبورد", icon: "📊" },
        { href: "/profile", label: "پروفایل", icon: "👤" },
        { href: "/orders", label: "سفارش‌های من", icon: "🧾" },
        { href: "/messages", label: "پیام‌ها", icon: "💬" },
    ];
    const staffItems = [
        ...(staffRoles.includes("order_manager") ? [
            { href: "/staff/orders", label: "مدیریت سفارشات", icon: "📦" },
            { href: "/staff/finance", label: "درآمد و تسویه حساب", icon: "💰" },
        ] : []),
        ...(staffRoles.includes("support_operator") && !staffRoles.includes("order_manager") ? [{ href: "/staff/support", label: "پشتیبانی آنلاین", icon: "🎧" }] : []),
        ...(staffRoles.includes("support_operator") && staffRoles.includes("order_manager") ? [{ href: "/staff/support", label: "پشتیبانی آنلاین", icon: "🎧" }] : []),
    ];
    const adminItems = [
        { href: "/admin", label: "پنل مدیریت", icon: "🛠️" },
        { href: "/admin/orders", label: "مدیریت سفارش‌ها", icon: "📦" },
        { href: "/admin/services", label: "مدیریت خدمات", icon: "⚙️" },
        { href: "/admin/announcements", label: "اطلاعیه‌ها", icon: "📢" },
        { href: "/admin/reports", label: "گزارش‌ها", icon: "📈" },
        { href: "/admin/settlements", label: "تسویه حساب کارکنان", icon: "💳" },
        { href: "/admin/settings", label: "تنظیمات سایت", icon: "⚙️" },
        { href: "/admin/appearance", label: "ظاهر سایت", icon: "🎨" },
    ];

    function Item({ href, label, icon }: { href: string; label: string; icon: string }) {
        const active = pathname === href || pathname.startsWith(href + "/");
        return <Link href={href} onClick={() => onClose?.()} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${active ? "bg-[var(--primary)] text-white" : "text-[var(--text)] hover:bg-[var(--surface-secondary)]"}`}><span className="text-lg">{icon}</span><span className="font-bold">{label}</span></Link>;
    }

    return <GlassPanel className={`h-full flex flex-col ${mobile ? "rounded-none border-0" : "rounded-3xl"}`}>
        <div className="p-5 border-b border-[var(--border)]"><div className="text-2xl font-black text-[var(--text)]">توسن</div>{role === "guest" ? <div className="mt-3"><Link href="/auth?mode=login" onClick={() => onClose?.()}><TusanButton className="w-full">ورود / ثبت‌نام</TusanButton></Link></div> : <div className="mt-3"><div className="font-bold text-[var(--text)]">{fullName || "کاربر"}</div><div className="text-sm text-[var(--text-muted)] break-all">{email}</div></div>}</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div><div className="mb-2 text-xs font-bold text-[var(--text-muted)]">عمومی</div><div className="space-y-1">{publicItems.map((item) => <Item key={item.href} {...item} />)}</div></div>
            {role !== "guest" && <div><div className="mb-2 text-xs font-bold text-[var(--text-muted)]">حساب کاربری</div><div className="space-y-1">{userItems.map((item) => <Item key={item.href} {...item} />)}</div></div>}
            {staffItems.length > 0 && <div><div className="mb-2 text-xs font-bold text-[var(--text-muted)]">پنل کاری</div><div className="space-y-1">{staffItems.map((item) => <Item key={item.href} {...item} />)}</div></div>}
            {role === "admin" && <div><div className="mb-2 text-xs font-bold text-[var(--text-muted)]">مدیریت</div><div className="space-y-1">{adminItems.map((item) => <Item key={item.href} {...item} />)}</div></div>}
        </div>
        {role !== "guest" && <div className="p-4 border-t border-[var(--border)]"><TusanButton variant="secondary" className="w-full" onClick={handleLogout}>خروج از حساب</TusanButton></div>}
    </GlassPanel>;
}
