import type { Metadata } from "next";
import PercentageCalculator from "@/components/tools/PercentageCalculator";
import { getToolMetadata } from "@/lib/tool-seo";
export const metadata: Metadata=getToolMetadata("/tools/percentage-calculator");
export default function Page(){return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-4xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">Percentage Calculator</div><h1 className="mt-2 text-3xl font-black md:text-4xl">محاسبه درصد آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">درصد یک عدد، درصد تغییر، افزایش و کاهش و اختلاف دو عدد را سریع و رایگان محاسبه کنید.</p></header><div className="mt-10"><PercentageCalculator/></div></div></main>}
