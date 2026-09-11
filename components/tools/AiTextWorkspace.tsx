"use client";

import { useState } from "react";

type Props = { title: string; description: string; placeholder: string; systemPrompt: string; fileMode?: boolean };

export default function AiTextWorkspace({ title, description, placeholder, systemPrompt, fileMode = false }: Props) {
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!input.trim() && !file) return;
    setLoading(true); setError(""); setResult("");
    try {
      let prompt = `${systemPrompt}\n\nدرخواست کاربر:\n${input.trim()}`;
      let fileData: { mimeType: string; data: string } | undefined;
      if (file) {
        if (file.size > 3 * 1024 * 1024) throw new Error("حجم فایل نباید بیشتر از ۳ مگابایت باشد.");
        const dataUrl = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error("خواندن فایل ناموفق بود.")); r.readAsDataURL(file); });
        const comma = dataUrl.indexOf(",");
        fileData = { mimeType: file.type || "application/octet-stream", data: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl };
        prompt += `\n\nفایل پیوست‌شده را نیز بررسی کن. نام فایل: ${file.name}`;
      }
      const response = await fetch("/api/ai/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, file: fileData }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "دریافت پاسخ ناموفق بود.");
      setResult(data.text || "پاسخی دریافت نشد.");
    } catch (e) { setError(e instanceof Error ? e.message : "خطای ناشناخته"); }
    finally { setLoading(false); }
  }

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]" dir="rtl">
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <h1 className="text-xl font-black sm:text-2xl">{title}</h1><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{description}</p>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={9} placeholder={placeholder} className="mt-4 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm leading-7 outline-none focus:border-[var(--primary)]" />
      {fileMode && <div className="mt-3 rounded-2xl border border-dashed border-[var(--border)] p-4"><label className="block cursor-pointer text-sm font-bold">فایل یا PDF (اختیاری)<input type="file" accept=".pdf,.txt,.md,.csv,.json" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-2 block w-full text-xs" /></label>{file && <div className="mt-2 text-xs text-[var(--text-muted)]">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</div>}</div>}
      {error && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-6 text-red-600">{error}</div>}
      <button type="button" onClick={run} disabled={loading || (!input.trim() && !file)} className="mt-4 w-full rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{loading ? "در حال پردازش..." : "اجرا با هوش مصنوعی"}</button>
    </div>
    <div className="min-h-[360px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><div className="text-sm font-black">خروجی</div>{result ? <div className="mt-4 whitespace-pre-wrap text-sm leading-8">{result}</div> : <div className="mt-16 text-center text-sm leading-7 text-[var(--text-muted)]">نتیجه اینجا نمایش داده می‌شود.</div>}</div>
  </div>;
}
