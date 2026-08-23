import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  const assets = settings.config?.assets || {};
  const icon = assets.iconUrl || assets.faviconUrl || "/favicon.ico";

  return {
    name: settings.site_name || "کافی نت توسن",
    short_name: settings.site_name || "توسن",
    description: settings.site_description || "سامانه خدمات آنلاین کافی‌نت توسن",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: settings.primary_color || "#09967c",
    lang: "fa",
    dir: "rtl",
    icons: [{ src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" }],
  };
}
