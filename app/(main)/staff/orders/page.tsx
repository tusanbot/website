"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton, TusanInput, SectionHeader } from "@/components/ui";
import OrderStatus from "@/components/orders/OrderStatus";

type Order = {
  id: string; tracking_code: string | null; user_id: string; service_id: string; status: string; price: number | null; created_at: string;
  assignment_status: string | null; assigned_staff_id: string | null; processing_status: string | null;
  services?: { title?: string; icon?: string } | null; profile?: { full_name?: string | null; phone?: string | null } | null;
};

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data, error } = await supabase.rpc("get_staff_orders");
    if (error) { setMessage(`دریافت سفارش‌ها انجام نشد. لطفاً دوباره تلاش کنید. (${error.message})`); setOrders([]); setLoading(false); return; }
    const rows = (Array.isArray(data) ? data : []) as any[];
    setOrders(rows.map(o => ({
      ...o,
      profile: o.customer ?? null,
      services: o.service ?? null,
    })) as Order[]);
    setLoading(false);
  }

  async function requestAssignment(orderId: string) {
    if (!userId || busy) return;
    setBusy(orderId); setMessage("");
    const { error } = await supabase.rpc("request_order_assignment", { p_order_id: orderId });
    if (error) setMessage(error.message || "درخواست تخصیص سفارش انجام نشد.");
    else setMessage("درخواست تخصیص سفارش برای تأیید مدیر اصلی ثبت شد.");
    await load(); setBusy(null);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase(); if (!q) return orders;
    return orders.filter(order => [order.tracking_code, order.profile?.full_name, order.profile?.phone, order.services?.title].some(v => String(v || "").toLowerCase().includes(q)));
  }, [orders, search]);

  return <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6 text-[var(--text)]">
    <div className="mx-auto max-w-7xl space-y-6">
      <SectionHeader title="مدیریت سفارشات" description="مشاهده سفارش‌های قابل انجام و درخواست تخصیص سفارش به شما" />
      {message && <GlassPanel className="p-4 border-[var(--primary)]/20 bg-[var(--primary)]/5 text-sm leading-7">{message}</GlassPanel>}
      <GlassPanel className="p-5"><TusanInput icon="🔍" value={search} onChange={e => setSearch(e.target.value)} placeholder="کد پیگیری، نام مشتری، شماره تماس یا خدمت..." clearable onClear={() => setSearch("")} /></GlassPanel>
      {loading ? <GlassPanel className="p-10 text-center text-[var(--text-muted)]">در حال دریافت سفارش‌ها...</GlassPanel> : filtered.length === 0 ? <GlassPanel className="p-10 text-center"><div className="text-5xl mb-4">📭</div><p className="text-[var(--text-muted)]">سفارش قابل نمایش پیدا نشد.</p></GlassPanel> : <div className="grid gap-4 md:grid-cols-2">
        {filtered.map(order => { const assignedToMe = order.assigned_staff_id === userId; const available = order.assignment_status === "unassigned"; const pending = order.assignment_status === "pending_approval"; return <GlassPanel key={order.id} className="p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-lg">{order.services?.icon || "📋"} {order.services?.title || "خدمت"}</h2><p className="mt-1 text-xs text-[var(--text-muted)]">کد پیگیری: {order.tracking_code || "---"}</p></div><OrderStatus status={order.status} /></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><span className="text-[var(--text-muted)]">مشتری</span><div className="font-bold mt-1">{order.profile?.full_name || order.profile?.phone || "---"}</div></div><div><span className="text-[var(--text-muted)]">مبلغ</span><div className="font-bold mt-1">{Number(order.price || 0).toLocaleString("fa-IR")} تومان</div></div><div><span className="text-[var(--text-muted)]">تخصیص</span><div className="font-bold mt-1">{assignedToMe ? "تخصیص به شما" : pending ? "در انتظار تأیید مدیر اصلی" : order.assignment_status === "assigned" ? "تخصیص یافته" : "آماده درخواست تخصیص"}</div></div><div><span className="text-[var(--text-muted)]">پردازش</span><div className="font-bold mt-1">{order.processing_status || "---"}</div></div></div>
          <div className="mt-5">{assignedToMe ? <div className="rounded-xl bg-[var(--primary)]/10 p-3 text-sm font-bold text-[var(--primary)]">این سفارش به شما تخصیص یافته است.</div> : available ? <TusanButton fullWidth onClick={() => void requestAssignment(order.id)} disabled={busy === order.id}>{busy === order.id ? "در حال ثبت درخواست..." : "درخواست تخصیص سفارش"}</TusanButton> : pending ? <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">درخواست شما ثبت شده و منتظر تأیید مدیر اصلی است.</div> : <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-muted)]">این سفارش در حال حاضر برای درخواست تخصیص در دسترس نیست.</div>}</div>
        </GlassPanel>; })}
      </div>}
    </div>
  </main>;
}
