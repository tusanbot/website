import Link from "next/link";
import { TusanCard, TusanButton } from "@/components/ui";
import OrderStatus from "@/components/orders/OrderStatus";
import TusanIcon from "@/components/ui/TusanIcon";

type RecentOrder = {
    id: string;
    tracking_code: string | null;
    status: string;
    price: number | null;
    created_at: string;
    serviceTitle: string;
    serviceIcon: string;
};

function formatPrice(price: number | null) {
    if (!price) return "رایگان";

    return `${Number(price).toLocaleString("fa-IR")} تومان`;
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export default function RecentOrders({
    orders,
}: {
    orders: RecentOrder[];
}) {
    return (
        <TusanCard className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text)]">
                        آخرین سفارش‌ها
                    </h2>

                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        آخرین سفارش‌های ثبت‌شده شما
                    </p>
                </div>

                <Link
                    href="/orders"
                    className="text-sm text-[var(--primary)] font-bold hover:underline"
                >
                    مشاهده همه
                </Link>
            </div>

            {orders.length === 0 ? (
                <div className="py-10 text-center">


                    <div className="flex justify-center">
                        <TusanIcon name="clipboard" size={40} className="text-[var(--primary)]" />
                    </div>

                    <p className="text-[var(--text-muted)] mt-3">
                        هنوز سفارشی ثبت نکرده‌اید.
                    </p>

                    <div className="mt-4 flex justify-center">
                        <Link href="/services">
                            <TusanButton>
                                ثبت اولین سفارش
                            </TusanButton>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <Link
                            key={order.id}
                            href={`/orders/${order.id}`}
                            className="block"
                        >
                            <TusanCard className="p-4 hover:-translate-y-0.5 transition-all duration-300">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-11 h-11 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center text-2xl">
                                            {order.serviceIcon}
                                        </div>

                                        <div>
                                            <div className="font-bold text-[var(--text)]">
                                                {order.serviceTitle}
                                            </div>

                                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                                {order.tracking_code
                                                    ? `کد پیگیری: ${order.tracking_code}`
                                                    : "بدون کد پیگیری"}
                                            </div>
                                        </div>
                                    </div>

                                    <OrderStatus status={order.status} />

                                    <div className="text-sm font-bold text-[var(--text)]">
                                        {formatPrice(order.price)}
                                    </div>

                                    <div className="text-xs text-[var(--text-muted)]">
                                        {formatDate(order.created_at)}
                                    </div>
                                </div>
                            </TusanCard>
                        </Link>
                    ))}
                </div>
            )}
        </TusanCard>
    );
}