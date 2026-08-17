type Variant =
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral";

type TusanBadgeProps = {
    children: React.ReactNode;
    variant?: Variant;
    className?: string;
};

export default function TusanBadge({
    children,
    variant = "default",
    className = "",
}: TusanBadgeProps) {
    const styles = {
        default:
            "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20",

        success:
            "bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20",

        warning:
            "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",

        danger:
            "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20",

        info:
            "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20",

        neutral:
            "bg-gray-500/10 text-gray-700 dark:text-gray-300 border border-gray-500/20",
    };

    return (
        <span
            className={`
                inline-flex items-center justify-center
                px-2.5 py-1
                rounded-full
                text-xs font-bold
                ${styles[variant]}
                ${className}
            `}
        >
            {children}
        </span>
    );
}