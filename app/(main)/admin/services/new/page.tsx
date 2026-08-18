"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ServiceFormBuilder, { FormField } from "@/components/ServiceFormBuilder";
import { GlassPanel, TusanCard, TusanButton, TusanInput, SectionHeader } from "@/components/ui";

type ParentForm = {
    id: string;
    title: string;
    description: string | null;
    service_id: string | null;
};

export default function NewServicePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [icon, setIcon] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [formSchema, setFormSchema] = useState<FormField[]>([]);
    const [formDescription, setFormDescription] = useState("");

    const [useParent, setUseParent] = useState(false);
    const [parentForms, setParentForms] = useState<ParentForm[]>([]);
    const [selectedParentId, setSelectedParentId] = useState("");
    const [loadingParents, setLoadingParents] = useState(false);
    const [showCreateParent, setShowCreateParent] = useState(false);
    const [newParentTitle, setNewParentTitle] = useState("");
    const [newParentDescription, setNewParentDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (useParent) loadParentForms();
    }, [useParent]);

    async function loadParentForms() {
        setLoadingParents(true);
        try {
            const { data, error: formsError } = await supabase
                .from("custom_forms")
                .select("id,title,description,service_id")
                .eq("form_type", "parent")
                .is("parent_form_id", null)
                .eq("is_public", true)
                .order("created_at", { ascending: false });
            if (formsError) throw new Error(formsError.message);
            setParentForms(data || []);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "دریافت فهرست فرم‌های مادر انجام نشد.");
        } finally {
            setLoadingParents(false);
        }
    }

    async function getAdminUserId() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("برای مدیریت فرم باید وارد حساب کاربری شوید.");
        const { data: profile, error: profileError } = await supabase
            .from("profiles").select("role").eq("id", user.id).single();
        if (profileError || profile?.role !== "admin") {
            throw new Error("دسترسی مدیریت فرم‌ها فقط برای مدیر مجاز است.");
        }
        return user.id;
    }

    async function createParentInline(userId: string) {
        if (!newParentTitle.trim()) throw new Error("عنوان فرم مادر را وارد کنید.");
        const { data: parent, error: parentError } = await supabase
            .from("custom_forms")
            .insert({
                title: newParentTitle.trim(),
                description: newParentDescription.trim() || null,
                schema: [],
                created_by: userId,
                is_public: true,
                form_type: "parent",
                parent_form_id: null,
                service_id: null,
                sort_order: 0,
            })
            .select("id,title,description,service_id")
            .single();
        if (parentError || !parent) throw new Error(parentError?.message || "فرم مادر ایجاد نشد.");
        setParentForms(items => [parent, ...items]);
        setSelectedParentId(parent.id);
        setShowCreateParent(false);
        setNewParentTitle("");
        setNewParentDescription("");
        return parent.id;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return setError("عنوان خدمت را وارد کنید.");
        if (useParent && !selectedParentId) return setError("یک فرم مادر را انتخاب کنید یا فرم مادر جدید ایجاد کنید.");
        setSaving(true);
        setError("");
        try {
            const userId = await getAdminUserId();
            const { data: service, error: serviceError } = await supabase
                .from("services")
                .insert({
                    title: title.trim(), category: category.trim() || null,
                    description: description.trim() || null,
                    price: price ? Number(price) : 0, icon: icon.trim() || null,
                    is_active: isActive, form_schema: formSchema,
                })
                .select("id").single();
            if (serviceError || !service) throw new Error(serviceError?.message || "خدمت ایجاد نشد.");

            const { error: formError } = await supabase.from("custom_forms").insert({
                title: title.trim(),
                description: formDescription.trim() || description.trim() || null,
                schema: formSchema,
                created_by: userId,
                is_public: true,
                form_type: "normal",
                parent_form_id: useParent ? selectedParentId : null,
                service_id: service.id,
                sort_order: 0,
            });
            if (formError) {
                await supabase.from("services").delete().eq("id", service.id);
                throw new Error(formError.message);
            }
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
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <SectionHeader title="ایجاد خدمت" description="اطلاعات خدمت و فرم را در همین صفحه تکمیل کنید. انتخاب فرم مادر کاملاً اختیاری است." />
                    <Link href="/admin/services"><TusanButton variant="secondary">بازگشت</TusanButton></Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <GlassPanel className="p-6 space-y-6">
                        <div className="grid md:grid-cols-2 gap-5">
                            <div><label className="block font-bold mb-2">عنوان خدمت</label><TusanInput value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً ثبت نام سایپا" /></div>
                            <div><label className="block font-bold mb-2">دسته‌بندی</label><TusanInput value={category} onChange={e => setCategory(e.target.value)} placeholder="مثلاً خودرو" /></div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-5">
                            <div><label className="block font-bold mb-2">آیکون</label><TusanInput value={icon} onChange={e => setIcon(e.target.value)} placeholder="مثلاً 🚗" />{icon && <div className="mt-3 text-4xl">{icon}</div>}</div>
                            <div><label className="block font-bold mb-2">قیمت</label><TusanInput type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="مثلاً 150000" /></div>
                        </div>
                        <div><label className="block font-bold mb-2">توضیحات خدمت</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none" /></div>
                        <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-[#09967C]" /><span className="font-bold">خدمت فعال باشد</span></label>
                    </GlassPanel>

                    <GlassPanel className="p-6 space-y-4">
                        <div><h2 className="text-xl font-bold">ساخت فرم</h2><p className="text-sm text-gray-500 mt-1">فیلدهای فرم را همین حالا اضافه کنید؛ نیازی به ورود به صفحه دیگری نیست.</p></div>
                        <div><label className="block font-bold mb-2">توضیحات فرم</label><textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder="توضیحی که بالای فرم نمایش داده می‌شود..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none" /></div>
                        <ServiceFormBuilder value={formSchema} onChange={setFormSchema} />
                    </GlassPanel>

                    <TusanCard className="p-6 space-y-5">
                        <div><h2 className="text-xl font-bold">فرم مادر</h2><p className="text-sm text-gray-500 mt-1">این گزینه اختیاری است. اگر فرم مستقل است، آن را فعال نکنید.</p></div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={useParent} onChange={e => { setUseParent(e.target.checked); setError(""); if (!e.target.checked) { setSelectedParentId(""); setShowCreateParent(false); } }} className="w-5 h-5 accent-[#09967C]" />
                            <span className="font-bold">این فرم داخل یک فرم مادر باشد</span>
                        </label>
                        {useParent && <div className="border-t pt-5 space-y-4">
                            <div className="grid sm:grid-cols-2 gap-3">
                                {loadingParents ? <div className="sm:col-span-2 rounded-xl border border-dashed p-4 text-sm text-gray-500">در حال دریافت فرم‌های مادر...</div> : parentForms.length ? parentForms.map(parent => <button key={parent.id} type="button" onClick={() => { setSelectedParentId(parent.id); setShowCreateParent(false); }} className={`text-right rounded-xl border p-4 transition ${selectedParentId === parent.id ? "border-[#09967C] bg-[#09967C]/5 ring-2 ring-[#09967C]/20" : "border-gray-200 bg-white hover:border-[#09967C]/50"}`}><div className="font-bold">{parent.title}</div>{parent.description && <div className="text-sm text-gray-500 mt-1">{parent.description}</div>}</button>) : <div className="sm:col-span-2 rounded-xl border border-dashed p-4 text-sm text-gray-500">هنوز فرم مادر فعالی وجود ندارد.</div>}
                            </div>
                            {!showCreateParent ? <TusanButton type="button" variant="outline" onClick={() => { setShowCreateParent(true); setSelectedParentId(""); }}>＋ ایجاد فرم مادر برای این فرم</TusanButton> : <div className="rounded-2xl border border-[#09967C]/30 bg-[#09967C]/5 p-5 space-y-4">
                                <div className="font-bold">ایجاد فرم مادر در همین صفحه</div>
                                <div><label className="block text-sm font-bold mb-2">عنوان فرم مادر</label><TusanInput value={newParentTitle} onChange={e => setNewParentTitle(e.target.value)} placeholder="مثلاً ثبت نام خودرو" /></div>
                                <div><label className="block text-sm font-bold mb-2">توضیحات فرم مادر</label><textarea value={newParentDescription} onChange={e => setNewParentDescription(e.target.value)} rows={2} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none" /></div>
                                <div className="flex flex-wrap gap-2"><TusanButton type="button" disabled={saving} onClick={async () => { try { setSaving(true); setError(""); const userId = await getAdminUserId(); await createParentInline(userId); } catch (err: any) { setError(err?.message || "فرم مادر ایجاد نشد."); } finally { setSaving(false); } }}>{saving ? "در حال ایجاد..." : "ایجاد و انتخاب فرم مادر"}</TusanButton><TusanButton type="button" variant="secondary" onClick={() => { setShowCreateParent(false); setNewParentTitle(""); setNewParentDescription(""); }}>انصراف</TusanButton></div>
                            </div>}
                        </div>}
                    </TusanCard>

                    {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4">{error}</div>}
                    <div className="flex gap-3"><TusanButton type="submit" disabled={saving} fullWidth>{saving ? "در حال ذخیره..." : "ایجاد خدمت و فرم"}</TusanButton><Link href="/admin/services"><TusanButton type="button" variant="secondary">انصراف</TusanButton></Link></div>
                </form>
            </div>
        </div>
    );
}
