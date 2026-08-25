"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ServiceFormBuilder, { FormField } from "@/components/ServiceFormBuilder";
import AdminAiWriter from "@/components/admin/AdminAiWriter";
import { GlassPanel, TusanCard, TusanButton, TusanInput, SectionHeader } from "@/components/ui";

type ParentService = { id: string; title: string; parent_form_id: string | null };
type ParentForm = { id: string; title: string; service_id: string | null };

export default function NewServicePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"normal" | "parent">("normal");
  const [title, setTitle] = useState(""); const [category, setCategory] = useState(""); const [description, setDescription] = useState(""); const [price, setPrice] = useState(""); const [icon, setIcon] = useState(""); const [isActive, setIsActive] = useState(true);
  const [slug, setSlug] = useState(""); const [metaTitle, setMetaTitle] = useState(""); const [metaDescription, setMetaDescription] = useState(""); const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [formSchema, setFormSchema] = useState<FormField[]>([]);
  const [useParent, setUseParent] = useState(false); const [parentServiceId, setParentServiceId] = useState(""); const [parentFormId, setParentFormId] = useState("");
  const [parentServices, setParentServices] = useState<ParentService[]>([]); const [parentForms, setParentForms] = useState<ParentForm[]>([]);
  const [loadingParents, setLoadingParents] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState("");

  useEffect(() => { if (mode === "normal" && useParent) loadParentData(); }, [mode, useParent]);
  async function loadParentData() {
    setLoadingParents(true); setError("");
    try {
      const [{ data: services, error: serviceError }, { data: forms, error: formError }] = await Promise.all([
        supabase.from("services").select("id,title,parent_form_id").eq("service_type", "parent").order("title"),
        supabase.from("custom_forms").select("id,title,service_id").eq("form_type", "parent").is("parent_form_id", null).order("title"),
      ]);
      if (serviceError) throw new Error(serviceError.message); if (formError) throw new Error(formError.message);
      setParentServices(services || []); setParentForms(forms || []);
    } catch (err: any) { setError(err?.message || "دریافت فرم‌های مادر انجام نشد."); } finally { setLoadingParents(false); }
  }
  function handleParentServiceChange(id: string) { setParentServiceId(id); const selected = parentServices.find(item => item.id === id); if (selected?.parent_form_id) setParentFormId(selected.parent_form_id); }
  function resetForMode(next: "normal" | "parent") { setMode(next); setError(""); setTitle(""); setCategory(""); setDescription(""); setPrice(""); setIcon(""); setSlug(""); setMetaTitle(""); setMetaDescription(""); setSeoKeywords([]); setFormSchema([]); setUseParent(false); setParentServiceId(""); setParentFormId(""); }
  async function getAdminId() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("ابتدا وارد حساب مدیریت شوید.");
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") throw new Error("دسترسی مدیریت مجاز نیست.");
    return user.id;
  }
  const applyAi = (data: Record<string, unknown>) => {
    if (data.title) setTitle(String(data.title)); if (data.slug) setSlug(String(data.slug)); if (data.category) setCategory(String(data.category)); if (data.description) setDescription(String(data.description)); if (data.icon) setIcon(String(data.icon));
    if (data.meta_title) setMetaTitle(String(data.meta_title)); if (data.meta_description) setMetaDescription(String(data.meta_description)); if (Array.isArray(data.seo_keywords)) setSeoKeywords(data.seo_keywords.map(String).slice(0, 12));
    if (Array.isArray(data.formSchema)) setFormSchema(data.formSchema as FormField[]);
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const userId = await getAdminId(); if (!title.trim()) throw new Error("عنوان خدمت را وارد کنید.");
      const servicePrice = price.trim() === "" ? 0 : Number(price); if (!Number.isFinite(servicePrice) || servicePrice < 0) throw new Error("قیمت خدمت معتبر نیست.");
      if (mode === "parent") {
        const { data: service, error: serviceError } = await supabase.from("services").insert({ title: title.trim(), slug: slug.trim() || null, category: category.trim() || null, description: description.trim() || null, price: 0, icon: icon.trim() || null, is_active: isActive, meta_title: metaTitle.trim() || null, meta_description: metaDescription.trim() || null, seo_keywords: seoKeywords, form_schema: [], parent_service_id: null, parent_form_id: null, service_type: "parent" }).select("id").single();
        if (serviceError || !service) throw new Error(serviceError?.message || "خدمت مادر ایجاد نشد.");
        const { data: form, error: formError } = await supabase.from("custom_forms").insert({ title: title.trim(), description: description.trim() || null, schema: [], created_by: userId, is_public: true, form_type: "parent", parent_form_id: null, service_id: service.id, sort_order: 0 }).select("id").single();
        if (formError || !form) throw new Error(formError?.message || "فرم مادر ایجاد نشد.");
        const { error: linkError } = await supabase.from("services").update({ parent_form_id: form.id }).eq("id", service.id); if (linkError) throw new Error(linkError.message);
      } else {
        if (useParent && !parentFormId) throw new Error("یک فرم مادر موجود را انتخاب کنید.");
        const { data: service, error: serviceError } = await supabase.from("services").insert({ title: title.trim(), slug: slug.trim() || null, category: category.trim() || null, description: description.trim() || null, price: servicePrice, icon: icon.trim() || null, is_active: isActive, meta_title: metaTitle.trim() || null, meta_description: metaDescription.trim() || null, seo_keywords: seoKeywords, form_schema: formSchema, parent_service_id: useParent ? (parentServiceId || null) : null, parent_form_id: useParent ? (parentFormId || null) : null, service_type: "normal" }).select("id").single();
        if (serviceError || !service) throw new Error(serviceError?.message || "خدمت ایجاد نشد.");
        const { error: formError } = await supabase.from("custom_forms").insert({ title: title.trim(), description: description.trim() || null, schema: formSchema, created_by: userId, is_public: true, form_type: "normal", parent_form_id: useParent ? (parentFormId || null) : null, service_id: service.id, sort_order: 0 });
        if (formError) throw new Error(formError.message);
      }
      router.push("/admin/services"); router.refresh();
    } catch (err: any) { console.error(err); setError(err?.message || "خطایی هنگام ایجاد خدمت رخ داد."); } finally { setSaving(false); }
  }
  return <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]"><div className="max-w-4xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"><SectionHeader title="ایجاد خدمت" description="خدمت مادر و خدمت معمولی به‌صورت جداگانه مدیریت می‌شوند." /><Link href="/admin/services"><TusanButton variant="secondary">بازگشت</TusanButton></Link></div>
    <div className="grid sm:grid-cols-2 gap-3 mb-6"><button type="button" onClick={() => resetForMode("normal")} className={`rounded-2xl border p-5 text-right transition ${mode === "normal" ? "border-[#09967C] bg-[#09967C]/5 ring-2 ring-[#09967C]/20" : "border-[var(--border)] bg-[var(--surface)]"}`}><div className="font-black text-lg">ایجاد خدمت معمولی</div><div className="text-sm text-[var(--muted)] mt-1">خدمت مستقل یا زیرمجموعه یک خدمت مادر</div></button><button type="button" onClick={() => resetForMode("parent")} className={`rounded-2xl border p-5 text-right transition ${mode === "parent" ? "border-[#09967C] bg-[#09967C]/5 ring-2 ring-[#09967C]/20" : "border-[var(--border)] bg-[var(--surface)]"}`}><div className="font-black text-lg">ایجاد خدمت مادر</div><div className="text-sm text-[var(--muted)] mt-1">خدمت ریشه‌ای که فرم مادر اختصاصی خودش را دارد</div></button></div>
    <GlassPanel className="p-6">{error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <form onSubmit={submit} className="space-y-6"><AdminAiWriter target="service" current={{ title, slug, category, description, icon, meta_title: metaTitle, meta_description: metaDescription, seo_keywords: seoKeywords, formSchema }} onApply={applyAi}/>
      <TusanCard className="p-5 space-y-5"><div className="grid md:grid-cols-2 gap-4"><div><label className="block text-sm font-bold mb-2">عنوان *</label><TusanInput value={title} onChange={e => setTitle(e.target.value)} /></div><div><label className="block text-sm font-bold mb-2">Slug</label><TusanInput value={slug} onChange={e => setSlug(e.target.value)} placeholder="مثلاً sabtenam-saypa" dir="ltr" /></div><div><label className="block text-sm font-bold mb-2">دسته‌بندی</label><TusanInput value={category} onChange={e => setCategory(e.target.value)} /></div>{mode === "normal" && <div><label className="block text-sm font-bold mb-2">قیمت (تومان)</label><TusanInput type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} /></div>}<div><label className="block text-sm font-bold mb-2">آیکون</label><TusanInput value={icon} onChange={e => setIcon(e.target.value)} /></div></div><div><label className="block text-sm font-bold mb-2">توضیحات</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none" /></div></TusanCard>
      <TusanCard className="p-5 space-y-4"><div><h3 className="font-black text-lg">تنظیمات SEO</h3><p className="text-sm text-[var(--muted)] mt-1">این مقادیر در تولید AI و صفحه خدمت برای بهینه‌سازی جست‌وجو استفاده می‌شوند.</p></div><div><label className="block text-sm font-bold mb-2">Meta Title</label><TusanInput value={metaTitle} onChange={e => setMetaTitle(e.target.value)} maxLength={60} /></div><div><label className="block text-sm font-bold mb-2">Meta Description</label><textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} maxLength={160} rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3" /></div><div><label className="block text-sm font-bold mb-2">کلیدواژه‌ها</label><TusanInput value={seoKeywords.join(", ")} onChange={e => setSeoKeywords(e.target.value.split(",").map(x => x.trim()).filter(Boolean).slice(0, 12))} placeholder="با ویرگول جدا کنید" /></div></TusanCard>
      <label className="flex items-center gap-3"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-[#09967C]" /><span className="font-bold">فعال باشد</span></label>
      {mode === "normal" && <><TusanCard className="p-5 space-y-5"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={useParent} onChange={e => { setUseParent(e.target.checked); if (!e.target.checked) { setParentServiceId(""); setParentFormId(""); } }} className="mt-1 w-5 h-5 accent-[#09967C]" /><span><div className="font-bold">اتصال به فرم مادر موجود</div><div className="text-sm text-[var(--muted)] mt-1">فرم مادر را دوباره ایجاد نکنید؛ از فرم موجود استفاده کنید.</div></span></label>{useParent && <div className="border-t border-[var(--border)] pt-5 grid md:grid-cols-2 gap-4"><div><label className="block text-sm font-bold mb-2">خدمت مادر</label><select value={parentServiceId} onChange={e => handleParentServiceChange(e.target.value)} disabled={loadingParents} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><option value="">بدون خدمت مادر</option>{parentServices.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div><label className="block text-sm font-bold mb-2">فرم مادر *</label><select value={parentFormId} onChange={e => setParentFormId(e.target.value)} disabled={loadingParents} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><option value="">{loadingParents ? "در حال دریافت..." : "انتخاب فرم مادر موجود"}</option>{parentForms.map(form => <option key={form.id} value={form.id}>{form.title}</option>)}</select></div></div>}</TusanCard><TusanCard className="p-5"><ServiceFormBuilder value={formSchema} onChange={setFormSchema} /></TusanCard></>}
      <TusanButton type="submit" disabled={saving} fullWidth>{saving ? "در حال ذخیره..." : mode === "parent" ? "ایجاد خدمت مادر" : "ایجاد خدمت معمولی"}</TusanButton>
      </form>
    </GlassPanel>
  </div></div>;
}
