import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Keep only routes that actually exist in the public application.
  // /about and /contact were previously advertised here but currently return 404.
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/services`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
  ];

  const supabase = createSupabaseServerClient();
  const [{ data: services }, { data: posts }] = await Promise.all([
    supabase
      .from("services")
      .select("id,slug,created_at")
      .eq("is_active", true)
      .not("slug", "is", null),
    supabase
      .from("blog_posts")
      .select("id,slug,published_at,updated_at")
      .eq("status", "published"),
  ]);

  const servicePages = (services || []).map((service: any) => ({
    url: `${siteUrl}/services/${encodeURIComponent(service.slug)}`,
    lastModified: service.created_at || undefined,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const blogPages = (posts || []).map((post: any) => ({
    url: `${siteUrl}/blog/${encodeURIComponent(post.slug)}`,
    lastModified: post.updated_at || post.published_at || undefined,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...servicePages, ...blogPages];
}

// Sitemap contains only canonical production URLs that are intended to be indexable.
