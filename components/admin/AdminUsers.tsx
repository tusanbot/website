"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton, SectionHeader, TusanTable, TusanBadge, TusanStatCard } from "@/components/ui";
import StaffRoleManagement from "@/components/admin/StaffRoleManagement";

type StaffAssignment = { code: string; name: string; status: string; commission_percent: number | null };
type UserProfile = {
    id: string; email: string | null; full_name: string | null; phone: string | null; national_code: string | null;
    role: string | null; created_at: string | null; email_confirmed_at: string | null; order_count: number;
    profile_completed: boolean; staff_roles: StaffAssignment[];
};

export default function AdminUsers() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
    const [selectedStaffUser, setSelectedStaffUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true); const [error, setError] = useState("");

    useEffect(() => { loadUsers(); }, []);
    async function loadUsers() {
        setLoading(true); setError("");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("نشست مدیریت معتبر نیست.");
            const response = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "خطا در دریافت اطلاعات کاربران.");
            setUsers((result.users || []) as UserProfile[]);
        } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات کاربران."); }
        finally { setLoading(false); }
    }
    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();
        return users.filter(user => {
            if (roleFilter !== "all" && user.role !== roleFilter) return false;
            if (!query) return true;
            return [user.full_name, user.phone, user.national_code, user.email, ...user.staff_roles.map(r => r.name)].filter(Boolean).some(value => String(value).toLowerCase().includes(query));
        });
    }, [users, search, roleFilter]);
    function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString("fa-IR") : "---"; }
    function getRoleLabel(role: string | null) { return role === "admin" ? "مدیر" : "مشتری"; }
    function staffLabel(user: UserProfile) {
        const active = user.staff_roles.filter(r => r.status === "approved");
        return active.length ? active.map(r => r.name).join("، ") : "بدون مقام";
    }

    return <div className="space-y-6">
        <GlassPanel className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><SectionHeader title="مدیریت کاربران" description="مشاهده کاربران، مقام‌ها و دسترسی‌های کارکنان" /><TusanButton variant="secondary" onClick={loadUsers}>بروزرسانی</TusanButton></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <TusanStatCard title="کل کاربران" value={users.length.toLocaleString("fa-IR")} icon="👥" />
                <TusanStatCard title="مشتریان" value={users.filter(u => u.role !== "admin").length.toLocaleString("fa-IR")} icon="🧑‍💼" />
                <TusanStatCard title="مدیران" value={users.filter(u => u.role === "admin").length.toLocaleString("fa-IR")} icon="🛡️" />
                <TusanStatCard title="کارکنان دارای مقام" value={users.filter(u => u.staff_roles.some(r => r.status === "approved")).length.toLocaleString("fa-IR")} icon="🧰" />
            </div>
        </GlassPanel>
        <GlassPanel className="p-5"><div className="grid md:grid-cols-3 gap-4"><div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-2">جستجوی کاربر</label><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="نام، ایمیل، شماره موبایل، کد ملی یا مقام..." className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#09967C]" /></div><div><label className="block text-sm font-bold text-gray-700 mb-2">نقش حساب</label><select value={roleFilter} onChange={e => setRoleFilter(e.target.value as "all" | "user" | "admin")} className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)]"><option value="all">همه</option><option value="user">مشتریان</option><option value="admin">مدیران</option></select></div></div></GlassPanel>
        {selectedStaffUser && <GlassPanel className="p-5"><div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="font-bold text-lg">مدیریت مقام و دسترسی</h2><p className="text-sm text-[var(--text-muted)]">{selectedStaffUser.full_name || selectedStaffUser.email || selectedStaffUser.id}</p></div><TusanButton variant="secondary" onClick={() => { setSelectedStaffUser(null); void loadUsers(); }}>بستن و بروزرسانی</TusanButton></div><StaffRoleManagement userId={selectedStaffUser.id} /></GlassPanel>}
        {loading ? <GlassPanel className="p-10 text-center text-gray-500">در حال دریافت کاربران...</GlassPanel> : error ? <GlassPanel className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">{error}</GlassPanel> : filteredUsers.length === 0 ? <GlassPanel className="p-10 text-center text-gray-500">کاربری با این مشخصات پیدا نشد.</GlassPanel> : <TusanTable columns={[{ key: "user", title: "کاربر" },{ key: "phone", title: "موبایل" },{ key: "role", title: "نقش حساب", align: "center" },{ key: "staff", title: "مقام کارکنان", align: "center" },{ key: "profile", title: "پروفایل", align: "center" },{ key: "orders", title: "سفارش‌ها", align: "center" },{ key: "created", title: "تاریخ عضویت" },{ key: "actions", title: "عملیات", align: "left" }]} rows={filteredUsers.map(user => ({
            user: <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">{(user.full_name || user.email || "؟").trim().charAt(0)}</div><div><div className="font-bold text-[var(--text)]">{user.full_name || "بدون نام"}</div><div className="text-xs text-[var(--text-muted)] mt-1">{user.email || `${user.id.slice(0, 8)}...`}</div></div></div>,
            phone: user.phone || "تکمیل نشده", role: <TusanBadge variant={user.role === "admin" ? "info" : "success"}>{getRoleLabel(user.role)}</TusanBadge>,
            staff: user.staff_roles.filter(r => r.status === "approved").length ? <div className="flex flex-wrap gap-1 justify-center">{user.staff_roles.filter(r => r.status === "approved").map(r => <TusanBadge key={r.code} variant="info">{r.name}{r.code === "order_manager" && r.commission_percent != null ? ` · ${Number(r.commission_percent).toLocaleString("fa-IR")}٪` : ""}</TusanBadge>)}</div> : <span className="text-xs text-[var(--text-muted)]">بدون مقام</span>,
            profile: user.profile_completed ? <TusanBadge variant="success">تکمیل‌شده</TusanBadge> : <TusanBadge variant="warning">تکمیل نشده</TusanBadge>, orders: <span className="font-bold text-[var(--text)]">{user.order_count.toLocaleString("fa-IR")}</span>, created: formatDate(user.created_at),
            actions: <div className="flex flex-wrap gap-2 justify-end"><Link href={`/admin/orders?user=${user.id}`}><TusanButton size="sm" variant="outline">سفارش‌ها</TusanButton></Link><TusanButton size="sm" variant="secondary" onClick={() => setSelectedStaffUser(user)}>مدیریت مقام</TusanButton></div>
        }))} emptyTitle="کاربری با این مشخصات پیدا نشد" emptyDescription="عبارت جستجو یا فیلتر نقش را تغییر دهید." />}
    </div>;
}
