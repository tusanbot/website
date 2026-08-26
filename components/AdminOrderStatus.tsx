"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const statuses = [
    { value: "registered", label: "ثبت شده" },
    { value: "checking", label: "در حال بررسی" },
    { value: "need_documents", label: "نیاز به مدارک" },
    { value: "processing", label: "در حال انجام" },
    { value: "ready", label: "آماده تحویل" },
    { value: "completed", label: "تکمیل شده" },
    { value: "cancelled", label: "لغو شده" },
];

const statusLabels = Object.fromEntries(statuses.map((item) => [item.value, item.label]));

export default function AdminOrderStatus({
    orderId,
    currentStatus,
    onUpdate,
}: {
    orderId: string;
    currentStatus: string;
    onUpdate: () => void;
}) {
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setStatus(currentStatus);
    }, [currentStatus]);

    async function saveStatus() {
        if (status === currentStatus) {
            alert("وضعیت تغییری نکرده است");
            return;
        }

        setLoading(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("برای تغییر وضعیت باید وارد حساب کاربری شوید.");

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();
            if (profileError || profile?.role !== "admin") {
                throw new Error("شما دسترسی لازم برای تغییر وضعیت سفارش را ندارید.");
            }

            const { data: order, error: orderError } = await supabase
                .from("orders")
                .select("id,status")
                .eq("id", orderId)
                .single();
            if (orderError || !order) throw new Error("سفارش پیدا نشد.");
            if (order.status !== currentStatus) {
                throw new Error("وضعیت سفارش در همین لحظه تغییر کرده است. صفحه را تازه‌سازی کنید.");
            }

            const { error: updateError } = await supabase
                .from("orders")
                .update({ status, updated_at: new Date().toISOString() })
                .eq("id", orderId)
                .eq("status", currentStatus);
            if (updateError) throw new Error(updateError.message);

            const { error: historyError } = await supabase.from("order_history").insert({
                order_id: orderId,
                old_status: currentStatus,
                new_status: status,
                description: "تغییر وضعیت سفارش توسط مدیر",
            });
            if (historyError) {
                console.error("order_history insert failed:", historyError);
                alert("وضعیت سفارش تغییر کرد، اما ثبت تاریخچه با خطا مواجه شد.");
            }

            const { error: messageError } = await supabase.from("messages").insert({
                order_id: orderId,
                sender_id: user.id,
                sender_role: "admin",
                message: `وضعیت سفارش شما به «${statusLabels[status] || status}» تغییر کرد.`,
                is_read: false,
                read_by_admin: true,
                read_by_user: false,
            });
            if (messageError) console.error("customer status notification failed:", messageError);

            alert("وضعیت سفارش تغییر کرد و اطلاع‌رسانی برای مشتری ارسال شد.");
            onUpdate();
        } catch (error: any) {
            alert(error?.message || "تغییر وضعیت سفارش ناموفق بود.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex gap-2 items-center">
            <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
                className="border rounded p-2"
            >
                {statuses.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                ))}
            </select>
            <button
                onClick={saveStatus}
                disabled={loading}
                className="bg-[#09967C] text-white px-4 py-2 rounded disabled:opacity-60"
            >
                {loading ? "در حال ذخیره..." : "ثبت تغییر"}
            </button>
        </div>
    );
}
