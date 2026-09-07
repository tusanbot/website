import type { Metadata } from "next";
import LoanCalculator from "@/components/tools/LoanCalculator";
import { getToolMetadata } from "@/lib/tool-seo";
export const metadata: Metadata=getToolMetadata("/tools/loan-calculator");
export default function Page(){return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-5xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">Loan Calculator</div><h1 className="mt-2 text-3xl font-black md:text-4xl">محاسبه اقساط وام آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">مبلغ قسط ماهانه، سود کل و مجموع بازپرداخت را بر اساس مبلغ وام، نرخ سود و مدت بازپرداخت محاسبه کنید.</p></header><div className="mt-10"><LoanCalculator/></div></div></main>}
