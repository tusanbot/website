"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string | null;
    order_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    read_at: string | null;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function iconFor(type: string) {
    if (type.includes("payment")) return "💳";
    if (type.includes("receipt")) return "🧾";
    if (type.includes("message")) return "💬";
    if (type.includes("document")) return "📎";
    if (type.includes("completed")) return "✅";
    if (type.includes("status")) return "🔄";
    return "🔔";
}

export default function NotificationCenter() {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const unreadCount = useMemo(
        () => items.filter((item) => !item.read_at).length,
        [items]
    );

    const load = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setItems([]);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("notifications")
            .select("id, type, title, message, order_id, metadata, created_at, read_at")
            .eq("recipient_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100);

        if (!error) setItems((data ?? []) as NotificationItem[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();

        const channel = supabase
            .channel("user-notifications")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "notifications" },
                () => load()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [load]);

    async function markRead(id: string) {
        setBusyId(id);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from("notifications")
                .update({ read_at: new Date().toISOString() })
                .eq("id", id)
                .eq("recipient_id", user.id)
                .is("read_at", null);
        }
        setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
        setBusyId(null);
    }

    async function markAllRead() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("recipient_id", user.id)
            .is("read_at", null);
        await load();
    }

    return (
        <div dir="rtl" className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black">اعلان‌ها</h1>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {unreadCount.toLocaleString("fa-IR")} اعلان خوانده‌نشده
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        type="button"
                        onClick={markAllRead}
                        className="rounded-xl border px-4 py-2 text-sm font-bold hover:bg-black/5"
                    >
                        علامت‌گذاری همه به‌عنوان خوانده‌شده
                    </button>
                )}
            </div>

            {loading ? (
                <div className="rounded-2xl border p-8 text-center text-[var(--text-muted)]">در حال دریافت اعلان‌ها...</div>
            ) : items.length === 0 ? (
                <div className="rounded-2xl border p-10 text-center">
                    <div className="text-5xl mb-3">🔔</div>
                    <p className="font-bold">اعلانی وجود ندارد.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`rounded-2xl border p-4 transition ${item.read_at ? "opacity-75" : "ring-1 ring-[var(--primary)]/20 bg-[var(--primary)]/5"}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="text-2xl shrink-0">{iconFor(item.type)}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                        <h2 className="font-black">{item.title}</h2>
                                        <time className="text-xs text-[var(--text-muted)] shrink-0">{formatDate(item.created_at)}</time>
                                    </div>
                                    {item.message && <p className="mt-2 leading-7 text-sm">{item.message}</p>}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {item.order_id && (
                                            <Link href={`/orders/${item.order_id}`} className="rounded-lg px-3 py-1.5 text-sm font-bold bg-[var(--primary)] text-white">
                                                مشاهده سفارش
                                            </Link>
                                        )}
                                        {!item.read_at && (
                                            <button
                                                type="button"
                                                disabled={busyId === item.id}
                                                onClick={() => markRead(item.id)}
                                                className="rounded-lg border px-3 py-1.5 text-sm font-bold disabled:opacity-50"
                                            >
                                                خوانده شد
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
