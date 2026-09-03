"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton } from "@/components/ui";

type Request = { id: string; status: "pending" | "approved" | "rejected"; reason: string; admin_note: string | null; requested_at: string; reviewed_at: string | null };
const labels = { pending: "در انتظار بررسی", approved: "تأیید شده", rejected: "رد شده" };

export default function AdminOrderCancellation({ orderId, orderStatus, onUpdate }: { orderId: string; orderStatus: string; onUpdate: () => void }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("order_cancellation_requests").select("id,status,reason,admin_note,requested_at,reviewed_at").eq("order_id", orderId).maybeSingle();
    if (error) setMessage(error.message);
    setRequest((data as Request | null) || null);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [orderId]);

  async function review(action: "approve" | "reject") {
    if (action === "reject" && note.trim().length < 3) { setMessage("علت رد درخواست الزامی است."); return; }
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.rpc("admin_review_order_cancellation", { p_request_id: request?.id, p_action: action, p_note: note.trim() || null });
      if (error) throw new Error(error.message);
      setRequest(data as Request); setNote(""); setMessage(action === "approve" ? "لغو سفارش تأیید شد و وضعیت سفارش به «لغو شده» تغییر کرد." : "درخواست لغو رد شد."); onUpdate();
    } catch (e: any) { setMessage(e?.message || "بررسی درخواست لغو ناموفق بود."); }
    finally { setBusy(false); }
  }

  if (loading) return <GlassPanel className="p-6">در حال بررسی درخواست لغو...</GlassPanel>;
  if (!request) return null;

  return <GlassPanel className="p-6 border border-red-200">
    <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-xl font-bold">درخواست لغو مشتری</h2><p className="text-sm text-[var(--text-muted)] mt-1">وضعیت: {labels[request.status]}</p></div><span className="text-xs text-[var(--text-muted)]">{new Date(request.requested_at).toLocaleString("fa-IR")}</span></div>
    <div className="rounded-xl border p-4 text-sm leading-7 mb-4"><div><span className="text-[var(--text-muted)]">علت درخواست:</span> {request.reason}</div>{request.admin_note && <div className="mt-2"><span className="text-[var(--text-muted)]">یادداشت مدیریت:</span> {request.admin_note}</div>}</div>
    {request.status === "pending" && <div className="space-y-3"><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="یادداشت مدیریت (برای رد الزامی است)" className="w-full rounded-xl border p-3 min-h-24" maxLength={2000}/><div className="flex flex-wrap gap-3"><TusanButton type="button" onClick={() => void review("approve")} disabled={busy}>تأیید لغو سفارش</TusanButton><TusanButton type="button" variant="secondary" onClick={() => void review("reject")} disabled={busy}>رد درخواست</TusanButton></div></div>}
    {request.status === "approved" && orderStatus !== "cancelled" && <div className="rounded-xl bg-amber-50 text-amber-800 p-4 text-sm">درخواست تأیید شده است؛ وضعیت سفارش باید لغو شده باشد.</div>}
    {message && <div className="mt-4 rounded-xl border p-4 text-sm leading-6">{message}</div>}
  </GlassPanel>;
}
