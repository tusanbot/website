import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ServiceOrderClient from "./ServiceOrderClient";
import { getCachedServicePageData, normalizeServicePath } from "@/lib/services/servicePageCache";

type Service = NonNullable<Awaited<ReturnType<typeof getCachedServicePageData>>["service"]>;

function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function getFieldLabels(schema: any[]) { return schema.map((field: any) => String(field?.label || field?.title || field?.name || "").trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 8); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const { service } = await getCachedServicePageData(id);
  if (!service) return { title: "خدمت پیدا نشد", robots: { index: false, follow: false } };
  const title = service.meta_title?.trim() || `${service.title} | کافی نت توسن`;
  const description = service.meta_description?.trim() || service.description?.trim() || `ثبت درخواست ${service.title} در کافی نت توسن با امکان ثبت آنلاین و پیگیری سفارش.`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, ""); const canonicalUrl = `${siteUrl}/services/${encodeURIComponent(service.slug)}`;
  const keywords = [...(service.seo_keywords || []), service.title, service.category, "کافی نت توسن", "خدمات آنلاین", "ثبت درخواست آنلاین"].filter(Boolean) as string[];
  return { title: { absolute: title }, description, keywords: [...new Set(keywords)], alternates: { canonical: canonicalUrl }, openGraph: { type: "website", locale: "fa_IR", url: canonicalUrl, siteName: "کافی نت توسن", title, description }, twitter: { card: "summary", title, description }, robots: { index: true, follow: true } };
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { service, related, children, parent } = await getCachedServicePageData(id);
  if (!service) { if (isUuid(id)) permanentRedirect("/services"); notFound(); }
  if (isUuid(id)) permanentRedirect(`/services/${encodeURIComponent(service.slug)}`);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, ""); const canonicalUrl = `${siteUrl}/services/${encodeURIComponent(service.slug)}`;
  const fieldLabels = getFieldLabels(service.form_schema);
  const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: service.title, description: service.description || undefined, url: canonicalUrl, provider: { "@type": "LocalBusiness", name: "کافی نت توسن", url: siteUrl }, areaServed: { "@type": "Country", name: "ایران" }, ...(service.price > 0 ? { offers: { "@type": "Offer", price: service.price, priceCurrency: "IRR", url: canonicalUrl } } : {}) };
  const categoryUrl = service.category ? `${siteUrl}/services?category=${encodeURIComponent(service.category)}` : null;
  const breadcrumbItems = [{ "@type": "ListItem", position: 1, name: "خانه", item: siteUrl }, { "@type": "ListItem", position: 2, name: "خدمات", item: `${siteUrl}/services` }, ...(service.category && categoryUrl ? [{ "@type": "ListItem", position: 3, name: service.category, item: categoryUrl }] : []), { "@type": "ListItem", position: service.category ? 4 : 3, name: service.title, item: canonicalUrl }];
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbItems }) }} />
    <main dir="rtl" className="min-h-screen page-background pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav aria-label="مسیر صفحه" className="py-4 text-xs sm:text-sm text-[var(--text-muted)]"><Link href="/" className="hover:text-[var(--primary)]">خانه</Link><span className="mx-2">/</span><Link href="/services" className="hover:text-[var(--primary)]">خدمات</Link>{service.category && <><span className="mx-2">/</span><Link href={`/services?category=${encodeURIComponent(service.category)}`} className="hover:text-[var(--primary)]">{service.category}</Link></>}<span className="mx-2">/</span><span className="font-bold text-[var(--text)]">{service.title}</span></nav>
        <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="bg-[var(--primary)]/5 px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl">{service.icon || "📋"}</div><div><div className="text-xs font-bold text-[var(--primary)]">{service.category || "خدمات آنلاین توسن"}</div><h1 className="mt-1 text-2xl font-black sm:text-3xl">{service.title}</h1></div></div>
              <div className="shrink-0 rounded-2xl border border-[var(--primary)]/20 bg-[var(--surface)] px-4 py-3 text-center">{service.price > 0 ? <><div className="text-[10px] text-[var(--text-muted)]">هزینه پایه</div><div className="mt-1 font-black text-[var(--primary)]">{service.price.toLocaleString("fa-IR")} تومان</div></> : <div className="font-black text-[var(--primary)]">تماس بگیرید</div>}</div>
            </div>
            {service.description?.trim() && <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">{service.description.trim()}</p>}
          </div>
          <div className="grid gap-3 border-t border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><div className="text-xs text-[var(--text-muted)]">فرآیند</div><div className="mt-1 font-bold">ثبت آنلاین و پیگیری سفارش</div></div>
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><div className="text-xs text-[var(--text-muted)]">اطلاعات موردنیاز</div><div className="mt-1 font-bold">{fieldLabels.length > 0 ? `${fieldLabels.length.toLocaleString("fa-IR")} مورد در فرم` : "در فرم نمایش داده می‌شود"}</div></div>
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><div className="text-xs text-[var(--text-muted)]">وضعیت</div><div className="mt-1 font-bold text-[var(--primary)]">● آماده ثبت سفارش</div></div>
          </div>
        </section>

        {parent && <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">این خدمت زیرمجموعه <Link href={`/services/${encodeURIComponent(parent.slug)}`} className="font-bold text-[var(--primary)] hover:underline">{parent.icon || "📄"} {parent.title}</Link> است.</div>}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <ServiceOrderClient initialService={service} />
          <aside className="order-first lg:order-last space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="font-black">نحوه ثبت درخواست</h2><ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-muted)]">{["اطلاعات موردنیاز را در فرم وارد کنید.", "اطلاعات و مدارک را بررسی و تأیید کنید.", "سفارش را ثبت کنید و برای پرداخت ادامه دهید.", "وضعیت سفارش را از بخش پیگیری مشاهده کنید."].map((item, i) => <li key={item} className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-black text-[var(--primary)]">{(i + 1).toLocaleString("fa-IR")}</span><span>{item}</span></li>)}</ol></div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="font-black">اطلاعات موردنیاز</h2>{fieldLabels.length ? <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-muted)]">{fieldLabels.map(label => <li key={label}>• {label}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">فیلدهای موردنیاز هنگام تکمیل فرم نمایش داده می‌شوند.</p>}</div>
          </aside>
        </div>

        {children?.length > 0 && <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="text-xl font-black">خدمات زیرمجموعه</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children.map(item => <Link key={item.id} href={`/services/${encodeURIComponent(item.slug)}`} className="group rounded-2xl border border-[var(--border)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/50 hover:shadow-sm"><div className="flex items-center gap-2 font-bold"><span className="text-xl">{item.icon || "📄"}</span><span>{item.title}</span></div>{item.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{item.description}</p>}<div className="mt-2 text-xs font-bold text-[var(--primary)]">{item.price > 0 ? `${item.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"} ←</div></Link>)}</div></section>}
        {related?.length > 0 && <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="text-xl font-black">خدمات مرتبط</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{related.map(item => <Link key={item.id} href={`/services/${encodeURIComponent(item.slug)}`} className="group rounded-2xl border border-[var(--border)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/50 hover:shadow-sm"><div className="flex items-center gap-2 font-bold"><span className="text-xl">{item.icon || "📄"}</span><span>{item.title}</span></div>{item.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{item.description}</p>}<div className="mt-2 text-xs font-bold text-[var(--primary)]">{item.price > 0 ? `${item.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"} ←</div></Link>)}</div></section>}
      </div>
    </main>
  </>;
}
