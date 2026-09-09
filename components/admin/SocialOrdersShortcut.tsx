"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton } from "@/components/ui";

type SocialOrder = {
  id: string;
  tracking_code: string;
  status: string;
  price: number;
  link: string;
  quantity: number;
  created_at: string;
  social_services?: { name: string } | null;
  social_platforms?: { name: string } | null;
};

const labels: Record<string, string> = {
  pending: "در انتظار پرداخت",
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده؛ در انتظار تأیید",
  processing: "در حال پردازش",
  partial: "ناقص",
  completed: "تکمیل‌شده",
  cancelled: "لغوشده",
  failed: "ناموفق",
};

export default function SocialOrdersShortcut() {
  const [orders, setOrders] = useState<SocialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("نشست مدیر یافت نشد.");
      const response = await fetch("/api/admin/social/orders", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "دریافت سفارش‌های اجتماعی ناموفق بود.");
      setOrders((result.orders || []) as SocialOrder[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت سفارش‌های اجتماعی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <GlassPanel className="p-5 mb-6"><div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><RefreshCw size={17} className="animate-spin"/> در حال دریافت سفارش‌های شبکه‌های اجتماعی...</div></GlassPanel>;

  return <GlassPanel className="p-5 mb-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
      <div><h2 className="text-lg font-black">سفارش‌های شبکه‌های اجتماعی</h2><p className="text-sm text-[var(--text-muted)] mt-1">سفارش‌های این بخش جدا از سفارش‌های عادی ثبت می‌شوند و از اینجا قابل مدیریت هستند.</p></div>
      <Link href="/admin/social/orders"><TusanButton size="sm" variant="outline">مدیریت همه سفارش‌های اجتماعی</TusanButton></Link>
    </div>
    {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 p-4 text-sm">{error}</div> : orders.length === 0 ? <div className="rounded-xl border border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">سفارش اجتماعی ثبت‌شده‌ای وجود ندارد.</div> :
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[var(--border)] text-right text-[var(--text-muted)]"><th className="px-3 py-3">کد پیگیری</th><th className="px-3 py-3">سرویس</th><th className="px-3 py-3">تعداد</th><th className="px-3 py-3">مبلغ</th><th className="px-3 py-3">وضعیت</th><th className="px-3 py-3">تاریخ</th><th className="px-3 py-3">عملیات</th></tr></thead><tbody>
        {orders.map(order => <tr key={order.id} className="border-b border-[var(--border)] last:border-0">
          <td className="px-3 py-3 font-bold">{order.tracking_code}</td>
          <td className="px-3 py-3">{order.social_platforms?.name ? `${order.social_platforms.name} / ` : ""}{order.social_services?.name || "—"}</td>
          <td className="px-3 py-3">{Number(order.quantity || 0).toLocaleString("fa-IR")}</td>
          <td className="px-3 py-3 font-bold">{Number(order.price || 0).toLocaleString("fa-IR")} تومان</td>
          <td className="px-3 py-3"><span className="rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 text-xs font-bold">{labels[order.status] || order.status}</span></td>
          <td className="px-3 py-3 text-[var(--text-muted)]">{new Date(order.created_at).toLocaleDateString("fa-IR")}</td>
          <td className="px-3 py-3"><Link href={`/admin/social/orders/${order.id}`}><TusanButton size="sm" variant="outline">مدیریت سفارش</TusanButton></Link>{order.link && <a href={order.link} target="_blank" rel="noreferrer" className="inline-flex mr-2 text-[var(--primary)]" title="مشاهده لینک"><ExternalLink size={17}/></a>}</td>
        </tr>)}
      </tbody></table></div>}
  </GlassPanel>;
}
