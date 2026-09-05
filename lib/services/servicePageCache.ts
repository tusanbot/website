import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { PricingRule } from "@/lib/forms/pricing";

export type ServicePageService = {
  id: string; title: string; slug: string; category: string | null; description: string | null; price: number; icon: string | null;
  form_schema: any[]; pricing_rules: PricingRule[]; is_active: boolean; parent_service_id: string | null;
  meta_title?: string | null; meta_description?: string | null; seo_keywords?: string[] | null;
  seo_content?: Record<string, unknown> | null; created_at?: string | null;
};
export type ServicePageLink = { id: string; title: string; slug: string; icon: string | null; description?: string | null; };
export type ServicePageData = { service: ServicePageService | null; related: ServicePageLink[]; children: ServicePageLink[]; parent: Pick<ServicePageLink, "id" | "title" | "slug" | "icon"> | null; };
const SERVICE_SELECT = "id,title,slug,category,description,price,icon,form_schema,pricing_rules,is_active,parent_service_id,meta_title,meta_description,seo_keywords,seo_content,created_at";
function normalizeSchema(value: any): any[] { if (Array.isArray(value)) return value; if (typeof value === "string") { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } } return []; }
function normalizeRules(value: any): PricingRule[] { if (typeof value === "string") { try { value = JSON.parse(value); } catch { value = []; } } return Array.isArray(value) ? value : []; }
function normalizeKeywords(value: any): string[] { return Array.isArray(value) ? value.map(String).filter(Boolean) : []; }
function normalizeSeoContent(value: any): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export function normalizeServicePath(value: string) { return decodeURIComponent(value).normalize("NFC").replace(/\u200c/g, "").replace(/\u200d/g, "").trim(); }
function rawServicePath(value: string) { return decodeURIComponent(value).normalize("NFC").trim(); }
function normalizeService(data: any): ServicePageService { return { ...data, price: Number(data.price || 0), form_schema: normalizeSchema(data.form_schema), pricing_rules: normalizeRules(data.pricing_rules), seo_keywords: normalizeKeywords(data.seo_keywords), seo_content: normalizeSeoContent(data.seo_content) }; }
async function loadServicePageData(path: string): Promise<ServicePageData> {
  const supabase = createSupabaseServerClient(); const requestedRaw = rawServicePath(path); const requested = normalizeServicePath(path); let service: ServicePageService | null = null;
  if (isUuid(requested)) { const { data, error } = await supabase.from("services").select(SERVICE_SELECT).eq("is_active", true).eq("id", requested).maybeSingle(); if (!error && data) service = normalizeService(data); }
  else { const exactSlug = await supabase.from("services").select(SERVICE_SELECT).eq("is_active", true).eq("slug", requestedRaw).maybeSingle(); if (!exactSlug.error && exactSlug.data) service = normalizeService(exactSlug.data); if (!service && requested !== requestedRaw) { const normalizedSlug = await supabase.from("services").select(SERVICE_SELECT).eq("is_active", true).eq("slug", requested).maybeSingle(); if (!normalizedSlug.error && normalizedSlug.data) service = normalizeService(normalizedSlug.data); } }
  if (!service && !isUuid(requested)) { const { data: candidates } = await supabase.from("services").select(SERVICE_SELECT).eq("is_active", true).ilike("slug", `%${requested}%`).limit(20); const match = (candidates || []).find((item: any) => normalizeServicePath(String(item.slug || "")) === requested); if (match) service = normalizeService(match); }
  if (!service) return { service: null, related: [], children: [], parent: null };
  const [{ data: related }, { data: children }, { data: parent }] = await Promise.all([
    service.category ? supabase.from("services").select("id,title,slug,icon,description").eq("is_active", true).eq("category", service.category).neq("id", service.id).limit(4) : Promise.resolve({ data: [] }),
    supabase.from("services").select("id,title,slug,icon,description").eq("is_active", true).eq("parent_service_id", service.id).order("created_at", { ascending: false }),
    service.parent_service_id ? supabase.from("services").select("id,title,slug,icon").eq("is_active", true).eq("id", service.parent_service_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { service, related: (related || []) as ServicePageLink[], children: (children || []) as ServicePageLink[], parent: (parent || null) as ServicePageData["parent"] };
}
export async function getCachedServicePageData(path: string): Promise<ServicePageData> { const normalized = normalizeServicePath(path); const cached = unstable_cache(() => loadServicePageData(path), ["service-page-data-v2", normalized], { revalidate: 60, tags: ["services", `service:${normalized}`] }); return cached(); }
