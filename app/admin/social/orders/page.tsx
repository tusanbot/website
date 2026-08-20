"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Search, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface SocialOrder {
  id: string;
  tracking_code: string;
  user_id: string;
  service_id: string;
  link: string;
  quantity: number;
  price: number;
  status: string;
  provider_order_id: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  created_at: string;
  social_services?: { name: string; slug: string; provider_service_id: string | null } | null;
  social_platforms?: { name: string; slug: string } | null;
}

const statusLabels: Record<string, string> = {
  pending: "در انتظار پرداخت",
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  processing: "در حال پردازش",
  completed: "تکمیل‌شده",
  partial: "ناقص",
  cancelled: "لغوشده",
  failed: "ناموفق",
};

export default function SocialOrdersAdminPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<SocialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadOrders() {
    setRefreshing(true);
    const { data, error } = await supabase
      .from("social_orders")
      .select("*, social_services(name,slug,provider_service_id), social_platforms(name,slug)")
      .order("created_at", { ascending: false });
    if (!error) setOrders((data || []) as SocialOrder[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { void loadOrders(); }, []);

  async function checkProviderStatus(orderId: string) {
    setChecking(orderId);
    setMessage(null);
    try {
      const response = await fetch("/api/social/provider-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "بررسی وضعیت ناموفق بود");
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: data.status } : order));
      setMessage(`وضعیت سفارش به «${statusLabels[data.status] || data.status}» بروزرسانی شد.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "بررسی وضعیت ناموفق بود.");
    } finally {
      setChecking(null);
    }
  }

  const filtered = orders.filter((o) => {
    const matchesStatus = status === "all" || o.status === status;
    const text = `${o.tracking_code} ${o.link} ${o.social_services?.name || ""} ${o.social_platforms?.name || ""}`.toLowerCase();
    return matchesStatus && text.includes(query.toLowerCase());
  });

  const counts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">سفارش‌های شبکه‌های اجتماعی</h1>
            <p className="mt-1 text-sm text-slate-500">مدیریت سفارش‌ها و وضعیت سرویس‌های اجتماعی</p>
          </div>
          <button onClick={() => void loadOrders()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
            <RefreshCw className={refreshing ? "animate-spin" : ""} size={17} /> بروزرسانی
          </button>
        </header>

        {message && <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{message}</div>}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {["all", "pending", "paid", "processing", "completed"].map((key) => (
            <button key={key} onClick={() => setStatus(key)} className={`rounded-2xl border p-4 text-right transition ${status === key ? "border-emerald-500 bg-white shadow-sm" : "border-slate-200 bg-white"}`}>
              <div className="text-xs text-slate-500">{key === "all" ? "کل سفارش‌ها" : statusLabels[key]}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{key === "all" ? orders.length : counts[key] || 0}</div>
            </button>
          ))}
        </section>

        <div className="relative">
          <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو بر اساس کد پیگیری، سرویس یا لینک..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm outline-none focus:border-emerald-500" />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? <div className="p-10 text-center text-slate-500">در حال دریافت سفارش‌ها...</div> : filtered.length === 0 ? <div className="p-10 text-center text-slate-500">سفارشی پیدا نشد.</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full text-sm">
                <thead className="bg-slate-50 text-right text-xs text-slate-500">
                  <tr><th className="px-4 py-3">کد پیگیری</th><th className="px-4 py-3">پلتفرم</th><th className="px-4 py-3">سرویس</th><th className="px-4 py-3">تعداد</th><th className="px-4 py-3">مبلغ</th><th className="px-4 py-3">وضعیت</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">تاریخ</th><th className="px-4 py-3">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((o) => <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold text-slate-900">{o.tracking_code}</td>
                    <td className="px-4 py-4">{o.social_platforms?.name || "—"}</td>
                    <td className="px-4 py-4">{o.social_services?.name || "—"}</td>
                    <td className="px-4 py-4">{o.quantity.toLocaleString("fa-IR")}</td>
                    <td className="px-4 py-4 font-medium">{Number(o.price).toLocaleString("fa-IR")} تومان</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{statusLabels[o.status] || o.status}</span></td>
                    <td className="px-4 py-4 text-xs text-slate-500">{o.provider_order_id || "—"}</td>
                    <td className="px-4 py-4 text-slate-500">{new Date(o.created_at).toLocaleString("fa-IR")}</td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2"><a href={o.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600"><ExternalLink size={15} /> لینک</a>{o.provider_order_id && <button disabled={checking === o.id} onClick={() => void checkProviderStatus(o.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 disabled:opacity-50"><Activity size={14} className={checking === o.id ? "animate-pulse" : ""} />{checking === o.id ? "در حال بررسی" : "وضعیت"}</button>}</div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
