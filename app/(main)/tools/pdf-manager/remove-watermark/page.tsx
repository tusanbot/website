import type { Metadata } from "next";
import PdfWatermarkTool from "@/components/tools/PdfWatermarkTool";
import { getToolMetadata } from "@/lib/tool-seo";
export const metadata: Metadata = getToolMetadata("/tools/pdf-manager/remove-watermark");
export default function RemoveWatermarkPage(){return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><header className="mx-auto mb-8 max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">PDF WATERMARK REMOVER</div><h1 className="mt-2 text-3xl font-black md:text-4xl">حذف واترمارک از PDF</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">محدوده واترمارک را مشخص کنید و نسخه اصلاح‌شده PDF را در مرورگر دریافت کنید؛ بدون ارسال فایل به سرور.</p></header><PdfWatermarkTool/></div></main>;}
