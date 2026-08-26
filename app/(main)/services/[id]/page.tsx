import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import ServiceOrderClient from "./ServiceOrderClient";
import type { PricingRule } from "@/lib/forms/pricing";

type Service = { id: string; title: string; slug: string; category: string | null; description: string | null; price: number; icon: string | null; form_schema: any[]; pricing_rules: PricingRule[]; is_active: boolean; parent_service_id: string | null; meta_title?: string | null; meta_description?: string | null; seo_keywords?: string[] | null; created_at?: string | null };
function normalizeSchema(value: any): any[] { if (Array.isArray(value)) return value; if (typeof value === "string") { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } } return []; }
function normalizeRules(value: any): PricingRule[] { if (typeof value === "string") { try { value = JSON.parse(value); } catch { value = []; } } return Array.isArray(value) ? value : []; }
function normalizeKeywords(value: any): string[] { if (Array.isArray(value)) return value.map(String).filter(Boolean); return []; }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function normalizeSlug(value: string) { return decodeURIComponent(value).normalize("NFC").replace(/\u200c/g, "").replace(/\u200d/g, "").trim(); }
const SERVICE_SELECT = "id,title,slug,category,description,price,icon,form_schema,pricing_rules,is_active,parent_service_id,meta_title,meta_description,seo_keywords,created_at";
async function getService(path: string): Promise<Service | null> {
  const supabase = createSupabaseServerClient();
  const query = supabase.from("services").select(SERVICE_SELECT).eq("is_active", true);
  const normalize = (data: any): Service => ({ ...data, price: Number(data.price || 0), form_schema: normalizeSchema(data.form_schema), pricing_rules: normalizeRules(data.pricing_rules), seo_keywords: normalizeKeywords(data.seo_keywords) });
  if (isUuid(path)) { const { data, error } = await query.eq("id", path).maybeSingle(); if (error || !data) return null; return normalize(data); }
  const requestedSlug = normalizeSlug(path); const { data, error } = await query.eq("slug", requestedSlug).maybeSingle();
  if (!error && data) return normalize(data);
  const { data: services, error: fallbackError } = await supabase.from("services").select(SERVICE_SELECT).eq("is_active", true).not("slug", "is", null);
  if (fallbackError) return null; const match = (services || []).find((item: any) => normalizeSlug(item.slug) === requestedSlug); if (!match) return null;
  return normalize(match);
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> { const { id } = await params; const service = await getService(id); if (!service) return { title: "خدمت پیدا نشد", robots: { index: false, follow: false } }; const title = service.meta_title?.trim() || `${service.title} | کافی نت توسن`; const description = service.meta_description?.trim() || service.description?.trim() || `ثبت درخواست ${service.title} در کافی نت توسن با امکان ثبت آنلاین و پیگیری سفارش.`; const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, ""); const canonicalUrl = `${siteUrl}/services/${encodeURIComponent(service.slug)}`; const keywords = [...(service.seo_keywords || []), service.title, service.category, "کافی نت توسن", "خدمات آنلاین", "ثبت درخواست آنلاین"].filter(Boolean) as string[]; return { title: { absolute: title }, description, keywords: [...new Set(keywords)], alternates: { canonical: canonicalUrl }, openGraph: { type: "website", locale: "fa_IR", url: canonicalUrl, siteName: "کافی نت توسن", title, description }, twitter: { card: "summary", title, description }, robots: { index: true, follow: true } }; }
export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const service = await getService(id);
  if (!service) { if (isUuid(id)) permanentRedirect("/services"); notFound(); }
  if (isUuid(id)) permanentRedirect(`/services/${encodeURIComponent(service.slug)}`);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, ""); const canonicalUrl = `${siteUrl}/services/${encodeURIComponent(service.slug)}`; const supabase = createSupabaseServerClient();
  const { data: related } = await supabase.from("services").select("id,title,slug,icon,description").eq("is_active", true).eq("category", service.category).neq("id", service.id).limit(4);
  const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: service.title, description: service.description || undefined, url: canonicalUrl, provider: { "@type": "LocalBusiness", name: "کافی نت توسن", url: siteUrl }, areaServed: { "@type": "Country", name: "ایران" }, ...(service.price > 0 ? { offers: { "@type": "Offer", price: service.price, priceCurrency: "IRR", url: canonicalUrl } } : {}) };
  const breadcrumbItems = [{ "@type": "ListItem", position: 1, name: "خانه", item: siteUrl }, { "@type": "ListItem", position: 2, name: "خدمات", item: `${siteUrl}/services` }, ...(service.category ? [{ "@type": "ListItem", position: 3, name: service.category, item: `${siteUrl}/services` }] : []), { "@type": "ListItem", position: service.category ? 4 : 3, name: service.title, item: canonicalUrl }];
  const breadcrumbJsonLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbItems };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} /><div dir="rtl" className="max-w-3xl mx-auto px-6 pt-5"><nav aria-label="مسیر صفحه" className="text-sm text-[var(--text-muted)]"><Link href="/" className="hover:underline">خانه</Link><span className="mx-2">/</span><Link href="/services" className="hover:underline">خدمات</Link><span className="mx-2">/</span>{service.category && <><Link href="/services" className="hover:underline">{service.category}</Link><span className="mx-2">/</span></>}<span className="font-medium text-[var(--text)]" aria-current="page">{service.title}</span></nav></div><ServiceOrderClient initialService={service} />{related && related.length > 0 && <section dir="rtl" className="max-w-3xl mx-auto px-6 pb-10" aria-labelledby="related-services-title"><div className="rounded-2xl border bg-white p-6 shadow-sm"><h2 id="related-services-title" className="text-xl font-bold mb-4">خدمات مرتبط</h2><div className="grid sm:grid-cols-2 gap-3">{related.map((item: any) => <Link key={item.id} href={`/services/${encodeURIComponent(item.slug)}`} className="rounded-xl border p-4 hover:border-[#09967C] transition"><div className="font-bold">{item.icon || "📄"} {item.title}</div>{item.description && <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{item.description}</p>}</Link>)}</div></div></section>}</>;
}
