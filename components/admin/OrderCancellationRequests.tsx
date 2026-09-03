"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton } from "@/components/ui";

type RequestRow = {
  id: string;
  order_id: string;
  status: "pending" | "approved" | "rejected" | string;
  reason: string;
  admin_note?: string | null;
  requested_at: string;
  reviewed_at?: string | null;
  tracking_code?: string | null;
  order_status?: string | null;
  price?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  service_title?: string | null;
  service_icon?: string | null;
};

const labels: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
};

export default function OrderCancellationRequests() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("admin_list_order_cancellation_requests", { p_status: filter });
    if (rpcError) {
      setRows([]);
      setError(`دریافت درخواست‌های لغو انجام نشد: ${rpcError.message}`);
    } else {
      setRows((Array.isArray(data) ? data : []) as RequestRow[]);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [filter]);

  const pendingCount = useMemo(() => rows.filter((r) => r.status === "pending").length, [rows]);

  return (
    <section dir="rtl" className="mb-6">
      <GlassPanel className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black">درخواست‌های لغو سفارش</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">درخواست‌ها را یکجا ببینید و برای بررسی وارد جزئیات سفارش شوید.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["pending", "approved", "rejected", "all"].map((value) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${filter === value ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
                {value === "all" ? "همه" : labels[value]}
              </button>
            ))}
            <TusanButton variant="outline" onClick={() => void load()}>بروزرسانی</TusanButton>
          </div>
        </div>
        {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}
        {!error && filter === "pending" && pendingCount > 0 && <div className="mb-4 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3 text-sm font-bold">{pendingCount.toLocaleString("fa-IR")} درخواست در انتظار بررسی است.</div>}
        {loading ? <div className="p-6 text-center text-sm">در حال بارگذاری...</div> : rows.length === 0 ? <div className="p-6 text-center text-sm text-[var(--text-muted)]">درخواستی برای نمایش وجود ندارد.</div> : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="grid gap-3 md:grid-cols-5">
                  <div><div className="text-xs text-[var(--text-muted)]">سفارش</div><b>{row.service_icon || "📋"} {row.service_title || "خدمت نامشخص"}</b><div className="text-xs mt-1">{row.tracking_code || "---"}</div></div>
                  <div><div className="text-xs text-[var(--text-muted)]">مشتری</div><b>{row.customer_name || "---"}</b><div className="text-xs mt-1">{row.customer_phone || "---"}</div></div>
                  <div><div className="text-xs text-[var(--text-muted)]">مبلغ</div><b className="text-[var(--primary)]">{Number(row.price || 0).toLocaleString("fa-IR")} تومان</b></div>
                  <div><div className="text-xs text-[var(--text-muted)]">وضعیت درخواست</div><b>{labels[row.status] || row.status}</b><div className="text-xs mt-1">{new Date(row.requested_at).toLocaleString("fa-IR")}</div></div>
                  <div><div className="text-xs text-[var(--text-muted)]">دلیل لغو</div><div className="text-sm line-clamp-3">{row.reason}</div></div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href={`/admin/orders/${row.order_id}`}><TusanButton size="sm" variant="outline">مشاهده و بررسی سفارش ←</TusanButton></Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
