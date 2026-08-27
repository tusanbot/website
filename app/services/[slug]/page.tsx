import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import ServiceRequestForm from '@/components/services/ServiceRequestForm'
import { buildCanonicalUrl } from '@/lib/seo/canonical'

const getService = unstable_cache(async (slug: string) => {
  const supabase = await createServerClient()
  const { data } = await supabase.from('services').select('id,title,slug,category,description,price,icon,form_schema,pricing_rules,is_active,parent_service_id,meta_title,meta_description,seo_keywords,seo_content,created_at').eq('slug', slug).eq('is_active', true).maybeSingle()
  return data
}, ['service-page'], { revalidate: 300 })

function asSeoContent(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  const text = (key: string) => typeof v[key] === 'string' ? v[key].trim() : ''
  const list = (key: string) => Array.isArray(v[key]) ? v[key].filter((x): x is string => typeof x === 'string' && x.trim()).map(x => x.trim()) : []
  const faq = Array.isArray(v.faq) ? v.faq.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)).map(x => ({ question: typeof x.question === 'string' ? x.question.trim() : '', answer: typeof x.answer === 'string' ? x.answer.trim() : '' })).filter(x => x.question && x.answer) : []
  return { intro: text('intro'), body: text('body'), steps: list('steps'), requirements: list('requirements'), notes: list('notes'), faq }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const service = await getService(slug)
  if (!service) return {}
  const canonical = buildCanonicalUrl(`/services/${service.slug}`)
  return { title: service.meta_title || service.title, description: service.meta_description || service.description || undefined, keywords: service.seo_keywords || undefined, alternates: { canonical }, robots: { index: true, follow: true }, openGraph: { title: service.meta_title || service.title, description: service.meta_description || service.description || undefined, url: canonical, type: 'website' }, twitter: { card: 'summary_large_image', title: service.meta_title || service.title, description: service.meta_description || service.description || undefined } }
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = await getService(slug)
  if (!service) notFound()
  if (service.slug !== slug) permanentRedirect(`/services/${service.slug}`)
  const seo = asSeoContent(service.seo_content)
  const canonical = buildCanonicalUrl(`/services/${service.slug}`)
  const faqSchema = seo?.faq?.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: seo.faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) } : null
  const serviceSchema = { '@context': 'https://schema.org', '@type': 'Service', name: service.title, description: service.description || seo?.intro || '', url: canonical, provider: { '@type': 'LocalBusiness', name: 'کافی نت توسن', url: buildCanonicalUrl('/') }, ...(service.price ? { offers: { '@type': 'Offer', price: service.price, priceCurrency: 'IRR', url: canonical } } : {}) }
  return (
    <main className="container mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <nav aria-label="مسیر صفحه" className="mb-6 text-sm"><Link href="/">خانه</Link> / <Link href="/services">خدمات</Link> / <span>{service.title}</span></nav>
      <article>
        <h1 className="text-3xl font-bold">{service.title}</h1>
        {seo?.intro ? <p className="mt-4 text-lg leading-8">{seo.intro}</p> : service.description ? <p className="mt-4 text-lg leading-8">{service.description}</p> : null}
        {seo?.body && <section className="mt-8"><div className="prose max-w-none whitespace-pre-line leading-8">{seo.body}</div></section>}
        {seo?.steps?.length ? <section className="mt-8"><h2 className="text-2xl font-semibold">مراحل انجام خدمت</h2><ol className="mt-4 list-decimal space-y-2 pr-6">{seo.steps.map((step, i) => <li key={i}>{step}</li>)}</ol></section> : null}
        {seo?.requirements?.length ? <section className="mt-8"><h2 className="text-2xl font-semibold">مدارک و اطلاعات مورد نیاز</h2><ul className="mt-4 list-disc space-y-2 pr-6">{seo.requirements.map((item, i) => <li key={i}>{item}</li>)}</ul></section> : null}
        {seo?.notes?.length ? <section className="mt-8"><h2 className="text-2xl font-semibold">نکات مهم</h2><ul className="mt-4 list-disc space-y-2 pr-6">{seo.notes.map((item, i) => <li key={i}>{item}</li>)}</ul></section> : null}
        {seo?.faq?.length ? <section className="mt-8"><h2 className="text-2xl font-semibold">سوالات متداول</h2><div className="mt-4 space-y-5">{seo.faq.map((item, i) => <div key={i}><h3 className="font-semibold">{item.question}</h3><p className="mt-1 leading-7">{item.answer}</p></div>)}</div></section> : null}
        <section className="mt-8"><h2 className="text-2xl font-semibold">نحوه ثبت درخواست</h2><ol className="mt-4 list-decimal space-y-2 pr-6"><li>اطلاعات موردنیاز را وارد کنید.</li><li>اطلاعات را بررسی کنید.</li><li>وضعیت سفارش را پیگیری کنید.</li></ol></section>
        <div className="mt-8"><ServiceRequestForm service={service} /></div>
      </article>
    </main>
  )
}
