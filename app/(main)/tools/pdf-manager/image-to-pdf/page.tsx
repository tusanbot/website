import type { Metadata } from "next";
import PdfManager from "@/components/tools/PdfManagerV2";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/pdf-manager/image-to-pdf");

export default function ImageToPdfPage() { return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">JPG to PDF</div><h1 className="mt-2 text-3xl font-black md:text-4xl">تبدیل عکس به PDF آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">یک یا چند تصویر JPG و PNG را انتخاب کنید، ترتیب صفحات را تغییر دهید، فایل‌های اضافه را حذف کنید و PDF نهایی بسازید.</p></header><div className="mt-10"><PdfManager activeTab="image-to-pdf"/></div></div></main>; }
