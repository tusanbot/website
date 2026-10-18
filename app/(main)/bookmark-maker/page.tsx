import type { Metadata } from "next";
import BookmarkMakerClient from "./BookmarkMakerClient";

export const metadata: Metadata = {
  title: "میز کار کافی‌نت توسن | سامانه‌ها، ثبت‌نام‌ها و ابزارها",
  description: "داشبورد سریع کافی‌نت توسن؛ دسترسی یکجا به سامانه‌های رسمی، ثبت‌نام‌های فعال و ابزارهای کاربردی PDF، عکس، فاکتور و طراحی پوستر.",
  alternates: { canonical: "https://www.tusancn.ir/bookmark-maker" },
  openGraph: {
    title: "میز کار کافی‌نت توسن",
    description: "سامانه‌های پرکاربرد، ثبت‌نام‌های فعال و ابزارهای کافی‌نت در یک صفحه؛ بدون نصب افزونه.",
    url: "https://www.tusancn.ir/bookmark-maker",
    siteName: "کافی نت توسن",
    locale: "fa_IR",
    type: "website",
  },
};

export default function BookmarkMakerPage() {
  return <BookmarkMakerClient />;
}
