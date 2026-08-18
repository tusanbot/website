"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ServiceFormBuilder, { FormField } from "@/components/ServiceFormBuilder";
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

    // فرم همان‌جا ساخته می‌شود؛ دیگر مرحله جداگانه‌ای برای ساخت فرم وجود ندارد.
    const [formSchema, setFormSchema] = useState<FormField[]>([]);
    const [createParent, setCreateParent] = useState(false);
    const [parentTitle, setParentTitle] = useState("");
    const [parentDescription, setParentDescription] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function createService(e: React.FormEvent) {
        e.preventDefault();

        if (!title.trim()) {
            setError("عنوان خدمت را وارد کنید.");
            return;
        }

        if (createParent && !parentTitle.trim()) {
            setError("عنوان فرم مادر را وارد کنید.");
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

            // اول خود خدمت ساخته می‌شود تا فرم ایجادشده بتواند به آن متصل شود.
            const { data: service, error: serviceError } = await supabase
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

            if (serviceError || !service) {
                throw new Error(serviceError?.message || "خدمت ایجاد نشد.");
            }

            let parentId: string | null = null;

            if (createParent) {
                const { data: parent, error: parentError } = await supabase
                    .from("custom_forms")
                    .insert({
                        title: parentTitle.trim(),
                        description: parentDescription.trim() || null,
                        schema: [],
                        created_by: user.id,
                        is_public: true,
                        form_type: "parent",
                        parent_form_id: null,
                        service_id: service.id,
                        sort_order: 0,
                    })
                    .select("id")
                    .single();

                if (parentError || !parent) {
                    throw new Error(parentError?.message || "فرم مادر ایجاد نشد.");
                }

                parentId = parent.id;
            }

            // فرم عادی/اصلی اختیاری است و می‌تواند مستقل یا زیرمجموعه فرم مادر باشد.
            const { error: formError } = await supabase
                .from("custom_forms")
                .insert({
                    title: title.trim(),
                    description: description.trim() || null,
                    schema: formSchema,
                    created_by: user.id,
                    is_public: true,
                    form_type: "normal",
                    parent_form_id: parentId,
                    service_id: service.id,
                    sort_order: 0,
                });

            if (formError) {
                throw new Error(formError.message);
            }

            // فرم و فیلدها در همین صفحه ساخته شدند؛ دیگر به صفحه فرم مادر منتقل نمی‌شویم.
            router.push("/admin/services");
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "خطایی هنگام ایجاد خدمت و فرم رخ داد.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <SectionHeader
                        title="افزودن خدمت جدید"
                        description="اطلاعات خدمت، فیلدهای فرم و در صورت نیاز فرم مادر را در همین صفحه تعریف کنید."
                    />
                    <Link href="/admin/services">
                        <TusanButton variant="secondary">بازگشت</TusanButton>
                    </Link>
                </div>

                <GlassPanel className="p-6">
                    <form onSubmit={createService} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-5">
                            <div>
                                <label className="block font-bold mb-2">عنوان خدمت</label>
                                <TusanInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً ثبت نام خودرو" />
                            </div>

                            <div>
                                <label className="block font-bold mb-2">دسته‌بندی</label>
                                <TusanInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً خودرو" />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">
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
                        </div>

                        <TusanCard className="p-4">
                            <label className="block font-bold mb-2">توضیحات</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیح مختصری درباره این خدمت..." rows={4} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none" />
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

                        <GlassPanel className="p-5">
                            <ServiceFormBuilder value={formSchema} onChange={setFormSchema} />
                        </GlassPanel>

                        <TusanCard className="p-5 space-y-4">
                            <div>
                                <h3 className="font-bold text-lg">فرم مادر</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    اختیاری است. اگر این فرم باید زیر یک فرم مادر قرار بگیرد، گزینه زیر را فعال کنید.
                                </p>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={createParent}
                                    onChange={(e) => setCreateParent(e.target.checked)}
                                    className="w-5 h-5 accent-[#09967C]"
                                />
                                <span className="font-bold">این فرم زیر یک فرم مادر قرار بگیرد</span>
                            </label>

                            {createParent && (
                                <div className="grid md:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-sm font-bold mb-2">عنوان فرم مادر</label>
                                        <TusanInput value={parentTitle} onChange={(e) => setParentTitle(e.target.value)} placeholder="مثلاً ثبت نام خودرو" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-2">توضیحات فرم مادر</label>
                                        <TusanInput value={parentDescription} onChange={(e) => setParentDescription(e.target.value)} placeholder="انتخاب نوع خودرو" />
                                    </div>
                                </div>
                            )}
                        </TusanCard>

                        {error && <GlassPanel className="p-4 border border-red-200 bg-red-50 text-red-700">{error}</GlassPanel>}

                        <div className="flex gap-3 pt-2">
                            <TusanButton type="submit" disabled={saving} fullWidth>
                                {saving ? "در حال ذخیره..." : "ایجاد خدمت و فرم"}
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
