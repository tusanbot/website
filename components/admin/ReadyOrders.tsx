"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton } from "@/components/ui";

type ReadyOrder = {
  id: string;
  status?: string | null;
  tracking_code?: string | null;
  price?: number | null;
  customer?: { full_name?: string | null; phone?: string | null; email?: string | null } | null;
  service?: { title?: string | null; icon?: string | null } | null;
};

export default function ReadyOrders({ orders, onUpdated }: { orders: ReadyOrder[]; onUpdated: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const readyOrders = useMemo(() => orders.filter((order) => order.status === "ready"), [orders]);

  async function completeOrder(order: ReadyOrder) {
    if (!window.confirm(`آیا سفارش ${order.tracking_code || "---"} پس از بررسی مدیر اصلی، تکمیل شود؟`)) return;
    setBusyId(order.id);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("update_staff_order_status", {
        p_order_id: order.id,
        p_status: "completed",
        p_note: "تأیید نهایی توسط مدیر اصلی و تکمیل سفارش",
      });
      if (error || data !== true) throw new Error(error?.message || "تکمیل سفارش انجام نشد.");
      setMessage(`سفارش ${order.tracking_code || "---"} با موفقیت تکمیل شد.`);
      onUpdated();
    } catch (error: any) {
      setMessage(error?.message || "تکمیل سفارش انجام نشد.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section dir="rtl" className="mb-6">
      <GlassPanel className="p-5 border-[var(--primary)]/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black">سفارشات آماده تحویل</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              سفارش‌هایی که مدیر سفارشات آماده تحویل کرده و منتظر تأیید نهایی مدیر اصلی هستند.
            </p>
          </div>
          <span className="rounded-full px-3 py-1 text-sm font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
            {readyOrders.length.toLocaleString("fa-IR")} سفارش
          </span>
        </div>
        {message && <div className="mb-4 rounded-xl border p-3 text-sm">{message}</div>}
        {readyOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-[var(--text-muted)]">
            در حال حاضر سفارشی منتظر تأیید نهایی نیست.
          </div>
        ) : (
          <div className="space-y-3">
            {readyOrders.map((order) => (
              <div key={order.id} className="rounded-xl border p-4">
                <div className="grid gap-3 md:grid-cols-4 items-center">
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">سفارش</div>
                    <b>{order.service?.icon || "📋"} {order.service?.title || "خدمت نامشخص"}</b>
                    <div className="text-xs mt-1">{order.tracking_code || "---"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">مشتری</div>
                    <b>{order.customer?.full_name || order.customer?.phone || order.customer?.email || "---"}</b>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">مبلغ</div>
                    <b>{Number(order.price || 0).toLocaleString("fa-IR")} تومان</b>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                    <Link href={`/admin/orders/${order.id}`}>
                      <TusanButton size="sm" variant="outline">مشاهده جزئیات</TusanButton>
                    </Link>
                    <TusanButton size="sm" onClick={() => void completeOrder(order)} disabled={busyId === order.id}>
                      {busyId === order.id ? "در حال تأیید..." : "تأیید و تکمیل"}
                    </TusanButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
