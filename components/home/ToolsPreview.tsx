"use client";

import Link from "next/link";
import { tools } from "@/lib/tools";
import { TusanButton } from "@/components/ui";

export default function ToolsPreview() {
  const featured = tools.filter((tool) => tool.featured).slice(0, 6);
  return (
    <section id="online-tools" className="relative scroll-mt-28 py-8 md:py-10" dir="rtl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-black text-[var(--primary)]">🛠️ ابزارهای توسن</span>
              <h2 className="text-xl font-black text-[var(--text)]">ابزارهای پرکاربرد</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">ابزارهای کاربردی و هوش مصنوعی برای انجام سریع‌تر کارها.</p>
          </div>
          <Link href="/tools" className="shrink-0"><TusanButton variant="secondary">همه ابزارها ←</TusanButton></Link>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {featured.map((tool) => (
            <Link key={tool.id} href={tool.enabled && tool.href ? tool.href : "/tools"} className="flex min-w-max items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-bold transition hover:scale-[1.03] hover:border-[var(--primary)]/40">
              <span>{tool.icon}</span><span>{tool.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
