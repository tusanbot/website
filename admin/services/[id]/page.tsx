"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ServiceFormBuilder, { FormField } from "@/components/ServiceFormBuilder";
import FormHierarchyManager from "@/components/FormHierarchyManager";
import { GlassPanel, TusanCard, TusanButton, TusanInput, SectionHeader } from "@/components/ui";

type Service = { id: string; title: string; category: string | null };

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
  const [formSchema, setFormSchema] = useState<FormField[]>([]);
  const [parentServices, setParentServices] = useState<Service[]>([]);
  const [parentServiceId, setParentServiceId] = useState("");
  const [loadingParents, setLoadingParents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (serviceId) loadService(); }, [serviceId]);

  async function loadParentServices(currentServiceId?: string) {
    setLoadingParents(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id,title,category")
        .eq("service_type", "parent")
        .eq("is_active", true)
        .neq("id", currentServiceId || "00000000-0000-0000-0000-000000000000")
        .order("title", { ascending: true });
      if (error) throw new Error(error.message);
      setParentServices(data || []);
    } catch (err: any) {
      setError(err?.message || "دریافت فهرست خدمات مادر انجام نشد.");
    } finally { setLoadingParents(false); }
  }

  async function loadService() {
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }
      const { data: service, error: serviceError } = await supabase.from("services").select("*").eq("id", serviceId).single();
      if (serviceError || !service) throw new Error("خدمت موردنظر پیدا نشد.");
      setTitle(service.title || "");
      setCategory(service.category || "");
      setDescription(service.description || "");
      setPrice(service.price == null ? "" : String(service.price));
      setIcon(service.icon || "");
      setIsActive(service.is_active ?? true);
      setFormSchema(Array.isArray(service.form_schema) ? service.form_schema : []);
      setParentServiceId(service.parent_service_id || "");
      await loadParentServices(service.id);
    } catch (err: any) { setError(err?.message || "خطایی هنگام دریافت اطلاعات خدمت رخ داد."); }
    finally { setLoading(false); }
  }

  async function updateService(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("عنوان خدمت را وارد کنید."); return; }
    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ابتدا وارد حساب مدیریت شوید.");
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") throw new Error("دسترسی مدیریت مجاز نیست.");
      const parsedPrice = price.trim() === "" ? 0 : Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) throw new Error("قیمت خدمت معتبر نیست.");
      const { error: updateError } = await supabase.from("services").update({
        title: title.trim(), category: category.trim() || null, description: description.trim() || null,
        price: parsedPrice, icon: icon.trim() || null, is_active: isActive, form_schema: formSchema,
        parent_service_id: parentServiceId || null,
      }).eq("id", serviceId);
      if (updateError) throw new Error(updateError.message);
      router.push("/admin/services"); router.refresh();
    } catch (err: any) { setError(err?.message || "خطایی هنگام بروزرسانی خدمت رخ داد."); }
    finally { setSaving(false); }
  }

  if (loading) return <div dir="rtl" className="min-h-screen page-background flex items-center justify-center"><GlassPanel className="p-10">در حال دریافت اطلاعات خدمت...</GlassPanel></div>;

  return <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]">
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <SectionHeader title="ویرایش خدمت" description="اطلاعات خدمت و ساختار فرم مادر و فرزند را مدیریت کنید." />
        <Link href="/admin/services"><TusanButton variant="secondary">بازگشت</TusanButton></Link>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <GlassPanel className="p-6">
        <form onSubmit={updateService} className="space-y-6">
          <TusanCard className="p-5 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div><label className="block font-bold mb-2">عنوان خدمت</label><TusanInput value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div><label className="block font-bold mb-2">دسته‌بندی</label><TusanInput value={category} onChange={e => setCategory(e.target.value)} /></div>
              <div><label className="block font-bold mb-2">قیمت (تومان)</label><TusanInput type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} /></div>
              <div><label className="block font-bold mb-2">آیکون</label><TusanInput value={icon} onChange={e => setIcon(e.target.value)} /></div>
            </div>
            <div><label className="block font-bold mb-2">توضیحات خدمت</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3" /></div>
            <label className="flex items-center gap-3"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-[#09967C]" /><span className="font-bold">خدمت فعال باشد</span></label>
          </TusanCard>

          <TusanCard className="p-5 space-y-4">
            <div>
              <h3 className="font-bold">خدمت مادر</h3>
              <p className="text-sm text-[var(--muted)] mt-1">در صورت انتخاب، این خدمت به‌عنوان زیرمجموعه خدمت مادر در سایت نمایش داده می‌شود.</p>
            </div>
            <select value={parentServiceId} onChange={e => setParentServiceId(e.target.value)} disabled={loadingParents || saving} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none">
              <option value="">بدون خدمت مادر (خدمت مستقل)</option>
              {parentServices.map(parent => <option key={parent.id} value={parent.id}>{parent.title}{parent.category ? ` — ${parent.category}` : ""}</option>)}
            </select>
            {!loadingParents && parentServices.length === 0 && <p className="text-sm text-amber-600">خدمت مادر فعالی برای انتخاب وجود ندارد.</p>}
          </TusanCard>

          <TusanCard className="p-5"><ServiceFormBuilder value={formSchema} onChange={setFormSchema} /></TusanCard>
          <div className="flex justify-end"><TusanButton type="submit" disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره اطلاعات خدمت"}</TusanButton></div>
        </form>
      </GlassPanel>

      <FormHierarchyManager serviceId={serviceId} />
    </div>
  </div>;
}
