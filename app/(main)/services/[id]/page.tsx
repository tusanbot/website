import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import ServiceOrderClient from "./ServiceOrderClient";

export const revalidate = 300;

type Service = { id: string; title: string; slug: string; category: string | null; description: string | null; price: number; icon: string | null; form_schema: any[]; is_active: boolean; parent_service_id: string | null; created_at?: string | null };
function normalizeSchema(value: any): any[] { if (Array.isArray(value)) return value; if (typeof value === "string") { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } } return []; }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function normalizeSlug(value: string) { return decodeURIComponent(value).normalize("NFC").replace(/\u200c/g, "").replace(/\u200d/g, "").trim(); }

async function getService(path: string): Promise<Service | null> {
  const supabase = createSupabaseServerClient();
  const query = supabase.from("services").select("id,title,slug,category,description,price,icon,form_schema,is_active,parent_service_id,created_at").eq("is_active", true);
  if (isUuid(path)) {
    const { data, error } = await query.eq("id", path).maybeSingle();
    if (error || !data) return null;
    return { ...data, price: Number(data.price || 0), form_schema: normalizeSchema(data.form_schema) } as Service;
  }

  const requestedSlug = normalizeSlug(path);
  const { data, error } = await query.eq("slug", requestedSlug).maybeSingle();
  if (!error && data) return { ...data, price: Number(data.price || 0), form_schema: normalizeSchema(data.form_schema) } as Service;

  // Persian URLs can differ by Unicode normalization or zero-width joiners.
  // Compare normalized slugs in memory as a safe fallback for the small service catalog.
  const { data: services, error: fallbackError } = await supabase.from("services").select("id,title,slug,category,description,price,icon,form_schema,is_active,parent_service_id,created_at").eq("is_active", true).not("slug", "is", null);
  if (fallbackError) return null;
  const match = (services || []).find((item: any) => normalizeSlug(item.slug) === requestedSlug);
  if (!match) return null;
  return { ...match, price: Number(match.price || 0), form_schema: normalizeSchema(match.form_schema) } as Service;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const service = await getService(id);
  if (!service) return { title: "خدمت پیدا نشد", robots: { index: false, follow: false } };
  const title = `${service.title} | کافی نت توسن`;
  const description = service.description?.trim() || `ثبت درخواست ${service.title} در کافی نت توسن با امکان ثبت آنلاین و پیگیری سفارش.`;
  const canonical = `/services/${encodeURIComponent(service.slug)}`;
  return { title, description, keywords: [service.title, service.category, "کافی نت توسن", "خدمات آنلاین", "ثبت درخواست آنلاین"].filter(Boolean) as string[], alternates: { canonical }, openGraph: { type: "website", locale: "fa_IR", url: canonical, siteName: "کافی نت توسن", title, description }, robots: { index: true, follow: true } };
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const service = await getService(id); if (!service) notFound();
  if (isUuid(id)) permanentRedirect(`/services/${encodeURIComponent(service.slug)}`);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tusancn.ir";
  const canonicalUrl = `${siteUrl}/services/${encodeURIComponent(service.slug)}`;
  const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: service.title, description: service.description || undefined, url: canonicalUrl, provider: { "@type": "LocalBusiness", name: "کافی نت توسن", url: siteUrl }, areaServed: { "@type": "Country", name: "ایران" }, ...(service.price > 0 ? { offers: { "@type": "Offer", price: service.price, priceCurrency: "IRR", url: canonicalUrl } } : {}) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><ServiceOrderClient initialService={service} /></>;
}
