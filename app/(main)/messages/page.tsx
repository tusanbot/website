"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUnreadMessagesByOrder } from "@/lib/notifications";
import TusanIcon from "@/components/ui/TusanIcon";

import {
    GlassPanel,
    TusanCard,
    TusanButton,
    SectionHeader,
} from "@/components/ui";
import OrderStatus from "@/components/orders/OrderStatus";

type MessageConversation = {
    orderId: string;
    trackingCode: string;
    serviceTitle: string;
    serviceIcon: string;
    orderStatus: string;
    unreadMessages: number;
    createdAt: string;
};

export default function MessagesPage() {
    const router = useRouter();

    const [conversations, setConversations] = useState<MessageConversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConversations();
    }, []);

    async function loadConversations() {
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

            const { data: orders, error } = await supabase
                .from("orders")
                .select(`
                id,
                tracking_code,
                status,
                created_at,
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
                console.error("خطا در دریافت سفارش‌ها:", error);
                setConversations([]);
                return;
            }

            const result = await Promise.all(
                (orders || []).map(async (order: any) => {
                    const unreadMessages =
                        await getUnreadMessagesByOrder(order.id);

                    return {
                        orderId: order.id,
                        trackingCode: order.tracking_code || "---",
                        serviceTitle:
                            order.services?.title || "خدمت نامشخص",
                        serviceIcon:
                            order.services?.icon || "💬",
                        orderStatus: order.status,
                        unreadMessages,
                        createdAt: order.created_at,
                    };
                })
            );

            setConversations(result);
        } catch (error) {
            console.error("خطا در دریافت پیام‌ها:", error);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    }

    const unreadTotal = conversations.reduce(
        (sum, conversation) =>
            sum + conversation.unreadMessages,
        0
    );

    if (loading) {
        return (
            <div
                dir="rtl"
                className="min-h-screen bg-gray-100 flex items-center justify-center p-6"
            >
                <GlassPanel className="p-8 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-2xl animate-pulse">
                        💬
                    </div>
                    <p className="mt-4 text-[var(--text-muted)]">
                        در حال دریافت پیام‌ها...
                    </p>
                </GlassPanel>
            </div>
        );
    }

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-gray-100 p-4 sm:p-6"
        >
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <GlassPanel className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                        <SectionHeader
                            title="پیام‌ها"
                            description="پیام‌های مربوط به سفارش‌های شما"
                        />

                        {unreadTotal > 0 && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
                                <div className="font-bold">
                                    💬 {unreadTotal.toLocaleString("fa-IR")} پیام جدید
                                </div>
                            </div>
                        )}
                    </div>
                </GlassPanel>

                {/* Conversations */}
                {conversations.length === 0 ? (
                    <GlassPanel className="p-12 text-center">
                        <div className="text-6xl mb-5">💬</div>

                        <h2 className="text-xl font-bold text-[var(--text)]">
                            هنوز پیامی ندارید
                        </h2>

                        <p className="text-[var(--text-muted)] mt-2">
                            پیام‌های مربوط به سفارش‌های شما در این بخش نمایش داده می‌شوند.
                        </p>

                        <div className="mt-6 flex justify-center">
                            <Link href="/services">
                                <TusanButton>
                                    ثبت سفارش جدید
                                </TusanButton>
                            </Link>
                        </div>
                    </GlassPanel>
                ) : (
                    <div className="space-y-4">
                        {conversations.map((conversation) => (
                            <Link
                                key={conversation.orderId}
                                href={`/orders/${conversation.orderId}`}
                                className="block"
                            >
                                <TusanCard className="p-5 hover:-translate-y-1 transition-all duration-300">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                                        {/* Icon */}
                                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-3xl">
                                            {conversation.serviceIcon}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">

                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-bold text-lg text-[var(--text)]">
                                                    {conversation.serviceTitle}
                                                </h2>

                                                {conversation.unreadMessages > 0 && (
                                                    <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                                        {conversation.unreadMessages} جدید
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[var(--text-muted)]">

                                                <span>
                                                    کد پیگیری: {" "}
                                                    <strong className="text-[var(--text)]">
                                                        {conversation.trackingCode}
                                                    </strong>
                                                </span>

                                                <OrderStatus status={conversation.orderStatus} />
                                            </div>

                                            <div className="text-xs text-[var(--text-muted)] mt-2">
                                                ثبت سفارش: {" "}
                                                {new Date(
                                                    conversation.createdAt
                                                ).toLocaleDateString(
                                                    "fa-IR"
                                                )}
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <div className="flex items-center justify-between sm:justify-end gap-3">

                                            {conversation.unreadMessages > 0 && (
                                                <span className="text-red-600 text-sm font-bold">
                                                    پیام جدید
                                                </span>
                                            )}

                                            <span className="text-[var(--primary)] font-bold">
                                                مشاهده ←
                                            </span>
                                        </div>
                                    </div>
                                </TusanCard>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Navigation */}
                <GlassPanel className="p-3">
                    <div className="grid grid-cols-3 gap-2">

                        <Link
                            href="/dashboard"
                            className="text-center py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition"
                        >
                            🏠

                            <span className="block text-xs mt-1">
                                داشبورد
                            </span>
                        </Link>

                        <Link
                            href="/orders"
                            className="text-center py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition"
                        >
                            <TusanIcon name="clipboard" size={24} className="text-[var(--primary)]" />

                            <span className="block text-xs mt-1">
                                سفارش‌ها
                            </span>
                        </Link>

                        <div className="text-center py-3 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
                            💬

                            <span className="block text-xs mt-1">
                                پیام‌ها
                            </span>
                        </div>

                    </div>
                </GlassPanel>

            </div>
        </div>
    );

}