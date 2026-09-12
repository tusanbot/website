"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

interface Profile { id: string; provider: string; model: string; model_config?: { text?: string; image?: string; video?: string; music?: string; tts?: string }; created_at: string; last_used_at: string | null }
type Source = "personal" | null;
const capabilityLabels: Array<[keyof NonNullable<Profile["model_config"]>, string]> = [["text", "متن و چت"], ["image", "تصویر"], ["video", "ویدیو"], ["music", "موسیقی"], ["tts", "تبدیل متن به صوت"]];

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
      setApiKey(""); setProfile(data.profile); setSource("personal"); setModel(data.profile?.model ?? ""); setMessage("کلید شخصی Gemini با موفقیت فعال شد و مدل هر قابلیت بر اساس دسترسی همین کلید تعیین شد.");
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
      <div className="mb-6"><Link href="/tools" className="text-sm font-bold text-[var(--primary)]">← بازگشت به ابزارها</Link><h1 className="mt-4 text-3xl font-black">دسترسی هوش مصنوعی توسن</h1><p className="mt-2 leading-7 text-[var(--text-muted)]">ورود با Google فقط برای احراز هویت سایت است. هر قابلیت AI بر اساس مدل قابل‌استفاده برای API Key شخصی شما اجرا می‌شود.</p></div>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        {loading ? <div className="py-10 text-center text-sm text-[var(--text-muted)]">در حال بررسی دسترسی...</div> : <>
          {source === "personal" && profile && <>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950"><div className="text-lg font-black">API Key شخصی فعال است ✓</div><p className="mt-2 text-sm">ارائه‌دهنده: Gemini · مدل متنی: {model || profile.model}</p><p className="mt-2 text-xs leading-6">مدل هر قابلیت هنگام اعتبارسنجی کلید از فهرست مدل‌های قابل‌دسترسی همان کلید انتخاب می‌شود؛ بنابراین مدل‌های نامعتبر یا خارج از دسترسی کلید به‌صورت ثابت در ابزارها استفاده نمی‌شوند.</p></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{capabilityLabels.map(([key, label]) => <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3"><div className="text-xs text-[var(--text-muted)]">{label}</div><div className="mt-1 break-all font-mono text-xs font-bold">{profile.model_config?.[key] || "برای این کلید در دسترس نیست"}</div></div>)}</div>
          </>}
          {source === "personal" && profile && <div className="mt-5 flex flex-wrap gap-3"><Link href="/tools" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">رفتن به ابزارهای هوش مصنوعی</Link><button onClick={logout} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold">غیرفعال‌کردن کلید شخصی</button></div>}
          <form onSubmit={submit} className="mt-6 border-t border-[var(--border)] pt-6">
            <h2 className="text-lg font-black">{source === "personal" ? "تعویض API Key" : "فعال‌سازی API Key شخصی"}</h2><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">کلید Gemini خودتان را وارد کنید. سیستم پس از اعتبارسنجی، مدل مناسب هر قابلیت را از مدل‌های مجاز همان کلید انتخاب می‌کند.</p>
            <label className="mt-4 block text-sm font-black">کلید API گوگل Gemini<input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" autoComplete="off" spellCheck={false} placeholder="کلید Gemini را وارد کنید" className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-4 font-mono text-sm outline-none focus:border-[var(--primary)]"/></label>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><b>امنیت:</b> کلید در مرورگر ذخیره نمی‌شود و در URL یا Cookie قرار نمی‌گیرد؛ نسخه ذخیره‌شده در سرور رمزنگاری می‌شود.</div>
            {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}{message && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</div>}
            <button disabled={submitting || !apiKey.trim()} className="mt-5 w-full rounded-2xl bg-[var(--primary)] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "در حال اعتبارسنجی و تشخیص مدل‌ها..." : "فعال‌سازی API Key شخصی"}</button>
          </form>
          {!source && <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-950"><b>بدون دسترسی AI:</b> اگر می‌خواهید از ابزارهای عمومی هوش مصنوعی استفاده کنید، API Key شخصی Gemini خودتان را فعال کنید. اگر با Google وارد سایت شده‌اید نیز همچنان باید کلید شخصی خودتان را داشته باشید.</div>}
        </>}
      </section>
    </div>
  </main>;
}
