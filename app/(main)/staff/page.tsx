"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton, TusanStatCard } from "@/components/ui";

type StaffRole = { code: string; name: string; permissions?: Record<string, boolean> | null };

export default function StaffDashboardPage() {
    const [role, setRole] = useState<StaffRole | null>(null);
    const [name, setName] = useState("کارمند");
    const [stats, setStats] = useState({ orders: 0, activeOrders: 0, support: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => { void load(); }, []);

    async function load() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const [{ data: profile }, { data: assignment }] = await Promise.all([
                supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
                supabase.from("staff_role_assignments").select("status,staff_roles(code,name,permissions)").eq("user_id", user.id).eq("status", "approved").limit(1).maybeSingle(),
            ]);
            setName(profile?.full_name || "کارمند");
            const assigned = Array.isArray(assignment?.staff_roles) ? assignment.staff_roles[0] : assignment?.staff_roles;
            setRole(assigned || null);

            const [orders, active, support] = await Promise.all([
                supabase.from("orders").select("id", { count: "exact", head: true }).eq("assigned_staff_id", user.id),
                supabase.from("orders").select("id", { count: "exact", head: true }).eq("assigned_staff_id", user.id).in("processing_status", ["in_progress", "result_submitted"]),
                supabase.from("support_conversations").select("id", { count: "exact", head: true }).eq("status", "open").eq("assigned_staff_id", user.id),
            ]);
            setStats({ orders: orders.count || 0, activeOrders: active.count || 0, support: support.count || 0 });
        } finally { setLoading(false); }
    }

    return (
        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <GlassPanel className="p-6 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><div className="text-sm text-[var(--text-muted)]">خوش آمدید</div><h1 className="mt-1 text-2xl font-black">{name}</h1><p className="mt-2 leading-7 text-[var(--text-muted)]">{role?.name || "مدیر اصلی"} · دسترسی‌ها بر اساس نقش فعال حساب شما اعمال می‌شود.</p></div>
                    <TusanButton variant="secondary" onClick={() => void load()}>بروزرسانی</TusanButton>
                </div>
            </GlassPanel>
            <div className="grid gap-4 sm:grid-cols-3">
                <TusanStatCard title="سفارش‌های تخصیص‌یافته" value={loading ? "…" : stats.orders.toLocaleString("fa-IR")} icon="📋" />
                <TusanStatCard title="در حال انجام" value={loading ? "…" : stats.activeOrders.toLocaleString("fa-IR")} icon="⚙️" />
                <TusanStatCard title="گفتگوهای فعال من" value={loading ? "…" : stats.support.toLocaleString("fa-IR")} icon="💬" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                {role?.code === "order_manager" && <Link href="/staff/orders"><GlassPanel className="p-6 transition hover:-translate-y-0.5"><div className="text-3xl">📋</div><h2 className="mt-3 font-black">مدیریت سفارشات</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">سفارش‌های مجاز، درخواست تخصیص و وضعیت پردازش.</p></GlassPanel></Link>}
                {role?.code === "support_operator" && <Link href="/staff/support"><GlassPanel className="p-6 transition hover:-translate-y-0.5"><div className="text-3xl">💬</div><h2 className="mt-3 font-black">پشتیبانی آنلاین</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">گفتگوهای صف، پذیرش گفتگو و پاسخ‌گویی به مشتری.</p></GlassPanel></Link>}
                {role?.code === "admin" && <Link href="/admin"><GlassPanel className="p-6 transition hover:-translate-y-0.5"><div className="text-3xl">🛡️</div><h2 className="mt-3 font-black">پنل مدیریت اصلی</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">مدیریت کامل کاربران، خدمات، سفارشات و تنظیمات.</p></GlassPanel></Link>}
            </div>
        </main>
    );
}
