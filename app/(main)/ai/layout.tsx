import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusancn.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "هوش مصنوعی توسن | ابزارهای هوش مصنوعی آنلاین",
  description: "مرکز هوش مصنوعی توسن برای تولید محتوا، تصویر، ویدیو و موسیقی، مدیریت اسناد، آموزش و ابزارهای هوش مصنوعی آنلاین.",
  alternates: { canonical: `${siteUrl}/ai` },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: `${siteUrl}/ai`,
    siteName: "کافی نت توسن",
    title: "هوش مصنوعی توسن | ابزارهای هوش مصنوعی آنلاین",
    description: "ابزارهای تخصصی هوش مصنوعی توسن برای تولید محتوا، اسناد، آموزش و قابلیت‌های مولد.",
  },
  robots: { index: true, follow: true },
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
