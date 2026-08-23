import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "وبلاگ | راهنما و آموزش خدمات آنلاین | کافی نت توسن",
  description: "راهنما، شرایط، مدارک و آموزش انجام خدمات آنلاین در وبلاگ کافی نت توسن.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "وبلاگ کافی نت توسن", description: "راهنما و آموزش خدمات آنلاین", url: "/blog", type: "website", locale: "fa_IR" },
};

export default async function BlogPage() {
  const supabase = createSupabaseServerClient();
  const { data: posts } = await supabase.from("blog_posts").select("id,title,slug,excerpt,featured_image,published_at,blog_categories(name,slug)").eq("status", "published").order("published_at", { ascending: false });
  return <main dir="rtl" className="max-w-6xl mx-auto px-6 py-10"><nav className="text-sm text-[var(--text-muted)] mb-6"><Link href="/">خانه</Link><span className="mx-2">/</span><span>وبلاگ</span></nav><header className="mb-10"><h1 className="text-3xl font-bold">وبلاگ کافی نت توسن</h1><p className="mt-3 text-[var(--text-muted)]">راهنمای خدمات، شرایط ثبت‌نام، مدارک مورد نیاز و آموزش‌های کاربردی.</p></header><section className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{(posts ?? []).map((post: any) => <article key={post.id} className="rounded-2xl border bg-white overflow-hidden shadow-sm"><div className="p-5"><div className="text-xs text-[var(--text-muted)] mb-2">{post.blog_categories?.name ?? "راهنما"}</div><h2 className="text-xl font-bold"><Link href={`/blog/${encodeURIComponent(post.slug)}`} className="hover:text-[#09967C]">{post.title}</Link></h2>{post.excerpt && <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{post.excerpt}</p>}<Link href={`/blog/${encodeURIComponent(post.slug)}`} className="inline-block mt-4 font-semibold text-[#09967C]">مطالعه مقاله ←</Link></div></article>)}</section>{(!posts || posts.length === 0) && <p className="text-center text-[var(--text-muted)] py-16">هنوز مقاله‌ای منتشر نشده است.</p>}</main>;
}
