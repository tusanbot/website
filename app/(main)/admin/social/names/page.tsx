"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SocialService } from "@/lib/social/types";

function formatNumber(value: number) {
    return new Intl.NumberFormat("fa-IR").format(value);
}

export default function SocialServiceNamesPage() {
    const [services, setServices] = useState<SocialService[]>([]);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    async function load() {
        setLoading(true);
        const { data, error } = await supabase
            .from("social_services")
            .select("*")
            .order("provider_service_id", { ascending: true });
        if (!error) {
            const rows = (data || []) as SocialService[];
            setServices(rows);
            setDrafts(Object.fromEntries(rows.map((service) => [service.id, service.name])));
        }
        setLoading(false);
    }

    useEffect(() => { void load(); }, []);

    async function save(service: SocialService) {
        const name = (drafts[service.id] || "").trim();
        if (!name) return;
        setSaving(service.id);
        setMessage("");
        const { error } = await supabase.from("social_services").update({ name }).eq("id", service.id);
        if (error) setMessage(`ذخیره نام سرویس «${service.name}» ناموفق بود: ${error.message}`);
        else {
            setServices((items) => items.map((item) => item.id === service.id ? { ...item, name } : item));
            setMessage("نام سرویس با موفقیت ذخیره شد.");
        }
        setSaving(null);
    }

    return (
        <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6 text-[var(--text)]">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <Link href="/admin/social" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] mb-2"><ArrowRight size={16} /> مدیریت خدمات اجتماعی</Link>
                        <h1 className="text-3xl font-black">ویرایش نام سرویس‌ها</h1>
                        <p className="mt-2 text-[var(--text-muted)]">نام نمایشی سرویس را مستقل از نام FJPanel تعیین کنید.</p>
                    </div>
                    <button type="button" onClick={() => void load()} disabled={loading || saving !== null} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-bold disabled:opacity-50"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> بروزرسانی</button>
                </div>

                {message && <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 font-bold">{message}</div>}

                <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    {loading ? <div className="p-10 text-center text-[var(--text-muted)]">در حال دریافت سرویس‌ها...</div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead><tr className="bg-[var(--background)] text-sm"><th className="p-4 text-right">نام نمایشی</th><th className="p-4 text-right">Provider</th><th className="p-4 text-right">شناسه</th><th className="p-4 text-right">محدوده</th><th className="p-4 text-right">عملیات</th></tr></thead>
                                <tbody>
                                    {services.map((service) => (
                                        <tr key={service.id} className="border-t border-[var(--border)]">
                                            <td className="p-3"><input value={drafts[service.id] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [service.id]: event.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[var(--primary)]" /></td>
                                            <td className="p-4">{service.provider}</td>
                                            <td className="p-4 font-mono" dir="ltr">{service.provider_service_id || "—"}</td>
                                            <td className="p-4">{formatNumber(service.min_quantity)} تا {formatNumber(service.max_quantity)}</td>
                                            <td className="p-3"><button type="button" onClick={() => void save(service)} disabled={saving === service.id} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white disabled:opacity-50"><Check size={16} /> {saving === service.id ? "در حال ذخیره..." : "ذخیره"}</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
