"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

import OrderStatus from "@/components/orders/OrderStatus";
import AdminOrderStatus from "@/components/AdminOrderStatus";
import OrderMessages from "@/components/OrderMessages";
import AdminOrderFiles from "@/components/AdminOrderFiles";

import {
    GlassPanel,
    TusanCard,
    TusanButton,
    SectionHeader,
} from "@/components/ui";

export default function AdminOrderDetailPage() {
    const params = useParams();
    const router = useRouter();

    const id = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const STATUS_LABELS: Record<string, string> = {
        registered: "ثبت شده",
        checking: "در حال بررسی",
        need_documents: "نیازمند مدارک",
        processing: "در حال انجام",
        ready: "آماده تحویل",
        completed: "تکمیل شده",
        cancelled: "لغو شده",
    };

    useEffect(() => {
        if (id) {
            loadOrder();
        }
    }, [id]);

    async function loadOrder() {
        setLoading(true);
        setError("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile, error: profileError } =
                await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

            if (
                profileError ||
                profile?.role !== "admin"
            ) {
                router.push("/dashboard");
                return;
            }

            const { data, error: orderError } =
                await supabase
                    .from("orders")
                    .select(`
                        *,
                        services(
                            title,
                            icon,
                            description
                        ),
                        profiles(
                            full_name,
                            phone
                        ),
                        order_history(
                            id,
                            old_status,
                            new_status,
                            description,
                            created_at
                        )
                    `)
                    .eq("id", id)
                    .single();

            if (orderError || !data) {
                throw new Error(
                    "سفارش موردنظر پیدا نشد."
                );
            }

            setOrder(data);

        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "خطایی هنگام دریافت سفارش رخ داد."
            );

        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div
                dir="rtl"
                className="min-h-screen page-background flex items-center justify-center text-[var(--text)]"
            >
                <GlassPanel className="p-10 text-center text-[var(--text-muted)]">
                    در حال دریافت اطلاعات سفارش...
                </GlassPanel>
            </div>
        );
    }

    if (!order) {
        return (
            <div
                dir="rtl"
                className="min-h-screen page-background p-6 text-[var(--text)]"
            >
                <div className="max-w-2xl mx-auto">
                    <GlassPanel className="p-8 text-center">
                        <div className="text-5xl mb-4">⚠️</div>

                        <h1 className="text-xl font-bold">
                            سفارش پیدا نشد
                        </h1>

                        <p className="text-[var(--text-muted)] mt-2">
                            {error}
                        </p>

                        <div className="mt-6">
                            <Link href="/admin/orders">
                                <TusanButton>
                                    بازگشت به مدیریت سفارش‌ها
                                </TusanButton>
                            </Link>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        );
    }

    const history = [...(order.order_history || [])].sort(
        (a: any, b: any) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
    );

    return (
        <div
            dir="rtl"
            className="min-h-screen page-background p-6 text-[var(--text)] transition-colors duration-300"
        >
            <div className="max-w-4xl mx-auto space-y-5">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <SectionHeader
                        title="مدیریت سفارش"
                        description={`${order.services?.icon || "📋"} ${order.services?.title || "سفارش"}`}
                    />

                    <Link href="/admin/orders">
                        <TusanButton variant="secondary">
                            بازگشت به سفارش‌ها
                        </TusanButton>
                    </Link>
                </div>

                <GlassPanel className="p-6">

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                        <div>

                            <h2 className="text-xl font-bold">
                                {order.services?.icon}{" "}
                                {order.services?.title}
                            </h2>

                            <p className="text-[var(--text-muted)] mt-2">
                                کد پیگیری:{" "}
                                <strong className="text-[var(--text)]">
                                    {order.tracking_code || "---"}
                                </strong>
                            </p>

                        </div>

                        <OrderStatus
                            status={order.status}
                        />

                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 mt-6 pt-5 border-t">

                        <TusanCard className="p-4">
                            <div className="text-sm text-[var(--text-muted)]">
                                نام مشتری
                            </div>

                            <div className="font-bold mt-1">
                                {order.profiles?.full_name || "---"}
                            </div>
                        </TusanCard>

                        <TusanCard className="p-4">
                            <div className="text-sm text-[var(--text-muted)]">
                                شماره تماس
                            </div>

                            <div className="font-bold mt-1">
                                {order.profiles?.phone || "---"}
                            </div>
                        </TusanCard>

                        <TusanCard className="p-4">
                            <div className="text-sm text-[var(--text-muted)]">
                                مبلغ سفارش
                            </div>

                            <div className="font-bold mt-1">
                                {Number(
                                    order.price || 0
                                ).toLocaleString("fa-IR")}{" "}
                                تومان
                            </div>
                        </TusanCard>

                        <TusanCard className="p-4">
                            <div className="text-sm text-[var(--text-muted)]">
                                تاریخ ثبت
                            </div>

                            <div className="font-bold mt-1">
                                {new Date(
                                    order.created_at
                                ).toLocaleString("fa-IR")}
                            </div>
                        </TusanCard>

                    </div>

                </GlassPanel>

                <GlassPanel className="p-6">

                    <h2 className="text-xl font-bold mb-4">
                        تغییر وضعیت سفارش
                    </h2>

                    <AdminOrderStatus
                        orderId={order.id}
                        currentStatus={order.status}
                        onUpdate={loadOrder}
                    />

                </GlassPanel>

                <GlassPanel className="p-6">

                    <h2 className="text-xl font-bold mb-5">
                        اطلاعات ارسال شده
                    </h2>

                    {Object.keys(
                        order.form_data || {}
                    ).length === 0 ? (
                        <p className="text-[var(--text-muted)]">
                            اطلاعاتی برای این سفارش ارسال نشده است.
                        </p>
                    ) : (
                        <div className="space-y-3">

                            {Object.entries(
                                order.form_data || {}
                            ).map(
                                ([key, value]: any) => (
                                    <div
                                        key={key}
                                        className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]"
                                    >

                                        <div className="text-sm text-[var(--text-muted)] mb-1">
                                            {key}
                                        </div>

                                        <div className="font-bold break-words text-[var(--text)]">
                                            {Array.isArray(value)
                                                ? value.join("، ")
                                                : String(value ?? "---")}
                                        </div>

                                    </div>
                                )
                            )}

                        </div>
                    )}

                </GlassPanel>

                <AdminOrderFiles
                    orderId={order.id}
                />

                <OrderMessages
                    orderId={order.id}
                />

                <GlassPanel className="p-6">
                    <h2 className="text-xl font-bold mb-5">تاریخچه سفارش</h2>

                    {history.length === 0 ? (
                        <p className="text-[var(--text-muted)]">هنوز تاریخچه‌ای ثبت نشده است.</p>
                    ) : (
                        <div className="space-y-5">
                            {history.map((item: any) => (
                                <div
                                    key={item.id}
                                    className="border-r-4 border-[var(--primary)] pr-4"
                                >
                                    <p className="font-bold text-[var(--text)]">
                                        {item.old_status === item.new_status
                                            ? "ثبت سفارش"
                                            : `تغییر وضعیت از ${STATUS_LABELS[item.old_status] || item.old_status
                                            } به ${STATUS_LABELS[item.new_status] || item.new_status
                                            }`}
                                    </p>

                                    {item.description && (
                                        <p className="text-[var(--text)] text-sm mt-1">
                                            {item.description}
                                        </p>
                                    )}

                                    <p className="text-[var(--text-muted)] text-sm mt-2">
                                        {new Date(item.created_at).toLocaleString("fa-IR")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassPanel>

            </div>
        </div>
    );
}