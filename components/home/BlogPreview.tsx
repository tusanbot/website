"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, SectionHeader, TusanButton } from "@/components/ui";

type Post = { id: string; title: string; slug: string; excerpt: string | null };

export default function BlogPreview() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase.from("blog_posts").select("id,title,slug,excerpt").eq("status", "published").order("published_at", { ascending: false }).limit(3)
      .then(({ data }) => { if (mounted) setPosts((data || []) as Post[]); });
    return () => { mounted = false; };
  }, []);

  if (!posts.length) return null;

  return (
    <section className="relative py-20" aria-labelledby="home-blog-title">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader title="راهنما و آموزش خدمات" description="شرایط، مدارک و مراحل انجام خدمات را در وبلاگ توسن بخوانید." align="center" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {posts.map((post, index) => (
            <GlassPanel key={post.id} className="flex h-full flex-col rounded-3xl border border-[var(--border)] p-6">
              <h2 id={index === 0 ? "home-blog-title" : undefined} className="text-xl font-black text-[var(--text)]">
                <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="transition hover:text-[var(--primary)]">{post.title}</Link>
              </h2>
              {post.excerpt && <p className="mt-3 line-clamp-3 leading-7 text-[var(--text-muted)]">{post.excerpt}</p>}
              <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="mt-auto pt-5 font-bold text-[var(--primary)]">مطالعه راهنما ←</Link>
            </GlassPanel>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/blog"><TusanButton variant="secondary" className="px-8 py-3">مشاهده همه مقالات</TusanButton></Link>
        </div>
      </div>
    </section>
  );
}
