"use client";

import Link from "next/link";
import { tools } from "@/lib/tools";
import { GlassPanel, TusanButton } from "@/components/ui";

export default function ToolsPreview() {
    const featuredNormal = tools.filter((tool) => tool.featured && tool.enabled && tool.type === "normal").slice(0, 3);
    const featuredAi = tools.filter((tool) => tool.featured && tool.enabled && tool.type === "ai").slice(0, 3);
    const featured = [...featuredAi, ...featuredNormal];

    return (
        <section id="online-tools" className="relative scroll-mt-28 py-10 md:py-12" dir="rtl">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <GlassPanel className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)]/90 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="inline-flex items-center rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/10 px-2.5 py-0.5 text-[11px] font-black text-[var(--primary)]">🛠️ ابزارهای توسن</div>
                            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <h2 className="text-xl font-black text-[var(--text)] sm:text-2xl">ابزارهای پرکاربرد</h2>
                                <p className="text-xs text-[var(--text-muted)]">ابزارهای کاربردی و هوش مصنوعی</p>
                            </div>
                        </div>
                        <Link href="/tools" className="shrink-0"><TusanButton variant="secondary">همه ابزارها ←</TusanButton></Link>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        {featured.map((tool) => (
                            <Link key={tool.id} href={tool.href || "/tools"} className="group flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-2.5 py-2.5 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/30">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-base">{tool.icon}</div>
                                <div className="min-w-0">
                                    <h3 className="truncate text-xs font-black text-[var(--text)]">{tool.title}</h3>
                                    <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">{tool.type === "ai" ? "هوش مصنوعی" : "ابزار کاربردی"}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </GlassPanel>
            </div>
        </section>
    );
}
