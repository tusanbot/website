"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton } from "@/components/ui";

type Order = {
  id: string;
  tracking_code: string | null;
  status: string;
  processing_status: string;
  assignment_status: string;
  assigned_staff_id: string | null;
  price: number | null;
  created_at: string;
  updated_at: string;
  services?: { title?: string | null; icon?: string | null } | null;
  profiles?: { full_name?: string | null; phone?: string | null } | null;
};

type Bucket = { key: string; title: string; icon: string; tone: string; statuses: string[] };

const BUCKETS: Bucket[] = [
  { key: "payment", title: "در انتظار پرداخت", icon: "💳", tone: "amber", statuses: ["awaiting_payment"] },
  { key: "review", title: "در حال بررسی", icon: "🔎", tone: "blue", statuses: ["under_review"] },
  { key: "assignment", title: "در انتظار تخصیص", icon: "📥", tone: "violet", statuses: ["awaiting_assignment"] },
  { key: "assigned", title: "تخصیص یافته", icon: "👤", tone: "indigo", statuses: ["assigned"] },
  { key: "progress", title: "در حال انجام", icon: "⚙️", tone: "orange", statuses: ["in_progress"] },
  { key: "submitted", title: "نتیجه ارسال شده", icon: "🧾", tone: "cyan", statuses: ["result_submitted"] },
  { key: "completed", title: "تکمیل شده", icon: "✅", tone: "green", statuses: ["completed"] },
];

const labels: Record<string, string> = {
  awaiting_payment: "در انتظار پرداخت",
  under_review: "در حال بررسی",
  awaiting_assignment: "در انتظار تخصیص",
  assigned: "تخصیص یافته",
  in_progress: "در حال انجام",
  result_submitted: "نتیجه ارسال شده",
  completed: "تکمیل شده",
  rejected: "رد شده",
  cancelled: "لغو شده",
};

export default function OrderWorkflowDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("orders")
      .select("id,tracking_code,status,processing_status,assignment_status,assigned_staff_id,price,created_at,updated_at,services(title,icon),profiles(full_name,phone)")
      .order("updated_at", { ascending: false });
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }
    setOrders((data || []) as Order[]);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin-order-workflow")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_staff_requests" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () => void load())
      .subscribe((status, err) => {
        setLive(status === "SUBSCRIBED");
        if (err) console.error("Admin workflow realtime error:", status, err);
      });
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const bucket of BUCKETS) result[bucket.key] = orders.filter(o => bucket.statuses.includes(o.processing_status)).length;
    result.total = orders.length;
    return result;
  }, [orders]);

  if (loading) return <GlassPanel className="p-5"><div className="animate-pulse text-sm text-[var(--text-muted)]">در حال آماده‌سازی داشبورد فرایند سفارش...</div></GlassPanel>;

  return (
    <div className="space-y-4">
      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-black text-lg">داشبورد عملیاتی سفارش‌ها</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">صف‌ها بر اساس وضعیت فرایند واقعی سفارش نمایش داده می‌شوند.</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${live ? "bg-green-500" : "bg-gray-400"}`} />
            {live ? "به‌روزرسانی زنده فعال" : "در حال اتصال..."}
            {lastUpdate && <span className="text-[var(--text-muted)]">· {lastUpdate.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
        </div>
      </GlassPanel>

      {error && <GlassPanel className="p-4 border-red-500/20 bg-red-500/10 text-sm text-red-600">خطا در دریافت وضعیت سفارش‌ها: {error}</GlassPanel>}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {BUCKETS.map(bucket => (
          <div key={bucket.key} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="text-xl">{bucket.icon}</div>
            <div className="mt-2 text-xs font-bold text-[var(--text-muted)]">{bucket.title}</div>
            <div className="mt-1 text-2xl font-black">{(counts[bucket.key] || 0).toLocaleString("fa-IR")}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {BUCKETS.map(bucket => {
          const items = orders.filter(o => bucket.statuses.includes(o.processing_status)).slice(0, 5);
          return (
            <GlassPanel key={bucket.key} className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
                <div className="font-black">{bucket.icon} {bucket.title}</div>
                <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-black">{(counts[bucket.key] || 0).toLocaleString("fa-IR")}</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {items.length === 0 ? <div className="p-5 text-center text-xs text-[var(--text-muted)]">موردی در این صف نیست.</div> : items.map(order => (
                  <Link key={order.id} href={`/admin/orders/${order.id}`} className="block p-4 hover:bg-[var(--surface-muted)] transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="truncate font-bold">{order.services?.icon} {order.services?.title || "خدمت"}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{order.tracking_code || "بدون کد"} · {order.profiles?.full_name || "کاربر"}</div></div>
                      <span className="shrink-0 text-xs font-bold text-[var(--primary)]">{Number(order.price || 0).toLocaleString("fa-IR")}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]"><span>{labels[order.processing_status] || order.processing_status}</span><span>{new Date(order.updated_at).toLocaleDateString("fa-IR")}</span></div>
                  </Link>
                ))}
              </div>
              {items.length > 0 && (counts[bucket.key] || 0) > items.length && <div className="border-t border-[var(--border)] p-3 text-center"><Link href={`/admin/orders?workflow=${bucket.key}`} className="text-xs font-bold text-[var(--primary)]">مشاهده همه ←</Link></div>}
            </GlassPanel>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/orders/workflow"><TusanButton variant="outline">🧾 بررسی نتایج ارسال‌شده</TusanButton></Link>
        <Link href="/admin/order-approvals"><TusanButton variant="outline">📥 تأیید تخصیص‌ها</TusanButton></Link>
        <Link href="/admin/support"><TusanButton variant="outline">💬 پشتیبانی آنلاین</TusanButton></Link>
      </div>
    </div>
  );
}
