import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { tools } from "@/lib/tools";
import { aiTools } from "@/lib/ai-tools";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/ai`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/services`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/tools`, changeFrequency: "weekly", priority: 0.8 },
  ];

  const toolPages = tools
    .filter((tool) => tool.enabled && tool.indexable && tool.href)
    .map((tool) => ({
      url: `${siteUrl}${tool.href}`,
      changeFrequency: "monthly" as const,
      priority: tool.featured ? 0.75 : 0.65,
    }));

  const aiPages = aiTools
    .filter((tool) => tool.href)
    .map((tool) => ({
      url: `${siteUrl}${tool.href}`,
      changeFrequency: "monthly" as const,
      priority: tool.featured ? 0.78 : 0.65,
    }));

  // Sitemap generation must remain available even if the content database has a
  // transient error. Static/tool URLs are still valuable discovery signals.
  let servicePages: MetadataRoute.Sitemap = [];
  let blogPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createSupabaseServerClient();
    const [{ data: services }, { data: posts }] = await Promise.all([
      supabase
        .from("services")
        .select("id,slug,created_at,updated_at")
        .eq("is_active", true)
        .not("slug", "is", null),
      supabase
        .from("blog_posts")
        .select("id,slug,published_at,updated_at")
        .eq("status", "published"),
    ]);

    servicePages = (services || []).map((service: any) => ({
      url: `${siteUrl}/services/${encodeURIComponent(service.slug)}`,
      lastModified: service.updated_at || service.created_at || undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    blogPages = (posts || []).map((post: any) => ({
      url: `${siteUrl}/blog/${encodeURIComponent(post.slug)}`,
      lastModified: post.updated_at || post.published_at || undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error("sitemap dynamic data load failed", error);
  }

  return [...staticPages, ...toolPages, ...aiPages, ...servicePages, ...blogPages];
}
