export type OrderStatus =
    | "registered"
    | "checking"
    | "need_documents"
    | "processing"
    | "ready"
    | "completed"
    | "cancelled"
    | "awaiting_payment"
    | "under_review"
    | "awaiting_assignment"
    | "assigned"
    | "in_progress"
    | "result_submitted"
    | "rejected";

export const orderStatusMap: Record<
    OrderStatus,
    {
        label: string;
        variant:
        | "default"
        | "success"
        | "warning"
        | "danger"
        | "info"
        | "neutral";
        icon: string;
    }
> = {
    registered: { label: "ثبت شده", variant: "default", icon: "📝" },
    checking: { label: "در حال بررسی", variant: "warning", icon: "🔍" },
    need_documents: { label: "نیاز به مدارک", variant: "info", icon: "📎" },
    processing: { label: "در حال انجام", variant: "info", icon: "⚙️" },
    ready: { label: "آماده تحویل", variant: "success", icon: "📦" },
    completed: { label: "تکمیل شده", variant: "success", icon: "✅" },
    cancelled: { label: "لغو شده", variant: "danger", icon: "❌" },
    awaiting_payment: { label: "در انتظار پرداخت", variant: "warning", icon: "💳" },
    under_review: { label: "در حال بررسی", variant: "warning", icon: "🔍" },
    awaiting_assignment: { label: "در انتظار تخصیص", variant: "warning", icon: "⏳" },
    assigned: { label: "تخصیص یافته", variant: "info", icon: "👤" },
    in_progress: { label: "در حال انجام", variant: "info", icon: "⚙️" },
    result_submitted: { label: "نتیجه ارسال شده", variant: "success", icon: "📤" },
    rejected: { label: "رد شده", variant: "danger", icon: "⛔" },
};

const statusFallbackLabels: Record<string, string> = {
    pending: "در انتظار",
    paid: "پرداخت شده",
    failed: "ناموفق",
    awaiting_manual_verification: "در انتظار بررسی دستی",
    payment_pending: "در انتظار پرداخت",
    payment_failed: "پرداخت ناموفق",
    unassigned: "تخصیص نیافته",
    pending_assignment: "در انتظار تخصیص",
    active: "فعال",
    closed: "بسته شده",
};

export function getOrderStatus(status: string) {
    const normalized = String(status ?? "").trim();
    return (
        orderStatusMap[normalized as OrderStatus] ?? {
            label: statusFallbackLabels[normalized] ?? "وضعیت نامشخص",
            variant: "neutral" as const,
            icon: "•",
        }
    );
}

export function getOrderStatusLabel(status: string) {
    return getOrderStatus(status).label;
}
