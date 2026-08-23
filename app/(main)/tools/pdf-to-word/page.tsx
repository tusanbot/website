"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, RotateCcw, Upload } from "lucide-react";

type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<unknown> };
  getTextContent?: () => Promise<{ items: Array<{ str?: string }> }>;
};
type PdfDocument = { numPages: number; getPage: (page: number) => Promise<PdfPage> };
type PdfJs = { GlobalWorkerOptions: { workerSrc: string }; getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> } };
type DocxApi = { Document: new (options: any) => any; Packer: { toBlob: (document: any) => Promise<Blob> }; Paragraph: new (options: any) => any; TextRun: new (options: any) => any };
type OcrApi = { createWorker: (langs?: string, oem?: number, options?: { logger?: (message: { status?: string; progress?: number }) => void }) => Promise<any> };

type BrowserLibraries = { pdfjsLib?: PdfJs; docx?: DocxApi; Tesseract?: OcrApi };
const getLibraries = () => window as unknown as BrowserLibraries;

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
// docx 9.x publishes its browser IIFE as index.iife.js, not build/index.umd.js.
const DOCX_URL = "https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js";
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id; script.src = src; script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`));
    document.head.appendChild(script);
  });
}

function formatBytes(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`; }
function textLooksUseful(text: string) { return text.replace(/\s/g, "").length >= 20; }

async function renderPage(page: PdfPage, scale = 2) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("امکان آماده‌سازی صفحه PDF وجود ندارد.");
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

export default function PdfToWordPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "processing" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const reset = () => { setFile(null); setPages(0); setProgress(0); setStatus("idle"); setText(""); setError(""); if (inputRef.current) inputRef.current.value = ""; };

  const convert = async (selected: File) => {
    if (selected.type !== "application/pdf") { setError("لطفاً فقط فایل PDF انتخاب کنید."); setStatus("error"); return; }
    if (selected.size > 50 * 1024 * 1024) { setError("حداکثر حجم فایل ۵۰ مگابایت است."); setStatus("error"); return; }
    setFile(selected); setError(""); setText(""); setProgress(2); setStatus("loading");
    let worker: any = null;
    try {
      await loadScript(PDFJS_URL, "tusan-pdfjs");
      const libraries = getLibraries();
      if (!libraries.pdfjsLib) throw new Error("کتابخانه PDF بارگذاری نشد. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.");
      libraries.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      const pdf = await libraries.pdfjsLib.getDocument({ data: await selected.arrayBuffer() }).promise;
      setPages(pdf.numPages); setStatus("processing");
      const chunks: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        let directText = "";
        if (page.getTextContent) {
          const direct = await page.getTextContent();
          directText = (direct.items || []).map(item => item.str || "").join(" ").replace(/[ \t]+/g, " ").trim();
        }
        if (textLooksUseful(directText)) {
          chunks.push(directText); setProgress(Math.round((i / pdf.numPages) * 90)); continue;
        }
        if (!worker) {
          await loadScript(TESSERACT_URL, "tusan-tesseract");
          const ocr = getLibraries();
          if (!ocr.Tesseract) throw new Error("موتور OCR بارگذاری نشد. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.");
          worker = await ocr.Tesseract.createWorker("fas+eng", 1, { logger: message => {
            if (message.status === "recognizing text" && typeof message.progress === "number") {
              setProgress(Math.min(95, Math.round(((i - 1 + message.progress) / pdf.numPages) * 90)));
            }
          }});
          if (worker.setParameters) await worker.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: "6" });
        }
        const canvas = await renderPage(page, 2);
        const result = await worker.recognize(canvas);
        chunks.push(result?.data?.text || "");
        setProgress(Math.round((i / pdf.numPages) * 90));
      }
      const output = chunks.map((chunk, i) => `صفحه ${i + 1}\n${chunk.trim()}`).join("\n\n").trim();
      setText(output); setProgress(100); setStatus("done");
    } catch (err) {
      console.error("PDF to Word failed", err); setStatus("error");
      setError(err instanceof Error ? err.message : "تبدیل فایل انجام نشد.");
    } finally { if (worker) await worker.terminate(); }
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => { const selected = e.target.files?.[0]; if (selected) void convert(selected); };
  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); const selected = e.dataTransfer.files?.[0]; if (selected) void convert(selected); };

  const downloadWord = async () => {
    if (!text) return;
    try {
      await loadScript(DOCX_URL, "tusan-docx");
      const libraries = getLibraries();
      if (!libraries.docx) throw new Error("کتابخانه ساخت Word بارگذاری شد اما شیء docx در مرورگر پیدا نشد.");
      const { Document, Packer, Paragraph, TextRun } = libraries.docx;
      const paragraphs = text.split(/\r?\n/).map(line => new Paragraph({ bidirectional: true, alignment: "right", children: [new TextRun({ text: line })] }));
      const document = new Document({ sections: [{ properties: {}, children: paragraphs }] });
      const blob = await Packer.toBlob(document);
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `${file?.name.replace(/\.pdf$/i, "") || "converted"}.docx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err instanceof Error ? err.message : "ساخت فایل Word انجام نشد."); setStatus("error"); }
  };

  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary)]/10 text-[var(--primary)]"><FileText size={32}/></div><h1 className="mt-5 text-3xl font-black text-[var(--text)] md:text-4xl">تبدیل PDF به Word</h1><p className="mt-3 text-[var(--text-muted)]">تبدیل PDF متنی به سند Word و استفاده از OCR برای PDFهای اسکن‌شده.</p></div><div className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"><section className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()} className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center ${dragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}><Upload size={40} className="text-[var(--primary)]"/><strong className="mt-4">PDF را اینجا رها کنید</strong><span className="mt-2 text-sm text-[var(--text-muted)]">یا برای انتخاب فایل کلیک کنید</span><span className="mt-4 text-xs text-[var(--text-muted)]">PDF · حداکثر ۵۰ مگابایت</span><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onInput}/></div>{file && <div className="mt-4 rounded-2xl bg-[var(--surface-secondary)] p-4"><div className="break-all text-sm font-black">{file.name}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{formatBytes(file.size)} · {pages || "در حال بررسی"} صفحه</div></div>}{(status === "loading" || status === "processing") && <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold"><span>در حال تبدیل</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }}/></div><div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin"/> صفحات متنی مستقیم استخراج می‌شوند؛ صفحات اسکن‌شده با OCR پردازش می‌شوند.</div></div>}{error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</div>}<div className="mt-5 flex gap-2"><button type="button" onClick={e => { e.stopPropagation(); reset(); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold"><RotateCcw size={16}/> شروع مجدد</button>{text && <button type="button" onClick={e => { e.stopPropagation(); void downloadWord(); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white"><Download size={16}/> دریافت Word</button>}</div></section><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-4"><h2 className="font-black">پیش‌نمایش متن</h2><p className="mt-1 text-xs text-[var(--text-muted)]">متن استخراج‌شده قابل ویرایش است و قبل از دریافت Word می‌توانید آن را اصلاح کنید.</p></div><textarea value={text} onChange={e => setText(e.target.value)} placeholder="بعد از انتخاب PDF، متن اینجا نمایش داده می‌شود..." className="min-h-[520px] w-full resize-y rounded-2xl border border-[var(--border)] bg-transparent p-4 text-sm leading-8 outline-none focus:border-[var(--primary)]"/><div className="mt-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4 text-xs leading-6 text-[var(--text-muted)]">PDFهای متنی معمولاً با کیفیت بالاتر تبدیل می‌شوند. در PDF اسکن‌شده، صفحات بدون متن قابل استخراج با OCR پردازش می‌شوند و کیفیت خروجی به کیفیت اسکن وابسته است.</div></section></div></div></main>;
}
