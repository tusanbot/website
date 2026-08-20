"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ServiceFormBuilder, { FormField } from "@/components/ServiceFormBuilder";
import { GlassPanel, TusanButton, TusanCard, TusanInput } from "@/components/ui";

type FormRow = {
    id: string;
    title: string;
    description: string | null;
    price: number;
    schema: FormField[] | null;
    form_type: "parent" | "normal";
    parent_form_id: string | null;
    service_id: string | null;
    sort_order: number;
    is_public: boolean;
};

type Props = { serviceId: string; parentServiceId?: string | null };

function normalizeSchema(value: any): FormField[] {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

export default function FormHierarchyManager({ serviceId, parentServiceId = null }: Props) {
    const [parent, setParent] = useState<FormRow | null>(null);
    const [parentOptions, setParentOptions] = useState<FormRow[]>([]);
    const [children, setChildren] = useState<FormRow[]>([]);
    const [unattachedForms, setUnattachedForms] = useState<FormRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [parentTitle, setParentTitle] = useState("");
    const [parentDescription, setParentDescription] = useState("");
    const [selectedParentId, setSelectedParentId] = useState("");
    const [newChildTitle, setNewChildTitle] = useState("");
    const [newChildDescription, setNewChildDescription] = useState("");
    const [newChildPrice, setNewChildPrice] = useState("");
    const [newChildSchema, setNewChildSchema] = useState<FormField[]>([]);
    const [showNewChild, setShowNewChild] = useState(false);
    const [editingChildId, setEditingChildId] = useState<string | null>(null);

    useEffect(() => {
        loadForms();
    }, [serviceId, parentServiceId]);

    async function loadForms() {
        setLoading(true);
        setError("");
        try {
            const [{ data: service, error: serviceError }, { data: currentRows, error: currentError }, { data: allParents, error: parentError }] = await Promise.all([
                supabase.from("services").select("parent_service_id").eq("id", serviceId).single(),
                supabase.from("custom_forms").select("id,title,description,price,schema,form_type,parent_form_id,service_id,sort_order,is_public").eq("service_id", serviceId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
                supabase.from("custom_forms").select("id,title,description,price,schema,form_type,parent_form_id,service_id,sort_order,is_public").eq("form_type", "parent").is("parent_form_id", null).order("title", { ascending: true }),
            ]);

            if (serviceError) throw new Error(serviceError.message);
            if (currentError) throw new Error(currentError.message);
            if (parentError) throw new Error(parentError.message);

            const rows: FormRow[] = (currentRows || []).map((row: any) => ({
                ...row,
                price: Number(row.price || 0),
                schema: normalizeSchema(row.schema),
                form_type: row.form_type === "parent" ? "parent" : "normal",
                is_public: row.is_public ?? true,
                sort_order: row.sort_order ?? 0,
            }));
            const options: FormRow[] = (allParents || []).map((row: any) => ({
                ...row,
                price: Number(row.price || 0),
                schema: normalizeSchema(row.schema),
                form_type: "parent",
                is_public: row.is_public ?? true,
                sort_order: row.sort_order ?? 0,
            }));

            const effectiveParentServiceId = parentServiceId || service?.parent_service_id || null;
            let root: FormRow | null = rows.find((row) => row.form_type === "parent" && !row.parent_form_id) || null;

            if (effectiveParentServiceId) {
                root = options.find((row) => row.service_id === effectiveParentServiceId) || null;
            }

            setParentOptions(options);
            setParent(root);
            setSelectedParentId(root?.id || "");
            setParentTitle(root?.title || "");
            setParentDescription(root?.description || "");
            setChildren(root ? rows.filter((row) => row.parent_form_id === root.id) : []);
            setUnattachedForms(root ? rows.filter((row) => row.form_type === "normal" && row.parent_form_id !== root.id) : rows.filter((row) => row.form_type === "normal"));
        } catch (err: any) {
            setError(err?.message || "دریافت ساختار فرم‌ها انجام نشد.");
        } finally {
            setLoading(false);
        }
    }

    async function getUserId() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("برای مدیریت فرم باید وارد حساب کاربری شوید.");
        return user.id;
    }

    async function attachToParent(formId: string) {
        const selected = parentOptions.find((item) => item.id === formId);
        if (!selected) {
            setError("فرم مادر انتخاب‌شده پیدا نشد.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const { error: serviceError } = await supabase.from("services").update({ parent_service_id: selected.service_id }).eq("id", serviceId);
            if (serviceError) throw new Error(serviceError.message);

            const { error: formError } = await supabase
                .from("custom_forms")
                .update({ parent_form_id: selected.id })
                .eq("service_id", serviceId)
                .eq("form_type", "normal");
            if (formError) throw new Error(formError.message);

            setSelectedParentId(selected.id);
            await loadForms();
        } catch (err: any) {
            setError(err?.message || "اتصال خدمت به فرم مادر انجام نشد.");
        } finally {
            setSaving(false);
        }
    }

    async function detachFromParent() {
        setSaving(true);
        setError("");
        try {
            const { error: serviceError } = await supabase.from("services").update({ parent_service_id: null }).eq("id", serviceId);
            if (serviceError) throw new Error(serviceError.message);
            const { error: formError } = await supabase.from("custom_forms").update({ parent_form_id: null }).eq("service_id", serviceId).eq("form_type", "normal");
            if (formError) throw new Error(formError.message);
            await loadForms();
        } catch (err: any) {
            setError(err?.message || "جدا کردن خدمت از فرم مادر انجام نشد.");
        } finally {
            setSaving(false);
        }
    }

    async function createParent() {
        if (parentServiceId) {
            setError("این خدمت زیرمجموعه یک خدمت مادر است و باید از فرم‌های مادر موجود استفاده کند.");
            return;
        }
        if (!parentTitle.trim()) {
            setError("عنوان فرم مادر را وارد کنید.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const userId = await getUserId();
            const { error: insertError } = await supabase.from("custom_forms").insert({
                title: parentTitle.trim(),
                description: parentDescription.trim() || null,
                price: 0,
                schema: [],
                created_by: userId,
                is_public: true,
                form_type: "parent",
                parent_form_id: null,
                service_id: serviceId,
                sort_order: 0,
            });
            if (insertError) throw new Error(insertError.message);
            await loadForms();
        } catch (err: any) {
            setError(err?.message || "ایجاد فرم مادر انجام نشد.");
        } finally {
            setSaving(false);
        }
    }

    async function updateParent() {
        if (!parent) return;
        if (!parentTitle.trim()) {
            setError("عنوان فرم مادر را وارد کنید.");
            return;
        }
        setSaving(true);
        setError("");
        const { error: updateError } = await supabase.from("custom_forms").update({ title: parentTitle.trim(), description: parentDescription.trim() || null }).eq("id", parent.id);
        if (updateError) setError(updateError.message);
        else await loadForms();
        setSaving(false);
    }

    async function createChild() {
        if (!parent) {
            setError("ابتدا یک فرم مادر موجود را انتخاب یا برای خدمت مادر ایجاد کنید.");
            return;
        }
        if (!newChildTitle.trim()) {
            setError("عنوان فرم فرزند را وارد کنید.");
            return;
        }
        const parsedPrice = newChildPrice.trim() === "" ? 0 : Number(newChildPrice);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            setError("مبلغ فرم فرزند معتبر نیست.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const userId = await getUserId();
            const { error: insertError } = await supabase.from("custom_forms").insert({
                title: newChildTitle.trim(),
                description: newChildDescription.trim() || null,
                price: parsedPrice,
                schema: newChildSchema,
                created_by: userId,
                is_public: true,
                form_type: "normal",
                parent_form_id: parent.id,
                service_id: serviceId,
                sort_order: children.length,
            });
            if (insertError) throw new Error(insertError.message);
            setNewChildTitle(""); setNewChildDescription(""); setNewChildPrice(""); setNewChildSchema([]); setShowNewChild(false);
            await loadForms();
        } catch (err: any) {
            setError(err?.message || "ایجاد فرم فرزند انجام نشد.");
        } finally {
            setSaving(false);
        }
    }

    async function saveChild(child: FormRow) {
        if (!Number.isFinite(Number(child.price)) || Number(child.price) < 0) {
            setError("مبلغ فرم فرزند معتبر نیست.");
            return;
        }
        setSaving(true); setError("");
        const { error: updateError } = await supabase.from("custom_forms").update({ title: child.title.trim(), description: child.description?.trim() || null, price: Number(child.price || 0), schema: normalizeSchema(child.schema) }).eq("id", child.id);
        if (updateError) setError(updateError.message);
        else { setEditingChildId(null); await loadForms(); }
        setSaving(false);
    }

    async function deleteChild(child: FormRow) {
        if (!confirm(`فرم «${child.title}» حذف شود؟`)) return;
        setSaving(true); setError("");
        const { error: deleteError } = await supabase.from("custom_forms").delete().eq("id", child.id);
        if (deleteError) setError(deleteError.message);
        else await loadForms();
        setSaving(false);
    }

    if (loading) return <GlassPanel className="p-5"><p className="text-sm text-gray-500">در حال دریافت ساختار فرم‌ها...</p></GlassPanel>;

    return (
        <GlassPanel className="p-5 space-y-5">
            <div>
                <h3 className="text-lg font-bold">ساختار فرم‌ها</h3>
                <p className="text-sm text-gray-500 mt-1">فرم مادر می‌تواند متعلق به یک خدمت مادر باشد و چند خدمت فرزند از همان فرم مادر استفاده کنند.</p>
            </div>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            {parentServiceId ? (
                <TusanCard className="p-5 space-y-4">
                    <div>
                        <div className="font-bold">انتخاب فرم مادر موجود</div>
                        <p className="text-sm text-gray-500 mt-1">فرم‌های مادر همه خدمات مادر در این فهرست هستند؛ نیازی به ساخت فرم مادر جدید برای این خدمت نیست.</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <select value={selectedParentId} onChange={(e) => setSelectedParentId(e.target.value)} disabled={saving} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none">
                            <option value="">انتخاب فرم مادر</option>
                            {parentOptions.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                        </select>
                        <TusanButton type="button" onClick={() => attachToParent(selectedParentId)} disabled={saving || !selectedParentId}>{saving ? "در حال اتصال..." : "اتصال به فرم مادر"}</TusanButton>
                        {parent && <TusanButton type="button" variant="secondary" onClick={detachFromParent} disabled={saving}>حذف اتصال</TusanButton>}
                    </div>
                </TusanCard>
            ) : !parent ? (
                <TusanCard className="p-5 space-y-4">
                    <div className="font-bold">فرم مادر هنوز ایجاد نشده است</div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold mb-2">عنوان فرم مادر</label><TusanInput value={parentTitle} onChange={(e) => setParentTitle(e.target.value)} placeholder="مثلاً ثبت نام خودرو" /></div>
                        <div><label className="block text-sm font-bold mb-2">توضیحات</label><TusanInput value={parentDescription} onChange={(e) => setParentDescription(e.target.value)} placeholder="مثلاً انتخاب نوع خودروساز" /></div>
                    </div>
                    <TusanButton type="button" onClick={createParent} disabled={saving}>{saving ? "در حال ایجاد..." : "ایجاد فرم مادر"}</TusanButton>
                </TusanCard>
            ) : (
                <TusanCard className="p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1"><label className="block text-sm font-bold mb-2">فرم مادر</label><TusanInput value={parentTitle} onChange={(e) => setParentTitle(e.target.value)} disabled={saving} /></div>
                        <div className="flex-1"><label className="block text-sm font-bold mb-2">توضیحات</label><TusanInput value={parentDescription} onChange={(e) => setParentDescription(e.target.value)} disabled={saving} /></div>
                        <TusanButton type="button" variant="secondary" onClick={updateParent} disabled={saving}>ذخیره فرم مادر</TusanButton>
                    </div>
                </TusanCard>
            )}

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div><h4 className="font-bold">فرم‌های فرزند این خدمت</h4><p className="text-sm text-gray-500">فرم‌های عادی این خدمت زیر فرم مادر انتخاب‌شده قرار می‌گیرند.</p></div>
                    <TusanButton type="button" onClick={() => setShowNewChild((value) => !value)} disabled={!parent}>{showNewChild ? "بستن" : "+ افزودن فرم فرزند"}</TusanButton>
                </div>

                {unattachedForms.length > 0 && parent && <TusanCard className="p-4 border-2 border-dashed border-amber-300 bg-amber-50/40">
                    <div className="font-bold text-amber-800">فرم‌های این خدمت هنوز به فرم مادر متصل نشده‌اند</div>
                    <div className="text-sm text-amber-700 mt-1">با اتصال فرم مادر، فرم‌های عادی موجود این خدمت به همان فرم مادر متصل می‌شوند.</div>
                    <div className="flex flex-wrap gap-2 mt-3">{unattachedForms.map(form => <span key={form.id} className="rounded-full bg-white border border-amber-200 px-3 py-1 text-sm">{form.title}</span>)}</div>
                    <div className="mt-3"><TusanButton type="button" onClick={() => attachToParent(parent.id)} disabled={saving}>{saving ? "در حال اتصال..." : "اتصال فرم‌های موجود"}</TusanButton></div>
                </TusanCard>}

                {showNewChild && parent && <TusanCard className="p-5 space-y-5 border-2 border-dashed border-[#09967C]/30">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div><label className="block text-sm font-bold mb-2">عنوان فرم فرزند</label><TusanInput value={newChildTitle} onChange={(e) => setNewChildTitle(e.target.value)} placeholder="مثلاً ثبت نام سایپا" /></div>
                        <div><label className="block text-sm font-bold mb-2">مبلغ (تومان)</label><TusanInput type="number" min="0" value={newChildPrice} onChange={(e) => setNewChildPrice(e.target.value)} placeholder="مثلاً 150000" /></div>
                        <div><label className="block text-sm font-bold mb-2">توضیحات</label><TusanInput value={newChildDescription} onChange={(e) => setNewChildDescription(e.target.value)} placeholder="توضیحات فرم سایپا" /></div>
                    </div>
                    <ServiceFormBuilder value={newChildSchema} onChange={setNewChildSchema} />
                    <TusanButton type="button" onClick={createChild} disabled={saving}>{saving ? "در حال ذخیره..." : "ایجاد فرم فرزند"}</TusanButton>
                </TusanCard>}

                {children.length === 0 && !showNewChild && <div className="border border-dashed rounded-xl p-6 text-center text-gray-500">هنوز فرم فرزندی به این فرم مادر متصل نشده است.</div>}

                {children.map((child) => {
                    const isEditing = editingChildId === child.id;
                    return <TusanCard key={child.id} className="p-5 space-y-4">
                        {isEditing ? <>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div><label className="block text-sm font-bold mb-2">عنوان فرم</label><TusanInput value={child.title} onChange={(e) => setChildren((items) => items.map((item) => item.id === child.id ? { ...item, title: e.target.value } : item))} /></div>
                                <div><label className="block text-sm font-bold mb-2">مبلغ (تومان)</label><TusanInput type="number" min="0" value={String(child.price ?? 0)} onChange={(e) => setChildren((items) => items.map((item) => item.id === child.id ? { ...item, price: Number(e.target.value || 0) } : item))} /></div>
                                <div><label className="block text-sm font-bold mb-2">توضیحات</label><TusanInput value={child.description || ""} onChange={(e) => setChildren((items) => items.map((item) => item.id === child.id ? { ...item, description: e.target.value } : item))} /></div>
                            </div>
                            <ServiceFormBuilder value={normalizeSchema(child.schema)} onChange={(schema) => setChildren((items) => items.map((item) => item.id === child.id ? { ...item, schema } : item))} />
                            <div className="flex gap-2"><TusanButton type="button" onClick={() => saveChild(child)} disabled={saving}>ذخیره فرم</TusanButton><TusanButton type="button" variant="secondary" onClick={() => setEditingChildId(null)}>انصراف</TusanButton></div>
                        </> : <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div><div className="font-bold">{child.title}</div><div className="text-sm text-gray-500 mt-1">{child.description || "بدون توضیحات"}</div><div className="text-sm font-bold text-[#09967C] mt-2">{Number(child.price || 0).toLocaleString("fa-IR")} تومان</div><div className="text-xs text-gray-400 mt-1">{normalizeSchema(child.schema).length.toLocaleString("fa-IR")} فیلد</div></div>
                            <div className="flex gap-2"><TusanButton type="button" variant="secondary" onClick={() => setEditingChildId(child.id)}>ویرایش</TusanButton><TusanButton type="button" variant="danger" onClick={() => deleteChild(child)}>حذف</TusanButton></div>
                        </div>}
                    </TusanCard>;
                })}
            </div>
        </GlassPanel>
    );
}
