import type { Metadata } from "next";
import PdfScanEnhancer from "@/components/tools/PdfScanEnhancer";
import { getToolMetadata } from "@/lib/tool-seo";
export const metadata: Metadata = getToolMetadata("/tools/pdf-manager/highlight-pdf");
export default function HighlightPdfPage(){return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><header className="mx-auto mb-8 max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">PDF SCAN ENHANCER</div><h1 className="mt-2 text-3xl font-black md:text-4xl">هایلایت و سفید کردن اسکن PDF</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">برش و صاف‌کردن صفحه، اصلاح نور و سایه و تبدیل عکس تیره مدارک به اسکن خواناتر؛ با پردازش مستقیم در مرورگر.</p></header><PdfScanEnhancer/></div></main>;}
