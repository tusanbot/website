import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Tag } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import BlogInteractions from "@/components/blog/BlogInteractions";

async function getPost(slug: string) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("blog_posts").select("id,title,slug,excerpt,content,featured_image,meta_title,meta_description,primary_keyword,seo_keywords,published_at,updated_at,blog_categories(name,slug),blog_post_services(service_id,services(id,title,slug))").eq("slug", decodeURIComponent(slug).normalize("NFC")).eq("status", "published").maybeSingle();
  return data as any;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "مقاله پیدا نشد", robots: { index: false, follow: false } };
  const title = post.meta_title || `${post.title} | وبلاگ کافی نت توسن`;
  const description = post.meta_description || post.excerpt || `راهنمای ${post.title} در کافی نت توسن.`;
  const canonical = `/blog/${encodeURIComponent(post.slug)}`;
  const keywords = [...(Array.isArray(post.seo_keywords) ? post.seo_keywords : []), post.primary_keyword, "کافی نت توسن"].filter(Boolean);
  return { title, description, keywords, alternates: { canonical }, openGraph: { type: "article", locale: "fa_IR", title, description, url: canonical, siteName: "کافی نت توسن", publishedTime: post.published_at || undefined, modifiedTime: post.updated_at || post.published_at || undefined } };
}

function stripHtml(value: string) { return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function readingMinutes(value: string) { return Math.max(1, Math.ceil(stripHtml(value).split(/\s+/).length / 220)); }

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, "");
  const canonical = `${siteUrl}/blog/${encodeURIComponent(post.slug)}`;
  const services = (post.blog_post_services ?? []).map((x: any) => x.services).filter(Boolean);
  const categorySlug = post.blog_categories?.slug;
  const relatedCategory = post.blog_categories?.name;
  const supabase = createSupabaseServerClient();
  const { data: relatedPosts } = categorySlug ? await supabase.from("blog_posts").select("id,title,slug,excerpt,published_at,blog_categories!inner(name,slug)").eq("status", "published").neq("id", post.id).eq("blog_categories.slug", categorySlug).order("published_at", { ascending: false }).limit(3) : { data: [] };
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "خانه", item: siteUrl }, { "@type": "ListItem", position: 2, name: "وبلاگ", item: `${siteUrl}/blog` }, { "@type": "ListItem", position: 3, name: post.title, item: canonical }] };
  const article = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.meta_description || post.excerpt || stripHtml(post.content).slice(0, 160), keywords: [...(Array.isArray(post.seo_keywords) ? post.seo_keywords : []), post.primary_keyword].filter(Boolean).join(", "), datePublished: post.published_at || undefined, dateModified: post.updated_at || post.published_at || undefined, mainEntityOfPage: { "@type": "WebPage", "@id": canonical }, author: { "@type": "Organization", name: "کافی نت توسن", url: siteUrl }, publisher: { "@type": "Organization", name: "کافی نت توسن", url: siteUrl } };
  return <main dir="rtl" className="blog-article-shell"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} /><div className="blog-article-breadcrumb"><Link href="/blog"><ArrowRight size={16} /> بازگشت به وبلاگ</Link><span>/</span><span>{relatedCategory || "راهنما"}</span></div><div className="blog-article-layout"><article className="blog-article-card"><header className="blog-article-header"><div className="blog-article-category"><Tag size={15} /> {relatedCategory || "راهنما"}</div><h1>{post.title}</h1>{post.excerpt && <p className="blog-article-lead">{post.excerpt}</p>}<div className="blog-article-meta"><span><CalendarDays size={16} /> {post.published_at ? new Date(post.published_at).toLocaleDateString("fa-IR") : ""}</span><span><Clock3 size={16} /> حدود {readingMinutes(post.content)} دقیقه مطالعه</span></div></header>{post.featured_image && <div className="blog-article-cover"><img src={post.featured_image} alt="" /></div>}<div className="blog-article-content" dangerouslySetInnerHTML={{ __html: post.content }} />{services.length > 0 && <section className="blog-service-cta"><div><span className="blog-eyebrow">خدمت مرتبط</span><h2>برای انجام این خدمت آماده‌اید؟</h2><p>می‌توانید درخواست خود را به‌صورت آنلاین ثبت کنید.</p></div><div className="blog-service-actions">{services.map((service: any) => <Link key={service.id} href={`/services/${encodeURIComponent(service.slug)}`}>ثبت درخواست {service.title}</Link>)}</div></section>}<BlogInteractions postId={post.id} postTitle={post.title} postUrl={canonical} /></article><aside className="blog-article-sidebar"><div className="blog-toc-card"><span className="blog-eyebrow">راهنمای مطالعه</span><h2>در این مقاله</h2><p>برای مطالعه راحت‌تر، بخش‌های مختلف مقاله با تیترهای مشخص از یکدیگر جدا شده‌اند.</p><Link href="/blog">مشاهده سایر مقالات</Link></div></aside></div>{relatedPosts && relatedPosts.length > 0 && <section className="blog-related-section"><div className="blog-results-head"><div><span className="blog-eyebrow">ادامه مطالعه</span><h2>مطالب مرتبط{relatedCategory ? ` در ${relatedCategory}` : ""}</h2></div></div><div className="blog-related-grid">{relatedPosts.map((related: any) => <Link key={related.id} href={`/blog/${encodeURIComponent(related.slug)}`} className="blog-related-card"><span>{related.blog_categories?.name || "راهنما"}</span><h3>{related.title}</h3>{related.excerpt && <p>{related.excerpt}</p>}</Link>)}</div></section>}</main>;
}
