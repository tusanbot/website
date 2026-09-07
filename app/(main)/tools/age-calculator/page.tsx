import type { Metadata } from "next";
import AgeCalculator from "@/components/tools/AgeCalculator";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/age-calculator");

export default function AgeCalculatorPage() {
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-4xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">Age Calculator</div><h1 className="mt-2 text-3xl font-black md:text-4xl">محاسبه سن آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">تاریخ تولد را وارد کنید تا سن شما به سال، ماه و روز محاسبه شود. برای تاریخ‌های شمسی، میلادی و مناسبت‌های روزمره مناسب است.</p></header><div className="mt-10"><AgeCalculator/></div></div></main>;
}
