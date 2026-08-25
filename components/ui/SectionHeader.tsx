"use client";

import { ReactNode } from "react";

interface SectionHeaderProps {
    title: string;
    description?: string;
    action?: ReactNode;
    align?: "right" | "center" | "left";
}

export default function SectionHeader({
    title,
    description,
    action,
    align = "right",
}: SectionHeaderProps) {
    const alignClass =
        align === "center"
            ? "text-center items-center"
            : align === "left"
                ? "text-left items-start"
                : "text-right items-end";

    return (
        <div className="flex items-start justify-between gap-4 mb-6">
            <div className={`flex flex-col ${alignClass}`}>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text)]">
                    {title}
                </h2>
                {description && (
                    <p className="mt-2 text-[var(--text-muted)] max-w-2xl">
                        {description}
                    </p>
                )}
            </div>

            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
