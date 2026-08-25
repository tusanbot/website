import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import "./design-system-accessibility.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getSiteSettings } from "@/lib/siteSettings";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir";
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const assets = settings.config?.assets || {};
  const title = settings.site_name || "کافی نت توسن";
  const description = settings.site_description || "خدمات آنلاین کافی‌نت توسن";
  const icon = assets.faviconUrl || assets.iconUrl || "/favicon.ico";

  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${title}` },
    description,
    applicationName: title,
    keywords: [title, "کافی نت", "خدمات اینترنتی", "ثبت نام آنلاین", "خدمات اداری آنلاین"],
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
    name: "کافی نت توسن",
    url: siteUrl,
    description: "خدمات آنلاین کافی نت توسن؛ ثبت نام، امور اداری، اینترنتی و کامپیوتری.",
    areaServed: { "@type": "Country", name: "ایران" },
    serviceType: ["خدمات کافی نت", "خدمات اینترنتی", "خدمات اداری آنلاین", "ثبت نام آنلاین"],
  };

  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazirmatn.className} ${vazirmatn.variable} antialiased bg-[var(--background)] text-[var(--text)] transition-colors duration-300`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
