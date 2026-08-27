import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

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
  return <main dir="rtl" className="max-w-4xl mx-auto px-6 py-10"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} /><nav className="text-sm text-[var(--text-muted)] mb-8"><Link href="/">خانه</Link><span className="mx-2">/</span><Link href="/blog">وبلاگ</Link><span className="mx-2">/</span><span>{post.title}</span></nav><article><header><h1 className="text-3xl md:text-4xl font-bold leading-tight">{post.title}</h1>{post.excerpt && <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">{post.excerpt}</p>}</header><div className="mt-8 prose prose-lg max-w-none rtl:prose-p:text-right" dangerouslySetInnerHTML={{ __html: post.content }} />{services.length > 0 && <section className="mt-10 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold mb-4">ثبت درخواست این خدمت</h2><div className="grid sm:grid-cols-2 gap-3">{services.map((service: any) => <Link key={service.id} href={`/services/${encodeURIComponent(service.slug)}`} className="rounded-xl bg-[#09967C] text-white px-5 py-4 text-center font-bold">ثبت درخواست {service.title}</Link>)}</div></section>}</article>{relatedPosts && relatedPosts.length > 0 && <section className="mt-10"><h2 className="text-2xl font-bold mb-5">مطالب مرتبط{relatedCategory ? ` در ${relatedCategory}` : ""}</h2><div className="grid gap-4 sm:grid-cols-3">{relatedPosts.map((related: any) => <Link key={related.id} href={`/blog/${encodeURIComponent(related.slug)}`} className="rounded-2xl border bg-white p-5 hover:shadow-sm"><h3 className="font-bold leading-7">{related.title}</h3>{related.excerpt && <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{related.excerpt}</p>}</Link>)}</div></section>}</main>;
}
