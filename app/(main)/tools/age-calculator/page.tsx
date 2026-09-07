import type { Metadata } from "next";
import AgeCalculator from "@/components/tools/AgeCalculator";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/age-calculator");

export default function AgeCalculatorPage() {
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-4xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">Age Calculator</div><h1 className="mt-2 text-3xl font-black md:text-4xl">محاسبه سن آنلاین و دقیق</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">محاسبه سن با تاریخ تولد شمسی یا میلادی؛ سن دقیق به سال، ماه و روز، مجموع روزهای سپری‌شده، تاریخ تولد بعدی و تعداد روزهای باقی‌مانده تا تولد را ببینید.</p></header><div className="mt-10"><AgeCalculator/></div><section className="mx-auto mt-10 max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-7 text-[var(--text-muted)] md:p-7"><h2 className="text-base font-black text-[var(--text)]">محاسبه سن شمسی و میلادی</h2><p className="mt-3">در حالت شمسی می‌توانید تاریخ تولد را با فرمت سال/ماه/روز وارد کنید و در حالت میلادی از انتخاب‌گر تاریخ استفاده کنید. محاسبات داخل مرورگر انجام می‌شود و تاریخ تولد برای این ابزار به سرور ارسال نمی‌شود.</p></section></div></main>;
}
