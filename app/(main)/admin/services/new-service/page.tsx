"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ServiceFormBuilder, { FormField } from "@/components/ServiceFormBuilder";
import { GlassPanel, TusanCard, TusanButton, TusanInput, SectionHeader } from "@/components/ui";

export default function NewServicePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [icon, setIcon] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formSchema, setFormSchema] = useState<FormField[]>([]);
  const [withParent, setWithParent] = useState(false);
  const [childTitle, setChildTitle] = useState("");
  const [childDescription, setChildDescription] = useState("");
  const [childPrice, setChildPrice] = useState("");
  const [childSchema, setChildSchema] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function getAdminId() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("ابتدا وارد حساب مدیریت شوید.");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") throw new Error("دسترسی مدیریت مجاز نیست.");
    return user.id;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const userId = await getAdminId();
      if (!title.trim()) throw new Error("عنوان خدمت را وارد کنید.");
      const servicePrice = price.trim() === "" ? 0 : Number(price);
      if (!Number.isFinite(servicePrice) || servicePrice < 0) throw new Error("قیمت خدمت معتبر نیست.");

      const { data: service, error: serviceError } = await supabase.from("services").insert({
        title: title.trim(), category: category.trim() || null, description: description.trim() || null,
        price: servicePrice, icon: icon.trim() || null, is_active: isActive,
        form_schema: withParent ? [] : formSchema,
      }).select("id").single();
      if (serviceError || !service) throw new Error(serviceError?.message || "خدمت ایجاد نشد.");

      if (withParent) {
        const { data: parent, error: parentError } = await supabase.from("custom_forms").insert({
          title: title.trim(), description: description.trim() || null, schema: [], created_by: userId,
          is_public: true, form_type: "parent", parent_form_id: null, service_id: service.id, sort_order: 0,
        }).select("id").single();
        if (parentError || !parent) {
          await supabase.from("services").delete().eq("id", service.id);
          throw new Error(parentError?.message || "فرم مادر ایجاد نشد.");
        }

        if (childTitle.trim()) {
          const cp = childPrice.trim() === "" ? servicePrice : Number(childPrice);
          if (!Number.isFinite(cp) || cp < 0) throw new Error("قیمت فرم فرزند معتبر نیست.");
          const { error: childError } = await supabase.from("custom_forms").insert({
            title: childTitle.trim(), description: childDescription.trim() || null, price: cp,
            schema: childSchema, created_by: userId, is_public: true, form_type: "normal",
            parent_form_id: parent.id, service_id: service.id, sort_order: 0,
          });
          if (childError) throw new Error(childError.message);
        }
      }
      router.push("/admin/services"); router.refresh();
    } catch (err: any) {
      console.error(err); setError(err?.message || "خطایی هنگام ایجاد خدمت رخ داد.");
    } finally { setSaving(false); }
  }

  return <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]">
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <SectionHeader title="ایجاد خدمت جدید" description="فرم مادر اختیاری است؛ یک خدمت عادی می‌تواند بدون آن ایجاد شود." />
        <Link href="/admin/services"><TusanButton variant="secondary">بازگشت</TusanButton></Link>
      </div>
      <GlassPanel className="p-6">
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <form onSubmit={submit} className="space-y-6">
          <TusanCard className="p-5 space-y-5">
            <div><h2 className="text-lg font-bold">اطلاعات خدمت</h2><p className="text-sm text-gray-500 mt-1">این اطلاعات برای خود خدمت ذخیره می‌شود و مستقل از فرم مادر است.</p></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-bold mb-2">عنوان خدمت *</label><TusanInput value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً ثبت نام خودرو" /></div>
              <div><label className="block text-sm font-bold mb-2">دسته‌بندی</label><TusanInput value={category} onChange={e => setCategory(e.target.value)} placeholder="مثلاً خودرو" /></div>
              <div><label className="block text-sm font-bold mb-2">قیمت (تومان)</label><TusanInput type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="مثلاً 150000" /></div>
              <div><label className="block text-sm font-bold mb-2">آیکون</label><TusanInput value={icon} onChange={e => setIcon(e.target.value)} placeholder="مثلاً 🚗" /></div>
            </div>
            <div><label className="block text-sm font-bold mb-2">توضیحات خدمت</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none" /></div>
            <label className="flex items-center gap-3"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-[#09967C]" /><span className="font-bold">خدمت فعال باشد</span></label>
          </TusanCard>

          {!withParent && <TusanCard className="p-5"><ServiceFormBuilder value={formSchema} onChange={setFormSchema} /></TusanCard>}

          <TusanCard className="p-5 space-y-5">
            <div className="flex items-start gap-3">
              <input id="with-parent" type="checkbox" checked={withParent} onChange={e => setWithParent(e.target.checked)} className="mt-1 w-5 h-5 accent-[#09967C]" />
              <label htmlFor="with-parent" className="cursor-pointer"><div className="font-bold">برای این خدمت فرم مادر ایجاد شود</div><div className="text-sm text-gray-500 mt-1">اختیاری است. اگر فعال نباشد، خدمت به‌صورت عادی و مستقل ثبت می‌شود.</div></label>
            </div>
            {withParent && <div className="border-t pt-5 space-y-5">
              <div className="rounded-xl bg-[#09967C]/5 border border-[#09967C]/20 p-4 text-sm">عنوان فرم مادر از عنوان خدمت استفاده می‌کند. ایجاد فرم فرزند در همین مرحله اختیاری است و بعداً از بخش «فرم‌ها» هم می‌توانید فرزند اضافه کنید.</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold mb-2">عنوان اولین فرم فرزند (اختیاری)</label><TusanInput value={childTitle} onChange={e => setChildTitle(e.target.value)} placeholder="مثلاً سایپا" /></div>
                <div><label className="block text-sm font-bold mb-2">قیمت فرم فرزند</label><TusanInput type="number" min="0" value={childPrice} onChange={e => setChildPrice(e.target.value)} placeholder="خالی = قیمت خدمت" /></div>
              </div>
              <div><label className="block text-sm font-bold mb-2">توضیحات فرم فرزند</label><TusanInput value={childDescription} onChange={e => setChildDescription(e.target.value)} placeholder="توضیحات فرم" /></div>
              {childTitle.trim() && <ServiceFormBuilder value={childSchema} onChange={setChildSchema} />}
            </div>}
          </TusanCard>
          <div className="flex justify-end"><TusanButton type="submit" disabled={saving}>{saving ? "در حال ذخیره..." : "ایجاد خدمت"}</TusanButton></div>
        </form>
      </GlassPanel>
    </div>
  </div>;
}
