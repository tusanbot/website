"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassPanel, SectionHeader, TusanBadge, TusanButton, TusanStatCard } from "@/components/ui";

type Report = {
  summary: Record<string, number>;
  statusCounts: Record<string, number>;
  topServices: { id: string; title: string; count: number; revenue: number }[];
  daily: { date: string; orders: number; revenue: number }[];
  services: { id: string; title: string }[];
  statuses: string[];
};

const statusLabels: Record<string, string> = {
  registered: "ثبت‌شده",
  checking: "در حال بررسی",
  need_documents: "نیازمند مدارک",
  processing: "در حال انجام",
  ready: "آماده تحویل",
  completed: "تکمیل‌شده",
  cancelled: "لغوشده",
};

const money = (value: number) => `${Number(value || 0).toLocaleString("fa-IR")} تومان`;

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return date.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("all");
  const [service, setService] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from, to, status, service });
      const response = await fetch(`/api/admin/reports?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "خطا در دریافت گزارش");
      setReport(data);
    } catch (err: any) {
      setError(err?.message || "خطا در دریافت گزارش‌ها");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const maxDaily = useMemo(() => Math.max(1, ...(report?.daily || []).map((item) => item.orders)), [report]);

  return (
    <div dir="rtl" className="min-h-screen page-background p-4 sm:p-6 text-[var(--text)]">
      <div className="max-w-6xl mx-auto space-y-6">
        <SectionHeader title="گزارش‌ها" description="گزارش عملیاتی سفارش‌ها، درآمد، کاربران و خدمات" />

        <GlassPanel className="p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <label className="text-sm font-bold">از<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-2 w-full rounded-xl border p-3 bg-[var(--surface)]" /></label>
            <label className="text-sm font-bold">تا<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-2 w-full rounded-xl border p-3 bg-[var(--surface)]" /></label>
            <label className="text-sm font-bold">وضعیت<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-xl border p-3 bg-[var(--surface)]"><option value="all">همه</option>{report?.statuses.map((item) => <option key={item} value={item}>{statusLabels[item] || item}</option>)}</select></label>
            <label className="text-sm font-bold">خدمت<select value={service} onChange={(e) => setService(e.target.value)} className="mt-2 w-full rounded-xl border p-3 bg-[var(--surface)]"><option value="all">همه خدمات</option>{report?.services.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <TusanButton onClick={load} disabled={loading}>{loading ? "در حال دریافت..." : "اعمال فیلتر"}</TusanButton>
          </div>
        </GlassPanel>

        {error ? <GlassPanel className="p-6 text-red-600">{error}</GlassPanel> : loading && !report ? <GlassPanel className="p-10 text-center">در حال دریافت گزارش‌ها...</GlassPanel> : report && <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <TusanStatCard title="سفارش‌ها" value={report.summary.orders.toLocaleString("fa-IR")} icon="📦" />
            <TusanStatCard title="درآمد" value={money(report.summary.revenue)} icon="💰" />
            <TusanStatCard title="نرخ تکمیل" value={`${report.summary.completionRate.toLocaleString("fa-IR")}٪`} icon="✅" />
            <TusanStatCard title="کاربران جدید" value={report.summary.newUsers.toLocaleString("fa-IR")} icon="👥" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <GlassPanel className="p-6 lg:col-span-2">
              <h2 className="font-black text-xl mb-5">روند روزانه سفارش‌ها</h2>
              {report.daily.length === 0 ? <p className="text-[var(--text-muted)]">داده‌ای در این بازه وجود ندارد.</p> : <div className="space-y-3">{report.daily.map((item) => <div key={item.date} className="grid grid-cols-[90px_1fr_80px] gap-3 items-center text-sm"><span>{new Date(item.date).toLocaleDateString("fa-IR", { month: "numeric", day: "numeric" })}</span><div className="h-3 rounded-full bg-[var(--primary)]/10 overflow-hidden"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${(item.orders / maxDaily) * 100}%` }} /></div><strong>{item.orders.toLocaleString("fa-IR")}</strong></div>)}</div>}
            </GlassPanel>

            <GlassPanel className="p-6">
              <h2 className="font-black text-xl mb-5">وضعیت سفارش‌ها</h2>
              <div className="space-y-3">{Object.entries(report.statusCounts).map(([key, count]) => <div key={key} className="flex items-center justify-between"><span>{statusLabels[key] || key}</span><TusanBadge>{count.toLocaleString("fa-IR")}</TusanBadge></div>)}</div>
            </GlassPanel>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassPanel className="p-6"><h2 className="font-black text-xl mb-5">خدمات پُرسفارش</h2><div className="space-y-3">{report.topServices.map((item, index) => <div key={item.id} className="flex items-center justify-between gap-3 border-b last:border-0 pb-3"><span><b>{(index + 1).toLocaleString("fa-IR")}.</b> {item.title}</span><span className="text-sm font-bold">{item.count.toLocaleString("fa-IR")} سفارش</span></div>)}</div></GlassPanel>
            <GlassPanel className="p-6"><h2 className="font-black text-xl mb-5">شاخص‌های تکمیلی</h2><div className="grid grid-cols-2 gap-4"><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><span className="text-sm text-[var(--text-muted)]">میانگین سفارش</span><strong className="block mt-2">{money(report.summary.averageOrder)}</strong></div><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><span className="text-sm text-[var(--text-muted)]">لغوشده</span><strong className="block mt-2">{report.summary.cancelled.toLocaleString("fa-IR")}</strong></div><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><span className="text-sm text-[var(--text-muted)]">پروفایل ناقص</span><strong className="block mt-2">{report.summary.incompleteUsers.toLocaleString("fa-IR")}</strong></div><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><span className="text-sm text-[var(--text-muted)]">خدمات فعال</span><strong className="block mt-2">{report.summary.activeServices.toLocaleString("fa-IR")}</strong></div></div></GlassPanel>
          </div>
        </>}
      </div>
    </div>
  );
}
