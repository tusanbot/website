"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

interface Profile { id: string; provider: string; model: string; model_config?: { text?: string; image?: string; video?: string; music?: string; tts?: string }; created_at: string; last_used_at: string | null }
type Source = "personal" | null;
type Capability = "text" | "image" | "video" | "music" | "tts";
const capabilities: Array<[Capability, string]> = [["text", "متن و چت"], ["image", "تولید تصویر"], ["video", "تولید ویدیو"], ["music", "تولید موسیقی"], ["tts", "تبدیل متن به صوت"]];

export default function AiProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [model, setModel] = useState("");
  const [apiKeys, setApiKeys] = useState<Record<Capability, string>>({ text: "", image: "", video: "", music: "", tts: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    try { const response = await fetch("/api/ai/session", { cache: "no-store" }); const data = await response.json(); setProfile(data.profile ?? null); setSource(data.source ?? null); setModel(data.model ?? data.profile?.model ?? ""); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setSubmitting(true);
    try {
      const activeKeys = Object.fromEntries(Object.entries(apiKeys).filter(([, value]) => value.trim())) as Record<string, string>;
      const response = await fetch("/api/ai/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKeys: activeKeys }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "فعال‌سازی انجام نشد.");
      setApiKeys({ text: "", image: "", video: "", music: "", tts: "" }); setProfile(data.profile); setSource("personal"); setModel(data.profile?.model ?? ""); setMessage("کلیدها با موفقیت ثبت شدند؛ هر ابزار از کلید و مدل اختصاصی خودش استفاده می‌کند.");
    } catch (e) { setError(e instanceof Error ? e.message : "خطایی رخ داد."); }
    finally { setSubmitting(false); }
  }

  async function logout() { await fetch("/api/ai/session", { method: "DELETE" }); await refresh(); setMessage("کلیدهای شخصی غیرفعال شدند."); }

  return <main dir="rtl" className="min-h-screen page-background px-4 py-10 sm:px-6"><div className="mx-auto max-w-3xl">
    <div className="mb-6"><Link href="/tools" className="text-sm font-bold text-[var(--primary)]">← بازگشت به ابزارها</Link><h1 className="mt-4 text-3xl font-black">دسترسی هوش مصنوعی توسن</h1><p className="mt-2 leading-7 text-[var(--text-muted)]">برای جلوگیری از برخورد سهمیه ابزارها به یکدیگر، برای هر قابلیت می‌توانید API Key جداگانه Gemini تنظیم کنید.</p></div>
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
      {loading ? <div className="py-10 text-center text-sm text-[var(--text-muted)]">در حال بررسی دسترسی...</div> : <>
        {source === "personal" && profile && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950"><div className="text-lg font-black">API Keyهای شخصی فعال هستند ✓</div><p className="mt-2 text-sm">مدل متنی: {model || profile.model}</p><p className="mt-2 text-xs leading-6">کلیدهای واقعی در مرورگر نمایش داده یا ذخیره نمی‌شوند. اگر برای یک قابلیت کلید جداگانه نگذارید، سیستم از کلید متنی اصلی به‌عنوان fallback استفاده می‌کند.</p></div>}
        {source === "personal" && profile && <div className="mt-4 grid gap-2 sm:grid-cols-2">{capabilities.map(([key, label]) => <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3"><div className="text-xs text-[var(--text-muted)]">{label}</div><div className="mt-1 break-all font-mono text-xs font-bold">{profile.model_config?.[key] || "برای این قابلیت مدل فعال نیست"}</div></div>)}</div>}
        {source === "personal" && profile && <div className="mt-5"><button onClick={logout} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold">غیرفعال‌کردن کلیدها</button></div>}
        <form onSubmit={submit} className="mt-6 border-t border-[var(--border)] pt-6"><h2 className="text-lg font-black">{source === "personal" ? "تعویض یا تکمیل کلیدها" : "تنظیم کلیدهای AI"}</h2><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">برای هر ابزار، کلیدی بگذارید که همان قابلیت را در Google AI Studio فعال و دارای سهمیه باشد.</p>
          <div className="mt-4 grid gap-4">{capabilities.map(([key, label]) => <label key={key} className="block text-sm font-black">{label}<input value={apiKeys[key]} onChange={e => setApiKeys(current => ({ ...current, [key]: e.target.value }))} type="password" autoComplete="off" spellCheck={false} placeholder={`API Key مخصوص ${label} (اختیاری)`} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-4 font-mono text-sm outline-none focus:border-[var(--primary)]"/></label>)}</div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><b>نکته:</b> تغییر مدل سهمیه Google را افزایش نمی‌دهد؛ اگر سهمیه یک Key تمام شده، برای همان ابزار Key پروژه دیگری را تنظیم کنید.</div>
          {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}{message && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</div>}
          <button disabled={submitting || !Object.values(apiKeys).some(value => value.trim())} className="mt-5 w-full rounded-2xl bg-[var(--primary)] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "در حال اعتبارسنجی کلیدها و تشخیص مدل‌ها..." : "ذخیره کلیدهای AI"}</button>
        </form>
      </>}
    </section>
  </div></main>;
}
