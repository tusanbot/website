"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Download, Loader2, RotateCcw, Upload } from "lucide-react";

type PdfJs = { getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<any> }; GlobalWorkerOptions?: { workerSrc: string } };
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function loadPdfJs() {
  return new Promise<PdfJs>((resolve, reject) => {
    const existing = document.getElementById("tusan-pdf-js") as HTMLScriptElement | null;
    const get = () => (window as unknown as { pdfjsLib?: PdfJs }).pdfjsLib;
    if (get()) return resolve(get()!);
    const script = existing ?? document.createElement("script");
    let timer: number;
    const done = (error?: Error) => { window.clearTimeout(timer); error ? reject(error) : get() ? resolve(get()!) : reject(new Error("موتور PDF آماده نشد.")); };
    script.onload = () => done();
    script.onerror = () => done(new Error("بارگذاری موتور PDF انجام نشد."));
    if (!existing) { script.id = "tusan-pdf-js"; script.src = PDFJS_URL; script.async = true; document.head.appendChild(script); }
    timer = window.setTimeout(() => done(new Error("بارگذاری موتور PDF بیش از حد طول کشید.")), 60000);
  });
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function PdfToImage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<Array<{ page: number; url: string }>>([]);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [scale, setScale] = useState(1.5);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const reset = () => { pages.forEach(p => URL.revokeObjectURL(p.url)); setPages([]); setFile(null); setStatus("idle"); setMessage(""); if (inputRef.current) inputRef.current.value = ""; };
  useEffect(() => () => pages.forEach(p => URL.revokeObjectURL(p.url)), [pages]);

  const select = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0]; if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) { setStatus("error"); setMessage("فقط فایل PDF انتخاب کنید."); return; }
    reset(); setFile(next);
  };

  const convert = async () => {
    if (!file) { setStatus("error"); setMessage("ابتدا یک PDF انتخاب کنید."); return; }
    setStatus("working"); setMessage("در حال تبدیل صفحات...");
    try {
      const pdfjs = await loadPdfJs();
      if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      const pdf = await pdfjs.getDocument({ data: (await file.arrayBuffer()).slice(0) }).promise;
      const output: Array<{ page: number; url: string }> = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setMessage(`در حال تبدیل صفحه ${pageNumber} از ${pdf.numPages}...`);
        const page = await pdf.getPage(pageNumber); const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d"); if (!context) throw new Error("مرورگر امکان پردازش تصویر را فراهم نکرد.");
        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("ساخت تصویر انجام نشد.")), format === "png" ? "image/png" : "image/jpeg", 0.92));
        output.push({ page: pageNumber, url: URL.createObjectURL(blob) }); page.cleanup();
      }
      await pdf.destroy(); setPages(output); setStatus("done"); setMessage(`${output.length} صفحه آماده دانلود شد.`);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "تبدیل PDF انجام نشد."); }
  };

  const downloadPage = async (page: { page: number; url: string }) => {
    const blob = await fetch(page.url).then(r => r.blob()); downloadBlob(blob, `tusan-page-${page.page}.${format === "png" ? "png" : "jpg"}`);
  };

  return <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7" dir="rtl">
    <div className="grid gap-5 md:grid-cols-[1fr_280px]">
      <div className="rounded-2xl border border-dashed border-[var(--primary)]/35 bg-[var(--primary)]/5 p-8 text-center">
        <Upload className="mx-auto h-9 w-9 text-[var(--primary)]" />
        <h2 className="mt-3 text-lg font-black">PDF را به تصویر تبدیل کنید</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">هر صفحه به صورت تصویر مستقل PNG یا JPG پردازش می‌شود.</p>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={select} className="hidden" />
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-5 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">انتخاب PDF</button>
        {file && <div className="mt-4 text-xs font-bold text-[var(--text-muted)]">{file.name}</div>}
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
        <label className="block text-sm font-black">فرمت خروجی</label>
        <div className="mt-2 grid grid-cols-2 gap-2">{(["png", "jpeg"] as const).map(v => <button key={v} type="button" onClick={() => setFormat(v)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${format === v ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--surface)]"}`}>{v === "png" ? "PNG" : "JPG"}</button>)}</div>
        <label className="mt-5 block text-sm font-black">کیفیت / اندازه</label>
        <select value={scale} onChange={e => setScale(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"><option value={1}>استاندارد</option><option value={1.5}>بالا</option><option value={2}>خیلی بالا</option></select>
        <button type="button" onClick={convert} disabled={status === "working" || !file} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{status === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} تبدیل PDF به عکس</button>
        <button type="button" onClick={reset} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-bold"><RotateCcw className="h-4 w-4" /> پاک کردن</button>
      </div>
    </div>
    {message && <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${status === "error" ? "bg-red-500/10 text-red-600" : "bg-[var(--primary)]/10 text-[var(--primary)]"}`}>{message}</div>}
    {pages.length > 0 && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pages.map(page => <div key={page.page} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]"><img src={page.url} alt={`صفحه ${page.page}`} className="aspect-[3/4] w-full object-contain bg-white" /><div className="flex items-center justify-between gap-2 p-3"><span className="text-xs font-black">صفحه {page.page}</span><button type="button" onClick={() => downloadPage(page)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-black text-white"><Download className="h-3.5 w-3.5" /> دانلود</button></div></div>)}</div>}
  </div>;
}
