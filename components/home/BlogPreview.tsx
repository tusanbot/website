"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedTagRail from "@/components/home/AnimatedTagRail";

type Post = { id: string; title: string; slug: string };

export default function BlogPreview() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase.from("blog_posts").select("id,title,slug").eq("status", "published").order("published_at", { ascending: false }).limit(12)
      .then(({ data }) => { if (mounted) setPosts((data || []) as Post[]); });
    return () => { mounted = false; };
  }, []);

  if (!posts.length) return null;

  const items = posts.map((post) => ({
    id: post.id,
    title: post.title,
    href: `/blog/${encodeURIComponent(post.slug)}`,
    icon: <BookOpen size={16} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />,
  }));

  return (
    <section className="relative py-8" aria-labelledby="home-blog-title" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-black text-[var(--primary)]">مقالات و آموزش‌ها</span>
            <h2 id="home-blog-title" className="mt-1 text-lg font-black text-[var(--text)]">آخرین راهنماهای توسن</h2>
          </div>
          <Link href="/blog" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--primary)] transition hover:gap-2">همه مقالات <ArrowLeft size={14} /></Link>
        </div>
        <AnimatedTagRail items={items} ariaLabel="آخرین مقالات و آموزش‌های توسن" speed={10} direction="rtl" itemClassName="max-w-[300px]" />
      </div>
    </section>
  );
}
