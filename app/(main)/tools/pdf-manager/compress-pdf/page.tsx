import type { Metadata } from "next";
import PdfManager from "@/components/tools/PdfManager";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/pdf-manager/compress-pdf");

export default function CompressPdfPage() { return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">Compress PDF</div><h1 className="mt-2 text-3xl font-black md:text-4xl">کاهش حجم PDF آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">فایل PDF را بهینه کنید، حجم اولیه و خروجی را مقایسه کنید و فایل جدید را دریافت کنید.</p></header><div className="mt-10"><PdfManager activeTab="compress"/></div></div></main>; }
