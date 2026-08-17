"use client";

import { InputHTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";

type TusanInputProps = InputHTMLAttributes<HTMLInputElement> & {
    icon?: ReactNode;
    clearable?: boolean;
    onClear?: () => void;
};

export default function TusanInput({
    icon,
    clearable = false,
    onClear,
    className = "",
    value,
    ...props
}: TusanInputProps) {
    const hasValue =
        value !== undefined &&
        value !== null &&
        String(value).length > 0;

    return (
        <motion.div
            whileHover={{ y: -1 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
            }}
            className="relative w-full"
        >
            {icon && (
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] text-lg">
                    {icon}
                </div>
            )}

            <input
                value={value}
                className={`
                    w-full
                    rounded-2xl
                    border border-[var(--border)]
                    bg-[var(--surface)]
                    text-[var(--text)]
                    placeholder:text-[var(--muted)]
                    py-3.5
                    ${icon ? "pr-12" : "pr-4"}
                    ${clearable ? "pl-12" : "pl-4"}
                    outline-none
                    transition-all duration-200
                    focus:border-[var(--primary)]
                    focus:ring-4
                    focus:ring-[color-mix(in_srgb,var(--primary)_14%,transparent)]
                    backdrop-blur-sm
                    ${className}
                `}
                {...props}
            />

            {clearable && hasValue && (
                <button
                    type="button"
                    onClick={onClear}
                    className="
                        absolute left-3 top-1/2 -translate-y-1/2
                        w-8 h-8
                        rounded-lg
                        bg-[var(--border)]
                        text-[var(--muted)]
                        hover:bg-[var(--surface-strong)]
                        hover:text-[var(--text)]
                        transition-all duration-200
                    "
                    aria-label="پاک کردن"
                >
                    ×
                </button>
            )}
        </motion.div>
    );
}