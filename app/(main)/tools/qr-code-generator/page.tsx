import type { Metadata } from "next";
import QrCodeGenerator from "@/components/tools/QrCodeGenerator";
import { getToolMetadata } from "@/lib/tool-seo";
export const metadata: Metadata=getToolMetadata("/tools/qr-code-generator");
export default function Page(){return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-3xl px-5 lg:px-8"><header className="text-center"><div className="text-sm font-black text-[var(--primary)]">QR Code Generator</div><h1 className="mt-2 text-3xl font-black md:text-4xl">ساخت QR Code آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">لینک یا متن دلخواه خود را به QR Code تبدیل کنید و تصویر آن را دانلود کنید.</p></header><div className="mt-10"><QrCodeGenerator/></div></div></main>}
