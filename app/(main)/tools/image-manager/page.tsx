import type { Metadata } from "next";
import ImageManager from "@/components/tools/ImageManager";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/image-manager");

export default function ImageManagerPage() {
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">Image Manager</div><h1 className="mt-2 text-3xl font-black md:text-4xl">مدیریت عکس آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">چند تصویر را هم‌زمان انتخاب کنید، اندازه و کیفیت را تنظیم کنید، فرمت را تغییر دهید یا تصاویر را بچرخانید و خروجی بگیرید.</p></header><div className="mt-10"><ImageManager /></div></div></main>;
}
