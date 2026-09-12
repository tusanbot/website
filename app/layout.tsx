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
  const assets = settings.config?.assets || {};
  const title = settings.site_name || "کافی نت توسن";
  const description = settings.site_description || "خدمات آنلاین کافی‌نت توسن";
  const icon = assets.faviconUrl || assets.iconUrl || "/favicon.ico";
  return {
    metadataBase: new URL(siteUrl), title: { default: title, template: `%s | ${title}` }, description,
    applicationName: title,
    manifest: "/manifest.webmanifest",
    keywords: [title, "کافی نت", "کافی نت مراغه", "خدمات اینترنتی", "ثبت نام آنلاین", "خدمات اداری آنلاین"],
    alternates: { canonical: siteUrl },
    icons: { icon, shortcut: icon, apple: assets.iconUrl || icon },
    openGraph: { type: "website", locale: "fa_IR", url: siteUrl, siteName: title, title, description },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#localbusiness`,
    name: "کافی نت توسن",
    url: siteUrl,
    telephone: "+989940838154",
    email: "info@tusan.ir",
    description: "خدمات آنلاین کافی نت توسن؛ ثبت نام، امور اداری، اینترنتی و کامپیوتری.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "مراغه",
      addressRegion: "آذربایجان شرقی",
      addressCountry: "IR",
      streetAddress: "خیابان ساسان (شهید مدرس)",
    },
    areaServed: [
      { "@type": "City", name: "مراغه" },
      { "@type": "AdministrativeArea", name: "آذربایجان شرقی" },
    ],
    serviceType: ["خدمات کافی نت", "خدمات اینترنتی", "خدمات اداری آنلاین", "ثبت نام آنلاین"],
    sameAs: [
      "https://t.me/Tusan_admin",
      "https://eitaa.com/tusan_c",
      "https://rubika.ir/tusan_c",
    ],
  };
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "کافی نت توسن",
    description: "خدمات آنلاین کافی نت توسن",
    publisher: { "@id": `${siteUrl}/#localbusiness` },
    inLanguage: "fa-IR",
  };
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazirmatn.className} ${vazirmatn.variable} antialiased bg-[var(--background)] text-[var(--text)] transition-colors duration-300`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });`}
        </Script>
        <Script id="pwa-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {})); }`}
        </Script>
        <ThemeProvider>
          <AnalyticsTracker />
          {children}
          <PwaInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
