import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, ExternalLink, Newspaper } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type NewsItem = {
  id: string; title: string; slug: string; excerpt: string | null; content: string; category: string;
  image_url: string | null; source_name: string | null; source_url: string | null; official_url: string | null;
  published_at: string | null; is_active_registration: boolean; registration_start_at: string | null; registration_end_at: string | null;
};
const categories: Record<string, string> = {
  general: "عمومی", education: "آموزش و دانشگاه", employment: "استخدام", government: "خدمات دولتی",
  registration: "ثبت‌نام و فراخوان", finance: "وام و تسهیلات", exams: "آزمون‌ها",
};
async function getNews(slug: string) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("news_announcements")
    .select("id,title,slug,excerpt,content,category,image_url,source_name,source_url,official_url,published_at,is_active_registration,registration_start_at,registration_end_at")
    .eq("slug", decodeURIComponent(slug).normalize("NFC")).eq("status", "published").maybeSingle();
  return data as NewsItem | null;
}
function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await getNews((await params).slug);
  if (!item) return { title: "خبر پیدا نشد | توسن", robots: { index: false, follow: false } };
  const description = item.excerpt || item.content.slice(0, 160);
  const canonical = `/news/${encodeURIComponent(item.slug)}`;
  return { title: `${item.title} | اخبار توسن`, description, alternates: { canonical }, openGraph: { type: "article", locale: "fa_IR", title: item.title, description, url: canonical, siteName: "کافی نت توسن", publishedTime: item.published_at || undefined, images: item.image_url ? [{ url: item.image_url, alt: item.title }] : undefined } };
}
export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = await getNews((await params).slug);
  if (!item) notFound();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, "");
  const canonical = `${siteUrl}/news/${encodeURIComponent(item.slug)}`;
  const article = { "@context": "https://schema.org", "@type": "NewsArticle", headline: item.title, description: item.excerpt || item.content.slice(0, 160), datePublished: item.published_at || undefined, dateModified: item.published_at || undefined, mainEntityOfPage: { "@type": "WebPage", "@id": canonical }, author: { "@type": "Organization", name: item.source_name || "کافی نت توسن" }, publisher: { "@type": "Organization", name: "کافی نت توسن", url: siteUrl } };
  return <main dir="rtl" className="mx-auto min-h-[70vh] w-full max-w-4xl px-4 py-8 md:px-6 md:py-12">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
    <Link href="/news" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]"><ArrowRight size={17}/> بازگشت به اخبار و اطلاعیه‌ها</Link>
    <article className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
      {item.image_url && <img src={item.image_url} alt="" className="max-h-[420px] w-full object-cover" />}
      <div className="p-5 sm:p-8 md:p-10">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]"><span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-black text-[var(--primary)]">{categories[item.category] || "اطلاعیه"}</span>{item.published_at && <span className="inline-flex items-center gap-1"><CalendarDays size={15}/>{formatDate(item.published_at)}</span>}</div>
        <h1 className="mt-4 text-2xl font-black leading-10 md:text-4xl">{item.title}</h1>
        {item.excerpt && <p className="mt-4 border-r-4 border-[var(--primary)] pr-4 text-base font-bold leading-8 text-[var(--text-muted)]">{item.excerpt}</p>}
        {item.is_active_registration && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900"><strong>اطلاعیه مرتبط با ثبت‌نام</strong>{item.registration_start_at && <p>شروع مهلت: {formatDate(item.registration_start_at)}</p>}{item.registration_end_at && <p>پایان مهلت: {formatDate(item.registration_end_at)}</p>}</div>}
        <div className="mt-6 whitespace-pre-wrap break-words text-base leading-9 text-[var(--text)]">{item.content}</div>
        {(item.official_url || item.source_url) && <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-black">منبع و پیگیری</div><p className="mt-1 text-sm text-[var(--text-muted)]">{item.source_name || "منبع اطلاعیه"}</p></div><a href={item.official_url || item.source_url || "#"} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white">مشاهده منبع رسمی <ExternalLink size={16}/></a></div>}
        {!item.image_url && <div className="mt-8 flex items-center gap-2 text-xs text-[var(--text-muted)]"><Newspaper size={15}/> اخبار و اطلاعیه‌های کافی‌نت توسن</div>}
      </div>
    </article>
  </main>;
}
