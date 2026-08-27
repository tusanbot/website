import type { Metadata } from "next";
import Link from "next/link";
import { Search, ArrowLeft, BookOpen, CalendarDays } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "وبلاگ | راهنما و آموزش خدمات آنلاین | کافی نت توسن",
  description: "راهنما، شرایط، مدارک و آموزش انجام خدمات آنلاین در وبلاگ کافی نت توسن.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "وبلاگ کافی نت توسن", description: "راهنما و آموزش خدمات آنلاین", url: "/blog", type: "website", locale: "fa_IR" },
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const category = (params.category || "").trim();
  const supabase = createSupabaseServerClient();

  let query = supabase.from("blog_posts").select("id,title,slug,excerpt,featured_image,published_at,blog_categories(name,slug)").eq("status", "published").order("published_at", { ascending: false });
  if (q) query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`);
  if (category) query = query.eq("blog_categories.slug", category);
  const [{ data: posts }, { data: categories }, { data: allPosts }] = await Promise.all([
    query,
    supabase.from("blog_categories").select("id,name,slug,description").order("name"),
    supabase.from("blog_posts").select("id,category_id").eq("status", "published"),
  ]);
  const counts = new Map<string, number>();
  (allPosts ?? []).forEach((p: any) => counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1));

  return <main dir="rtl" className="blog-page-shell">
    <section className="blog-hero">
      <div className="blog-breadcrumb"><Link href="/">خانه</Link><span>/</span><span>وبلاگ</span></div>
      <div className="blog-hero-content"><div><span className="blog-eyebrow">دانش و راهنمای خدمات</span><h1>وبلاگ کافی نت توسن</h1><p>راهنمای کاربردی، مرحله‌به‌مرحله و به‌روز برای انجام خدمات آنلاین، اداری و تأمین اجتماعی.</p></div><div className="blog-hero-icon"><BookOpen size={42} /></div></div>
      <form action="/blog" className="blog-search-form"><Search size={21} /><input name="q" defaultValue={q} placeholder="جستجو در عنوان و محتوای مقالات..." aria-label="جستجوی مقالات" /><button type="submit">جستجو</button>{category && <input type="hidden" name="category" value={category} />}</form>
    </section>

    <div className="blog-layout">
      <aside className="blog-sidebar">
        <div className="blog-sidebar-card"><div className="blog-sidebar-heading"><span>موضوعات</span><span>{allPosts?.length ?? 0}</span></div><Link href="/blog" className={!category ? "active" : ""}>همه مطالب <span>{allPosts?.length ?? 0}</span></Link>{(categories ?? []).map((item: any) => <Link key={item.id} href={`/blog?category=${encodeURIComponent(item.slug)}`} className={category === item.slug ? "active" : ""}>{item.name}<span>{counts.get(item.id) || 0}</span></Link>)}</div>
      </aside>
      <section className="blog-results">
        <div className="blog-results-head"><div><span className="blog-eyebrow">مطالب منتشرشده</span><h2>{q ? `نتایج جستجو برای «${q}»` : category ? ((categories ?? []).find((x: any) => x.slug === category)?.name || "مطالب دسته‌بندی") : "آخرین راهنماها"}</h2></div><span className="blog-result-count">{posts?.length ?? 0} مقاله</span></div>
        {posts?.length ? <div className="blog-grid">{posts.map((post: any) => <article key={post.id} className="blog-post-card"><div className="blog-card-visual">{post.featured_image ? <img src={post.featured_image} alt="" /> : <div className="blog-card-pattern"><BookOpen size={34} /></div>}<span>{post.blog_categories?.name ?? "راهنما"}</span></div><div className="blog-card-body"><div className="blog-card-meta"><span><CalendarDays size={15} /> {post.published_at ? new Date(post.published_at).toLocaleDateString("fa-IR") : ""}</span></div><h3><Link href={`/blog/${encodeURIComponent(post.slug)}`}>{post.title}</Link></h3>{post.excerpt && <p>{post.excerpt}</p>}<Link href={`/blog/${encodeURIComponent(post.slug)}`} className="blog-read-more">مطالعه مقاله <ArrowLeft size={17} /></Link></div></article>)}</div> : <div className="blog-empty-state"><BookOpen size={38} /><h3>مقاله‌ای پیدا نشد</h3><p>عبارت جستجو یا دسته‌بندی دیگری را امتحان کنید.</p><Link href="/blog">نمایش همه مطالب</Link></div>}
      </section>
    </div>
  </main>;
}
