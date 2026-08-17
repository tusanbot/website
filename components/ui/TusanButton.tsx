"use client";

import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "motion/react";

type Variant =
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger";

type Size = "sm" | "md" | "lg";

type TusanButtonProps =
    HTMLMotionProps<"button"> & {
        children: ReactNode;
        variant?: Variant;
        size?: Size;
        fullWidth?: boolean;
        loading?: boolean;
        icon?: ReactNode;
    };

export default function TusanButton({
    children,
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    icon,
    className = "",
    disabled,
    ...props
}: TusanButtonProps) {
    const isDisabled = disabled || loading;

    const sizeClasses = {
        sm: "px-3 py-2 text-sm rounded-xl",
        md: "px-5 py-3 text-sm rounded-xl",
        lg: "px-6 py-3.5 text-base rounded-2xl",
    };

    const variantClasses = {
        primary:
            "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:brightness-105",

        secondary:
            "bg-[var(--surface-muted)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)]",

        outline:
            "border border-[var(--primary)] text-[var(--primary)] bg-transparent hover:bg-[var(--primary)]/10",

        ghost:
            "text-[var(--text)] bg-transparent hover:bg-[var(--surface)]",

        danger:
            "bg-red-600 text-white shadow-[var(--shadow-sm)] hover:bg-red-700",
    };

    return (
        <motion.button
            whileHover={
                isDisabled
                    ? undefined
                    : { y: -2, scale: 1.01 }
            }
            whileTap={
                isDisabled
                    ? undefined
                    : { scale: 0.99 }
            }
            transition={{
                duration: 0.18,
                ease: "easeOut",
            }}
            disabled={isDisabled}
            className={`
                inline-flex items-center justify-center gap-2
                font-bold transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30
                disabled:opacity-50 disabled:cursor-not-allowed
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${fullWidth ? "w-full" : ""}
                ${className}
            `}
            {...props}
        >
            {loading && (
                <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                </svg>
            )}

            {!loading && icon}

            <span>{children}</span>
        </motion.button>
    );
}