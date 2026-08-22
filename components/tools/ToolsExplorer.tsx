"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GlassPanel, SectionHeader } from "@/components/ui";
import { tools, ToolCategory, ToolType } from "@/lib/tools";

type Props = { compact?: boolean };

const categoryTabs: { value: ToolCategory; label: string; icon: string }[] = [
    { value: "general", label: "عمومی", icon: "🧰" },
    { value: "cybercafe", label: "مخصوص کافی‌نت", icon: "🖥️" },
];

const typeTabs: { value: ToolType; label: string }[] = [
    { value: "normal", label: "ابزارهای کاربردی" },
    { value: "ai", label: "ابزارهای هوش مصنوعی" },
];

export default function ToolsExplorer({ compact = false }: Props) {
    const [category, setCategory] = useState<ToolCategory>("general");
    const [type, setType] = useState<ToolType>("normal");

    const visibleTools = useMemo(
        () => tools.filter((tool) => tool.category === category && tool.type === type),
        [category, type]
    );

    return (
        <section className={compact ? "py-12" : "py-16 md:py-24"} dir="rtl">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {!compact && (
                    <SectionHeader
                        title="ابزارهای توسن"
                        description="ابزارهای کاربردی و هوش مصنوعی، یکجا و بدون شلوغ‌کردن منوی سایت."
                        align="center"
                    />
                )}

                <GlassPanel className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/80 p-4 sm:p-6">
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-secondary)] p-1.5">
                        {categoryTabs.map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => setCategory(tab.value)}
                                className={`rounded-xl px-4 py-3 text-sm font-black transition ${category === tab.value ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
                            >
                                <span className="ml-2">{tab.icon}</span>{tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {typeTabs.map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => setType(tab.value)}
                                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${type === tab.value ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--primary)]/40"}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {visibleTools.length > 0 ? (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {visibleTools.map((tool) => (
                                <div key={tool.id} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:shadow-lg">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">{tool.icon}</div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-[var(--text)]">{tool.title}</h3>
                                            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{tool.description}</p>
                                        </div>
                                    </div>
                                    <div className="mt-5">
                                        {tool.enabled && tool.href ? (
                                            <Link href={tool.href} className="block rounded-xl bg-[var(--primary)] px-4 py-3 text-center text-sm font-black text-white transition hover:opacity-90">باز کردن ابزار</Link>
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-center text-sm font-bold text-[var(--text-muted)]">به‌زودی</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
                            <div className="text-3xl">🛠️</div>
                            <h3 className="mt-3 font-black text-[var(--text)]">ابزارهای این بخش به‌زودی اضافه می‌شوند</h3>
                            <p className="mt-2 text-sm text-[var(--text-muted)]">ساختار ابزار آماده است و ابزارها به‌صورت مرحله‌ای فعال خواهند شد.</p>
                        </div>
                    )}
                </GlassPanel>
            </div>
        </section>
    );
}
