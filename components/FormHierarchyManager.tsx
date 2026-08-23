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

type Props = { serviceId: string };

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
  const [newChildPrice, setNewChildPrice] = useState("");
  const [newChildSchema, setNewChildSchema] = useState<FormField[]>([]);
  const [showNewChild, setShowNewChild] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);

  useEffect(() => { loadForms(); }, [serviceId]);

  async function loadForms() {
    setLoading(true);
    setError("");
    try {
      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("id,service_type,parent_service_id,parent_form_id")
        .eq("id", serviceId)
        .single();
      if (serviceError || !service) throw new Error(serviceError?.message || "خدمت پیدا نشد.");

      let parentFormId = service.parent_form_id as string | null;

      // Backward-compatible repair for services that already point to a parent service.
      if (!parentFormId && service.parent_service_id) {
        const { data: parentService } = await supabase
          .from("services")
          .select("parent_form_id")
          .eq("id", service.parent_service_id)
          .single();
        parentFormId = parentService?.parent_form_id || null;
        if (parentFormId) {
          await supabase.from("services").update({ parent_form_id: parentFormId }).eq("id", serviceId);
        }
      }

      // A parent service owns its own parent form.
      if (!parentFormId && service.service_type === "parent") {
        const { data: ownParent } = await supabase
          .from("custom_forms")
          .select("id")
          .eq("service_id", serviceId)
          .eq("form_type", "parent")
          .is("parent_form_id", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        parentFormId = ownParent?.id || null;
        if (parentFormId) await supabase.from("services").update({ parent_form_id: parentFormId }).eq("id", serviceId);
      }

      let parentRow: FormRow | null = null;
      if (parentFormId) {
        const { data } = await supabase
          .from("custom_forms")
          .select("id,title,description,price,schema,form_type,parent_form_id,service_id,sort_order,is_public")
          .eq("id", parentFormId)
          .single();
        if (data) parentRow = { ...data, price: Number(data.price || 0), schema: normalizeSchema(data.schema), form_type: "parent", is_public: data.is_public ?? true, sort_order: data.sort_order ?? 0 };
      }

      const { data: childRows, error: childError } = await supabase
        .from("custom_forms")
        .select("id,title,description,price,schema,form_type,parent_form_id,service_id,sort_order,is_public")
        .eq("service_id", serviceId)
        .eq("form_type", "normal")
        .eq("parent_form_id", parentFormId || "00000000-0000-0000-0000-000000000000")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (childError) throw new Error(childError.message);

      const rows: FormRow[] = (childRows || []).map((row: any) => ({ ...row, price: Number(row.price || 0), schema: normalizeSchema(row.schema), form_type: "normal", is_public: row.is_public ?? true, sort_order: row.sort_order ?? 0 }));
      setParent(parentRow);
      setChildren(rows);
      setParentTitle(parentRow?.title || "");
      setParentDescription(parentRow?.description || "");
    } catch (err: any) {
      setError(err?.message || "خطایی هنگام دریافت ساختار فرم‌ها رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  async function getUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("برای مدیریت فرم باید وارد حساب کاربری شوید.");
    return user.id;
  }

  async function createParent() {
    if (!parentTitle.trim()) return setError("عنوان فرم مادر را وارد کنید.");
    setSaving(true); setError("");
    try {
      const userId = await getUserId();
      const { data, error: insertError } = await supabase.from("custom_forms").insert({
        title: parentTitle.trim(), description: parentDescription.trim() || null, price: 0, schema: [], created_by: userId,
        is_public: true, form_type: "parent", parent_form_id: null, service_id: serviceId, sort_order: 0,
      }).select("id").single();
      if (insertError || !data) throw new Error(insertError?.message || "ایجاد فرم مادر انجام نشد.");
      const { error: linkError } = await supabase.from("services").update({ parent_form_id: data.id }).eq("id", serviceId);
      if (linkError) throw new Error(linkError.message);
      await loadForms();
    } catch (err: any) { setError(err?.message || "ایجاد فرم مادر انجام نشد."); }
    finally { setSaving(false); }
  }

  async function updateParent() {
    if (!parent) return;
    if (!parentTitle.trim()) return setError("عنوان فرم مادر را وارد کنید.");
    setSaving(true); setError("");
    const { error: updateError } = await supabase.from("custom_forms").update({ title: parentTitle.trim(), description: parentDescription.trim() || null }).eq("id", parent.id);
    if (updateError) setError(updateError.message); else await loadForms();
    setSaving(false);
  }

  async function createChild() {
    if (!parent) return setError("ابتدا یک فرم مادر برای این خدمت انتخاب یا ایجاد کنید.");
    if (!newChildTitle.trim()) return setError("عنوان فرم فرزند را وارد کنید.");
    const parsedPrice = newChildPrice.trim() === "" ? 0 : Number(newChildPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return setError("مبلغ فرم فرزند معتبر نیست.");
    setSaving(true); setError("");
    try {
      const userId = await getUserId();
      const { error: insertError } = await supabase.from("custom_forms").insert({
        title: newChildTitle.trim(), description: newChildDescription.trim() || null, price: parsedPrice, schema: newChildSchema,
        created_by: userId, is_public: true, form_type: "normal", parent_form_id: parent.id, service_id: serviceId, sort_order: children.length,
      });
      if (insertError) throw new Error(insertError.message);
      setNewChildTitle(""); setNewChildDescription(""); setNewChildPrice(""); setNewChildSchema([]); setShowNewChild(false); await loadForms();
    } catch (err: any) { setError(err?.message || "ایجاد فرم فرزند انجام نشد."); }
    finally { setSaving(false); }
  }

  async function saveChild(child: FormRow) {
    if (!Number.isFinite(Number(child.price)) || Number(child.price) < 0) return setError("مبلغ فرم فرزند معتبر نیست.");
    setSaving(true); setError("");
    const { error: updateError } = await supabase.from("custom_forms").update({ title: child.title.trim(), description: child.description?.trim() || null, price: Number(child.price || 0), schema: normalizeSchema(child.schema) }).eq("id", child.id);
    if (updateError) setError(updateError.message); else { setEditingChildId(null); await loadForms(); }
    setSaving(false);
  }

  async function deleteChild(child: FormRow) {
    if (!confirm(`فرم «${child.title}» حذف شود؟`)) return;
    setSaving(true); setError("");
    const { error: deleteError } = await supabase.from("custom_forms").delete().eq("id", child.id);
    if (deleteError) setError(deleteError.message); else await loadForms();
    setSaving(false);
  }

  if (loading) return <GlassPanel className="p-5"><p className="text-sm text-gray-500">در حال دریافت ساختار فرم‌ها...</p></GlassPanel>;

  return <GlassPanel className="p-5 space-y-5">
    <div><h3 className="text-lg font-bold">ساختار فرم‌ها</h3><p className="text-sm text-gray-500 mt-1">فرم مادر می‌تواند از قبل وجود داشته باشد و چند خدمت از همان فرم مادر استفاده کنند؛ فرم‌های فرزند همچنان مخصوص همین خدمت هستند.</p></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

    {!parent ? <TusanCard className="p-5 space-y-4">
      <div className="font-bold">برای این خدمت فرم مادر متصل نشده است</div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-bold mb-2">عنوان فرم مادر جدید</label><TusanInput value={parentTitle} onChange={e => setParentTitle(e.target.value)} placeholder="مثلاً ثبت نام خودرو" /></div>
        <div><label className="block text-sm font-bold mb-2">توضیحات</label><TusanInput value={parentDescription} onChange={e => setParentDescription(e.target.value)} placeholder="توضیحات فرم مادر" /></div>
      </div>
      <TusanButton type="button" onClick={createParent} disabled={saving}>{saving ? "در حال ایجاد..." : "ایجاد و اتصال فرم مادر"}</TusanButton>
    </TusanCard> : <>
      <TusanCard className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1"><label className="block text-sm font-bold mb-2">فرم مادر مرتبط</label><TusanInput value={parentTitle} onChange={e => setParentTitle(e.target.value)} disabled={saving} /></div>
          <div className="flex-1"><label className="block text-sm font-bold mb-2">توضیحات</label><TusanInput value={parentDescription} onChange={e => setParentDescription(e.target.value)} disabled={saving} /></div>
          <TusanButton type="button" variant="secondary" onClick={updateParent} disabled={saving}>ذخیره فرم مادر</TusanButton>
        </div>
      </TusanCard>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><div><h4 className="font-bold">فرم‌های فرزند</h4><p className="text-sm text-gray-500">فرم‌های اختصاصی همین خدمت زیر فرم مادر قرار می‌گیرند.</p></div><TusanButton type="button" onClick={() => setShowNewChild(v => !v)}>{showNewChild ? "بستن" : "+ افزودن فرم فرزند"}</TusanButton></div>
        {showNewChild && <TusanCard className="p-5 space-y-5 border-2 border-dashed border-[#09967C]/30"><div className="grid md:grid-cols-3 gap-4"><div><label className="block text-sm font-bold mb-2">عنوان فرم فرزند</label><TusanInput value={newChildTitle} onChange={e => setNewChildTitle(e.target.value)} placeholder="مثلاً ثبت نام سایپا" /></div><div><label className="block text-sm font-bold mb-2">مبلغ (تومان)</label><TusanInput type="number" min="0" value={newChildPrice} onChange={e => setNewChildPrice(e.target.value)} /></div><div><label className="block text-sm font-bold mb-2">توضیحات</label><TusanInput value={newChildDescription} onChange={e => setNewChildDescription(e.target.value)} /></div></div><ServiceFormBuilder value={newChildSchema} onChange={setNewChildSchema} /><TusanButton type="button" onClick={createChild} disabled={saving}>{saving ? "در حال ذخیره..." : "ایجاد فرم فرزند"}</TusanButton></TusanCard>}
        {children.length === 0 && !showNewChild && <div className="border border-dashed rounded-xl p-6 text-center text-gray-500">هنوز فرم فرزندی برای این خدمت ایجاد نشده است.</div>}
        {children.map(child => { const isEditing = editingChildId === child.id; return <TusanCard key={child.id} className="p-5 space-y-4">{isEditing ? <><div className="grid md:grid-cols-3 gap-4"><div><label className="block text-sm font-bold mb-2">عنوان فرم</label><TusanInput value={child.title} onChange={e => setChildren(items => items.map(item => item.id === child.id ? {...item,title:e.target.value} : item))} /></div><div><label className="block text-sm font-bold mb-2">مبلغ (تومان)</label><TusanInput type="number" min="0" value={String(child.price ?? 0)} onChange={e => setChildren(items => items.map(item => item.id === child.id ? {...item,price:Number(e.target.value || 0)} : item))} /></div><div><label className="block text-sm font-bold mb-2">توضیحات</label><TusanInput value={child.description || ""} onChange={e => setChildren(items => items.map(item => item.id === child.id ? {...item,description:e.target.value} : item))} /></div></div><ServiceFormBuilder value={normalizeSchema(child.schema)} onChange={schema => setChildren(items => items.map(item => item.id === child.id ? {...item,schema} : item))} /><div className="flex gap-2"><TusanButton type="button" onClick={() => saveChild(child)} disabled={saving}>ذخیره فرم</TusanButton><TusanButton type="button" variant="secondary" onClick={() => setEditingChildId(null)}>انصراف</TusanButton></div></> : <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><div className="font-bold">{child.title}</div><div className="text-sm text-gray-500 mt-1">{child.description || "بدون توضیحات"}</div><div className="text-sm font-bold text-[#09967C] mt-2">{Number(child.price || 0).toLocaleString("fa-IR")} تومان</div><div className="text-xs text-gray-400 mt-1">{normalizeSchema(child.schema).length.toLocaleString("fa-IR")} فیلد</div></div><div className="flex gap-2"><TusanButton type="button" variant="secondary" onClick={() => setEditingChildId(child.id)}>ویرایش</TusanButton><TusanButton type="button" variant="danger" onClick={() => deleteChild(child)}>حذف</TusanButton></div></div>}</TusanCard>; })}
      </div>
    </>}
  </GlassPanel>;
}
