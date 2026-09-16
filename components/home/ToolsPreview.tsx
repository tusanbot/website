"use client";

import Link from "next/link";
import { tools } from "@/lib/tools";
import { extraTools } from "@/lib/extra-tools";
import { aiTools } from "@/lib/ai-tools";
import { GlassPanel, TusanButton } from "@/components/ui";

type HomeTool = { id: string; title: string; icon: string; href: string };

const homePopularIds = [
    "pdf-to-word",
    "pdf-manager",
    "text-to-speech-ai",
    "thesis-idea-ai",
    "qr-code-generator",
    "invoice-builder",
];

export default function ToolsPreview() {
    const allTools = [...tools, ...extraTools];
    const featured: HomeTool[] = homePopularIds.map((id) => {
        const tool = allTools.find((item) => item.id === id) ?? aiTools.find((item) => item.id === id);
        if (tool) return { id: tool.id, title: tool.title, icon: tool.icon, href: tool.href };
        return null;
    }).filter(Boolean) as HomeTool[];

    return (
        <section id="online-tools" className="relative scroll-mt-28 py-10 md:py-12" dir="rtl">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <GlassPanel className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)]/90 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="inline-flex items-center rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/10 px-2.5 py-0.5 text-[11px] font-black text-[var(--primary)]">🛠️ ابزارهای آنلاین</div>
                            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <h2 className="text-xl font-black text-[var(--text)] sm:text-2xl">ابزارهای پرکاربرد</h2>
                                <p className="text-xs text-[var(--text-muted)]">شش ابزار منتخب و پرمصرف برای استفاده سریع</p>
                            </div>
                        </div>
                        <Link href="/tools" className="shrink-0"><TusanButton variant="secondary">همه ابزارها ←</TusanButton></Link>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        {featured.map((tool) => (
                            <Link key={tool.id} href={tool.href} className="group flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-2.5 py-2.5 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/30">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-base">{tool.icon}</div>
                                <div className="min-w-0"><h3 className="truncate text-xs font-black text-[var(--text)]">{tool.title}</h3><p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">ابزار آنلاین</p></div>
                            </Link>
                        ))}
                    </div>
                </GlassPanel>
            </div>
        </section>
    );
}
