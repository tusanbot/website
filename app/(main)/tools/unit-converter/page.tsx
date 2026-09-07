import type { Metadata } from "next";
import UnitConverter from "@/components/tools/UnitConverter";
import { getToolMetadata } from "@/lib/tool-seo";
export const metadata: Metadata=getToolMetadata("/tools/unit-converter");
export default function Page(){return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-4xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">Unit Converter</div><h1 className="mt-2 text-3xl font-black md:text-4xl">تبدیل واحد آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">واحدهای طول، وزن، دما، مساحت، حجم، سرعت، زمان و حجم داده را سریع تبدیل کنید.</p></header><div className="mt-10"><UnitConverter/></div></div></main>}
