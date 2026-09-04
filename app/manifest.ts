import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  const assets = settings.config?.assets || {};
  const icon = assets.iconUrl || assets.faviconUrl || "/pwa-icon.svg";
  const name = settings.site_name || "کافی نت توسن";
  const description = settings.site_description || "سامانه خدمات آنلاین کافی‌نت توسن";

  return {
    name,
    short_name: "توسن",
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: settings.primary_color || "#09967c",
    lang: "fa",
    dir: "rtl",
    icons: [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
}
