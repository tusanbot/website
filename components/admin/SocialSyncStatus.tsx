"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type SyncLog = { id: string; success: boolean; received: number; synced: number; skipped: number; error_message: string | null; source: string; created_at: string };

export default function SocialSyncStatus() {
  const [log, setLog] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) return;
      const response = await fetch("/api/admin/social-sync-status", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
      const result = await response.json();
      if (response.ok) setLog(result.logs?.[0] ?? null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-slate-900">وضعیت همگام‌سازی خدمات شبکه‌های اجتماعی</h2>
        <p className="mt-1 text-xs text-slate-500">همگام‌سازی خودکار سرویس‌های FJPanel</p>
      </div>
      <button onClick={() => void load()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""}/> بروزرسانی</button>
    </div>
    {loading ? <div className="mt-5 text-sm text-slate-500">در حال دریافت وضعیت...</div> : !log ? <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">هنوز اجرای موفق یا ناموفق ثبت نشده است.</div> : <>
      <div className="mt-5 flex items-center gap-2">{log.success ? <CheckCircle2 className="text-emerald-600" size={20}/> : <XCircle className="text-red-600" size={20}/>}<span className={`text-sm font-bold ${log.success ? "text-emerald-700" : "text-red-700"}`}>{log.success ? "همگام‌سازی موفق" : "همگام‌سازی ناموفق"}</span><span className="mr-2 inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13}/>{new Date(log.created_at).toLocaleString("fa-IR")}</span></div>
      <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">دریافت‌شده</div><div className="mt-1 font-bold">{log.received.toLocaleString("fa-IR")}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">ثبت/بروزرسانی</div><div className="mt-1 font-bold">{log.synced.toLocaleString("fa-IR")}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">ردشده</div><div className="mt-1 font-bold">{log.skipped.toLocaleString("fa-IR")}</div></div><div className="hidden rounded-xl bg-slate-50 p-3 md:block"><div className="text-xs text-slate-500">منبع</div><div className="mt-1 font-bold">{log.source === "vercel-cron" ? "خودکار" : "دستی"}</div></div></div>
      {!log.success && log.error_message && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">{log.error_message}</div>}
    </>}
  </section>;
}
