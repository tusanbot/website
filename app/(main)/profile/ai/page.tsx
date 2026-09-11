"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { TusanButton, TusanCard } from "@/components/ui";

type Profile = { id: string; provider: string; model: string; created_at: string; last_used_at: string | null };

export default function AiProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-3.8-flash");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/ai/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setProvider(data.profile.provider);
          setModel(data.profile.model);
        }
      })
      .catch(() => { setError(true); setMessage("دریافت تنظیمات هوش مصنوعی ناموفق بود."); })
      .finally(() => setLoading(false));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/ai/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, model, apiKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ذخیره ناموفق بود.");
      setProfile(data.profile); setApiKey(""); setMessage("تنظیمات هوش مصنوعی با موفقیت ذخیره شد.");
    } catch (e) { setError(true); setMessage(e instanceof Error ? e.message : "ذخیره ناموفق بود."); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm("API Key ذخیره‌شده حذف شود؟")) return;
    const response = await fetch("/api/ai/profile", { method: "DELETE" });
    if (response.ok) { setProfile(null); setApiKey(""); setMessage("تنظیمات هوش مصنوعی حذف شد."); setError(false); }
    else { setError(true); setMessage("حذف تنظیمات ناموفق بود."); }
  }

  return <section className="mx-auto max-w-3xl space-y-5" dir="rtl">
    <div className="flex items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-[var(--primary)]"><Bot size={22} /><span className="text-sm font-bold">هوش مصنوعی</span></div><h1 className="mt-2 text-2xl font-black">پروفایل هوش مصنوعی</h1><p className="mt-2 text-sm text-[var(--text-muted)]">API شخصی خودتان را یک‌بار ثبت کنید و ابزارهای هوش مصنوعی توسن را با حساب خودتان استفاده کنید.</p></div>
      <Link href="/ai"><TusanButton variant="secondary">رفتن به AI Hub</TusanButton></Link>
    </div>

    <TusanCard className="p-5 sm:p-7">
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary)]/5 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-[var(--primary)]" size={22} /><div className="text-sm leading-7"><strong>امنیت کلید</strong><p className="text-[var(--text-muted)]">API Key فقط برای اتصال سروری به Provider استفاده می‌شود و در پاسخ API یا رابط کاربری نمایش داده نمی‌شود.</p></div></div>
      <form onSubmit={save} className="space-y-5">
        <div><label className="mb-2 block text-sm font-bold">ارائه‌دهنده</label><select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none"><option value="gemini">Google Gemini</option><option value="openai" disabled>OpenAI — به‌زودی</option></select></div>
        <div><label className="mb-2 block text-sm font-bold">مدل</label><input value={model} onChange={(e) => setModel(e.target.value)} dir="ltr" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left outline-none" placeholder="gemini-3.8-flash" /></div>
        <div><label className="mb-2 block text-sm font-bold">API Key {profile && <span className="font-normal text-[var(--text-muted)]">(برای تغییر، کلید جدید را وارد کنید)</span>}</label><div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} /><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} dir="ltr" autoComplete="new-password" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-4 text-left outline-none" placeholder={profile ? "••••••••••••••••" : "API Key خود را وارد کنید"} required={!profile} /></div></div>
        {message && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</div>}
        <div className="flex flex-col gap-2 sm:flex-row"><TusanButton type="submit" disabled={saving || loading}>{saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}</TusanButton>{profile && <button type="button" onClick={remove} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"><Trash2 size={17} />حذف API</button>}</div>
      </form>
    </TusanCard>
  </section>;
}
