import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ArrowLeft, Newspaper, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "اخبار و اطلاعیه‌ها | کافی نت توسن",
  description: "آخرین اخبار، فراخوان‌ها و اطلاعیه‌های مهم آموزشی، استخدامی و خدمات عمومی در کافی نت توسن.",
  alternates: { canonical: "/news" },
  openGraph: { title: "اخبار و اطلاعیه‌های کافی نت توسن", description: "آخرین اخبار و اطلاعیه‌های کاربردی", url: "/news", type: "website", locale: "fa_IR" },
};

type NewsItem = {
  id: string; title: string; slug: string; excerpt: string | null; category: string;
  image_url: string | null; source_name: string | null; published_at: string | null;
  official_url: string | null; is_active_registration: boolean;
  registration_start_at: string | null; registration_end_at: string | null;
};
const categories: Record<string, string> = {
  general: "عمومی", education: "آموزش و دانشگاه", employment: "استخدام", government: "خدمات دولتی",
  registration: "ثبت‌نام و فراخوان", finance: "وام و تسهیلات", exams: "آزمون‌ها",
};
function formatDate(value: string | null) {
  if (!value) return "تاریخ انتشار نامشخص";
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const category = (params.category || "").trim();
  const supabase = createSupabaseServerClient();
  let request = supabase.from("news_announcements")
    .select("id,title,slug,excerpt,category,image_url,source_name,published_at,official_url,is_active_registration,registration_start_at,registration_end_at")
    .eq("status", "published").order("published_at", { ascending: false, nullsFirst: false }).limit(60);
  if (category) request = request.eq("category", category);
  if (query) request = request.or(`title.ilike.%${query.replace(/[,%()]/g, " ")}%,excerpt.ilike.%${query.replace(/[,%()]/g, " ")}%`);
  const { data, error } = await request;
  const items = (data ?? []) as NewsItem[];

  return <main dir="rtl" className="mx-auto min-h-[70vh] w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
    <header className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-9">
      <div className="flex items-center gap-3 text-[var(--primary)]"><Newspaper size={28} /><span className="text-sm font-black">رسانه توسن</span></div>
      <h1 className="mt-3 text-3xl font-black text-[var(--text)] md:text-4xl">اخبار و اطلاعیه‌ها</h1>
      <p className="mt-3 max-w-3xl leading-8 text-[var(--text-muted)]">اخبار، فراخوان‌ها و اطلاعیه‌های کاربردی را یک‌جا دنبال کنید. این بخش مستقل از فهرست ثبت‌نام‌های فعال است؛ بنابراین هر خبر الزاماً به معنی باز بودن ثبت‌نام نیست.</p>
      <form action="/news" method="get" className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="sr-only">جست‌وجو در اخبار</span><Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input name="q" defaultValue={query} placeholder="جست‌وجو در اخبار و اطلاعیه‌ها..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-3 pr-10 pl-3 text-sm outline-none focus:border-[var(--primary)]" /></label>
        <select name="category" defaultValue={category} aria-label="دسته‌بندی اخبار" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"><option value="">همه دسته‌ها</option>{Object.entries(categories).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white" type="submit">جست‌وجو</button>
      </form>
    </header>
    {error ? <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm leading-7 text-amber-900">بخش اخبار هنوز به پایگاه داده متصل نشده است. پس از اجرای مهاجرت دیتابیس، این صفحه فعال می‌شود.</div> :
      items.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center"><Newspaper className="mx-auto text-[var(--text-muted)]" size={40}/><h2 className="mt-4 text-xl font-black">هنوز خبری منتشر نشده است</h2><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">خبرها و اطلاعیه‌های تأییدشده به‌زودی در این بخش نمایش داده می‌شوند.</p></div> :
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(item => <article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:shadow-lg">
        <Link href={`/news/${encodeURIComponent(item.slug)}`} className="block">
          {item.image_url ? <img src={item.image_url} alt="" loading="lazy" className="h-48 w-full object-cover" /> : <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[var(--primary)]/10 to-[var(--surface-secondary)] text-[var(--primary)]"><Newspaper size={42}/></div>}
        </Link>
        <div className="p-5"><div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]"><span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 font-bold text-[var(--primary)]">{categories[item.category] || "اطلاعیه"}</span><span className="inline-flex items-center gap-1"><CalendarDays size={13}/>{formatDate(item.published_at)}</span></div>
          <h2 className="mt-3 text-lg font-black leading-8"><Link href={`/news/${encodeURIComponent(item.slug)}`} className="hover:text-[var(--primary)]">{item.title}</Link></h2>
          {item.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--text-muted)]">{item.excerpt}</p>}
          {item.is_active_registration && item.registration_end_at && <p className="mt-3 text-xs font-bold text-emerald-700">مهلت ثبت‌نام تا {formatDate(item.registration_end_at)}</p>}
          <Link href={`/news/${encodeURIComponent(item.slug)}`} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">ادامه مطلب <ArrowLeft size={16}/></Link>
        </div>
      </article>)}</div>}
    <p className="mt-8 text-xs leading-6 text-[var(--text-muted)]">اطلاعات هر خبر باید با منبع رسمی آن تطبیق داده شود. برای اقدام یا ثبت‌نام، تاریخ و شرایط را در لینک رسمی بررسی کنید.</p>
  </main>;
}
