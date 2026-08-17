"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
    getAdminUnreadMessagesCount,
} from "@/lib/notifications";

import {
    GlassPanel,
    TusanCard,
    TusanButton,
    TusanInput,
    SectionHeader,
    TusanBadge,
} from "@/components/ui";

type Message = {
    id: string;
    order_id: string | null;
    sender_id: string | null;
    sender_role: string | null;
    read_by_admin: boolean | null;
    read_by_user: boolean | null;
    created_at: string | null;
    [key: string]: unknown;
};

type OrderInfo = {
    id: string;
    tracking_code: string | null;
    user_id: string | null;
    services?: {
        title?: string | null;
        icon?: string | null;
    } | null;
    profiles?: {
        full_name?: string | null;
        phone?: string | null;
    } | null;
};

type Filter =
    | "all"
    | "unread"
    | "read";

export default function AdminMessages() {
    const [messages, setMessages] =
        useState<Message[]>([]);

    const [orders, setOrders] =
        useState<Record<string, OrderInfo>>({});

    const [filter, setFilter] =
        useState<Filter>("all");

    const [search, setSearch] =
        useState("");

    const [unreadCount, setUnreadCount] =
        useState(0);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        loadMessages();

        const channel = supabase
            .channel("admin-messages-list")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "messages",
                },
                () => {
                    loadMessages();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(
                channel
            );
        };
    }, []);

    async function loadMessages() {
        setLoading(true);
        setError("");

        try {
            const {
                data,
                error: messagesError,
            } = await supabase
                .from("messages")
                .select("*")
                .order("created_at", {
                    ascending: false,
                })
                .limit(100);

            if (messagesError) {
                throw messagesError;
            }

            const nextMessages =
                (data || []) as Message[];

            setMessages(nextMessages);

            const orderIds = Array.from(
                new Set(
                    nextMessages
                        .map(
                            (message) =>
                                message.order_id
                        )
                        .filter(Boolean)
                )
            ) as string[];

            if (orderIds.length > 0) {
                const {
                    data: orderData,
                    error: orderError,
                } = await supabase
                    .from("orders")
                    .select(`
                        id,
                        tracking_code,
                        user_id,
                        services(
                            title,
                            icon
                        ),
                        profiles(
                            full_name,
                            phone
                        )
                    `)
                    .in("id", orderIds);

                if (orderError) {
                    console.error(
                        orderError
                    );
                }

                const map: Record<
                    string,
                    OrderInfo
                > = {};

                (orderData || []).forEach(
                    (order: any) => {
                        map[order.id] =
                            order;
                    }
                );

                setOrders(map);
            } else {
                setOrders({});
            }

            const count =
                await getAdminUnreadMessagesCount();

            setUnreadCount(count);
        } catch (err) {
            console.error(err);

            setError(
                "خطا در دریافت پیام‌ها."
            );
        } finally {
            setLoading(false);
        }
    }

    async function markAsRead(
        message: Message
    ) {
        if (message.read_by_admin) {
            return;
        }

        const { error } =
            await supabase
                .from("messages")
                .update({
                    read_by_admin: true,
                })
                .eq(
                    "id",
                    message.id
                );

        if (error) {
            console.error(error);
            return;
        }

        setMessages((current) =>
            current.map((item) =>
                item.id === message.id
                    ? {
                        ...item,
                        read_by_admin:
                            true,
                    }
                    : item
            )
        );

        setUnreadCount(
            Math.max(
                0,
                unreadCount - 1
            )
        );
    }

    function getMessageText(
        message: Message
    ) {
        const possibleKeys = [
            "content",
            "message",
            "text",
            "body",
        ];

        for (const key of possibleKeys) {
            const value =
                message[key];

            if (
                typeof value ===
                "string" &&
                value.trim()
            ) {
                return value;
            }
        }

        return "متن پیام در دسترس نیست";
    }

    function formatDate(
        value: string | null
    ) {
        if (!value) {
            return "---";
        }

        return new Date(
            value
        ).toLocaleString(
            "fa-IR",
            {
                dateStyle:
                    "short",
                timeStyle:
                    "short",
            }
        );
    }

    const filteredMessages =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            return messages.filter(
                (message) => {
                    if (
                        filter ===
                        "unread" &&
                        message.read_by_admin
                    ) {
                        return false;
                    }

                    if (
                        filter ===
                        "read" &&
                        !message.read_by_admin
                    ) {
                        return false;
                    }

                    if (!query) {
                        return true;
                    }

                    const order =
                        message.order_id
                            ? orders[
                            message
                                .order_id
                            ]
                            : undefined;

                    const text =
                        getMessageText(
                            message
                        );

                    return [
                        text,
                        order?.tracking_code,
                        order
                            ?.profiles
                            ?.full_name,
                        order
                            ?.profiles
                            ?.phone,
                    ]
                        .filter(
                            Boolean
                        )
                        .some(
                            (value) =>
                                String(
                                    value
                                )
                                    .toLowerCase()
                                    .includes(
                                        query
                                    )
                        );
                }
            );
        }, [
            messages,
            orders,
            filter,
            search,
        ]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <GlassPanel className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <SectionHeader
                        title="پیام‌های مشتریان"
                        description="مشاهده و مدیریت پیام‌های مرتبط با سفارش‌ها"
                    />

                    <div className="flex items-center gap-3">
                        <TusanBadge>
                            {unreadCount.toLocaleString("fa-IR")} پیام خوانده‌نشده
                        </TusanBadge>

                        <TusanButton onClick={loadMessages}>
                            بروزرسانی
                        </TusanButton>
                    </div>
                </div>
            </GlassPanel>

            {/* Filters */}
            <GlassPanel className="p-5">
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">
                            جستجو
                        </label>

                        <TusanInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="متن پیام، نام مشتری، شماره تماس یا کد پیگیری..."
                            icon="🔍"
                            clearable
                            onClear={() => setSearch("")}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">
                            وضعیت
                        </label>

                        <select
                            value={filter}
                            onChange={(event) => setFilter(event.target.value as Filter)}
                            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]"
                        >
                            <option value="all">همه پیام‌ها</option>
                            <option value="unread">خوانده‌نشده</option>
                            <option value="read">خوانده‌شده</option>
                        </select>
                    </div>
                </div>
            </GlassPanel>

            {/* Messages */}
            {loading ? (
                <GlassPanel className="p-10 text-center text-[var(--text-muted)]">
                    در حال دریافت پیام‌ها...
                </GlassPanel>
            ) : error ? (
                <GlassPanel className="p-6 border-red-500/20 bg-red-500/10 text-red-600 text-center">
                    {error}
                </GlassPanel>
            ) : filteredMessages.length === 0 ? (
                <GlassPanel className="p-10 text-center text-[var(--text-muted)]">
                    پیامی برای نمایش وجود ندارد.
                </GlassPanel>
            ) : (
                <div className="space-y-4">
                    {filteredMessages.map(
                        (message) => {
                            const order =
                                message.order_id
                                    ? orders[
                                    message
                                        .order_id
                                    ]
                                    : undefined;

                            const unread =
                                !message.read_by_admin;

                            return (
                                <TusanCard
                                    key={message.id}
                                    className={`p-5 border-r-4 ${unread ? "border-red-500" : "border-[var(--border)]"
                                        }`}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                                                    💬
                                                </div>

                                                <div>
                                                    <div className="font-bold text-[var(--text)]">
                                                        {order
                                                            ?.profiles
                                                            ?.full_name ||
                                                            "مشتری"}
                                                    </div>

                                                    <div className="text-xs text-[var(--text-muted)]">
                                                        {formatDate(
                                                            message.created_at
                                                        )}
                                                    </div>
                                                </div>

                                                {unread && (
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                                                        جدید
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-4 bg-gray-50 rounded-xl p-4 text-gray-700 leading-7 whitespace-pre-wrap">
                                                {getMessageText(
                                                    message
                                                )}
                                            </div>
                                        </div>

                                        <div className="lg:w-56 shrink-0">
                                            {order && (
                                                <GlassPanel className="p-4">
                                                    <div className="font-bold text-[var(--text)]">
                                                        {order.services?.icon || "📋"} {order.services?.title || "سفارش"}
                                                    </div>

                                                    <div className="text-sm text-[var(--text-muted)] mt-2">
                                                        کد پیگیری:
                                                        <br />
                                                        <span className="font-bold text-[var(--text)]">
                                                            {order.tracking_code || "---"}
                                                        </span>
                                                    </div>

                                                    <div className="mt-4">
                                                        <Link href={`/admin/orders/${order.id}`}>
                                                            <TusanButton className="w-full">
                                                                مشاهده سفارش
                                                            </TusanButton>
                                                        </Link>
                                                    </div>
                                                </GlassPanel>
                                            )}

                                            {unread && (
                                                <TusanButton
                                                    variant="outline"
                                                    className="w-full mt-3"
                                                    onClick={() => markAsRead(message)}
                                                >
                                                    علامت‌گذاری به‌عنوان خوانده‌شده
                                                </TusanButton>
                                            )}
                                        </div>
                                    </div>
                                </TusanCard>
                            );
                        }
                    )}
                </div>
            )}
        </div>
    );
}