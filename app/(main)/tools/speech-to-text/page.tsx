"use client";

import { useRef, useState } from "react";
import { Mic, Square, Copy, Trash2 } from "lucide-react";

export default function SpeechToTextPage() {
  const recognitionRef = useRef<any>(null);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  const toggle = () => {
    const Recognition = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!Recognition) {
      setError("مرورگر شما از تبدیل صوت به متن پشتیبانی نمی‌کند. Chrome یا Edge را امتحان کنید.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "fa-IR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += chunk + " ";
        else interimText += chunk;
      }
      if (finalText) setText((prev) => `${prev}${finalText}`);
      if (interimText) setError(`در حال شنیدن: ${interimText}`); else setError("");
    };
    recognition.onerror = (event: any) => setError(`خطای تشخیص صدا: ${event.error || "نامشخص"}`);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setError("");
  };

  return (
    <main className="min-h-screen page-background px-6 py-12" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black text-[var(--text)]">تبدیل صوت به متن آنلاین</h1>
        <p className="mt-3 leading-8 text-[var(--text-muted)]">صحبت کنید تا متن فارسی شما در همین مرورگر نوشته شود.</p>
        <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={toggle} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 font-black text-white">
              {listening ? <Square size={18} /> : <Mic size={18} />} {listening ? "توقف ضبط" : "شروع تبدیل صوت"}
            </button>
            <button type="button" onClick={() => navigator.clipboard.writeText(text)} disabled={!text} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-3 font-bold disabled:opacity-40"><Copy size={18} /> کپی متن</button>
            <button type="button" onClick={() => setText("")} disabled={!text} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-3 font-bold disabled:opacity-40"><Trash2 size={18} /> پاک کردن</button>
          </div>
          {error && <p className="mt-4 rounded-xl bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-muted)]">{error}</p>}
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="متن تشخیص‌داده‌شده اینجا نمایش داده می‌شود..." className="mt-5 min-h-80 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 leading-8 outline-none focus:border-[var(--primary)]" />
          <p className="mt-3 text-xs text-[var(--text-muted)]">پردازش با قابلیت تشخیص گفتار مرورگر انجام می‌شود و فایل صوتی روی سرور توسن آپلود نمی‌شود.</p>
        </div>
      </div>
    </main>
  );
}
