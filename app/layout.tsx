import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import "./design-system-accessibility.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tusan.ir";
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "کافی نت توسن | خدمات اینترنتی و ثبت درخواست آنلاین", template: "%s | کافی نت توسن" },
  description: "کافی نت توسن؛ ارائه خدمات اینترنتی، ثبت درخواست آنلاین و خدمات اداری و غیرحضوری با امکان پیگیری سفارش.",
  applicationName: "کافی نت توسن",
  keywords: ["کافی نت توسن", "کافی نت", "خدمات اینترنتی", "ثبت نام آنلاین", "خدمات اداری آنلاین"],
  alternates: { canonical: siteUrl },
  openGraph: { type: "website", locale: "fa_IR", url: siteUrl, siteName: "کافی نت توسن", title: "کافی نت توسن | خدمات اینترنتی و ثبت درخواست آنلاین", description: "ثبت آنلاین خدمات و پیگیری سفارش‌ها در کافی نت توسن." },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fa" dir="rtl"><body className={`${vazirmatn.className} ${vazirmatn.variable} antialiased bg-[var(--background)] text-[var(--text)] transition-colors duration-300`}><ThemeProvider>{children}</ThemeProvider></body></html>;
}
