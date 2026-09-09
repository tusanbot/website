import type { Metadata } from "next";
import Link from "next/link";
import PdfManager from "@/components/tools/PdfManagerV2";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/pdf-manager");

export default function PdfManagerPage() {
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">PDF Manager</div><h1 className="mt-2 text-3xl font-black md:text-4xl">مدیریت PDF آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">ادغام، تقسیم، کاهش حجم، تبدیل عکس به PDF، PDF به Word و OCR در یک محیط مجتمع؛ هر قابلیت صفحه اختصاصی خودش را نیز دارد.</p></header><div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2"><Link href="/tools/pdf-manager/pdf-to-image" className="rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-2 text-xs font-black text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white">🖼️ تبدیل PDF به عکس</Link><Link href="/tools/pdf-manager/image-to-pdf" className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--primary)]/30 hover:text-[var(--primary)]">عکس به PDF</Link></div><div className="mt-8"><PdfManager activeTab="manager"/></div></div></main>;
}
