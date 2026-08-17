"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ServiceFormBuilder, {
    FormField,
} from "@/components/ServiceFormBuilder";

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

    const [formSchema, setFormSchema] =
        useState<FormField[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");



    async function createService(e: React.FormEvent) {
        e.preventDefault();

        if (!title.trim()) {
            setError("عنوان خدمت را وارد کنید.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            // بررسی ورود کاربر
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            // بررسی مدیر بودن
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profileError) {
                throw new Error("خطا در بررسی دسترسی کاربر.");
            }

            if (profile?.role !== "admin") {
                router.push("/dashboard");
                return;
            }

            // ساخت خدمت
            const { error: insertError } = await supabase
                .from("services")
                .insert({
                    title: title.trim(),
                    category: category.trim() || null,
                    description: description.trim() || null,
                    price: price ? Number(price) : 0,
                    icon: icon.trim() || null,
                    is_active: isActive,
                    form_schema: formSchema,
                });

            if (insertError) {
                throw new Error(insertError.message);
            }

            router.push("/admin/services");
            router.refresh();

        } catch (err: any) {
            console.error(err);
            setError(
                err?.message || "خطایی هنگام ایجاد خدمت رخ داد."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            dir="rtl"
            className="min-h-screen page-background p-6 text-[var(--text)] transition-colors duration-300"
        >
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <SectionHeader
                        title="افزودن خدمت جدید"
                        description="اطلاعات اولیه خدمت را وارد کنید و فرم ثبت سفارش آن را طراحی کنید."
                    />

                    <Link href="/admin/services">
                        <TusanButton variant="secondary">
                            بازگشت
                        </TusanButton>
                    </Link>
                </div>


                {/* Form */}
                <GlassPanel className="p-6 space-y-6">
                    <form
                        onSubmit={createService}
                        className="space-y-6"
                    >

                        {/* Title */}
                        <div>
                            <label className="block font-bold mb-2">
                                عنوان خدمت
                            </label>

                            <TusanInput
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="مثلاً ثبت نام کنکور"
                            />
                        </div>


                        {/* Category */}
                        <div>
                            <label className="block font-bold mb-2">
                                دسته‌بندی
                            </label>

                            <TusanInput
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                placeholder="مثلاً 🎓"
                            />

                            <p className="text-sm text-gray-500 mt-2">
                                مثال: آموزشی، مالیاتی، بیمه، خودرو، بانکی و...
                            </p>
                        </div>


                        {/* Icon */}
                        <div>
                            <label className="block font-bold mb-2">
                                آیکون
                            </label>

                            <input
                                type="text"
                                value={icon}
                                onChange={(e) =>
                                    setIcon(e.target.value)
                                }
                                placeholder="مثلاً 🎓"
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#09967C]"
                            />

                            {icon && (
                                <div className="mt-3 text-4xl">
                                    {icon}
                                </div>
                            )}
                        </div>


                        {/* Price */}
                        <div>
                            <label className="block font-bold mb-2">
                                قیمت
                            </label>

                            <div className="relative">

                                <TusanInput
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="مثلاً 150000"
                                />

                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                    تومان
                                </span>

                            </div>

                            <p className="text-sm text-gray-500 mt-2">
                                در صورت رایگان بودن خدمت، عدد ۰ وارد کنید.
                            </p>
                        </div>


                        {/* Description */}
                        <TusanCard className="p-4">
                            <label className="block font-bold mb-2">
                                توضیحات
                            </label>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="توضیح مختصری درباره این خدمت..."
                                rows={5}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none"
                            />
                        </TusanCard>


                        {/* Active */}
                        <TusanCard className="p-4">

                            <label className="flex items-center gap-3 cursor-pointer">

                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) =>
                                        setIsActive(e.target.checked)
                                    }
                                    className="w-5 h-5 accent-[#09967C]"
                                />

                                <div>
                                    <div className="font-bold">
                                        خدمت فعال باشد
                                    </div>

                                    <div className="text-sm text-gray-500 mt-1">
                                        اگر غیرفعال باشد، کاربران نمی‌توانند
                                        خدمت را ثبت کنند.
                                    </div>
                                </div>

                            </label>

                        </TusanCard>


                        {/* Form Builder */}
                        <GlassPanel className="p-5">
                            <ServiceFormBuilder
                                value={formSchema}
                                onChange={setFormSchema}
                            />
                        </GlassPanel>


                        {/* Error */}
                        {error && (
                            <GlassPanel className="p-4 border border-red-200 bg-red-50 text-red-700">
                                {error}
                            </GlassPanel>
                        )}


                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <TusanButton
                                type="submit"
                                disabled={saving}
                                fullWidth
                            >
                                {saving ? "در حال ذخیره..." : "ایجاد خدمت"}
                            </TusanButton>

                            <Link href="/admin/services">
                                <TusanButton variant="secondary">
                                    انصراف
                                </TusanButton>
                            </Link>
                        </div>

                    </form>
                </GlassPanel>

            </div>
        </div>
    );
}