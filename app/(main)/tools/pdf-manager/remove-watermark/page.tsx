import type { Metadata } from "next";
import PdfWatermarkTool from "@/components/tools/PdfWatermarkTool";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/pdf-manager/remove-watermark");

export default function RemoveWatermarkPage() {
  return (
    <main dir="rtl" className="min-h-screen page-background py-12 md:py-20">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <div className="text-sm font-black text-[var(--primary)]">PDF Tools</div>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">شناسایی و حذف واترمارک PDF</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            شناسایی و حذف ساختاری واترمارک‌های استاندارد PDF از نوع annotation، بدون پوشاندن محتوای زیرین و بدون ارسال فایل به سرور.
          </p>
        </header>
        <PdfWatermarkTool />
      </div>
    </main>
  );
}
