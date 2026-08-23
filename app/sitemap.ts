import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tusancn.ir";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/services`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const supabase = createSupabaseServerClient();
  const { data: services } = await supabase.from("services").select("id,slug,created_at").eq("is_active", true).not("slug", "is", null);
  const servicePages: MetadataRoute.Sitemap = (services || []).map((service: any) => ({ url: `${siteUrl}/services/${encodeURIComponent(service.slug)}`, lastModified: service.created_at || undefined, changeFrequency: "weekly", priority: 0.8 }));
  return [...staticPages, ...servicePages];
}
