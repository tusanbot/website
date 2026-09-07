import type { Metadata } from "next";
import PdfManager from "@/components/tools/PdfManagerV2";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/pdf-manager/merge-pdf");

export default function MergePdfPage() { return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">Merge PDF</div><h1 className="mt-2 text-3xl font-black md:text-4xl">ادغام PDF آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">چند فایل PDF را انتخاب کنید، ترتیب آن‌ها را با کشیدن یا دکمه‌های جابه‌جایی مدیریت کنید و یک فایل واحد بسازید.</p></header><div className="mt-10"><PdfManager activeTab="merge"/></div></div></main>; }
