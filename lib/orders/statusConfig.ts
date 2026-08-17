export type OrderStatus =
    | "registered"
    | "checking"
    | "need_documents"
    | "processing"
    | "ready"
    | "completed"
    | "cancelled";

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
    registered: {
        label: "ثبت شده",
        variant: "default",
        icon: "📝",
    },

    checking: {
        label: "در حال بررسی",
        variant: "warning",
        icon: "🔍",
    },

    need_documents: {
        label: "نیاز به مدارک",
        variant: "info",
        icon: "📎",
    },

    processing: {
        label: "در حال انجام",
        variant: "info",
        icon: "⚙️",
    },

    ready: {
        label: "آماده تحویل",
        variant: "success",
        icon: "📦",
    },

    completed: {
        label: "تکمیل شده",
        variant: "success",
        icon: "✅",
    },

    cancelled: {
        label: "لغو شده",
        variant: "danger",
        icon: "❌",
    },
};

export function getOrderStatus(status: string) {
    return (
        orderStatusMap[
        status as OrderStatus
        ] ?? {
            label: status,
            variant: "neutral",
            icon: "•",
        }
    );
}