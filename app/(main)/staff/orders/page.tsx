"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, SectionHeader, TusanBadge, TusanButton } from "@/components/ui";

type Order = { id: string; tracking_code: string | null; status: string; processing_status: string; assignment_status: string; price: number | null; created_at: string; service?: { title?: string | null } | null; };

const statusLabels: Record<string, string> = { awaiting_payment: "منتظر پرداخت", in_progress: "در حال انجام", result_submitted: "نتیجه ارسال شده", completed: "تکمیل شده", rejected: "رد شده", cancelled: "لغو شده" };

export default function StaffOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    useEffect(() => { void loadOrders(); }, []);

    async function loadOrders() {
        setLoading(true);
        const { data, error } = await supabase.from("orders").select("id,tracking_code,status,processing_status,assignment_status,price,created_at,services(title)").order("created_at", { ascending: false }).limit(100);
        if (error) setMessage(error.message);
        setOrders((data || []).map((row: any) => ({ ...row, service: Array.isArray(row.services) ? row.services[0] : row.services })) as Order[]);
        setLoading(false);
    }

    async function requestAssignment(orderId: string) {
        setBusy(orderId); setMessage("");
        const { error } = await supabase.rpc("request_order_assignment", { p_order_id: orderId });
        if (error) setMessage(error.message); else setMessage("درخواست تخصیص ثبت شد و منتظر تأیید مدیر است.");
        await loadOrders(); setBusy(null);
    }

    async function setProcessing(orderId: string, nextStatus: string) {
        setBusy(orderId); setMessage("");
        const { error } = await supabase.rpc("set_order_processing_status", { p_order_id: orderId, p_status: nextStatus, p_note: nextStatus === "result_submitted" ? "نتیجه توسط اپراتور سفارش ارسال شد." : null });
        if (error) setMessage(error.message); else setMessage("وضعیت سفارش به‌روزرسانی شد.");
        await loadOrders(); setBusy(null);
    }

    return (
        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4"><SectionHeader title="مدیریت سفارشات" description="فقط سفارش‌هایی که بر اساس نقش و دسترسی خدمت برای شما مجاز هستند نمایش داده می‌شوند." /><TusanButton variant="secondary" onClick={() => void loadOrders()}>بروزرسانی</TusanButton></div>
            {message && <GlassPanel className="border border-[var(--primary)]/20 p-4 text-sm">{message}</GlassPanel>}
            <GlassPanel className="overflow-hidden p-0">
                <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--surface-muted)]"><tr><th className="px-4 py-3 text-right">سفارش</th><th className="px-4 py-3 text-right">خدمت</th><th className="px-4 py-3 text-right">وضعیت</th><th className="px-4 py-3 text-right">پردازش</th><th className="px-4 py-3 text-right">مبلغ</th><th className="px-4 py-3 text-right">عملیات</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">در حال بارگذاری...</td></tr> : orders.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">سفارشی در دسترس نیست.</td></tr> : orders.map((order) => <tr key={order.id} className="border-t border-[var(--border)]"><td className="px-4 py-4"><div className="font-black">{order.tracking_code || order.id.slice(0, 8)}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{new Date(order.created_at).toLocaleDateString("fa-IR")}</div></td><td className="px-4 py-4">{order.service?.title || "خدمت نامشخص"}</td><td className="px-4 py-4"><TusanBadge variant="info">{order.status}</TusanBadge></td><td className="px-4 py-4"><TusanBadge variant={order.processing_status === "in_progress" ? "warning" : order.processing_status === "completed" ? "success" : "info"}>{statusLabels[order.processing_status] || order.processing_status}</TusanBadge></td><td className="px-4 py-4 font-bold">{(order.price || 0).toLocaleString("fa-IR")} تومان</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2">{order.assignment_status === "unassigned" && <TusanButton size="sm" onClick={() => void requestAssignment(order.id)} disabled={busy === order.id}>{busy === order.id ? "..." : "درخواست تخصیص"}</TusanButton>}{order.assignment_status === "assigned" && order.processing_status === "awaiting_payment" && <TusanButton size="sm" onClick={() => void setProcessing(order.id, "in_progress")} disabled={busy === order.id}>شروع انجام</TusanButton>}{order.processing_status === "in_progress" && <TusanButton size="sm" onClick={() => void setProcessing(order.id, "result_submitted")} disabled={busy === order.id}>ارسال نتیجه</TusanButton>}</div></td></tr>)}</tbody></table></div>
            </GlassPanel>
        </main>
    );
}
