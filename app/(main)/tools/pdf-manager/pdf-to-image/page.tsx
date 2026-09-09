import type { Metadata } from "next";
import PdfToImage from "@/components/tools/PdfToImage";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/pdf-manager/pdf-to-image");

export default function PdfToImagePage() {
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">PDF to Image</div><h1 className="mt-2 text-3xl font-black md:text-4xl">تبدیل PDF به عکس آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">صفحات PDF را به تصاویر PNG یا JPG با کیفیت انتخابی تبدیل کنید؛ پردازش در مرورگر انجام می‌شود و هر صفحه جداگانه قابل دانلود است.</p></header><div className="mt-10"><PdfToImage /></div></div></main>;
}
