import type { Metadata } from "next";
import BookmarkMakerClient from "./BookmarkMakerClient";

export const metadata: Metadata = {
  title: "نشانک‌ساز کافی‌نت توسن | دریافت بوکمارک خدمات",
  description: "دریافت فایل بوکمارک دسته‌بندی‌شده خدمات کافی‌نت، سامانه‌های پرکاربرد و ابزارهای آنلاین توسن برای واردکردن در Chrome.",
  alternates: { canonical: "https://www.tusancn.ir/bookmark-maker" },
  openGraph: {
    title: "نشانک‌ساز کافی‌نت توسن",
    description: "همه لینک‌های کاربردی کافی‌نت و ابزارهای آنلاین توسن را یک‌جا به نشانک‌های Chrome اضافه کنید.",
    url: "https://www.tusancn.ir/bookmark-maker",
    siteName: "کافی نت توسن",
    locale: "fa_IR",
    type: "website",
  },
};

export default function BookmarkMakerPage() {
  return <BookmarkMakerClient />;
}
