import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronLeft, Flame, Search, Sparkles, Star, Tag, ThumbsUp, TrendingUp } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "وبلاگ | راهنما و آموزش خدمات آنلاین | کافی نت توسن",
  description: "راهنماهای کاربردی، آموزش مرحله‌به‌مرحله، شرایط و مدارک موردنیاز خدمات آنلاین در وبلاگ کافی نت توسن.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "وبلاگ کافی نت توسن", description: "راهنما و آموزش خدمات آنلاین", url: "/blog", type: "website", locale: "fa_IR" },
};

const PAGE_SIZE = 9;
type Category = { id: string; name: string; slug: string; description: string | null };
type Post = { id: string; title: string; slug: string; excerpt: string | null; featured_image: string | null; published_at: string | null; category_id: string | null; blog_categories: { name: string; slug: string } | null; likes?: number; dislikes?: number; ratings?: number; ratingAverage?: number; comments?: number; score?: number; trend?: number };
type Reaction = { post_id: string; reaction: string };
type Rating = { post_id: string; rating: number };
type Comment = { post_id: string; status: string };

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}
function readingTime(post: Post) {
  const words = `${post.title} ${post.excerpt ?? ""}`.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(2, Math.ceil(words / 35))} دقیقه مطالعه`;
}
function engagement(post: Post) {
  return (post.likes ?? 0) * 3 + (post.dislikes ?? 0) * -1 + (post.comments ?? 0) * 2 + (post.ratings ?? 0) * 1.5 + (post.ratingAverage ?? 0) * 2;
}
function recency(value: string | null) {
  if (!value) return 0;
  const days = Math.max(0, (Date.now() - new Date(value).getTime()) / 86400000);
  return Math.max(0, 1 - days / 45);
}
function enrich(posts: Post[], reactions: Reaction[], ratings: Rating[], comments: Comment[]) {
  const byId = new Map<string, Post>();
  posts.forEach((post) => byId.set(post.id, { ...post, likes: 0, dislikes: 0, ratings: 0, ratingAverage: 0, comments: 0 }));
  reactions.forEach((row) => { const p = byId.get(row.post_id); if (!p) return; if (row.reaction === "like") p.likes = (p.likes ?? 0) + 1; if (row.reaction === "dislike") p.dislikes = (p.dislikes ?? 0) + 1; });
  const ratingTotals = new Map<string, { sum: number; count: number }>();
  ratings.forEach((row) => { const current = ratingTotals.get(row.post_id) ?? { sum: 0, count: 0 }; current.sum += Number(row.rating); current.count += 1; ratingTotals.set(row.post_id, current); });
  ratingTotals.forEach((value, id) => { const p = byId.get(id); if (p) { p.ratings = value.count; p.ratingAverage = value.count ? value.sum / value.count : 0; } });
  comments.forEach((row) => { if (row.status !== "approved") return; const p = byId.get(row.post_id); if (p) p.comments = (p.comments ?? 0) + 1; });
  return [...byId.values()].map((post) => ({ ...post, score: engagement(post), trend: engagement(post) * 0.7 + recency(post.published_at) * 12 }));
}
function PostCard({ post, featured = false, rank }: { post: Post; featured?: boolean; rank?: number }) {
  return <article className={featured ? "blog-card blog-card-featured" : "blog-card"}>
    <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="blog-card-media" aria-label={`مطالعه ${post.title}`}>
      {post.featured_image ? <img src={post.featured_image} alt="" loading={featured ? "eager" : "lazy"} /> : <div className="blog-media-fallback"><BookOpen size={42} /></div>}
      <span className="blog-category-badge">{post.blog_categories?.name ?? "راهنما"}</span>
      {rank && <span className="blog-rank">{rank}</span>}
    </Link>
    <div className="blog-card-content">
      <div className="blog-meta"><span><CalendarDays size={15} /> {formatDate(post.published_at)}</span><span>•</span><span>{readingTime(post)}</span></div>
      <h3><Link href={`/blog/${encodeURIComponent(post.slug)}`}>{post.title}</Link></h3>
      {post.excerpt && <p>{post.excerpt}</p>}
      {(post.likes || post.ratingAverage || post.comments) ? <div className="blog-engagement"><span><ThumbsUp size={13} /> {post.likes ?? 0}</span><span><Star size={13} /> {(post.ratingAverage ?? 0).toFixed(1)}</span><span>💬 {post.comments ?? 0}</span></div> : null}
      <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="blog-card-link">مطالعه مقاله <ArrowLeft size={17} /></Link>
    </div>
  </article>;
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const categorySlug = (params.category || "").trim();
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const supabase = createSupabaseServerClient();
  const [{ data: categoriesData }, { data: postsData }, { data: reactionsData }, { data: ratingsData }, { data: commentsData }] = await Promise.all([
    supabase.from("blog_categories").select("id,name,slug,description").order("name"),
    supabase.from("blog_posts").select("id,title,slug,excerpt,featured_image,published_at,category_id,blog_categories(name,slug)").eq("status", "published").order("published_at", { ascending: false }),
    supabase.from("blog_reactions").select("post_id,reaction"),
    supabase.from("blog_ratings").select("post_id,rating"),
    supabase.from("blog_comments").select("post_id,status"),
  ]);
  const categories = (categoriesData ?? []) as Category[];
  const allPosts = (postsData ?? []) as unknown as Post[];
  const enriched = enrich(allPosts, (reactionsData ?? []) as Reaction[], (ratingsData ?? []) as Rating[], (commentsData ?? []) as Comment[]);
  let posts = enriched;
  const activeCategory = categories.find((item) => item.slug === categorySlug) ?? null;
  if (activeCategory) posts = posts.filter((post) => post.category_id === activeCategory.id);
  if (q) {
    const needle = q.toLocaleLowerCase("fa");
    posts = posts.filter((post) => `${post.title} ${post.excerpt ?? ""}`.toLocaleLowerCase("fa").includes(needle));
  }
  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const isFiltered = Boolean(q || activeCategory);
  const popular = !isFiltered ? [...enriched].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 4) : [];
  const trending = !isFiltered ? [...enriched].sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0)).slice(0, 4) : [];
  const featured = !isFiltered && page === 1 ? posts[0] : null;
  const visiblePosts = featured ? posts.slice(1, 1 + PAGE_SIZE) : posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const categoryCounts = new Map<string, number>();
  allPosts.forEach((post) => categoryCounts.set(post.category_id ?? "uncategorized", (categoryCounts.get(post.category_id ?? "uncategorized") || 0) + 1));
  const pageUrl = (nextPage: number) => { const p = new URLSearchParams(); if (q) p.set("q", q); if (categorySlug) p.set("category", categorySlug); if (nextPage > 1) p.set("page", String(nextPage)); return `/blog${p.toString() ? `?${p.toString()}` : ""}`; };

  return <main dir="rtl" className="blog-hub">
    <style>{`
      .blog-hub{min-height:100vh;background:linear-gradient(180deg,#f3fbf8 0%,#f8fafc 28%,#fff 100%);color:var(--text-primary);padding-bottom:5rem}.blog-wrap{max-width:1280px;margin:auto;padding:0 20px}.blog-hero{position:relative;overflow:hidden;margin:22px auto 28px;max-width:1280px;border-radius:32px;padding:42px 34px 30px;background:radial-gradient(circle at 10% 10%,rgba(255,255,255,.2),transparent 32%),linear-gradient(135deg,#087d69,#09967c 52%,#0b8a86);color:#fff;box-shadow:0 24px 60px rgba(9,150,124,.18)}.blog-hero:after{content:"";position:absolute;width:280px;height:280px;border-radius:50%;background:rgba(255,255,255,.08);left:-100px;bottom:-160px}.blog-breadcrumb{position:relative;z-index:1;display:flex;gap:9px;align-items:center;font-size:13px;color:rgba(255,255,255,.8)}.blog-breadcrumb a{color:#fff;font-weight:700}.blog-hero-grid{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto;gap:30px;align-items:center;margin-top:24px}.blog-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:800;color:var(--primary)}.blog-hero .blog-eyebrow{color:#dff5ef}.blog-hero h1{margin:8px 0 10px;font-size:clamp(2rem,4vw,3.5rem);line-height:1.15;font-weight:900;letter-spacing:-.035em}.blog-hero p{max-width:720px;margin:0;color:rgba(255,255,255,.86);line-height:2;font-size:16px}.blog-hero-mark{display:grid;place-items:center;width:118px;height:118px;border-radius:34px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(12px)}.blog-search{display:flex;align-items:center;gap:10px;margin-top:28px;padding:7px;border-radius:18px;background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.12);color:var(--text-secondary)}.blog-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--text-primary);font-family:inherit;padding:11px 8px;font-size:14px}.blog-search button{border:0;border-radius:13px;padding:11px 18px;background:var(--primary);color:#fff;font:inherit;font-weight:800;cursor:pointer}.blog-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px;align-items:start}.blog-sidebar{position:sticky;top:90px}.blog-side-card{background:rgba(255,255,255,.9);border:1px solid var(--border);border-radius:24px;padding:16px;box-shadow:var(--shadow-sm)}.blog-side-title{display:flex;justify-content:space-between;align-items:center;padding:6px 8px 12px;font-weight:900}.blog-side-title span:last-child{font-size:12px;color:var(--text-muted);background:var(--surface-muted);padding:5px 9px;border-radius:99px}.blog-side-link{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border-radius:13px;color:var(--text-secondary);font-size:13px;font-weight:700;transition:.2s}.blog-side-link:hover,.blog-side-link.active{background:var(--primary-light);color:var(--primary-dark)}.blog-side-link small{min-width:24px;text-align:center;color:var(--text-muted)}.blog-side-desc{margin:12px 8px 4px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;line-height:1.9;color:var(--text-muted)}.blog-main-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:18px}.blog-main-head h2{margin:5px 0 0;font-size:25px;font-weight:900}.blog-count{font-size:13px;color:var(--text-muted);white-space:nowrap}.blog-featured{display:grid;grid-template-columns:1.1fr 1fr;overflow:hidden;border-radius:28px;background:var(--surface-strong);border:1px solid var(--border);box-shadow:var(--shadow-md);margin-bottom:22px}.blog-featured .blog-card-media{min-height:340px}.blog-featured .blog-card-content{padding:30px}.blog-featured h3{font-size:28px;line-height:1.5}.blog-featured p{font-size:15px;line-height:2.1}.blog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.blog-card{overflow:hidden;background:rgba(255,255,255,.94);border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow-xs);transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}.blog-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg);border-color:rgba(9,150,124,.18)}.blog-card-media{display:block;position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,#dff5ef,#e0f7f6);overflow:hidden}.blog-card-media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .45s ease}.blog-card:hover .blog-card-media img{transform:scale(1.035)}.blog-media-fallback{height:100%;display:grid;place-items:center;color:var(--primary)}.blog-category-badge{position:absolute;right:12px;top:12px;border-radius:99px;background:rgba(255,255,255,.94);color:var(--primary-dark);font-size:11px;font-weight:900;padding:6px 10px;box-shadow:0 6px 16px rgba(15,23,42,.1)}.blog-rank{position:absolute;left:12px;top:12px;width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:rgba(9,150,124,.94);color:#fff;font-weight:900;font-size:12px}.blog-card-content{padding:17px}.blog-meta{display:flex;align-items:center;gap:7px;color:var(--text-muted);font-size:11px}.blog-meta span:first-child{display:flex;align-items:center;gap:5px}.blog-card h3{margin:10px 0 7px;font-size:17px;line-height:1.75;font-weight:900}.blog-card h3 a{color:var(--text-primary)}.blog-card p{margin:0;color:var(--text-secondary);font-size:12.5px;line-height:1.95;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.blog-card-link{display:inline-flex;align-items:center;gap:6px;margin-top:14px;color:var(--primary-dark);font-size:12px;font-weight:900}.blog-engagement{display:flex;align-items:center;gap:12px;margin-top:12px;color:var(--text-muted);font-size:11px}.blog-engagement span{display:inline-flex;align-items:center;gap:4px}.blog-special{margin:0 0 30px}.blog-special-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:14px}.blog-special-head h2{margin:5px 0 0;font-size:22px;font-weight:900}.blog-special-head p{margin:0;color:var(--text-muted);font-size:12px}.blog-special-icon{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:900;color:var(--primary-dark)}.blog-special-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.blog-special .blog-card h3{font-size:15px}.blog-special .blog-card p{display:none}.blog-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 18px;padding:12px 15px;border-radius:16px;background:rgba(255,255,255,.72);border:1px solid var(--border);font-size:12px;color:var(--text-secondary)}.blog-toolbar a{display:inline-flex;align-items:center;gap:6px;color:var(--primary-dark);font-weight:900}.blog-empty{display:grid;place-items:center;text-align:center;padding:70px 24px;border:1px dashed var(--border-strong);border-radius:24px;background:rgba(255,255,255,.65)}.blog-empty-icon{width:70px;height:70px;display:grid;place-items:center;border-radius:22px;background:var(--primary-light);color:var(--primary);margin-bottom:14px}.blog-empty h3{font-weight:900;font-size:19px}.blog-empty p{margin:7px 0 18px;color:var(--text-muted);font-size:13px}.blog-empty a{border-radius:12px;background:var(--primary);color:#fff;padding:10px 16px;font-size:13px;font-weight:800}.blog-pagination{display:flex;justify-content:center;align-items:center;gap:7px;margin-top:28px}.blog-page-number,.blog-page-arrow{display:grid;place-items:center;min-width:38px;height:38px;border:1px solid var(--border);border-radius:12px;background:#fff;color:var(--text-secondary);font-size:12px;font-weight:800}.blog-page-number.active{background:var(--primary);border-color:var(--primary);color:#fff}.blog-page-arrow.disabled{opacity:.4;pointer-events:none}.blog-bottom-note{display:flex;align-items:center;gap:10px;margin-top:32px;padding:17px 18px;border-radius:20px;background:linear-gradient(135deg,#f0fbf8,#fff);border:1px solid rgba(9,150,124,.12);color:var(--text-secondary);font-size:12px;line-height:1.9}.blog-bottom-note svg{color:var(--primary);flex:none}@media(max-width:980px){.blog-layout{grid-template-columns:1fr}.blog-sidebar{position:static}.blog-side-card{display:flex;overflow:auto;gap:7px;padding:10px}.blog-side-title,.blog-side-desc{display:none}.blog-side-link{white-space:nowrap;padding:9px 12px;background:var(--surface-muted)}.blog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.blog-special-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.blog-featured{grid-template-columns:1fr}.blog-featured .blog-card-media{min-height:auto}}@media(max-width:640px){.blog-wrap{padding:0 14px}.blog-hero{margin:12px 0 20px;padding:28px 18px 20px;border-radius:24px}.blog-hero-grid{grid-template-columns:1fr}.blog-hero-mark{display:none}.blog-search{margin-top:20px}.blog-search button{padding:10px 13px}.blog-main-head{align-items:start}.blog-main-head h2{font-size:21px}.blog-grid,.blog-special-grid{grid-template-columns:1fr}.blog-special-head{align-items:start;gap:10px}.blog-special-head p{display:none}.blog-featured .blog-card-content{padding:20px}.blog-featured h3{font-size:21px}.blog-bottom-note{align-items:flex-start}}
    `}</style>
    <div className="blog-wrap">
      <section className="blog-hero">
        <div className="blog-breadcrumb"><Link href="/">خانه</Link><span>‹</span><span>وبلاگ</span></div>
        <div className="blog-hero-grid"><div><span className="blog-eyebrow"><Sparkles size={15} /> دانش کاربردی، بدون پیچیدگی</span><h1>مجله توسن؛ راهنمای مطمئن خدمات آنلاین</h1><p>آموزش‌های مرحله‌به‌مرحله، شرایط و مدارک موردنیاز و نکات کاربردی برای اینکه خدمات اداری و آنلاین را سریع‌تر و با خطای کمتر انجام دهید.</p></div><div className="blog-hero-mark"><BookOpen size={48} /></div></div>
        <form action="/blog" className="blog-search"><Search size={20} aria-hidden="true" /><input name="q" defaultValue={q} placeholder="چه چیزی می‌خواهید یاد بگیرید؟" aria-label="جستجو در مقالات وبلاگ" />{categorySlug && <input type="hidden" name="category" value={categorySlug} />}<button type="submit">جستجو</button></form>
      </section>
      {!isFiltered && <>
        <section className="blog-special" aria-labelledby="popular-heading"><div className="blog-special-head"><div><span className="blog-special-icon"><Flame size={15} /> محبوب‌ترین مطالب</span><h2 id="popular-heading">مطالبی که بیشتر مورد توجه کاربران بوده‌اند</h2></div><p>بر پایه لایک، امتیاز و مشارکت کاربران</p></div><div className="blog-special-grid">{popular.map((post, index) => <PostCard key={post.id} post={post} rank={index + 1} />)}</div></section>
        <section className="blog-special" aria-labelledby="trending-heading"><div className="blog-special-head"><div><span className="blog-special-icon"><TrendingUp size={15} /> مطالب داغ</span><h2 id="trending-heading">مطالبی که همین حالا ارزش خواندن دارند</h2></div><p>ترکیب تازگی و تعامل کاربران</p></div><div className="blog-special-grid">{trending.map((post, index) => <PostCard key={post.id} post={post} rank={index + 1} />)}</div></section>
      </>}
      <div className="blog-layout">
        <aside className="blog-sidebar" aria-label="دسته‌بندی مطالب"><div className="blog-side-card"><div className="blog-side-title"><span>دسته‌بندی مطالب</span><span>{total} مقاله</span></div><Link href="/blog" className={`blog-side-link ${!categorySlug ? "active" : ""}`}><span>همه مطالب</span><small>{allPosts.length}</small></Link>{categories.map((item) => <Link key={item.id} href={`/blog?category=${encodeURIComponent(item.slug)}`} className={`blog-side-link ${categorySlug === item.slug ? "active" : ""}`}><span>{item.name}</span><small>{categoryCounts.get(item.id) || 0}</small></Link>)}{activeCategory?.description && <p className="blog-side-desc">{activeCategory.description}</p>}</div></aside>
        <section className="blog-results" aria-live="polite">
          <div className="blog-main-head"><div><span className="blog-eyebrow">{isFiltered ? "نتایج فیلترشده" : "جدیدترین مطالب"}</span><h2>{q ? `نتایج «${q}»` : activeCategory ? activeCategory.name : "تازه‌ترین راهنماها"}</h2></div><span className="blog-count">{total} مقاله</span></div>
          {featured && <div className="blog-featured"><PostCard post={featured} featured /></div>}
          {isFiltered && <div className="blog-toolbar"><span>{q ? `جستجو برای «${q}»` : `دسته «${activeCategory?.name}»`}</span><Link href="/blog">پاک کردن فیلترها <ArrowLeft size={15} /></Link></div>}
          {visiblePosts.length ? <div className="blog-grid">{visiblePosts.map((post) => <PostCard key={post.id} post={post} />)}</div> : <div className="blog-empty"><div className="blog-empty-icon"><Search size={28} /></div><h3>مقاله‌ای پیدا نشد</h3><p>عبارت جستجو یا دسته‌بندی دیگری را امتحان کنید.</p><Link href="/blog">نمایش همه مطالب</Link></div>}
          {totalPages > 1 && <nav className="blog-pagination" aria-label="صفحه‌بندی مقالات"><Link href={pageUrl(Math.max(1, page - 1))} className={`blog-page-arrow ${page === 1 ? "disabled" : ""}`} aria-label="صفحه قبل"><ChevronLeft size={18} /></Link>{Array.from({length:totalPages},(_,i)=>i+1).filter(n=>n===1||n===totalPages||Math.abs(n-page)<=1).map((n,i,arr)=><span key={n}>{i>0&&arr[i-1]!==n-1?<span className="blog-page-number" aria-hidden="true">…</span>:null}<Link href={pageUrl(n)} className={`blog-page-number ${n===page?"active":""}`} aria-current={n===page?"page":undefined}>{n}</Link></span>)}<Link href={pageUrl(Math.min(totalPages,page+1))} className={`blog-page-arrow ${page===totalPages?"disabled":""}`} aria-label="صفحه بعد"><ArrowRight size={18}/></Link></nav>}
          <div className="blog-bottom-note"><Tag size={19} /><span>مقالات با ساختار خوانا، خلاصه کاربردی و اطلاعات زمان مطالعه ارائه می‌شوند. امکانات امتیازدهی، نظر، لایک، دیسلایک و اشتراک‌گذاری نیز در صفحه هر مقاله در دسترس است.</span></div>
        </section>
      </div>
    </div>
  </main>;
}
