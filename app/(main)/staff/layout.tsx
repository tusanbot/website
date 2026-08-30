import type { ReactNode } from "react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { GlassPanel, TusanButton } from "@/components/ui";

export default async function StaffLayout({ children }: { children: ReactNode }) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <StaffDenied />;

    const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).maybeSingle();
    const { data: assignment } = await supabase
        .from("staff_role_assignments")
        .select("status,staff_roles(code,name,permissions)")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

    const role = Array.isArray(assignment?.staff_roles) ? assignment?.staff_roles[0] : assignment?.staff_roles;
    const isAdmin = profile?.role === "admin";
    const isStaff = Boolean(role?.code);

    if (!isAdmin && !isStaff) return <StaffDenied loggedIn />;

    return (
        <div dir="rtl" className="min-h-screen page-background text-[var(--text)]">
            <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                    <div>
                        <div className="font-black">پنل کارکنان توسن</div>
                        <div className="mt-0.5 text-xs text-[var(--text-muted)]">{profile?.full_name || "کارمند"} · {isAdmin ? "مدیر اصلی" : role?.name || role?.code}</div>
                    </div>
                    <nav className="flex items-center gap-2 overflow-x-auto">
                        <Link className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-[var(--surface-muted)]" href="/staff">داشبورد</Link>
                        {(isAdmin || role?.code === "order_manager") && <Link className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-[var(--surface-muted)]" href="/staff/orders">سفارشات</Link>}
                        {(isAdmin || role?.code === "support_operator" || role?.code === "order_manager") && <Link className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-[var(--surface-muted)]" href="/staff/support">پشتیبانی</Link>}
                        {isAdmin && <Link className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-[var(--surface-muted)]" href="/admin">پنل مدیر</Link>}
                    </nav>
                </div>
            </header>
            {children}
        </div>
    );
}

function StaffDenied({ loggedIn = false }: { loggedIn?: boolean }) {
    return (
        <div dir="rtl" className="min-h-screen bg-[var(--background)] text-[var(--text)] flex items-center justify-center p-6">
            <GlassPanel className="w-full max-w-md p-8 text-center">
                <div className="mb-4 text-5xl">⛔</div>
                <h1 className="text-xl font-black">دسترسی غیرمجاز</h1>
                <p className="mt-3 leading-7 text-[var(--text-muted)]">{loggedIn ? "حساب شما نقش فعال کارکنان ندارد." : "برای مشاهده این پنل ابتدا وارد حساب خود شوید."}</p>
                <div className="mt-6 flex flex-col gap-3">
                    {!loggedIn && <Link href="/auth?mode=login"><TusanButton className="w-full">ورود به حساب</TusanButton></Link>}
                    <Link href="/" className="text-sm font-bold text-[var(--primary)] hover:underline">بازگشت به صفحه اصلی</Link>
                </div>
            </GlassPanel>
        </div>
    );
}
