import { TusanBadge } from "@/components/ui";
import { getOrderStatus } from "@/lib/orders/statusConfig";

export default function OrderStatus({
    status,
}: {
    status: string;
}) {
    const config = getOrderStatus(status);

    return (
        <TusanBadge variant={config.variant}>
            <span className="flex items-center gap-1">
                <span>{config.icon}</span>
                <span>{config.label}</span>
            </span>
        </TusanBadge>
    );
}