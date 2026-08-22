"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AnnouncementForm from "@/components/admin/AnnouncementForm";

import {
    GlassPanel,
    TusanButton,
    SectionHeader,
} from "@/components/ui";

export default function EditAnnouncementPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [announcement, setAnnouncement] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (id) loadAnnouncement();
    }, [id]);

    async function loadAnnouncement() {
        setLoading(true);
        setError("");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role !== "admin") {
                router.push("/dashboard");
                return;
            }

            const { data, error } = await supabase
                .from("services_announcements")
                .select("*")
                .eq("id", id)
                .single();

            if (error || !data) throw new Error("اطلاعیه موردنظر پیدا نشد.");

            setAnnouncement({
                ...data,
                documents: Array.isArray(data.documents) ? data.documents : [],
                start_at: data.start_at
                    ? new Date(data.start_at).toISOString().slice(0, 16)
                    : "",
                end_at: data.end_at
                    ? new Date(data.end_at).toISOString().slice(0, 16)
                    : "",
                extended_end_at: data.extended_end_at
                    ? new Date(data.extended_end_at).toISOString().slice(0, 16)
                    : null,
            });
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "خطایی هنگام دریافت اطلاعیه رخ داد.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(data: any) {
        setSubmitting(true);
        setError("");
        try {
            const payload = {
                title: data.title,
                type: data.type,
                summary: data.summary,
                content: data.content,
                // Optional dates must be sent as SQL NULL, never as an empty string.
                start_at: data.start_at || null,
                end_at: data.end_at || null,
                documents: data.documents || [],
                is_active: data.is_active,
                is_extendable: data.is_extendable,
                extended_end_at: data.extended_end_at || null,
                button_label: data.button_label || "ثبت‌نام",
                service_id: data.service_id || null,
                priority: Number(data.priority || 0),
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from("services_announcements")
                .update(payload)
                .eq("id", id);

            if (error) throw new Error(error.message);
            router.push("/admin/announcements");
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "خطایی هنگام ذخیره تغییرات رخ داد.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div dir="rtl" className="min-h-screen page-background flex items-center justify-center p-6">
                <GlassPanel className="p-8 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-2xl animate-pulse">✏️</div>
                    <p className="mt-4 text-[var(--text-muted)]">در حال دریافت اطلاعات اطلاعیه...</p>
                </GlassPanel>
            </div>
        );
    }

    if (!announcement) {
        return (
            <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]">
                <div className="max-w-2xl mx-auto">
                    <GlassPanel className="p-8 text-center">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h1 className="text-xl font-bold">اطلاعیه پیدا نشد</h1>
                        <p className="text-[var(--text-muted)] mt-2">{error}</p>
                        <div className="mt-6">
                            <Link href="/admin/announcements">
                                <TusanButton>بازگشت به اطلاعیه‌ها</TusanButton>
                            </Link>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" className="min-h-screen page-background text-[var(--text)] p-6 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <SectionHeader title="ویرایش اطلاعیه" description="اطلاعات اطلاعیه یا ثبت‌نام را ویرایش کنید." />
                    <Link href="/admin/announcements">
                        <TusanButton variant="outline">← بازگشت</TusanButton>
                    </Link>
                </div>

                <GlassPanel className="p-6">
                    {error && (
                        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-600">{error}</div>
                    )}
                    <AnnouncementForm initialData={announcement} onSubmit={handleSubmit} submitting={submitting} />
                </GlassPanel>
            </div>
        </div>
    );
}
