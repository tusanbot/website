"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
    GlassPanel,
    TusanCard,
    TusanButton,
    TusanInput,
    SectionHeader,
} from "@/components/ui";

export default function NewServicePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [icon, setIcon] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function createService(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) {
            setError("عنوان خدمت را وارد کنید.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profileError || profile?.role !== "admin") {
                router.push("/dashboard");
                return;
            }

            const { data: service, error: insertError } = await supabase
                .from("services")
                .insert({
                    title: title.trim(),
                    category: category.trim() || null,
                    description: description.trim() || null,
                    price: price ? Number(price) : 0,
                    icon: icon.trim() || null,
                    is_active: isActive,
                    form_schema: [],
                })
                .select("id")
                .single();

            if (insertError || !service) {
                throw new Error(insertError?.message || "خدمت ایجاد نشد.");
            }

            router.push(`/admin/services/${service.id}/forms`);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "خطایی هنگام ایجاد خدمت رخ داد.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]">
            <div className="max-w-3xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <SectionHeader
                        title="افزودن خدمت جدید"
                        description="ابتدا خدمت را ایجاد کنید؛ سپس فرم مادر و فرم‌های فرزند آن را بسازید."
                    />
                    <Link href="/admin/services">
                        <TusanButton variant="secondary">بازگشت</TusanButton>
                    </Link>
                </div>

                <GlassPanel className="p-6">
                    <form onSubmit={createService} className="space-y-6">
                        <div>
                            <label className="block font-bold mb-2">عنوان خدمت</label>
                            <TusanInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً ثبت نام خودرو" />
                        </div>

                        <div>
                            <label className="block font-bold mb-2">دسته‌بندی</label>
                            <TusanInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً خودرو" />
                        </div>

                        <div>
                            <label className="block font-bold mb-2">آیکون</label>
                            <TusanInput value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="مثلاً 🚗" />
                            {icon && <div className="mt-3 text-4xl">{icon}</div>}
                        </div>

                        <div>
                            <label className="block font-bold mb-2">قیمت</label>
                            <div className="relative">
                                <TusanInput type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="مثلاً 150000" />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">تومان</span>
                            </div>
                        </div>

                        <TusanCard className="p-4">
                            <label className="block font-bold mb-2">توضیحات</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیح مختصری درباره این خدمت..." rows={5} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none" />
                        </TusanCard>

                        <TusanCard className="p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-5 h-5 accent-[#09967C]" />
                                <div>
                                    <div className="font-bold">خدمت فعال باشد</div>
                                    <div className="text-sm text-gray-500 mt-1">اگر غیرفعال باشد، کاربران نمی‌توانند خدمت را ثبت کنند.</div>
                                </div>
                            </label>
                        </TusanCard>

                        {error && <GlassPanel className="p-4 border border-red-200 bg-red-50 text-red-700">{error}</GlassPanel>}

                        <div className="flex gap-3">
                            <TusanButton type="submit" disabled={saving} fullWidth>
                                {saving ? "در حال ایجاد..." : "ایجاد خدمت و ساخت فرم‌ها"}
                            </TusanButton>
                            <Link href="/admin/services">
                                <TusanButton type="button" variant="secondary">انصراف</TusanButton>
                            </Link>
                        </div>
                    </form>
                </GlassPanel>
            </div>
        </div>
    );
}
