"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DynamicServiceForm from "@/components/DynamicServiceForm";
import { GlassPanel, TusanButton } from "@/components/ui";
import { calculateServicePrice, type PricingRule } from "@/lib/forms/pricing";

type Service = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  price: number;
  icon: string | null;
  form_schema: any[];
  pricing_rules: PricingRule[];
  is_active: boolean;
  parent_service_id: string | null;
  parent_form_id?: string | null;
};
type LegacyChild = { id: string; title: string; description: string | null; price: number; schema: any[]; sort_order: number };

function normalizeSchema(value: any): any[] {
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
function normalizeRules(value: any): PricingRule[] {
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { value = []; }
  }
  return Array.isArray(value) ? value : [];
}
function mergeFormSchemas(parentFields: any[], childFields: any[]): any[] {
  const result: any[] = [];
  const seen = new Set<string>();
  for (const field of [...normalizeSchema(parentFields), ...normalizeSchema(childFields)]) {
    if (!field || typeof field !== "object") continue;
    const key = String(field.name || field.id || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(field);
  }
  return result;
}

export default function ServiceOrderClient({ initialService }: { initialService: Service }) {
  const router = useRouter();
  const serviceId = initialService.id;
  const [service] = useState<Service | null>(initialService);
  const [children, setChildren] = useState<Service[]>([]);
  const [legacyChildren, setLegacyChildren] = useState<LegacyChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<Service | null>(null);
  const [selectedLegacy, setSelectedLegacy] = useState<LegacyChild | null>(null);
  const [parentFields, setParentFields] = useState<any[]>([]);
  const [hasChildren, setHasChildren] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => { loadChildren(); }, [serviceId]);

  async function loadSharedParentFields(parentFormId?: string | null) {
    if (!parentFormId) { setParentFields([]); return; }
    const { data, error: parentError } = await supabase.from("custom_forms").select("schema").eq("id", parentFormId).maybeSingle();
    if (parentError) throw new Error(parentError.message);
    setParentFields(normalizeSchema(data?.schema));
  }

  async function loadChildren() {
    try {
      const { data: childServices, error: childServiceError } = await supabase.from("services").select("id,title,category,description,price,icon,form_schema,pricing_rules,is_active,parent_service_id,parent_form_id").eq("parent_service_id", serviceId).eq("is_active", true).order("created_at", { ascending: true });
      if (childServiceError) throw new Error(childServiceError.message);
      const normalized = (childServices || []).map((item: any) => ({ ...item, price: Number(item.price || 0), form_schema: normalizeSchema(item.form_schema), pricing_rules: normalizeRules(item.pricing_rules) })) as Service[];
      setChildren(normalized);
      if (normalized.length > 0) {
        await loadSharedParentFields(normalized.find((item) => item.parent_form_id)?.parent_form_id);
        setLegacyChildren([]); setHasChildren(true); return;
      }
      if (initialService.parent_form_id) await loadSharedParentFields(initialService.parent_form_id); else setParentFields([]);
      const { data: parentForm } = await supabase.from("custom_forms").select("id").eq("service_id", serviceId).eq("form_type", "parent").is("parent_form_id", null).eq("is_public", true).maybeSingle();
      if (parentForm) {
        const { data: oldChildren, error: oldError } = await supabase.from("custom_forms").select("id,title,description,price,schema,sort_order").eq("service_id", serviceId).eq("parent_form_id", parentForm.id).eq("form_type", "normal").eq("is_public", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
        if (oldError) throw new Error(oldError.message);
        setLegacyChildren((oldChildren || []).map((form: any) => ({ ...form, price: Number(form.price || 0), schema: normalizeSchema(form.schema) })));
      } else setLegacyChildren([]);
      setHasChildren(normalized.length > 0);
    } catch (err: any) {
      console.error(err); setError(err?.message || "خطایی هنگام دریافت اطلاعات خدمت رخ داد.");
    }
  }

  async function submitOrder(submittedData: Record<string, any>) {
    if (submitting) return;
    const chosenService = selectedChild;
    const chosenLegacy = selectedLegacy;
    if ((hasChildren || legacyChildren.length > 0) && !chosenService && !chosenLegacy) { setError("ابتدا یکی از خدمات موردنظر را انتخاب کنید."); return; }
    setSubmitting(true); setError("");
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();
    const idempotencyKey = idempotencyKeyRef.current;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const orderServiceId = chosenService?.id || service!.id;
      const orderFormId = chosenLegacy?.id || null;
      const response = await fetch("/api/orders/create", { method: "POST", headers: { "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey }, body: JSON.stringify({ serviceId: orderServiceId, formId: orderFormId, formData: submittedData, idempotencyKey }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = Array.isArray(payload?.errors) ? payload.errors.map((item: any) => item.message).filter(Boolean).join("\n") : "";
        throw new Error(details || payload?.error || "ثبت سفارش انجام نشد.");
      }
      const order = payload?.order;
      if (!order?.id) throw new Error("سفارش ثبت شد اما اطلاعات سفارش دریافت نشد.");
      idempotencyKeyRef.current = null;
      router.push(`/payment/${order.id}`); router.refresh();
    } catch (err: any) {
      console.error(err); setError(err?.message || "خطایی هنگام ثبت سفارش رخ داد.");
    } finally { setSubmitting(false); }
  }

  const handleFormChange = useCallback((next: Record<string, any>) => setFormData(next), []);
  const activeSchema = useMemo(() => { if (selectedChild) return mergeFormSchemas(parentFields, selectedChild.form_schema); if (selectedLegacy) return mergeFormSchemas(parentFields, selectedLegacy.schema); return mergeFormSchemas(parentFields, service?.form_schema || []); }, [parentFields, selectedChild, selectedLegacy, service]);
  const activeRules = selectedChild ? selectedChild.pricing_rules : service?.pricing_rules || [];
  const activeBasePrice = selectedChild?.price ?? selectedLegacy?.price ?? service?.price ?? 0;
  const currentPrice = calculateServicePrice(activeBasePrice, activeRules, formData);
  const showingChildPicker = !selectedChild && !selectedLegacy && (children.length > 0 || legacyChildren.length > 0);

  if (!service) return <div dir="rtl" className="min-h-screen page-background p-6"><GlassPanel className="p-8 text-center"><div className="text-5xl mb-4">⚠️</div><h1 className="text-xl font-bold">خدمت پیدا نشد</h1><p className="text-[var(--text-muted)] mt-2">{error}</p><div className="mt-6"><Link href="/services"><TusanButton>بازگشت به خدمات</TusanButton></Link></div></GlassPanel></div>;
  return <div dir="rtl" className="min-h-screen bg-gray-100 p-6"><div className="max-w-3xl mx-auto">
    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 whitespace-pre-line" role="alert">{error}</div>}
    {showingChildPicker ? <GlassPanel className="bg-white rounded-2xl shadow p-6"><div className="mb-6"><h2 className="text-xl font-bold">انتخاب خدمت</h2><p className="text-sm text-[var(--text-muted)] mt-1">یکی از خدمات زیرمجموعه را انتخاب کنید.</p></div><div className="grid sm:grid-cols-2 gap-4">
      {children.map(child => <button key={child.id} type="button" onClick={() => { setSelectedChild(child); setSelectedLegacy(null); setFormData({}); setError(""); idempotencyKeyRef.current = null; }} className="text-right border rounded-2xl p-5 bg-white hover:border-[#09967C] hover:shadow-md transition"><div className="flex items-center gap-3"><div className="text-2xl">{child.icon || "📄"}</div><div className="font-bold text-lg">{child.title}</div></div>{child.description && <div className="text-sm text-gray-500 mt-2 leading-6">{child.description}</div>}<div className="mt-3 text-[#09967C] font-bold">{child.price > 0 ? `${child.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}</div><div className="text-[#09967C] font-bold text-sm mt-2">انتخاب خدمت ←</div></button>)}
      {legacyChildren.map(child => <button key={child.id} type="button" onClick={() => { setSelectedLegacy(child); setSelectedChild(null); setFormData({}); setError(""); idempotencyKeyRef.current = null; }} className="text-right border rounded-2xl p-5 bg-white hover:border-[#09967C] hover:shadow-md transition"><div className="font-bold text-lg">{child.title}</div>{child.description && <div className="text-sm text-gray-500 mt-2 leading-6">{child.description}</div>}<div className="mt-3 text-[#09967C] font-bold">{child.price > 0 ? `${child.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}</div><div className="text-[#09967C] font-bold text-sm mt-2">انتخاب فرم ←</div></button>)}
    </div></GlassPanel> : <GlassPanel className="bg-white rounded-2xl shadow p-6"><div className="flex items-center justify-between gap-3 mb-6"><div><h2 className="text-xl font-bold">{selectedChild ? selectedChild.title : selectedLegacy ? selectedLegacy.title : "اطلاعات سفارش"}</h2><p className="text-sm text-[var(--text-muted)] mt-1">مبلغ فعلی خدمت: <strong className="text-[#09967C]">{currentPrice.toLocaleString("fa-IR")} تومان</strong></p></div>{(selectedChild || selectedLegacy) && <TusanButton type="button" variant="secondary" onClick={() => { setSelectedChild(null); setSelectedLegacy(null); setFormData({}); idempotencyKeyRef.current = null; }}>تغییر خدمت</TusanButton>}</div>{activeSchema.length === 0 ? <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center"><p className="text-[var(--text-muted)]">این فرم هنوز فیلدی ندارد.</p></div> : <DynamicServiceForm fields={activeSchema} onSubmit={submitOrder} onChange={handleFormChange} submitting={submitting} />}</GlassPanel>}
  </div></div>;
}
