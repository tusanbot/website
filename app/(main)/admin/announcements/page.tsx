"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { GlassPanel, TusanButton, TusanBadge, TusanTable, SectionHeader } from "@/components/ui";

type Announcement = {
    id: string;
    title: string;
    type: "registration" | "announcement";
    summary: string | null;
    start_at: string | null;
    end_at: string | null;
    is_active: boolean;
    is_extendable: boolean;
    button_label: string | null;
    priority: number;
    created_at: string;
};

export default function AdminAnnouncementsPage() {
    const router = useRouter();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { checkAdmin(); }, []);

    async function checkAdmin() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profile?.role !== "admin") { router.push("/dashboard"); return; }
        loadAnnouncements();
    }

    async function loadAnnouncements() {
        setLoading(true);
        const { data, error } = await supabase
            .from("services_announcements")
            .select("id,title,type,summary,start_at,end_at,is_active,is_extendable,button_label,priority,created_at")
            .order("priority", { ascending: false })
            .order("start_at", { ascending: false });

        if (error) {
            console.error(error);
            setAnnouncements([]);
        } else {
            setAnnouncements((data || []) as Announcement[]);
        }
        setLoading(false);
    }

    async function toggleActive(id: string, current: boolean) {
        const { error } = await supabase.from("services_announcements").update({ is_active: !current }).eq("id", id);
        if (error) { alert("خطا در بروزرسانی وضعیت اطلاعیه"); console.error(error); return; }
        loadAnnouncements();
    }

    async function deleteAnnouncement(id: string) {
        if (!confirm("آیا از حذف این اطلاعیه مطمئن هستید؟ این عملیات قابل بازگشت نیست.")) return;
        const { error } = await supabase.from("services_announcements").delete().eq("id", id);
        if (error) { alert("خطا در حذف اطلاعیه"); console.error(error); return; }
        loadAnnouncements();
    }

    function formatDate(date: string | null) {
        return date ? new Date(date).toLocaleDateString("fa-IR") : "متعاقباً اعلام می‌شود";
    }

    if (loading) {
        return (
            <div dir="rtl" className="min-h-screen page-background flex items-center justify-center p-6">
                <GlassPanel className="p-8 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-2xl animate-pulse">📢</div>
                    <p className="mt-4 text-[var(--text-muted)]">در حال دریافت اطلاعیه‌ها...</p>
                </GlassPanel>
            </div>
        );
    }

    return (
        <div dir="rtl" className="min-h-screen page-background text-[var(--text)] p-6 transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <SectionHeader title="مدیریت اطلاعیه‌ها" description="ایجاد، ویرایش و مدیریت اطلاعیه‌ها و ثبت‌نام‌های فعال" />
                    <Link href="/admin/announcements/new">
                        <TusanButton>＋ ایجاد اطلاعیه</TusanButton>
                    </Link>
                </div>

                <GlassPanel className="overflow-hidden">
                    {announcements.length === 0 ? (
                        <div className="p-12 text-center text-[var(--text-muted)]">
                            هنوز هیچ اطلاعیه‌ای ثبت نشده است.
                            <div className="mt-5">
                                <Link href="/admin/announcements/new"><TusanButton>＋ ایجاد اولین اطلاعیه</TusanButton></Link>
                            </div>
                        </div>
                    ) : (
                        <TusanTable
                            columns={[
                                { key: "title", title: "عنوان" },
                                { key: "type", title: "نوع" },
                                { key: "start", title: "شروع" },
                                { key: "end", title: "پایان" },
                                { key: "priority", title: "اولویت" },
                                { key: "status", title: "وضعیت" },
                                { key: "actions", title: "عملیات", align: "left" },
                            ]}
                            rows={announcements.map((item) => ({
                                title: (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[var(--text)]">{item.title}</span>
                                        {item.summary && <span className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{item.summary}</span>}
                                    </div>
                                ),
                                type: (
                                    <TusanBadge className={item.type === "registration" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}>
                                        {item.type === "registration" ? "ثبت‌نام" : "اطلاعیه"}
                                    </TusanBadge>
                                ),
                                start: formatDate(item.start_at),
                                end: (
                                    <div className="flex flex-col">
                                        <span>{formatDate(item.end_at)}</span>
                                        {item.is_extendable && <span className="text-xs text-green-600 mt-1">قابل تمدید</span>}
                                    </div>
                                ),
                                priority: item.priority.toLocaleString("fa-IR"),
                                status: (
                                    <TusanBadge className={item.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                        {item.is_active ? "فعال" : "غیرفعال"}
                                    </TusanBadge>
                                ),
                                actions: (
                                    <div className="flex gap-2 flex-wrap justify-end">
                                        <Link href={`/admin/announcements/${item.id}`}>
                                            <TusanButton size="sm" variant="outline">ویرایش</TusanButton>
                                        </Link>
                                        <TusanButton size="sm" variant="secondary" onClick={() => toggleActive(item.id, item.is_active)}>
                                            {item.is_active ? "غیرفعال" : "فعال"}
                                        </TusanButton>
                                        <TusanButton size="sm" variant="danger" onClick={() => deleteAnnouncement(item.id)}>حذف</TusanButton>
                                    </div>
                                ),
                            }))}
                        />
                    )}
                </GlassPanel>
            </div>
        </div>
    );
}
