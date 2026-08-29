import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ServiceOrderClient from "./ServiceOrderClient";
import ServiceSeoContent, { getServiceSeoFaqSchema } from "@/components/services/ServiceSeoContent";
import {
  getCachedServicePageData,
  normalizeServicePath,
} from "@/lib/services/servicePageCache";

type Service = NonNullable<Awaited<ReturnType<typeof getCachedServicePageData>>["service"]>;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getFieldLabels(schema: any[]) {
  return schema
    .map((field: any) => String(field?.label || field?.title || field?.name || "").trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 8);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { service } = await getCachedServicePageData(id);
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

export default async function ServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { service, related, children, parent } = await getCachedServicePageData(id);

  if (!service) {
    if (isUuid(id)) permanentRedirect("/services");
    notFound();
  }

  if (isUuid(id)) permanentRedirect(`/services/${encodeURIComponent(service.slug)}`);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/services/${encodeURIComponent(service.slug)}`;
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
  const faqJsonLd = getServiceSeoFaqSchema(service.seo_content);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

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

      <section dir="rtl" className="max-w-3xl mx-auto px-6 pt-5 pb-2" aria-labelledby="service-guide-title">
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

      <ServiceSeoContent content={service.seo_content} />

      <ServiceOrderClient initialService={service} />

      {children && children.length > 0 && (
        <section dir="rtl" className="max-w-3xl mx-auto px-6 pb-6" aria-labelledby="child-services-title">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 id="child-services-title" className="text-xl font-bold mb-4">خدمات زیرمجموعه</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {children.map((item) => (
                <Link
                  key={item.id}
                  href={`/services/${encodeURIComponent(item.slug)}`}
                  className="rounded-xl border p-4 hover:border-[#09967C] transition"
                >
                  <div className="font-bold">{item.icon || "📄"} {item.title}</div>
                  {item.description && (
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{item.description}</p>
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
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/services/${encodeURIComponent(item.slug)}`}
                  className="rounded-xl border p-4 hover:border-[#09967C] transition"
                >
                  <div className="font-bold">{item.icon || "📄"} {item.title}</div>
                  {item.description && (
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{item.description}</p>
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
