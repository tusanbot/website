"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { aiTools } from "@/lib/ai-tools";
import { GlassPanel, TusanButton } from "@/components/ui";

export default function AiToolsPreview() {
  const featured = aiTools.filter((tool) => tool.featured).slice(0, 6);

  return (
    <section id="ai-tools" className="relative scroll-mt-28 py-8 md:py-10" dir="rtl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <GlassPanel className="overflow-hidden rounded-[1.5rem] border border-[var(--primary)]/15 bg-[var(--primary)]/[0.035] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/10 px-2.5 py-0.5 text-[11px] font-black text-[var(--primary)]"><Sparkles size={12} /> هوش مصنوعی توسن</div>
              <h2 className="mt-2 text-xl font-black sm:text-2xl">ابزارهای هوش مصنوعی</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">تصویر، ویدیو، موسیقی، اسناد، آموزش و پرامپت‌سازی</p>
            </div>
            <Link href="/ai" className="shrink-0"><TusanButton variant="secondary">مرکز هوش مصنوعی ←</TusanButton></Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {featured.map((tool) => (
              <Link key={tool.id} href={tool.href} className="group flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-sm">
                <div className="flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-base">{tool.icon}</div><ArrowLeft size={14} className="text-[var(--text-muted)] transition group-hover:-translate-x-1 group-hover:text-[var(--primary)]" /></div>
                <h3 className="truncate text-xs font-black">{tool.title}</h3>
              </Link>
            ))}
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
