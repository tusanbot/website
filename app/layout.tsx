import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import "./design-system-accessibility.css";
import "./status-brand.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import AnalyticsTracker from "@/components/analytics/AnalyticsTracker";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { getSiteSettings } from "@/lib/siteSettings";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, "");
const GA_MEASUREMENT_ID = "G-08SPYBX3MG";
const vazirmatn = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazirmatn", display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#09967c",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings.site_name || "کافی نت توسن";
  const description = settings.site_description || "خدمات آنلاین کافی‌نت توسن";
  const assets = settings.config?.assets || {};
  const favicon = assets.faviconUrl || assets.iconUrl || "/favicon.ico";

  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${title}` },
    description,
    applicationName: title,
    manifest: "/manifest.webmanifest",
    keywords: [title, "کافی نت", "کافی نت مراغه", "خدمات اینترنتی", "ثبت نام آنلاین", "خدمات اداری آنلاین"],
    alternates: { canonical: siteUrl },
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
    openGraph: { type: "website", locale: "fa_IR", url: siteUrl, siteName: title, title, description },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#localbusiness`,
    name: "کافی نت توسن",
    url: siteUrl,
    telephone: "+989940838154",
    description: "خدمات آنلاین کافی نت توسن؛ ثبت نام، امور اداری، اینترنتی و کامپیوتری.",
    address: {
      "@type": "PostalAddress",