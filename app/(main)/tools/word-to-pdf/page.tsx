"use client";

import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";

declare global { interface Window { mammoth?: any } }

function loadMammoth() {
  return new Promise<any>((resolve, reject) => {
    if (window.mammoth) return resolve(window.mammoth);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/mammoth@1.9.1/mammoth.browser.min.js";
    script.onload = () => window.mammoth ? resolve(window.mammoth) : reject(new Error("mammoth unavailable"));
    script.onerror = () => reject(new Error("mammoth load failed"));
    document.head.appendChild(script);
  });
}

export default function WordToPdfPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const convert = async (file: File) => {
    setBusy(true); setError("");
    try {
      const mammoth = await loadMammoth();
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(result.value || "", 175);
      let y = 18;
      for (const line of lines) {
        if (y > 280) { pdf.addPage(); y = 18; }
        pdf.text(line, 195, y, { align: "right" });
        y += 6;
      }
      const base = file.name.replace(/\.docx?$/i, "") || "document";
      pdf.save(`${base}.pdf`);
    } catch (e) {
      console.error(e);
      setError("تبدیل فایل انجام نشد. فایل Word باید DOC یا DOCX معتبر باشد و اتصال اینترنت برای بارگذاری موتور تبدیل لازم است.");
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen page-background px-6 py-12" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black text-[var(--text)]">تبدیل Word به PDF</h1>
        <p className="mt-3 leading-8 text-[var(--text-muted)]">فایل Word را انتخاب کنید و نسخه PDF آن را دریافت کنید. متن سند در مرورگر استخراج و در PDF قرار می‌گیرد.</p>
        <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center transition hover:border-[var(--primary)]/50">
          {busy ? <Loader2 className="animate-spin text-[var(--primary)]" size={42} /> : <FileText className="text-[var(--primary)]" size={42} />}
          <span className="mt-4 font-black text-[var(--text)]">{busy ? "در حال تبدیل..." : "انتخاب فایل Word"}</span>
          <span className="mt-2 text-sm text-[var(--text-muted)]">DOC و DOCX</span>
          <input type="file" accept=".doc,.docx" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && convert(e.target.files[0])} />
        </label>
        {error && <p className="mt-4 rounded-2xl bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--text-muted)]">{error}</p>}
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--text-muted)]">
          <Download className="mb-2 text-[var(--primary)]" size={20} />
          این ابزار برای اسناد متنی ساده مناسب است؛ قالب‌بندی‌های پیچیده، تصاویر و جدول‌های Word ممکن است دقیقاً مانند فایل اصلی منتقل نشوند.
        </div>
      </div>
    </main>
  );
}
