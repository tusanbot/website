import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/siteSettings";

function getIconType(url: string): string {
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) return "image/jpeg";
  if (cleanUrl.endsWith(".webp")) return "image/webp";
  if (cleanUrl.endsWith(".svg")) return "image/svg+xml";
  return "image/png";
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  const assets = settings.config?.assets || {};
  const icon = assets.iconUrl || assets.faviconUrl || "/favicon.ico";
  const iconType = getIconType(icon);

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
    icons: [
      { src: icon, sizes: "512x512", type: iconType, purpose: "maskable" },
      { src: icon, sizes: "512x512", type: iconType, purpose: "any" },
    ],
  };
}