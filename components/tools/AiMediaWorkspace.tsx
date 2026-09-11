"use client";

import { useEffect, useState } from "react";

type Mode = "image" | "video" | "music";
type Props = { mode: Mode; title: string; description: string };

export default function AiMediaWorkspace({ mode, title, description }: Props) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState(mode === "video" ? "9:16" : "1:1");
  const [reference, setReference] = useState<File | null>(null);
  const [result, setResult] = useState<{ url?: string; text?: string } | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!operation) return;
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/ai/video?operation=${encodeURIComponent(operation)}`, { cache: "no-store" });
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "خطا در وضعیت تولید ویدیو"); }
        if (contentType.startsWith("video/")) { const blob = await response.blob(); if (!stopped) { setResult({ url: URL.createObjectURL(blob) }); setOperation(null); setLoading(false); setStatus("ویدیو آماده شد."); } return; }
        const data = await response.json();
        if (data.done && data.error) throw new Error(data.error);
        if (!stopped) { setStatus("در حال تولید ویدیو... این فرایند ممکن است چند دقیقه زمان ببرد."); setTimeout(poll, 7000); }
      } catch (e) { if (!stopped) { setError(e instanceof Error ? e.message : "خطای ناشناخته"); setOperation(null); setLoading(false); } }
    };
    poll();
    return () => { stopped = true; };
  }, [operation]);

  async function generate() {
    if (!prompt.trim() || loading) return;
    setLoading(true); setError(""); setResult(null); setStatus("در حال ارسال درخواست...");
    try {
      let file: { mimeType: string; data: string } | undefined;
      if (reference) {
        if (reference.size > 3 * 1024 * 1024) throw new Error("حجم تصویر مرجع نباید بیشتر از ۳ مگابایت باشد.");
        const dataUrl = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error("خواندن تصویر ناموفق بود.")); r.readAsDataURL(reference); });
        const comma = dataUrl.indexOf(","); file = { mimeType: reference.type || "image/jpeg", data: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl };
      }
      const response = await fetch(`/api/ai/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim(), aspectRatio, image: file }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تولید محتوا ناموفق بود.");
      if (mode === "video") { setOperation(data.operation); setStatus("درخواست ثبت شد؛ در حال تولید ویدیو..."); }
      else { setResult({ url: data.url, text: data.text }); setStatus("تولید با موفقیت انجام شد."); setLoading(false); }
    } catch (e) { setError(e instanceof Error ? e.message : "خطای ناشناخته"); setLoading(false); }
  }

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]" dir="rtl">
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><h1 className="text-xl font-black sm:text-2xl">{title}</h1><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{description}</p><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={8} placeholder={mode === "image" ? "مثلاً: یک پوستر حرفه‌ای برای کافی‌نت توسن، سبک مدرن، نورپردازی استودیویی..." : mode === "video" ? "صحنه، حرکت دوربین، سوژه، نور، سبک و نسبت تصویر را دقیق توضیح دهید..." : "سبک موسیقی، سازها، حال‌وهوا، سرعت، خواننده یا بی‌کلام بودن و مدت تقریبی را بنویسید..."} className="mt-4 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm leading-7 outline-none focus:border-[var(--primary)]" /><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">نسبت تصویر/ویدیو<select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm"><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option></select></label>{(mode === "image" || mode === "music") && <label className="text-xs font-bold">تصویر مرجع (اختیاری)<input type="file" accept="image/*" onChange={(e) => setReference(e.target.files?.[0] || null)} className="mt-2 block w-full text-xs" /></label>}</div>{mode === "video" && <div className="mt-3 rounded-xl bg-[var(--surface-secondary)] p-3 text-xs leading-6 text-[var(--text-muted)]">ویدیوهای Veo فعلاً کوتاه هستند و با صدای تولیدشده توسط مدل ارائه می‌شوند.</div>}{error && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-6 text-red-600">{error}</div>}{status && !error && <div className="mt-3 rounded-xl bg-[var(--primary)]/5 p-3 text-xs leading-6 text-[var(--text-muted)]">{status}</div>}<button type="button" onClick={generate} disabled={loading || !prompt.trim()} className="mt-4 w-full rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{loading ? "در حال پردازش..." : `تولید ${mode === "image" ? "تصویر" : mode === "video" ? "ویدیو" : "موسیقی"}`}</button></div>
    <div className="min-h-[420px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><div className="text-sm font-black">خروجی</div>{result?.url && mode === "image" && <img src={result.url} alt="خروجی تولیدشده با هوش مصنوعی" className="mt-4 w-full rounded-2xl border border-[var(--border)]" />}{result?.url && mode === "video" && <video src={result.url} controls className="mt-4 w-full rounded-2xl" />}{result?.url && mode === "music" && <audio src={result.url} controls className="mt-4 w-full" />}{result?.text && <div className="mt-4 whitespace-pre-wrap text-xs leading-7">{result.text}</div>}{!result && <div className="mt-16 text-center text-sm leading-7 text-[var(--text-muted)]">خروجی اینجا نمایش داده می‌شود.</div>}</div>
  </div>;
}
