"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AnnouncementForm from "@/components/admin/AnnouncementForm";

export default function NewAnnouncementPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(data: any) {
        setSubmitting(true);
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

            if (profile?.role !== "admin") throw new Error("دسترسی غیرمجاز");

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
            };

            const { error: insertError } = await supabase
                .from("services_announcements")
                .insert(payload);

            if (insertError) throw new Error(insertError.message);
            router.push("/admin/announcements");
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "خطایی هنگام ذخیره اطلاعیه رخ داد.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div dir="rtl" className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">ایجاد اطلاعیه جدید</h1>
                        <p className="text-gray-500 mt-1">
                            اطلاعیه یا ثبت‌نام جدید را ایجاد کنید تا در اسلایدر خدمات و صفحه ثبت‌نام‌های فعال نمایش داده شود.
                        </p>
                    </div>
                    <Link href="/admin/announcements" className="bg-white border border-gray-200 px-5 py-3 rounded-xl hover:bg-gray-50 transition text-center">
                        ← بازگشت
                    </Link>
                </div>

                <div className="bg-white/95 backdrop-blur rounded-3xl border border-white/60 shadow-[0_10px_30px_rgba(15,23,42,0.08)] p-6">
                    {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>}
                    <AnnouncementForm onSubmit={handleSubmit} submitting={submitting} />
                </div>
            </div>
        </div>
    );
}
