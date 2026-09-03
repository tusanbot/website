"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton } from "@/components/ui";

type Refund = {
  id: string;
  amount: number;
  status: string;
  reason: string;
  transaction_id: string | null;
  admin_note: string | null;
};

const labels: Record<string, string> = {
  requested: "در انتظار تأیید",
  approved: "تأیید شده",
  processing: "در حال بازپرداخت",
  completed: "بازپرداخت انجام شد",
  rejected: "رد شده",
  failed: "ناموفق",
};

export default function AdminOrderRefund({
  orderId,
  orderStatus,
  onUpdate,
}: {
  orderId: string;
  orderStatus: string;
  onUpdate: () => void;
}) {
  const [refund, setRefund] = useState<Refund | null>(null);
  const [reason, setReason] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("order_refunds")
      .select("id,amount,status,reason,transaction_id,admin_note")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error) setMessage(error.message);
    setRefund((data as Refund | null) || null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [orderId]);

  async function requestRefund() {
    if (!reason.trim()) {
      setMessage("علت بازپرداخت را وارد کنید.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("admin_request_order_refund", {
        p_order_id: orderId,
        p_reason: reason.trim(),
      });
      if (error) throw new Error(error.message);
      setRefund(data as Refund);
      setReason("");
      setMessage("درخواست بازپرداخت ثبت شد.");
      onUpdate();
    } catch (e: any) {
      setMessage(e?.message || "ثبت بازپرداخت ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function action(actionName: "approve" | "reject" | "processing" | "completed" | "failed") {
    if (actionName === "completed" && !transactionId.trim()) {
      setMessage("شماره پیگیری واریز وجه را وارد کنید.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("admin_update_order_refund", {
        p_refund_id: refund?.id,
        p_action: actionName,
        p_transaction_id: transactionId.trim() || null,
        p_note: note.trim() || null,
      });
      if (error) throw new Error(error.message);
      setRefund(data as Refund);
      setTransactionId("");
      if (actionName !== "completed") setNote("");
      setMessage(
        actionName === "completed" ? "بازپرداخت با موفقیت ثبت شد." : "وضعیت بازپرداخت به‌روزرسانی شد."
      );
      onUpdate();
    } catch (e: any) {
      setMessage(e?.message || "عملیات بازپرداخت ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <GlassPanel className="p-6">در حال بررسی وضعیت بازپرداخت...</GlassPanel>;

  const canRequest = ["cancelled", "rejected"].includes(orderStatus) && (!refund || ["rejected", "failed"].includes(refund.status));

  return (
    <GlassPanel className="p-6 border border-amber-200">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold">بازپرداخت سفارش</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {refund ? `وضعیت: ${labels[refund.status] || refund.status}` : "برای سفارش لغوشده یا ردشده"}
          </p>
        </div>
        {refund && <strong>{Number(refund.amount).toLocaleString("fa-IR")} تومان</strong>}
      </div>

      {refund && (
        <div className="rounded-xl border p-4 mb-4 space-y-2 text-sm">
          <div><span className="text-[var(--text-muted)]">علت:</span> {refund.reason}</div>
          {refund.transaction_id && <div><span className="text-[var(--text-muted)]">شماره پیگیری:</span> {refund.transaction_id}</div>}
          {refund.admin_note && <div><span className="text-[var(--text-muted)]">یادداشت:</span> {refund.admin_note}</div>}
        </div>
      )}

      {canRequest && (
        <div className="space-y-3">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="علت بازپرداخت" className="w-full rounded-xl border p-3 min-h-24" />
          <TusanButton type="button" onClick={() => void requestRefund()} disabled={busy}>
            {busy ? "در حال ثبت..." : refund ? "ثبت مجدد درخواست بازپرداخت" : "ایجاد درخواست بازپرداخت"}
          </TusanButton>
        </div>
      )}

      {refund?.status === "requested" && (
        <div className="flex flex-wrap gap-3">
          <TusanButton type="button" onClick={() => void action("approve")} disabled={busy}>تأیید بازپرداخت</TusanButton>
          <TusanButton type="button" variant="secondary" onClick={() => void action("reject")} disabled={busy}>رد بازپرداخت</TusanButton>
        </div>
      )}

      {refund?.status === "approved" && (
        <div className="flex flex-wrap gap-3">
          <TusanButton type="button" onClick={() => void action("processing")} disabled={busy}>شروع بازپرداخت</TusanButton>
          <TusanButton type="button" variant="secondary" onClick={() => void action("reject")} disabled={busy}>رد بازپرداخت</TusanButton>
        </div>
      )}

      {refund?.status === "processing" && (
        <div className="space-y-3">
          <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="شماره پیگیری واریز وجه" className="w-full rounded-xl border p-3" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت اختیاری" className="w-full rounded-xl border p-3" />
          <div className="flex flex-wrap gap-3">
            <TusanButton type="button" onClick={() => void action("completed")} disabled={busy}>ثبت بازپرداخت انجام‌شده</TusanButton>
            <TusanButton type="button" variant="secondary" onClick={() => void action("failed")} disabled={busy}>ثبت ناموفق</TusanButton>
          </div>
        </div>
      )}

      {message && <div className="mt-4 rounded-xl border p-4 text-sm leading-6">{message}</div>}
    </GlassPanel>
  );
}
