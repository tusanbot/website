"use client";

import Link from "next/link";
import { tools } from "@/lib/tools";
import { GlassPanel, TusanButton } from "@/components/ui";

export default function ToolsPreview() {
    const featured = tools.filter((tool) => tool.featured).slice(0, 6);

    return (
        <section id="online-tools" className="relative scroll-mt-28 py-16 md:py-20" dir="rtl">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <GlassPanel className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/90 p-6 sm:p-8">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/10 px-3 py-1 text-xs font-black text-[var(--primary)]">🛠️ ابزارهای توسن</div>
                            <h2 className="mt-3 text-2xl font-black text-[var(--text)] sm:text-3xl">ابزارهای پرکاربرد</h2>
                            <p className="mt-2 max-w-2xl leading-7 text-[var(--text-muted)]">چند ابزار کاربردی و هوش مصنوعی که به‌مرور در اختیار شما قرار می‌گیرند.</p>
                        </div>
                        <Link href="/tools" className="shrink-0"><TusanButton variant="secondary">مشاهده همه ابزارها ←</TusanButton></Link>
                    </div>
                    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {featured.map((tool) => (
                            <Link key={tool.id} href={tool.enabled && tool.href ? tool.href : "/tools"} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 transition hover:-translate-y-1 hover:border-[var(--primary)]/30">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-xl">{tool.icon}</div>
                                    <div className="min-w-0"><h3 className="truncate font-black text-[var(--text)]">{tool.title}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{tool.type === "ai" ? "هوش مصنوعی" : "ابزار کاربردی"}</p></div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </GlassPanel>
            </div>
        </section>
    );
}
