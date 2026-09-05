"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

interface Profile { id: string; provider: string; model: string; created_at: string; last_used_at: string | null }
type Source = "google" | "personal" | null;

export default function AiProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/session", { cache: "no-store" });
      const data = await response.json();
      setProfile(data.profile ?? null);
      setSource(data.source ?? null);
      setModel(data.model ?? data.profile?.model ?? "");
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setSubmitting(true);
    try {
      const response = await fetch("/api/ai/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ورود انجام نشد.");
      setApiKey(""); setProfile(data.profile); setSource("personal"); setModel(data.profile?.model ?? ""); setMessage("کلید شخصی Gemini با موفقیت فعال شد.");
    } catch (e) { setError(e instanceof Error ? e.message : "خطایی رخ داد."); }
    finally { setSubmitting(false); }
  }

  async function logout() {
    await fetch("/api/ai/session", { method: "DELETE" });
    await refresh();
    setMessage("نشست API شخصی حذف شد. اگر با Google وارد سایت باشید، دسترسی AI عمومی همچنان فعال می‌ماند.");
  }

  return <main dir="rtl" className="min-h-screen page-background px-4 py-10 sm:px-6">
    <div className="mx-auto max-w-3xl">
      <div className="mb-6"><Link href="/tools" className="text-sm font-bold text-[var(--primary)]">← بازگشت به ابزارها</Link><h1 className="mt-4 text-3xl font-black">دسترسی هوش مصنوعی توسن</h1><p className="mt-2 leading-7 text-[var(--text-muted)]">کاربران واردشده با Google می‌توانند بدون وارد کردن کلید از ابزارهای AI عمومی استفاده کنند. در صورت تمایل، می‌توانید کلید شخصی Gemini خود را جایگزین کنید.</p></div>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        {loading ? <div className="py-10 text-center text-sm text-[var(--text-muted)]">در حال بررسی دسترسی...</div> : <>
          {source === "google" && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"><div className="text-lg font-black">دسترسی Google فعال است ✓</div><p className="mt-2 text-sm leading-7">با حساب Google سایت وارد شده‌اید و می‌توانید از ابزارهای عمومی هوش مصنوعی توسن استفاده کنید. کلید Gemini در مرورگر یا حساب Google شما ذخیره نمی‌شود.</p><p className="mt-1 text-xs">مدل پیش‌فرض: {model || "Gemini"}</p></div>}
          {source === "personal" && profile && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950"><div className="text-lg font-black">کلید شخصی فعال است ✓</div><p className="mt-2 text-sm">ارائه‌دهنده: Gemini · مدل: {profile.model}</p></div>}
          {source === "personal" && profile && <div className="mt-5 flex flex-wrap gap-3"><Link href="/tools" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">رفتن به ابزارهای هوش مصنوعی</Link><button onClick={logout} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold">حذف نشست API شخصی</button></div>}
          {source !== "google" && <form onSubmit={submit} className="mt-6 border-t border-[var(--border)] pt-6">
            <h2 className="text-lg font-black">استفاده با API Key شخصی</h2><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">اگر با Google وارد نشده‌اید یا می‌خواهید مصرف Gemini با کلید خودتان انجام شود، کلید شخصی را وارد کنید.</p>
            <label className="mt-4 block text-sm font-black">کلید API گوگل Gemini<input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" autoComplete="off" spellCheck={false} placeholder="کلید Gemini را وارد کنید" className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-4 font-mono text-sm outline-none focus:border-[var(--primary)]"/></label>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><b>امنیت:</b> کلید در مرورگر ذخیره نمی‌شود و در URL یا Cookie قرار نمی‌گیرد؛ نسخه ذخیره‌شده در سرور رمزنگاری می‌شود.</div>
            {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}{message && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</div>}
            <button disabled={submitting || !apiKey.trim()} className="mt-5 w-full rounded-2xl bg-[var(--primary)] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "در حال اعتبارسنجی..." : "فعال‌سازی API Key شخصی"}</button>
          </form>}
          {!source && <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-950"><b>دسترسی بدون کلید:</b> اگر حساب Google دارید، ابتدا از صفحه ورود سایت با Google وارد شوید؛ سپس ابزارهای AI عمومی بدون API Key شخصی در دسترس خواهند بود.</div>}
          {message && source === "google" && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</div>}
        </>}
      </section>
    </div>
  </main>;
}
