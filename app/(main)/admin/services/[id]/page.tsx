"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type ParentForm = {
    id: string;
    title: string;
    description: string | null;
};

export default function EditServicePage() {
    const params = useParams();
    const router = useRouter();
    const serviceId = params.id as string;

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [icon, setIcon] = useState("");
    const [isActive, setIsActive] = useState(true);

    // فرم اصلی این خدمت؛ همان‌جا با ServiceFormBuilder ویرایش می‌شود.
    const [formSchema, setFormSchema] = useState<FormField[]>([]);
    const [formId, setFormId] = useState<string | null>(null);

    // فرم مادر کاملاً اختیاری است.
    const [parentForms, setParentForms] = useState<ParentForm[]>([]);
    const [selectedParentId, setSelectedParentId] = useState<string>("");
    const [showParentOptions, setShowParentOptions] = useState(false);
    const [showCreateParent, setShowCreateParent] = useState(false);
    const [newParentTitle, setNewParentTitle] = useState("");
    const [newParentDescription, setNewParentDescription] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (serviceId) loadService();
    }, [serviceId]);

    async function loadService() {
        setLoading(true);
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

            const { data: service, error: serviceError } = await supabase
                .from("services")
                .select("*")
                .eq("id", serviceId)
                .single();

            if (serviceError || !service) {
                throw new Error("خدمت موردنظر پیدا نشد.");
            }

            setTitle(service.title || "");
            setCategory(service.category || "");
            setDescription(service.description || "");
            setPrice(service.price !== null && service.price !== undefined ? String(service.price) : "");
            setIcon(service.icon || "");
            setIsActive(service.is_active ?? true);
            setFormSchema(Array.isArray(service.form_schema) ? service.form_schema : []);

            // فرم‌های جدید hierarchy.
            const { data: forms, error: formsError } = await supabase
                .from("custom_forms")
                .select("id,title,description,schema,form_type,parent_form_id")
                .eq("service_id", serviceId)
                .order("created_at", { ascending: true });

            if (!formsError && forms) {
                const parents = forms.filter(
                    (form: any) => form.form_type === "parent" && !form.parent_form_id
                );
                setParentForms(parents);

                // ترجیح با فرم عادیِ بدون والد است؛ در غیر این صورت اولین فرم عادی.
                const normalForms = forms.filter((form: any) => form.form_type !== "parent");
                const mainForm = normalForms.find((form: any) => !form.parent_form_id) || normalForms[0];

                if (mainForm) {
                    setFormId(mainForm.id);
                    setFormSchema(Array.isArray(mainForm.schema) ? mainForm.schema : []);
                    setSelectedParentId(mainForm.parent_form_id || "");
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "خطایی هنگام دریافت اطلاعات خدمت رخ داد.");
        } finally {
            setLoading(false);
        }
    }

    async function createParentInline() {
        if (!newParentTitle.trim()) {
            setError("عنوان فرم مادر را وارد کنید.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("برای مدیریت فرم باید وارد حساب کاربری شوید.");

            const { data: parent, error: parentError } = await supabase
                .from("custom_forms")
                .insert({
                    title: newParentTitle.trim(),
                    description: newParentDescription.trim() || null,
                    schema: [],
                    created_by: user.id,
                    is_public: true,
                    form_type: "parent",
                    parent_form_id: null,
                    service_id: serviceId,
                    sort_order: 0,
                })
                .select("id,title,description")
                .single();

            if (parentError || !parent) {
                throw new Error(parentError?.message || "فرم مادر ایجاد نشد.");
            }

            setParentForms((items) => [...items, parent]);
            setSelectedParentId(parent.id);
            setShowCreateParent(false);
            setShowParentOptions(true);
            setNewParentTitle("");
            setNewParentDescription("");
        } catch (err: any) {
            setError(err?.message || "ایجاد فرم مادر انجام نشد.");
        } finally {
            setSaving(false);
        }
    }

    async function updateService(e: React.FormEvent) {
        e.preventDefault();

        if (!title.trim()) {
            setError("عنوان خدمت را وارد کنید.");
            return;
        }

        setError("");
        setSaving(true);

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

            const { error: updateError } = await supabase
                .from("services")
                .update({
                    title: title.trim(),
                    category: category.trim() || null,
                    description: description.trim() || null,
                    price: price ? Number(price) : 0,
                    icon: icon.trim() || null,
                    is_active: isActive,
                    // سازگاری با نسخه قدیمی DynamicServiceForm.
                    form_schema: formSchema,
                })
                .eq("id", serviceId);

            if (updateError) throw new Error(updateError.message);

            // اگر این خدمت قبلاً فرم hierarchy داشته، همان فرم عادی فعلی را بروزرسانی می‌کنیم.
            if (formId) {
                const { error: formError } = await supabase
                    .from("custom_forms")
                    .update({
                        title: title.trim(),
                        description: description.trim() || null,
                        schema: formSchema,
                        parent_form_id: selectedParentId || null,
                        form_type: "normal",
                    })
                    .eq("id", formId);

                if (formError) throw new Error(formError.message);
            } else {
                // برای خدمات قدیمی، اولین ذخیره فرم را به hierarchy منتقل می‌کنیم.
                const { data: newForm, error: formError } = await supabase
                    .from("custom_forms")
                    .insert({
                        title: title.trim(),
                        description: description.trim() || null,
                        schema: formSchema,
                        created_by: user.id,
                        is_public: true,
                        form_type: "normal",
                        parent_form_id: selectedParentId || null,
                        service_id: serviceId,
                        sort_order: 0,
                    })
                    .select("id")
                    .single();

                if (formError) throw new Error(formError.message);
                setFormId(newForm?.id || null);
            }

            router.push("/admin/services");
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "خطایی هنگام بروزرسانی خدمت رخ داد.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div dir="rtl" className="min-h-screen page-background flex items-center justify-center text-[var(--text)]">
                <GlassPanel className="p-10 text-center text-[var(--text-muted)]">در حال دریافت اطلاعات خدمت...</GlassPanel>
            </div>
        );
    }

    return (
        <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)] transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <SectionHeader title="ویرایش خدمت" description="اطلاعات خدمت و فرم آن را در همین صفحه مدیریت کنید." />
                    <Link href="/admin/services">
                        <TusanButton variant="secondary">بازگشت</TusanButton>
                    </Link>
                </div>

                <GlassPanel className="p-6">
                    <form onSubmit={updateService} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-5">
                            <div>
                                <label className="block font-bold mb-2">عنوان خدمت</label>
                                <TusanInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً ثبت نام کنکور" />
                            </div>
                            <div>
                                <label className="block font-bold mb-2">دسته‌بندی</label>
                                <TusanInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً آموزشی" />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">
                            <div>
                                <label className="block font-bold mb-2">آیکون</label>
                                <TusanInput value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="مثلاً 🎓" />
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
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none" />
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

                        {/* Parent selector — optional and directly below the form builder. */}
                        <TusanCard className="p-5 space-y-4">
                            <div>
                                <h3 className="font-bold text-lg">فرم مادر</h3>
                                <p className="text-sm text-gray-500 mt-1">این بخش کاملاً اختیاری است. اگر فرم مستقل است، هیچ گزینه‌ای انتخاب نکنید.</p>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showParentOptions}
                                    onChange={(e) => {
                                        setShowParentOptions(e.target.checked);
                                        if (!e.target.checked) setSelectedParentId("");
                                    }}
                                    className="w-5 h-5 accent-[#09967C]"
                                />
                                <span className="font-bold">این فرم داخل یک فرم مادر باشد</span>
                            </label>

                            {showParentOptions && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {parentForms.map((parent) => (
                                            <button
                                                key={parent.id}
                                                type="button"
                                                onClick={() => setSelectedParentId(parent.id)}
                                                className={`text-right rounded-xl border p-4 transition ${selectedParentId === parent.id ? "border-[#09967C] bg-[#09967C]/5 ring-2 ring-[#09967C]/20" : "border-gray-200 bg-white hover:border-[#09967C]/50"}`}
                                            >
                                                <div className="font-bold">{parent.title}</div>
                                                {parent.description && <div className="text-sm text-gray-500 mt-1">{parent.description}</div>}
                                            </button>
                                        ))}
                                    </div>

                                    {parentForms.length === 0 && !showCreateParent && (
                                        <div className="text-sm text-gray-500 border border-dashed rounded-xl p-4">برای این خدمت هنوز فرم مادری ایجاد نشده است.</div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setShowCreateParent((value) => !value)}
                                        className="text-[#09967C] font-bold text-sm"
                                    >
                                        {showCreateParent ? "− بستن ایجاد فرم مادر" : "+ ایجاد فرم مادر برای این خدمت"}
                                    </button>

                                    {showCreateParent && (
                                        <div className="rounded-xl bg-gray-50 p-4 space-y-4">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold mb-2">عنوان فرم مادر</label>
                                                    <TusanInput value={newParentTitle} onChange={(e) => setNewParentTitle(e.target.value)} placeholder="مثلاً ثبت نام خودرو" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold mb-2">توضیحات</label>
                                                    <TusanInput value={newParentDescription} onChange={(e) => setNewParentDescription(e.target.value)} placeholder="انتخاب نوع خودرو" />
                                                </div>
                                            </div>
                                            <TusanButton type="button" onClick={createParentInline} disabled={saving}>
                                                {saving ? "در حال ایجاد..." : "ایجاد و انتخاب فرم مادر"}
                                            </TusanButton>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TusanCard>

                        {error && <GlassPanel className="p-4 border border-red-200 bg-red-50 text-red-700">{error}</GlassPanel>}

                        <div className="flex gap-3 pt-2">
                            <TusanButton type="submit" disabled={saving} fullWidth>
                                {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                            </TusanButton>
                            <Link href="/admin/services">
                                <TusanButton variant="secondary">انصراف</TusanButton>
                            </Link>
                        </div>
                    </form>
                </GlassPanel>
            </div>
        </div>
    );
}
