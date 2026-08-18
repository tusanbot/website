"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ServiceFormBuilder, {
    FormField,
} from "@/components/ServiceFormBuilder";
import {
    GlassPanel,
    TusanButton,
    TusanCard,
    TusanInput,
} from "@/components/ui";

type FormRow = {
    id: string;
    title: string;
    description: string | null;
    schema: FormField[] | null;
    form_type: "parent" | "normal";
    parent_form_id: string | null;
    service_id: string | null;
    sort_order: number;
    is_public: boolean;
};

type Props = {
    serviceId: string;
};

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

export default function FormHierarchyManager({ serviceId }: Props) {
    const [parent, setParent] = useState<FormRow | null>(null);
    const [children, setChildren] = useState<FormRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [parentTitle, setParentTitle] = useState("");
    const [parentDescription, setParentDescription] = useState("");

    const [newChildTitle, setNewChildTitle] = useState("");
    const [newChildDescription, setNewChildDescription] = useState("");
    const [newChildSchema, setNewChildSchema] = useState<FormField[]>([]);
    const [showNewChild, setShowNewChild] = useState(false);
    const [editingChildId, setEditingChildId] = useState<string | null>(null);

    useEffect(() => {
        loadForms();
    }, [serviceId]);

    async function loadForms() {
        setLoading(true);
        setError("");

        const { data, error: queryError } = await supabase
            .from("custom_forms")
            .select(
                "id,title,description,schema,form_type,parent_form_id,service_id,sort_order,is_public"
            )
            .eq("service_id", serviceId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (queryError) {
            setError(queryError.message);
            setLoading(false);
            return;
        }

        const rows: FormRow[] = (data || []).map((row: any) => ({
            ...row,
            schema: normalizeSchema(row.schema),
            form_type: row.form_type === "parent" ? "parent" : "normal",
            is_public: row.is_public ?? true,
            sort_order: row.sort_order ?? 0,
        }));

        const root = rows.find(
            (row) => row.form_type === "parent" && !row.parent_form_id
        ) || null;

        setParent(root);
        setChildren(
            root
                ? rows.filter((row) => row.parent_form_id === root.id)
                : []
        );

        setParentTitle(root?.title || "");
        setParentDescription(root?.description || "");
        setLoading(false);
    }

    async function getUserId() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("برای مدیریت فرم باید وارد حساب کاربری شوید.");
        }

        return user.id;
    }

    async function createParent() {
        if (!parentTitle.trim()) {
            setError("عنوان فرم مادر را وارد کنید.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const userId = await getUserId();

            const { error: insertError } = await supabase
                .from("custom_forms")
                .insert({
                    title: parentTitle.trim(),
                    description: parentDescription.trim() || null,
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

        const { error: updateError } = await supabase
            .from("custom_forms")
            .update({
                title: parentTitle.trim(),
                description: parentDescription.trim() || null,
            })
            .eq("id", parent.id);

        if (updateError) {
            setError(updateError.message);
        } else {
            await loadForms();
        }

        setSaving(false);
    }

    async function createChild() {
        if (!parent) {
            setError("ابتدا فرم مادر را ایجاد کنید.");
            return;
        }

        if (!newChildTitle.trim()) {
            setError("عنوان فرم فرزند را وارد کنید.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const userId = await getUserId();

            const { error: insertError } = await supabase
                .from("custom_forms")
                .insert({
                    title: newChildTitle.trim(),
                    description: newChildDescription.trim() || null,
                    schema: newChildSchema,
                    created_by: userId,
                    is_public: true,
                    form_type: "normal",
                    parent_form_id: parent.id,
                    service_id: serviceId,
                    sort_order: children.length,
                });

            if (insertError) throw new Error(insertError.message);

            setNewChildTitle("");
            setNewChildDescription("");
            setNewChildSchema([]);
            setShowNewChild(false);
            await loadForms();
        } catch (err: any) {
            setError(err?.message || "ایجاد فرم فرزند انجام نشد.");
        } finally {
            setSaving(false);
        }
    }

    async function saveChild(child: FormRow) {
        setSaving(true);
        setError("");

        const { error: updateError } = await supabase
            .from("custom_forms")
            .update({
                title: child.title.trim(),
                description: child.description?.trim() || null,
                schema: normalizeSchema(child.schema),
            })
            .eq("id", child.id);

        if (updateError) {
            setError(updateError.message);
        } else {
            setEditingChildId(null);
            await loadForms();
        }

        setSaving(false);
    }

    async function deleteChild(child: FormRow) {
        if (!confirm(`فرم «${child.title}» حذف شود؟`)) return;

        setSaving(true);
        setError("");

        const { error: deleteError } = await supabase
            .from("custom_forms")
            .delete()
            .eq("id", child.id);

        if (deleteError) {
            setError(deleteError.message);
        } else {
            await loadForms();
        }

        setSaving(false);
    }

    if (loading) {
        return (
            <GlassPanel className="p-5">
                <p className="text-sm text-gray-500">در حال دریافت ساختار فرم‌ها...</p>
            </GlassPanel>
        );
    }

    return (
        <GlassPanel className="p-5 space-y-5">
            <div>
                <h3 className="text-lg font-bold">ساختار فرم‌ها</h3>
                <p className="text-sm text-gray-500 mt-1">
                    هر خدمت می‌تواند یک فرم مادر داشته باشد و فرم‌های عادی آن به‌عنوان فرزند زیرمجموعه فرم مادر قرار بگیرند.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!parent ? (
                <TusanCard className="p-5 space-y-4">
                    <div className="font-bold">فرم مادر هنوز ایجاد نشده است</div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-2">عنوان فرم مادر</label>
                            <TusanInput
                                value={parentTitle}
                                onChange={(e) => setParentTitle(e.target.value)}
                                placeholder="مثلاً ثبت نام خودرو"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">توضیحات</label>
                            <TusanInput
                                value={parentDescription}
                                onChange={(e) => setParentDescription(e.target.value)}
                                placeholder="مثلاً انتخاب نوع خودروساز"
                            />
                        </div>
                    </div>

                    <TusanButton type="button" onClick={createParent} disabled={saving}>
                        {saving ? "در حال ایجاد..." : "ایجاد فرم مادر"}
                    </TusanButton>
                </TusanCard>
            ) : (
                <>
                    <TusanCard className="p-5 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold mb-2">فرم مادر</label>
                                <TusanInput
                                    value={parentTitle}
                                    onChange={(e) => setParentTitle(e.target.value)}
                                    disabled={saving}
                                />
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm font-bold mb-2">توضیحات</label>
                                <TusanInput
                                    value={parentDescription}
                                    onChange={(e) => setParentDescription(e.target.value)}
                                    disabled={saving}
                                />
                            </div>

                            <TusanButton type="button" variant="secondary" onClick={updateParent} disabled={saving}>
                                ذخیره فرم مادر
                            </TusanButton>
                        </div>
                    </TusanCard>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold">فرم‌های فرزند</h4>
                                <p className="text-sm text-gray-500">مثلاً سایپا، ایران‌خودرو، کرمان‌موتور و...</p>
                            </div>

                            <TusanButton
                                type="button"
                                onClick={() => setShowNewChild((value) => !value)}
                            >
                                {showNewChild ? "بستن" : "+ افزودن فرم فرزند"}
                            </TusanButton>
                        </div>

                        {showNewChild && (
                            <TusanCard className="p-5 space-y-5 border-2 border-dashed border-[#09967C]/30">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-2">عنوان فرم فرزند</label>
                                        <TusanInput
                                            value={newChildTitle}
                                            onChange={(e) => setNewChildTitle(e.target.value)}
                                            placeholder="مثلاً ثبت نام سایپا"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold mb-2">توضیحات</label>
                                        <TusanInput
                                            value={newChildDescription}
                                            onChange={(e) => setNewChildDescription(e.target.value)}
                                            placeholder="توضیحات فرم سایپا"
                                        />
                                    </div>
                                </div>

                                <ServiceFormBuilder
                                    value={newChildSchema}
                                    onChange={setNewChildSchema}
                                />

                                <TusanButton type="button" onClick={createChild} disabled={saving}>
                                    {saving ? "در حال ذخیره..." : "ایجاد فرم فرزند"}
                                </TusanButton>
                            </TusanCard>
                        )}

                        {children.length === 0 && !showNewChild && (
                            <div className="border border-dashed rounded-xl p-6 text-center text-gray-500">
                                هنوز فرم فرزندی ایجاد نشده است.
                            </div>
                        )}

                        {children.map((child) => {
                            const isEditing = editingChildId === child.id;

                            return (
                                <TusanCard key={child.id} className="p-5 space-y-4">
                                    {isEditing ? (
                                        <>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold mb-2">عنوان فرم</label>
                                                    <TusanInput
                                                        value={child.title}
                                                        onChange={(e) =>
                                                            setChildren((items) =>
                                                                items.map((item) =>
                                                                    item.id === child.id
                                                                        ? { ...item, title: e.target.value }
                                                                        : item
                                                                )
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-bold mb-2">توضیحات</label>
                                                    <TusanInput
                                                        value={child.description || ""}
                                                        onChange={(e) =>
                                                            setChildren((items) =>
                                                                items.map((item) =>
                                                                    item.id === child.id
                                                                        ? { ...item, description: e.target.value }
                                                                        : item
                                                                )
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <ServiceFormBuilder
                                                value={normalizeSchema(child.schema)}
                                                onChange={(schema) =>
                                                    setChildren((items) =>
                                                        items.map((item) =>
                                                            item.id === child.id
                                                                ? { ...item, schema }
                                                                : item
                                                        )
                                                    )
                                                }
                                            />

                                            <div className="flex gap-2">
                                                <TusanButton type="button" onClick={() => saveChild(child)} disabled={saving}>
                                                    ذخیره فرم
                                                </TusanButton>
                                                <TusanButton type="button" variant="secondary" onClick={() => setEditingChildId(null)}>
                                                    انصراف
                                                </TusanButton>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <div className="font-bold">{child.title}</div>
                                                {child.description && (
                                                    <div className="text-sm text-gray-500 mt-1">{child.description}</div>
                                                )}
                                                <div className="text-xs text-gray-400 mt-2">
                                                    {normalizeSchema(child.schema).length.toLocaleString("fa-IR")} فیلد
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <TusanButton type="button" size="sm" variant="outline" onClick={() => setEditingChildId(child.id)}>
                                                    ویرایش فرم
                                                </TusanButton>
                                                <TusanButton type="button" size="sm" variant="danger" onClick={() => deleteChild(child)} disabled={saving}>
                                                    حذف
                                                </TusanButton>
                                            </div>
                                        </div>
                                    )}
                                </TusanCard>
                            );
                        })}
                    </div>
                </>
            )}
        </GlassPanel>
    );
}
