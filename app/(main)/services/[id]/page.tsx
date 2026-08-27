import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import ServiceOrderClient from "./ServiceOrderClient";
import type { PricingRule } from "@/lib/forms/pricing";

type Service = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  description: string | null;
  price: number;
  icon: string | null;
  form_schema: any[];
  pricing_rules: PricingRule[];
  is_active: boolean;
  parent_service_id: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  seo_keywords?: string[] | null;
  created_at?: string | null;
};

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
    try {
      value = JSON.parse(value);
    } catch {
      value = [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function normalizeKeywords(value: any): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeSlug(value: string) {
  return decodeURIComponent(value)
    .normalize("NFC")
    .replace(/\u200c/g, "")
    .replace(/\u200d/g, "")
    .trim();
}

const SERVICE_SELECT =
  "id,title,slug,category,description,price,icon,form_schema,pricing_rules,is_active,parent_service_id,meta_title,meta_description,seo_keywords,created_at";

async function getService(path: string): Promise<Service | null> {
  const supabase = createSupabaseServerClient();
  const query = supabase.from("services").select(SERVICE_SELECT).eq("is_active", true);

  const normalize = (data: any): Service => ({
    ...data,
    price: Number(data.price || 0),
    form_schema: normalizeSchema(data.form_schema),
    pricing_rules: normalizeRules(data.pricing_rules),
    seo_keywords: normalizeKeywords(data.seo_keywords),
  });

  if (isUuid(path)) {
    const { data, error } = await query.eq("id", path).maybeSingle();
    if (error || !data) return null;
    return normalize(data);
  }

  const requestedSlug = normalizeSlug(path);
  const { data, error } = await query.eq("slug", requestedSlug).maybeSingle();
  if (!error && data) return normalize(data);

  const { data: services, error: fallbackError } = await supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("is_active", true)
    .not("slug", "is", null);

  if (fallbackError) return null;
  const match = (services || []).find((item: any) => normalizeSlug(item.slug) === requestedSlug);
  return match ? normalize(match) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const service = await getService(id);
  if (!service) return { title: "خدمت پیدا نشد", robots: { index: false, follow: false } };

  const title = service.meta_title?.trim() || `${service.title} | کافی نت توسن`;
  const description =
    service.meta_description?.trim() ||
    service.description?.trim() ||
    `ثبت درخواست ${service.title} در کافی نت توسن با امکان ثبت آنلاین و پیگیری سفارش.`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/services/${encodeURIComponent(service.slug)}`;
  const keywords = [
    ...(service.seo_keywords || []),
    service.title,
    service.category,
    "کافی نت توسن",
    "خدمات آنلاین",
    "ثبت درخواست آنلاین",
  ].filter(Boolean) as string[];

  return {
    title: { absolute: title },
    description,
    keywords: [...new Set(keywords)],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      url: canonicalUrl,
      siteName: "کافی نت توسن",
      title,
      description,
    },
    twitter: { card: "summary", title, description },
    robots: { index: true, follow: true },
  };
}

function getFieldLabels(schema: any[]) {
  return schema
    .map((field: any) => String(field?.label || field?.title || field?.name || "").trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 8);
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getService(id);

  if (!service) {
    if (isUuid(id)) permanentRedirect("/services");
    notFound();
  }

  if (isUuid(id)) permanentRedirect(`/services/${encodeURIComponent(service.slug)}`);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/services/${encodeURIComponent(service.slug)}`;
  const supabase = createSupabaseServerClient();

  const [{ data: related }, { data: children }, { data: parent }] = await Promise.all([
    supabase
      .from("services")
      .select("id,title,slug,icon,description")
      .eq("is_active", true)
      .eq("category", service.category)
      .neq("id", service.id)
      .limit(4),
    supabase
      .from("services")
      .select("id,title,slug,icon,description")
      .eq("is_active", true)
      .eq("parent_service_id", service.id)
      .order("created_at", { ascending: false }),
    service.parent_service_id
      ? supabase
          .from("services")
          .select("id,title,slug,icon")
          .eq("is_active", true)
          .eq("id", service.parent_service_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const fieldLabels = getFieldLabels(service.form_schema);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description || undefined,
    url: canonicalUrl,
    provider: { "@type": "LocalBusiness", name: "کافی نت توسن", url: siteUrl },
    areaServed: { "@type": "Country", name: "ایران" },
    ...(service.price > 0
      ? {
          offers: {
            "@type": "Offer",
            price: service.price,
            priceCurrency: "IRR",
            url: canonicalUrl,
          },
        }
      : {}),
  };

  const categoryUrl = service.category
    ? `${siteUrl}/services?category=${encodeURIComponent(service.category)}`
    : null;
  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "خانه", item: siteUrl },
    { "@type": "ListItem", position: 2, name: "خدمات", item: `${siteUrl}/services` },
    ...(service.category && categoryUrl
      ? [{ "@type": "ListItem", position: 3, name: service.category, item: categoryUrl }]
      : []),
    {
      "@type": "ListItem",
      position: service.category ? 4 : 3,
      name: service.title,
      item: canonicalUrl,
    },
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div dir="rtl" className="max-w-3xl mx-auto px-6 pt-5">
        <nav aria-label="مسیر صفحه" className="text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:underline">خانه</Link>
          <span className="mx-2">/</span>
          <Link href="/services" className="hover:underline">خدمات</Link>
          <span className="mx-2">/</span>
          {service.category && (
            <>
              <Link href={`/services?category=${encodeURIComponent(service.category)}`} className="hover:underline">
                {service.category}
              </Link>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="font-medium text-[var(--text)]" aria-current="page">
            {service.title}
          </span>
        </nav>
      </div>

      {parent && (
        <section dir="rtl" className="max-w-3xl mx-auto px-6 pt-4" aria-label="خدمت مادر">
          <div className="rounded-xl border bg-white px-4 py-3 text-sm">
            این خدمت زیرمجموعه{" "}
            <Link
              href={`/services/${encodeURIComponent(parent.slug)}`}
              className="font-bold text-[#09967C] hover:underline"
            >
              {parent.icon || "📄"} {parent.title}
            </Link>{" "}است.
          </div>
        </section>
      )}

      <section
        dir="rtl"
        className="max-w-3xl mx-auto px-6 pt-5 pb-2"
        aria-labelledby="service-guide-title"
      >
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 id="service-guide-title" className="text-2xl font-bold">{service.title}</h1>
          {service.description?.trim() && (
            <div className="mt-4 text-[var(--text-muted)] leading-8">
              <p>{service.description.trim()}</p>
            </div>
          )}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <h2 className="font-bold text-lg">نحوه ثبت درخواست</h2>
              <ol className="mt-2 list-decimal pr-5 space-y-1 text-sm leading-7 text-[var(--text-muted)]">
                <li>اطلاعات موردنیاز این خدمت را در فرم مربوط وارد کنید.</li>
                <li>اطلاعات واردشده را پیش از ارسال بررسی و تأیید کنید.</li>
                <li>پس از ثبت، وضعیت سفارش را از مسیر پیگیری سفارش بررسی کنید.</li>
              </ol>
            </div>
            <div>
              <h2 className="font-bold text-lg">اطلاعات موردنیاز</h2>
              {fieldLabels.length > 0 ? (
                <ul className="mt-2 list-disc pr-5 space-y-1 text-sm leading-7 text-[var(--text-muted)]">
                  {fieldLabels.map((label) => <li key={label}>{label}</li>)}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                  اطلاعات موردنیاز این خدمت هنگام تکمیل فرم نمایش داده می‌شود.
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-[var(--surface-muted)] p-4">
            <h2 className="font-bold">نکته مهم</h2>
            <p className="mt-1 text-sm leading-7 text-[var(--text-muted)]">
              قبل از ثبت نهایی، اطلاعات و فایل‌های واردشده را با دقت بررسی کنید. در صورت وجود شرایط اختصاصی برای این خدمت، موارد لازم در فرم ثبت درخواست نمایش داده می‌شود.
            </p>
          </div>
        </div>
      </section>

      <ServiceOrderClient initialService={service} />

      {children && children.length > 0 && (
        <section dir="rtl" className="max-w-3xl mx-auto px-6 pb-6" aria-labelledby="child-services-title">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 id="child-services-title" className="text-xl font-bold mb-4">خدمات زیرمجموعه</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {children.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/services/${encodeURIComponent(item.slug)}`}
                  className="rounded-xl border p-4 hover:border-[#09967C] transition"
                >
                  <div className="font-bold">{item.icon || "📄"} {item.title}</div>
                  {item.description && (
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {related && related.length > 0 && (
        <section dir="rtl" className="max-w-3xl mx-auto px-6 pb-10" aria-labelledby="related-services-title">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 id="related-services-title" className="text-xl font-bold mb-4">خدمات مرتبط</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {related.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/services/${encodeURIComponent(item.slug)}`}
                  className="rounded-xl border p-4 hover:border-[#09967C] transition"
                >
                  <div className="font-bold">{item.icon || "📄"} {item.title}</div>
                  {item.description && (
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
