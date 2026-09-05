"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

interface Profile { id: string; provider: string; model: string; created_at: string; last_used_at: string | null }
type Source = "personal" | null;

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
      if (!response.ok) throw new Error(data.error || "فعال‌سازی انجام نشد.");
      setApiKey(""); setProfile(data.profile); setSource("personal"); setModel(data.profile?.model ?? ""); setMessage("کلید شخصی Gemini با موفقیت فعال شد.");
    } catch (e) { setError(e instanceof Error ? e.message : "خطایی رخ داد."); }
    finally { setSubmitting(false); }
  }

  async function logout() {
    await fetch("/api/ai/session", { method: "DELETE" });
    await refresh();
    setMessage("کلید شخصی غیرفعال شد. برای استفاده دوباره باید کلید Gemini خودتان را فعال کنید.");
  }

  return <main dir="rtl" className="min-h-screen page-background px-4 py-10 sm:px-6">
    <div className="mx-auto max-w-3xl">
      <div className="mb-6"><Link href="/tools" className="text-sm font-bold text-[var(--primary)]">← بازگشت به ابزارها</Link><h1 className="mt-4 text-3xl font-black">دسترسی هوش مصنوعی توسن</h1><p className="mt-2 leading-7 text-[var(--text-muted)]">ورود با Google فقط برای احراز هویت سایت است. ابزارهای عمومی AI همیشه با API Key شخصی خودتان اجرا می‌شوند.</p></div>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        {loading ? <div className="py-10 text-center text-sm text-[var(--text-muted)]">در حال بررسی دسترسی...</div> : <>
          {source === "personal" && profile && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950"><div className="text-lg font-black">API Key شخصی فعال است ✓</div><p className="mt-2 text-sm">ارائه‌دهنده: Gemini · مدل: {model || profile.model}</p><p className="mt-2 text-xs leading-6">حتی اگر با Google وارد سایت شده باشید، مصرف ابزارهای عمومی AI با کلید شخصی شما انجام می‌شود و از API Key توسن استفاده نمی‌کند.</p></div>}
          {source === "personal" && profile && <div className="mt-5 flex flex-wrap gap-3"><Link href="/tools" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">رفتن به ابزارهای هوش مصنوعی</Link><button onClick={logout} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold">غیرفعال‌کردن کلید شخصی</button></div>}
          <form onSubmit={submit} className="mt-6 border-t border-[var(--border)] pt-6">
            <h2 className="text-lg font-black">{source === "personal" ? "تعویض API Key" : "فعال‌سازی API Key شخصی"}</h2><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">کلید Gemini خودتان را وارد کنید. ورود با Google به‌تنهایی کلید Gemini ایجاد یا تأمین نمی‌کند.</p>
            <label className="mt-4 block text-sm font-black">کلید API گوگل Gemini<input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" autoComplete="off" spellCheck={false} placeholder="کلید Gemini را وارد کنید" className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-4 font-mono text-sm outline-none focus:border-[var(--primary)]"/></label>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><b>امنیت:</b> کلید در مرورگر ذخیره نمی‌شود و در URL یا Cookie قرار نمی‌گیرد؛ نسخه ذخیره‌شده در سرور رمزنگاری می‌شود.</div>
            {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}{message && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</div>}
            <button disabled={submitting || !apiKey.trim()} className="mt-5 w-full rounded-2xl bg-[var(--primary)] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "در حال اعتبارسنجی..." : "فعال‌سازی API Key شخصی"}</button>
          </form>
          {!source && <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-950"><b>بدون دسترسی AI:</b> اگر می‌خواهید از ابزارهای عمومی هوش مصنوعی استفاده کنید، API Key شخصی Gemini خودتان را فعال کنید. اگر با Google وارد سایت شده‌اید نیز همچنان باید کلید شخصی خودتان را داشته باشید.</div>}
        </>}
      </section>
    </div>
  </main>;
}
