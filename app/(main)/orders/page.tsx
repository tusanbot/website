"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OrderStatus from "@/components/OrderStatus";
import { getUnreadMessagesByOrder } from "@/lib/notifications";
import {
    GlassPanel,
    TusanCard,
    TusanButton,
    TusanInput,
    SectionHeader,
} from "@/components/ui";

type Order = {
    id: string;
    tracking_code: string | null;
    status: string;
    created_at: string;
    updated_at?: string | null;
    price?: number | null;
    services?: {
        title?: string | null;
        icon?: string | null;
    } | null;
    unreadMessages: number;
};

const STATUS_LABELS: Record<string, string> = {
    all: "همه",
    registered: "ثبت‌شده",
    checking: "در حال بررسی",
    need_documents: "نیازمند مدارک",
    processing: "در حال انجام",
    ready: "آماده",
    completed: "تکمیل‌شده",
    cancelled: "لغوشده",
};

const STATUS_CLASSES: Record<string, string> = {
    all: "bg-[var(--surface-muted)] text-[var(--text)]",
    registered: "bg-blue-100 text-blue-700",
    checking: "bg-yellow-100 text-yellow-700",
    need_documents: "bg-orange-100 text-orange-700",
    processing: "bg-purple-100 text-purple-700",
    ready: "bg-cyan-100 text-cyan-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const STATUS_ORDER = [
    "registered",
    "checking",
    "need_documents",
    "processing",
    "ready",
    "completed",
    "cancelled",
];

function formatPrice(price: number | null | undefined) {
    if (!price || Number(price) === 0) {
        return "رایگان";
    }

    return `${Number(price).toLocaleString("fa-IR")} تومان`;
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export default function OrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [sortOrder, setSortOrder] = useState<
        "newest" | "oldest"
    >("newest");

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        setLoading(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role === "admin") {
                router.push("/admin/orders");
                return;
            }

            const { data, error } = await supabase
                .from("orders")
                .select(`
                    *,
                    services(
                        title,
                        icon
                    )
                `)
                .eq("user_id", user.id)
                .order("created_at", {
                    ascending: false,
                });

            if (error) {
                console.error(error);
                setOrders([]);
                return;
            }

            const ordersWithMessages = await Promise.all(
                (data || []).map(async (order) => {
                    const unreadMessages =
                        await getUnreadMessagesByOrder(
                            order.id
                        );

                    return {
                        ...order,
                        unreadMessages,
                    };
                })
            );

            setOrders(ordersWithMessages);
        } catch (error) {
            console.error(error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: orders.length,
        };

        STATUS_ORDER.forEach((status) => {
            counts[status] = orders.filter(
                (order) => order.status === status
            ).length;
        });

        return counts;
    }, [orders]);

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();

        const result = orders.filter((order) => {
            const serviceTitle =
                order.services?.title?.toLowerCase() || "";

            const trackingCode =
                order.tracking_code?.toLowerCase() || "";

            const matchesSearch =
                !query ||
                serviceTitle.includes(query) ||
                trackingCode.includes(query);

            const matchesStatus =
                statusFilter === "all" ||
                order.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        return [...result].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();

            return sortOrder === "newest"
                ? dateB - dateA
                : dateA - dateB;
        });
    }, [
        orders,
        search,
        statusFilter,
        sortOrder,
    ]);

    function clearFilters() {
        setSearch("");
        setStatusFilter("all");
    }

    if (loading) {
        return (
            <div
                dir="rtl"
                className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center"
            >
                <div className="tusan-surface-sm px-8 py-6 text-gray-600">
                    <div className="text-3xl text-center mb-3">
                        ⏳
                    </div>

                    در حال دریافت سفارش‌ها...
                </div>
            </div>
        );
    }

    return (
        <div
            dir="rtl"
            className="min-h-screen page-background text-[var(--text)] transition-colors duration-300"
        >
            {/* Navigation */}
            <nav className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="h-16 flex items-center justify-between gap-4">

                        <Link
                            href="/dashboard"
                            className="font-bold text-lg text-[var(--primary)]"
                        >
                            توسن
                        </Link>

                        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                            <Link
                                href="/dashboard"
                                className="px-3 sm:px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-[var(--surface-muted)] transition whitespace-nowrap"
                            >
                                🏠 داشبورد
                            </Link>

                            <Link
                                href="/orders"
                                className="px-3 sm:px-4 py-2 rounded-lg text-sm bg-[#09967C] text-white font-bold whitespace-nowrap"
                            >
                                📋 سفارش‌های من
                            </Link>

                            <Link
                                href="/services"
                                className="px-3 sm:px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-[var(--surface-muted)] transition whitespace-nowrap"
                            >
                                🛍️ خدمات
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <SectionHeader
                        title="سفارش‌های من"
                        description="مشاهده و پیگیری تمام سفارش‌های ثبت‌شده شما"
                    />

                    <Link href="/services">
                        <TusanButton icon={<span>＋</span>}>
                            ثبت سفارش جدید
                        </TusanButton>
                    </Link>
                </div>

                {/* Search & Filter */}
                {orders.length > 0 && (
                    <GlassPanel className="p-4 sm:p-5 mb-6">

                        <div className="grid lg:grid-cols-[1fr_auto] gap-4">

                            {/* Search */}

                            <TusanInput
                                icon="🔍"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="جستجو بر اساس نام خدمت یا کد پیگیری..."
                                clearable
                                onClear={() => setSearch("")}
                            />


                            {/* Sort */}
                            <select
                                value={sortOrder}
                                onChange={(event) =>
                                    setSortOrder(
                                        event.target.value as
                                        | "newest"
                                        | "oldest"
                                    )
                                }
                                className="h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 min-w-[180px]"
                            >
                                <option value="newest">
                                    جدیدترین سفارش‌ها
                                </option>

                                <option value="oldest">
                                    قدیمی‌ترین سفارش‌ها
                                </option>
                            </select>
                        </div>

                        {/* Status Tabs */}
                        <div className="flex gap-2 overflow-x-auto pt-4 pb-1">
                            {[
                                "all",
                                ...STATUS_ORDER,
                            ].map((status) => {
                                const active =
                                    statusFilter === status;

                                return (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() =>
                                            setStatusFilter(
                                                status
                                            )
                                        }
                                        className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition ${active
                                            ? "bg-[var(--primary)] text-white shadow-md"
                                            : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                                            }`}
                                    >
                                        {STATUS_LABELS[status]}

                                        <span
                                            className={`mr-2 ${active
                                                ? "text-white/80"
                                                : "text-[var(--text-muted)]"
                                                }`}
                                        >
                                            {(
                                                statusCounts[
                                                status
                                                ] || 0
                                            ).toLocaleString(
                                                "fa-IR"
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </GlassPanel>
                )}

                {/* Result count */}
                {orders.length > 0 && (
                    <div className="flex items-center justify-between gap-3 mb-4 text-sm text-[var(--text-muted)]">
                        <span>
                            نمایش{" "}
                            <strong className="text-[var(--text)]">
                                {filteredOrders.length.toLocaleString(
                                    "fa-IR"
                                )}
                            </strong>{" "}
                            سفارش از{" "}
                            <strong className="text-[var(--text)]">
                                {orders.length.toLocaleString(
                                    "fa-IR"
                                )}
                            </strong>
                        </span>

                        {(search ||
                            statusFilter !== "all") && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-[#09967C] font-bold hover:underline"
                                >
                                    پاک کردن فیلترها
                                </button>
                            )}
                    </div>
                )}

                {/* Empty */}
                {orders.length === 0 ? (
                    <div className="tusan-surface p-10 text-center">

                        <div className="text-5xl mb-4">
                            📭
                        </div>

                        <h2 className="text-xl font-bold">
                            هنوز سفارشی ثبت نکرده‌اید
                        </h2>

                        <p className="text-[var(--text-muted)] mt-2">
                            برای ثبت سفارش جدید روی دکمه زیر کلیک کنید.
                        </p>

                        <Link
                            href="/services"
                            className="inline-block mt-6 bg-[#09967C] text-white px-6 py-3 rounded-xl"
                        >
                            ثبت سفارش جدید
                        </Link>
                    </div>
                ) : filteredOrders.length === 0 ? (

                    /* No Search Result */
                    <div className="tusan-surface p-10 text-center">

                        <div className="text-5xl mb-4">
                            🔍
                        </div>

                        <h2 className="text-xl font-bold text-[var(--text)]">
                            سفارشی پیدا نشد
                        </h2>

                        <p className="text-[var(--text-muted)] mt-2">
                            عبارت جستجو یا وضعیت انتخاب‌شده را تغییر دهید.
                        </p>

                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-block mt-6 bg-[var(--surface-muted)] text-[var(--text)] px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                        >
                            حذف فیلترها
                        </button>
                    </div>

                ) : (

                    /* Orders */
                    <div className="space-y-4">

                        {filteredOrders.map((order) => (

                            <TusanCard
                                key={order.id}
                                className="p-5"
                            >

                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">

                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center text-2xl">
                                            {order.services?.icon ||
                                                "📋"}
                                        </div>

                                        <div>
                                            <h2 className="font-bold text-xl text-[var(--text)]">
                                                {order.services?.title ||
                                                    "خدمت نامشخص"}
                                            </h2>

                                            <div className="text-sm text-[var(--text-muted)] mt-1">
                                                {formatDate(
                                                    order.created_at
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <OrderStatus
                                        status={order.status}
                                    />
                                </div>

                                {/* Info */}
                                <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">

                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="text-xs text-[var(--text-muted)] mb-1">
                                            کد پیگیری
                                        </div>

                                        <div className="font-bold text-[var(--text)]">
                                            {order.tracking_code ||
                                                "---"}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="text-xs text-[var(--text-muted)] mb-1">
                                            تاریخ ثبت
                                        </div>

                                        <div className="font-bold text-[var(--text)]">
                                            {formatDate(
                                                order.created_at
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="text-xs text-[var(--text-muted)] mb-1">
                                            مبلغ سفارش
                                        </div>

                                        <div className="font-bold text-[var(--text)]">
                                            {formatPrice(
                                                order.price
                                            )}
                                        </div>
                                    </div>

                                </div>

                                {/* Unread Messages */}
                                {order.unreadMessages > 0 && (
                                    <Link
                                        href={`/orders/${order.id}`}
                                        className="mt-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300 rounded-xl px-4 py-3 hover:bg-red-100 transition"
                                    >
                                        <span className="flex items-center gap-2 font-bold">
                                            <span className="text-xl">
                                                💬
                                            </span>

                                            {order.unreadMessages.toLocaleString(
                                                "fa-IR"
                                            )}{" "}
                                            پیام جدید
                                        </span>

                                        <span className="text-sm font-bold">
                                            مشاهده پیام‌ها ←
                                        </span>
                                    </Link>
                                )}

                                {/* Action */}
                                <div className="mt-5">
                                    <Link href={`/orders/${order.id}`} className="block mt-5">
                                        <TusanButton fullWidth>
                                            مشاهده جزئیات سفارش
                                        </TusanButton>
                                    </Link>
                                </div>

                            </TusanCard>

                        ))}

                    </div>
                )}
            </main>
        </div>
    );
}