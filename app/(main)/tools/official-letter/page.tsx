"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const types = [
  ["request", "درخواست اداری"], ["general", "نامه اداری عمومی"], ["introduction", "معرفی‌نامه"],
  ["complaint", "شکایت و اعتراض"], ["thanks", "تقدیر و تشکر"], ["leave", "درخواست مرخصی"], ["custom", "نامه سفارشی"],
] as const;
const tones = [
  ["formal", "رسمی"], ["veryFormal", "بسیار رسمی"], ["respectful", "محترمانه و روان"], ["concise", "کوتاه و مستقیم"],
] as const;
type Action = "generate" | "improve" | "formalize" | "shorten";

export default function OfficialLetterPage() {
  const router = useRouter();
  const [type, setType] = useState("request");
  const [tone, setTone] = useState("formal");
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(action: Action) {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/ai/official-letter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, type, tone, recipient, sender, subject, details, text }),
      });
      const data = await response.json() as { text?: string; error?: string };
      if (response.status === 401 && data.error === "AI_PROFILE_REQUIRED") {
        router.push("/tools/ai-profile?returnTo=/tools/official-letter"); return;
      }
      if (!response.ok) throw new Error(data.error || "خطایی رخ داد.");
      setText(data.text || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تولید نامه انجام نشد.");
    } finally { setLoading(false); }
  }

  async function copyText() { if (text) await navigator.clipboard.writeText(text); }
  function printLetter() { window.print(); }
  function onSubmit(event: FormEvent) { event.preventDefault(); void run("generate"); }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 print:p-0" dir="rtl">
      <div className="mb-6 print:hidden">
        <div className="mb-2 text-sm font-medium text-emerald-700">ابزار هوش مصنوعی</div>
        <h1 className="text-3xl font-black text-slate-900">تدوین نامه اداری توسن</h1>
        <p className="mt-2 text-slate-600">با کمک Gemini نامه اداری را از توضیحات شما تهیه یا متن موجود را بازنویسی کنید.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] print:block">
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
          <div><label className="mb-2 block text-sm font-bold">نوع نامه</label><select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-emerald-500">{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label className="mb-2 block text-sm font-bold">لحن نامه</label><select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-emerald-500">{tones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="text-sm font-medium">گیرنده<input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="مثلاً مدیر محترم..." className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
            <label className="text-sm font-medium">فرستنده<input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="نام و سمت" className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
          </div>
          <label className="block text-sm font-medium">موضوع<input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع نامه" className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
          <label className="block text-sm font-medium">توضیحات و خواسته شما<textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={7} placeholder="مثلاً درخواست مرخصی از تاریخ ... به دلیل ..." className="mt-1 w-full resize-y rounded-xl border border-slate-300 p-3" /></label>
          <button disabled={loading} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-60">{loading ? "در حال تدوین..." : "تدوین نامه با هوش مصنوعی"}</button>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </form>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 print:hidden">
            <div className="font-bold">متن نامه</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void run("improve")} disabled={!text || loading} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">بهبود متن</button>
              <button type="button" onClick={() => void run("formalize")} disabled={!text || loading} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">رسمی‌تر</button>
              <button type="button" onClick={() => void run("shorten")} disabled={!text || loading} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">کوتاه‌تر</button>
              <button type="button" onClick={() => void copyText()} disabled={!text} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">کپی</button>
              <button type="button" onClick={printLetter} disabled={!text} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40">چاپ</button>
            </div>
          </div>
          <article className="mx-auto max-w-3xl p-8 sm:p-12 print:max-w-none print:p-0">
            <header className="mb-8 hidden text-center print:block">
              <h1 className="text-2xl font-black">ابزار تدوین نامه اداری توسن</h1>
              {subject && <div className="mt-4 font-bold">موضوع: {subject}</div>}
            </header>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="نامه تولیدشده اینجا نمایش داده می‌شود و می‌توانید آن را ویرایش کنید..." className="min-h-[620px] w-full resize-y border-0 bg-transparent text-[16px] leading-8 outline-none print:hidden" />
            <div aria-label="متن نامه برای چاپ" className="hidden whitespace-pre-wrap break-words text-[16px] leading-8 print:block">{text}</div>
            <footer className="mt-12 border-t pt-3 text-center text-xs text-slate-500 print:block">کافی‌نت توسن | tusancn.ir</footer>
          </article>
        </section>
      </div>

      <style jsx global>{`@media print {
  @page { size: A4; margin: 18mm; }
  html, body { background: white !important; }
  main { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
}`}</style>
    </main>
  );
}
