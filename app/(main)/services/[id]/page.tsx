"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DynamicServiceForm from "@/components/DynamicServiceForm";
import { GlassPanel, TusanButton, SectionHeader } from "@/components/ui";

type ChildForm = { id: string; title: string; description: string | null; price: number; schema: any[]; sort_order: number };
function normalizeSchema(value: any): any[] { if (Array.isArray(value)) return value; if (typeof value === "string") { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } } return []; }

export default function ServiceOrderPage() {
  const params = useParams(); const router = useRouter(); const serviceId = params.id as string;
  const [service, setService] = useState<any>(null); const [childForms, setChildForms] = useState<ChildForm[]>([]); const [selectedForm, setSelectedForm] = useState<ChildForm | null>(null); const [hasParentForm, setHasParentForm] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (serviceId) loadService(); }, [serviceId]);
  async function loadService() {
    setLoading(true); setError("");
    try {
      const { data: serviceData, error: serviceError } = await supabase.from("services").select("id,title,category,description,price,icon,form_schema,is_active").eq("id", serviceId).eq("is_active", true).single();
      if (serviceError || !serviceData) throw new Error("خدمت موردنظر پیدا نشد یا غیرفعال است.");
      setService({ ...serviceData, form_schema: normalizeSchema(serviceData.form_schema) });
      const { data: parentForm, error: parentError } = await supabase.from("custom_forms").select("id,title,description,form_type").eq("service_id", serviceId).eq("form_type", "parent").is("parent_form_id", null).eq("is_public", true).maybeSingle();
      if (parentError || !parentForm) { setHasParentForm(false); return; }
      setHasParentForm(true);
      const { data: children, error: childrenError } = await supabase.from("custom_forms").select("id,title,description,price,schema,sort_order").eq("service_id", serviceId).eq("parent_form_id", parentForm.id).eq("form_type", "normal").eq("is_public", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
      if (childrenError) throw new Error(childrenError.message);
      setChildForms((children || []).map((form: any) => ({ ...form, price: Number(form.price || 0), schema: normalizeSchema(form.schema) })));
    } catch (err: any) { console.error(err); setError(err?.message || "خطایی هنگام دریافت اطلاعات خدمت رخ داد."); } finally { setLoading(false); }
  }
  function generateTrackingCode() { return `TUS-${Date.now().toString().slice(-6)}-${Math.floor(100000 + Math.random() * 900000)}`; }
  async function submitOrder(formData: Record<string, any>) {
    if (hasParentForm && !selectedForm) { setError("ابتدا یکی از فرم‌های موردنظر را انتخاب کنید."); return; }
    setSubmitting(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.push("/login"); return; }
      const orderPrice = selectedForm ? Number(selectedForm.price || 0) : Number(service.price || 0);
      const { data: order, error: orderError } = await supabase.from("orders").insert({ user_id: user.id, service_id: service.id, form_id: selectedForm?.id || null, tracking_code: generateTrackingCode(), status: "registered", form_data: { ...formData }, price: orderPrice }).select("id,tracking_code,price").single();
      if (orderError) throw new Error(orderError.message); if (!order) throw new Error("سفارش ثبت شد اما اطلاعات سفارش دریافت نشد.");
      router.push(`/payment/${order.id}`);
      router.refresh();
    } catch (err: any) { console.error(err); setError(err?.message || "خطایی هنگام ثبت سفارش رخ داد."); } finally { setSubmitting(false); }
  }
  if (loading) return <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]"><GlassPanel className="p-8 text-center text-[var(--text-muted)]">در حال دریافت اطلاعات خدمت...</GlassPanel></div>;
  if (!service) return <div dir="rtl" className="min-h-screen page-background p-6"><GlassPanel className="p-8 text-center"><div className="text-5xl mb-4">⚠️</div><h1 className="text-xl font-bold">خدمت پیدا نشد</h1><p className="text-[var(--text-muted)] mt-2">{error}</p><div className="mt-6"><Link href="/services"><TusanButton>بازگشت به خدمات</TusanButton></Link></div></GlassPanel></div>;
  const activeFields = selectedForm ? normalizeSchema(selectedForm.schema) : normalizeSchema(service.form_schema);
  return <div dir="rtl" className="min-h-screen bg-gray-100 p-6"><div className="max-w-3xl mx-auto"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"><SectionHeader title={`${service.icon || "📋"} ${service.title}`} description={service.category || "ثبت سفارش خدمت"} /><Link href="/services"><TusanButton variant="secondary">← بازگشت به خدمات</TusanButton></Link></div>
    {service.description && <GlassPanel className="p-6 mb-5"><h2 className="font-bold mb-2">درباره این خدمت</h2><p className="text-[var(--text-secondary)] leading-7">{service.description}</p></GlassPanel>}
    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5">{error}</div>}
    {hasParentForm && !selectedForm ? <GlassPanel className="bg-white rounded-2xl shadow p-6"><div className="mb-6"><h2 className="text-xl font-bold">انتخاب نوع فرم</h2><p className="text-sm text-[var(--text-muted)] mt-1">لطفاً نوع ثبت‌نام موردنظر خود را انتخاب کنید.</p></div>{childForms.length === 0 ? <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-[var(--text-muted)]">هنوز هیچ فرم فرزندی برای این خدمت فعال نشده است.</div> : <div className="grid sm:grid-cols-2 gap-4">{childForms.map(form => <button key={form.id} type="button" onClick={() => { setSelectedForm(form); setError(""); }} className="text-right border rounded-2xl p-5 bg-white hover:border-[#09967C] hover:shadow-md transition"><div className="font-bold text-lg">{form.title}</div>{form.description && <div className="text-sm text-gray-500 mt-2 leading-6">{form.description}</div>}<div className="mt-3 text-[#09967C] font-bold">{form.price.toLocaleString("fa-IR")} تومان</div><div className="text-[#09967C] font-bold text-sm mt-2">انتخاب فرم ←</div></button>)}</div>}</GlassPanel> : <GlassPanel className="bg-white rounded-2xl shadow p-6"><div className="flex items-center justify-between gap-3 mb-6"><div><h2 className="text-xl font-bold">{selectedForm ? selectedForm.title : "اطلاعات سفارش"}</h2><p className="text-sm text-[var(--text-muted)] mt-1">{selectedForm ? `مبلغ خدمت: ${selectedForm.price.toLocaleString("fa-IR")} تومان` : `مبلغ خدمت: ${Number(service.price || 0).toLocaleString("fa-IR")} تومان`}</p></div>{selectedForm && <TusanButton type="button" variant="secondary" onClick={() => setSelectedForm(null)}>تغییر فرم</TusanButton>}</div>{activeFields.length === 0 ? <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center"><p className="text-[var(--text-muted)]">این فرم هنوز فیلدی ندارد.</p></div> : <DynamicServiceForm fields={activeFields} onSubmit={submitOrder} submitting={submitting} />}</GlassPanel>}
  </div></div>;
}
