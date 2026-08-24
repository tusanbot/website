"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

interface Profile { id: string; provider: string; model: string; created_at: string; last_used_at: string | null }

export default function AiProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
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
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setSubmitting(true);
    try {
      const response = await fetch("/api/ai/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ورود انجام نشد.");
      setApiKey(""); setProfile(data.profile); setMessage("کلید Gemini با موفقیت اعتبارسنجی شد و پروفایل شما آماده است.");
    } catch (e) { setError(e instanceof Error ? e.message : "خطایی رخ داد."); }
    finally { setSubmitting(false); }
  }

  async function logout() {
    await fetch("/api/ai/session", { method: "DELETE" });
    setProfile(null); setMessage("از نشست هوش مصنوعی خارج شدید. پروفایل شما حذف نشده است.");
  }

  return <main dir="rtl" className="min-h-screen page-background px-4 py-10 sm:px-6">
    <div className="mx-auto max-w-3xl">
      <div className="mb-6"><Link href="/tools" className="text-sm font-bold text-[var(--primary)]">← بازگشت به ابزارها</Link><h1 className="mt-4 text-3xl font-black">پروفایل هوش مصنوعی توسن</h1><p className="mt-2 leading-7 text-[var(--text-muted)]">برای استفاده از ابزارهای هوش مصنوعی توسن، کلید شخصی Google Gemini خود را وارد کنید. ثبت‌نام جداگانه لازم نیست.</p></div>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        {loading ? <div className="py-10 text-center text-sm text-[var(--text-muted)]">در حال بررسی نشست...</div> : profile ? <div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"><div className="text-lg font-black">پروفایل فعال است ✓</div><p className="mt-2 text-sm">ارائه‌دهنده: Gemini · مدل: {profile.model}</p></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[var(--surface-secondary)] p-4"><span className="text-xs text-[var(--text-muted)]">شناسه پروفایل</span><div className="mt-1 break-all text-sm font-bold">{profile.id}</div></div><div className="rounded-2xl bg-[var(--surface-secondary)] p-4"><span className="text-xs text-[var(--text-muted)]">آخرین استفاده</span><div className="mt-1 text-sm font-bold">{profile.last_used_at ? new Date(profile.last_used_at).toLocaleString("fa-IR") : "—"}</div></div></div>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/tools" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">رفتن به ابزارهای هوش مصنوعی</Link><button onClick={logout} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold">خروج از پروفایل</button></div>
          <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">خروج فقط نشست فعلی را حذف می‌کند؛ پروفایل شما باقی می‌ماند و با همان کلید می‌توانید دوباره وارد شوید.</p>
        </div> : <form onSubmit={submit}>
          <label className="block text-sm font-black">کلید API گوگل Gemini<input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" autoComplete="off" spellCheck={false} placeholder="کلید Gemini را وارد کنید" className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-4 font-mono text-sm outline-none focus:border-[var(--primary)]"/></label>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><b>امنیت:</b> کلید در مرورگر ذخیره نمی‌شود و در URL یا Cookie قرار نمی‌گیرد. فقط برای اعتبارسنجی به سرور ارسال می‌شود؛ نسخه ذخیره‌شده در سرور رمزنگاری می‌شود.</div>
          {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}{message && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</div>}
          <button disabled={submitting || !apiKey.trim()} className="mt-5 w-full rounded-2xl bg-[var(--primary)] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "در حال اعتبارسنجی..." : "ورود با API Key Gemini"}</button>
          <p className="mt-4 text-center text-xs leading-6 text-[var(--text-muted)]">کلید Gemini را می‌توانید از Google AI Studio دریافت کنید. توسن به حساب Google شما دسترسی ندارد.</p>
        </form>}
      </section>
    </div>
  </main>;
}
