import type { Metadata } from "next";
import AverageCalculator from "@/components/tools/AverageCalculator";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/average-calculator");

export default function AverageCalculatorPage() {
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-5xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">GPA & Average Calculator</div><h1 className="mt-2 text-3xl font-black md:text-4xl">محاسبه معدل آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">نمره و تعداد واحد هر درس را وارد کنید تا معدل وزنی شما محاسبه شود. این ابزار برای معدل ترمی و میانگین نمرات بر اساس واحد طراحی شده است.</p></header><div className="mt-10"><AverageCalculator/></div></div></main>;
}
