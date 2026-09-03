"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton } from "@/components/ui";

type Request = { id: string; status: "pending" | "approved" | "rejected"; reason: string; admin_note: string | null; requested_at: string; reviewed_at: string | null };

const labels: Record<Request["status"], string> = { pending: "در انتظار بررسی مدیریت", approved: "درخواست تأیید شد", rejected: "درخواست رد شد" };

export default function OrderCancellationRequest({ orderId, orderStatus, onUpdate }: { orderId: string; orderStatus: string; onUpdate?: () => void }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("order_cancellation_requests").select("id,status,reason,admin_note,requested_at,reviewed_at").eq("order_id", orderId).maybeSingle();
    if (error) setMessage(error.message);
    setRequest((data as Request | null) || null);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [orderId]);

  async function submit() {
    if (reason.trim().length < 3) { setMessage("علت لغو را وارد کنید."); return; }
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.rpc("request_order_cancellation", { p_order_id: orderId, p_reason: reason.trim() });
      if (error) throw new Error(error.message);
      setRequest(data as Request); setReason(""); setMessage("درخواست لغو سفارش ثبت شد و برای مدیریت ارسال شد."); onUpdate?.();
    } catch (e: any) { setMessage(e?.message || "ثبت درخواست لغو ناموفق بود."); }
    finally { setBusy(false); }
  }

  if (loading) return <GlassPanel className="p-6">در حال بررسی درخواست لغو...</GlassPanel>;
  if (["completed", "cancelled", "rejected"].includes(orderStatus) && !request) return null;

  return <GlassPanel className="p-6 border border-red-200">
    <div className="mb-4"><h2 className="text-xl font-bold">لغو سفارش</h2><p className="text-sm text-[var(--text-muted)] mt-1">لغو سفارش فقط پس از بررسی و تأیید مدیریت انجام می‌شود.</p></div>
    {request ? <div className="rounded-xl border p-4 space-y-2 text-sm leading-7">
      <div><span className="text-[var(--text-muted)]">وضعیت:</span> <strong>{labels[request.status]}</strong></div>
      <div><span className="text-[var(--text-muted)]">علت درخواست:</span> {request.reason}</div>
      {request.admin_note && <div><span className="text-[var(--text-muted)]">پاسخ مدیریت:</span> {request.admin_note}</div>}
      {request.status === "rejected" && <div className="pt-2 border-t"><p className="mb-2">در صورت نیاز می‌توانید درخواست جدیدی با علت متفاوت ثبت کنید.</p><textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="علت جدید لغو" className="w-full rounded-xl border p-3 min-h-24"/><TusanButton type="button" className="mt-3" onClick={() => void submit()} disabled={busy}>{busy ? "در حال ثبت..." : "ثبت درخواست جدید"}</TusanButton></div>}
    </div> : <div className="space-y-3">
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="لطفاً علت لغو سفارش را توضیح دهید" className="w-full rounded-xl border p-3 min-h-28" maxLength={2000}/>
      <TusanButton type="button" onClick={() => void submit()} disabled={busy}>{busy ? "در حال ثبت..." : "درخواست لغو سفارش"}</TusanButton>
    </div>}
    {message && <div className="mt-4 rounded-xl border p-4 text-sm leading-6">{message}</div>}
  </GlassPanel>;
}
