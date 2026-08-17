import { ReactNode } from "react";

type StatusVariant =
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "neutral";

type StatusBadgeProps = {
    children: ReactNode;
    variant?: StatusVariant;
    className?: string;
};

const variants: Record<StatusVariant, string> = {
    primary:
        "border border-[#09967C]/15 bg-[#09967C]/10 text-[#087d69]",
    success:
        "border border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning:
        "border border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger:
        "border border-red-500/15 bg-red-500/10 text-red-700 dark:text-red-300",
    neutral:
        "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]",
};

export default function StatusBadge({
    children,
    variant = "primary",
    className = "",
}: StatusBadgeProps) {
    return (
        <span
            className={`
                inline-flex items-center gap-1.5
                rounded-full
                px-3 py-1.5
                text-xs
                font-bold
                backdrop-blur-sm
                transition-colors
                ${variants[variant]}
                ${className}
            `}
        >
            {children}
        </span>
    );
}