"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Package, RefreshCw, Settings2, Wifi, WifiOff, Pencil, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SocialOrder, SocialPlatform, SocialService } from "@/lib/social/types";

interface SyncResult { success?: boolean; provider?: string; received?: number; synced?: number; skipped?: number; syncedAt?: string; error?: string; }

export default function SocialAdminPage() {
    const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
    const [services, setServices] = useState<SocialService[]>([]);
    const [orders, setOrders] = useState<SocialOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [savingName, setSavingName] = useState(false);

    async function load() {
        setLoading(true);
        const [{ data: platformData }, { data: serviceData }, { data: orderData }] = await Promise.all([
            supabase.from("social_platforms").select("*").order("sort_order"),
            supabase.from("social_services").select("*").order("sort_order"),
            supabase.from("social_orders").select("*").order("created_at", { ascending: false }).limit(50),
        ]);
        setPlatforms((platformData || []) as SocialPlatform[]);
        setServices((serviceData || []) as SocialService[]);
        setOrders((orderData || []) as SocialOrder[]);
        setLoading(false);
    }

    useEffect(() => {
        void load();
        const stored = window.localStorage.getItem("tusan_social_last_sync");
        if (stored) setLastSync(stored);
    }, []);

    async function syncServices() {
        if (syncing) return;
        setSyncing(true); setSyncResult(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) { setSyncResult({ error: "جلسه کاربری معتبر نیست. دوباره وارد حساب مدیریت شوید." }); return; }
            const response = await fetch("/api/social/sync", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, cache: "no-store" });
            const result = (await response.json()) as SyncResult;
            if (!response.ok) throw new Error(result.error || `خطای HTTP ${response.status}`);
            const timestamp = result.syncedAt || new Date().toISOString();
            setSyncResult(result); setLastSync(timestamp); window.localStorage.setItem("tusan_social_last_sync", timestamp); await load();
        } catch (error) {
            setSyncResult({ error: error instanceof Error ? error.message : "خطای ناشناخته هنگام همگام‌سازی" });
        } finally { setSyncing(false); }
    }

    function startEditing(service: SocialService) { setEditingId(service.id); setEditingName(service.name || ""); }
    function cancelEditing() { setEditingId(null); setEditingName(""); }

    async function saveName(serviceId: string) {
        const name = editingName.trim();
        if (!name) { alert("نام نمایشی خدمت را وارد کنید."); return; }
        setSavingName(true);
        const { error } = await supabase.from("social_services").update({ name }).eq("id", serviceId);
        if (error) { alert(`خطا در ذخیره نام خدمت: ${error.message}`); setSavingName(false); return; }
        setServices((current) => current.map((service) => service.id === serviceId ? { ...service, name } : service));
        cancelEditing(); setSavingName(false);
    }

    const activeServices = useMemo(() => services.filter((service) => service.is_active).length, [services]);
    const activeOrders = useMemo(() => orders.filter((order) => ["pending", "awaiting_payment", "paid", "processing", "partial"].includes(order.status)).length, [orders]);

    return (
        <main dir="rtl" className="min-h-screen page-background text-[var(--text)] p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] mb-2"><ArrowRight size={16} /> پنل مدیریت</Link>
                        <h1 className="text-3xl font-black">مدیریت خدمات شبکه‌های اجتماعی</h1>
                        <p className="mt-2 text-[var(--text-muted)]">کاتالوگ، نام نمایشی سرویس‌ها، همگام‌سازی و سفارش‌های این ماژول را مدیریت کنید.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => void load()} disabled={loading || syncing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-bold hover:border-[var(--primary)] disabled:opacity-50"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> بروزرسانی</button>
                        <button onClick={() => void syncServices()} disabled={syncing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 font-bold shadow-sm hover:opacity-90 disabled:opacity-50"><RefreshCw size={17} className={syncing ? "animate-spin" : ""} /> {syncing ? "در حال همگام‌سازی..." : "همگام‌سازی خدمات FJPanel"}</button>
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {syncResult?.error ? <WifiOff className="text-red-500" size={21} /> : <Wifi className="text-green-500" size={21} />}
                        <div><div className="font-bold">اتصال سرویس‌دهنده</div><div className="text-sm text-[var(--text-muted)]">FJPanel · API Key فقط در سمت سرور استفاده می‌شود</div></div>
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">آخرین همگام‌سازی: <span className="font-bold text-[var(--text)]">{lastSync ? new Date(lastSync).toLocaleString("fa-IR") : "هنوز انجام نشده"}</span></div>
                </div>

                {syncResult && <div className={`rounded-2xl border p-4 ${syncResult.error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>{syncResult.error ? <div className="font-bold">همگام‌سازی ناموفق بود: {syncResult.error}</div> : <div className="space-y-1"><div className="font-bold">همگام‌سازی با موفقیت انجام شد.</div><div className="text-sm">دریافت‌شده: {Number(syncResult.received || 0).toLocaleString("fa-IR")} · ثبت/به‌روزرسانی: {Number(syncResult.synced || 0).toLocaleString("fa-IR")} · ردشده: {Number(syncResult.skipped || 0).toLocaleString("fa-IR")}</div></div>}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Stat icon={<Settings2 size={20} />} title="پلتفرم‌ها" value={platforms.length} />
                    <Stat icon={<CheckCircle2 size={20} />} title="سرویس‌های فعال" value={activeServices} />
                    <Stat icon={<Package size={20} />} title="سفارش‌های فعال" value={activeOrders} />
                </div>

                <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)]"><h2 className="font-black text-xl">کاتالوگ سرویس‌ها</h2><p className="text-sm text-[var(--text-muted)] mt-1">نام ستون «نام نمایشی» همان نامی است که در سایت به مشتری نمایش داده می‌شود و می‌تواند مستقل از نام FJPanel تغییر کند.</p></div>
                    {loading ? <div className="p-10 text-center text-[var(--text-muted)]">در حال دریافت...</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px]"><thead><tr className="bg-[var(--background)] text-sm"><th className="p-4 text-right">نام نمایشی</th><th className="p-4 text-right">نام FJPanel</th><th className="p-4 text-right">Provider</th><th className="p-4 text-right">شناسه Provider</th><th className="p-4 text-right">محدوده</th><th className="p-4 text-right">وضعیت</th><th className="p-4 text-right">عملیات</th></tr></thead><tbody>{services.map((service) => { const editing = editingId === service.id; return <tr key={service.id} className="border-t border-[var(--border)]"><td className="p-4 font-bold min-w-[260px]">{editing ? <input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[var(--primary)]" /> : service.name}</td><td className="p-4 text-sm text-[var(--text-muted)] max-w-[260px]">{service.name}</td><td className="p-4">{service.provider}</td><td className="p-4" dir="ltr">{service.provider_service_id || "هنوز Sync نشده"}</td><td className="p-4">{service.min_quantity.toLocaleString("fa-IR")} تا {service.max_quantity.toLocaleString("fa-IR")}</td><td className="p-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${service.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{service.is_active ? "فعال" : "غیرفعال"}</span></td><td className="p-4"><div className="flex gap-2">{editing ? <><button onClick={() => void saveName(service.id)} disabled={savingName} className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Save size={15} /> ذخیره</button><button onClick={cancelEditing} disabled={savingName} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-bold"><X size={15} /> لغو</button></> : <button onClick={() => startEditing(service)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white"><Pencil size={15} /> ویرایش نام</button>}</div></td></tr>; })}</tbody></table></div>}
                </section>

                <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-5 border-b border-[var(--border)]"><h2 className="font-black text-xl">آخرین سفارش‌های اجتماعی</h2></div>
                    {orders.length === 0 ? <div className="p-10 text-center text-[var(--text-muted)]">هنوز سفارشی ثبت نشده است.</div> : <div className="divide-y divide-[var(--border)]">{orders.map((order) => <div key={order.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><strong>{order.tracking_code}</strong><div className="text-sm text-[var(--text-muted)] mt-1" dir="ltr">{order.link}</div></div><div className="text-sm">{order.quantity.toLocaleString("fa-IR")} عدد · {order.price.toLocaleString("fa-IR")} تومان · <b>{order.status}</b></div></div>)}</div>}
                </section>
            </div>
        </main>
    );
}

function Stat({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center gap-2 text-[var(--primary)]">{icon}<span className="text-sm font-bold text-[var(--text-muted)]">{title}</span></div><div className="mt-3 text-3xl font-black">{value.toLocaleString("fa-IR")}</div></div>;
}
