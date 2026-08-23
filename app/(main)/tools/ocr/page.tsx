"use client";

import { useCallback, useRef, useState } from "react";
import { Copy, Download, Eye, FileText, Loader2, RotateCcw, Sparkles, Upload } from "lucide-react";

type Status = "idle" | "loading" | "processing" | "done" | "error";
type OcrMode = "fast" | "accurate";
type PrepSettings = { contrast: boolean; threshold: boolean; denoise: boolean; sharpen: boolean };

declare global {
  interface Window {
    Tesseract?: {
      createWorker: (langs?: string, oem?: number, options?: { logger?: (message: { status?: string; progress?: number }) => void }) => Promise<{
        recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string } }>;
        setParameters?: (params: Record<string, string>) => Promise<unknown>;
        terminate: () => Promise<unknown>;
      }>;
    };
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<unknown> } }> }> };
    };
  }
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function loadScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") return resolve();
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`)), { once: true }); return; }
    const script = document.createElement("script"); script.id = id; script.src = src; script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureLibraries(needsPdf: boolean) {
  if (!window.Tesseract) await loadScript("tesseract-js-cdn", TESSERACT_URL);
  if (needsPdf && !window.pdfjsLib) await loadScript("pdfjs-cdn", PDFJS_URL);
}

function preprocessCanvas(source: HTMLCanvasElement, mode: OcrMode, settings: PrepSettings) {
  const canvas = document.createElement("canvas");
  const scale = mode === "accurate" ? 2 : 1.45;
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("مرورگر امکان پردازش تصویر را فراهم نکرد.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = image;
  const contrast = settings.contrast ? (mode === "accurate" ? 1.38 : 1.18) : 1;
  const threshold = mode === "accurate" && settings.threshold;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    if (threshold) gray = gray < 178 ? 0 : 255;
    data[i] = gray; data[i + 1] = gray; data[i + 2] = gray; data[i + 3] = 255;
  }
  if (settings.denoise) {
    const copy = new Uint8ClampedArray(data);
    for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
      const idx = (y * width + x) * 4;
      const neighbors = [copy[idx - 4], copy[idx + 4], copy[idx - width * 4], copy[idx + width * 4], copy[idx]];
      neighbors.sort((a, b) => a - b); const value = neighbors[2];
      data[idx] = value; data[idx + 1] = value; data[idx + 2] = value;
    }
  }
  ctx.putImageData(image, 0, 0);
  if (settings.sharpen) {
    const sharpened = document.createElement("canvas"); sharpened.width = canvas.width; sharpened.height = canvas.height;
    const sctx = sharpened.getContext("2d"); if (sctx) { sctx.filter = "contrast(1.08)"; sctx.drawImage(canvas, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(sharpened, 0, 0); }
  }
  return canvas;
}

function fileToCanvas(file: File) {
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const ctx = c.getContext("2d"); if (!ctx) return reject(new Error("Canvas unavailable")); ctx.drawImage(img, 0, 0); resolve(c); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تصویر قابل خواندن نیست.")); }; img.src = url;
  });
}

function normalizeOcrText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/ۀ/g, "هٔ")
    .replace(/\u00a0/g, " ")
    .split("\n").map((line) => line.replace(/[ \t]+/g, " ").replace(/\s+([،؛,:.!؟?٪%])/g, "$1").replace(/([،؛,:.!؟?٪%])(?=\S)/g, "$1 ").trim()).filter((line, index, arr) => line || (index > 0 && arr[index - 1])).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function cleanOcrText(value: string) {
  return normalizeOcrText(value)
    .replace(/[|¦]{2,}/g, "")
    .replace(/[~`^]{2,}/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/([آ-ی])([0-9])/g, "$1 $2")
    .replace(/([0-9])([آ-ی])/g, "$1 $2")
    .replace(/\s+([\)\]\}»])/g, "$1")
    .replace(/([\(\[\{«])\s+/g, "$1")
    .trim();
}

function canvasPreviewUrl(canvas: HTMLCanvasElement | null) { return canvas ? canvas.toDataURL("image/jpeg", 0.72) : ""; }

export default function OcrToolPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle"); const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState(""); const [rawText, setRawText] = useState(""); const [text, setText] = useState("");
  const [error, setError] = useState(""); const [isDragging, setIsDragging] = useState(false); const [mode, setMode] = useState<OcrMode>("accurate");
  const [settings, setSettings] = useState<PrepSettings>({ contrast: true, threshold: true, denoise: false, sharpen: true });
  const [previewOriginal, setPreviewOriginal] = useState(""); const [previewProcessed, setPreviewProcessed] = useState("");

  const reset = () => { setStatus("idle"); setProgress(0); setFileName(""); setRawText(""); setText(""); setError(""); setPreviewOriginal(""); setPreviewProcessed(""); if (inputRef.current) inputRef.current.value = ""; };

  const runOcr = useCallback(async (file: File) => {
    setError(""); setRawText(""); setText(""); setFileName(file.name); setPreviewOriginal(""); setPreviewProcessed("");
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { setStatus("error"); setError("فقط فایل‌های تصویری و PDF قابل پردازش هستند."); return; }
    if (file.size > MAX_FILE_SIZE) { setStatus("error"); setError("حجم فایل نباید بیشتر از ۲۵ مگابایت باشد."); return; }
    try {
      setStatus("loading"); setProgress(3); await ensureLibraries(file.type === "application/pdf");
      if (!window.Tesseract) throw new Error("موتور OCR بارگذاری نشد.");
      const worker = await window.Tesseract.createWorker("fas+eng", 1, { logger: (message) => { if (message.status === "recognizing text" && typeof message.progress === "number") setProgress(Math.min(96, Math.max(10, Math.round(message.progress * 72)))); } });
      try {
        if (worker.setParameters) await worker.setParameters({ tessedit_pageseg_mode: mode === "accurate" ? "6" : "3", preserve_interword_spaces: "1", language_model_ngram_on: "1" });
        const outputs: string[] = [];
        if (file.type === "application/pdf") {
          if (!window.pdfjsLib) throw new Error("موتور PDF بارگذاری نشد.");
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
          const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
          for (let n = 1; n <= pdf.numPages; n += 1) {
            setStatus("processing"); setProgress(Math.round(((n - 1) / pdf.numPages) * 82) + 8);
            const page = await pdf.getPage(n); const viewport = page.getViewport({ scale: mode === "accurate" ? 2.4 : 1.7 });
            const source = document.createElement("canvas"); source.width = Math.ceil(viewport.width); source.height = Math.ceil(viewport.height); const sctx = source.getContext("2d"); if (!sctx) throw new Error("Canvas unavailable");
            await page.render({ canvasContext: sctx, viewport }).promise;
            if (n === 1) setPreviewOriginal(canvasPreviewUrl(source));
            const prepared = preprocessCanvas(source, mode, settings); if (n === 1) setPreviewProcessed(canvasPreviewUrl(prepared));
            const result = await worker.recognize(prepared); outputs.push(pdf.numPages > 1 ? `--- صفحه ${n} ---\n${result.data.text}` : result.data.text);
          }
        } else {
          const source = await fileToCanvas(file); setPreviewOriginal(canvasPreviewUrl(source)); const prepared = preprocessCanvas(source, mode, settings); setPreviewProcessed(canvasPreviewUrl(prepared));
          const result = await worker.recognize(prepared); outputs.push(result.data.text);
        }
        const raw = outputs.join("\n\n").trim(); setRawText(raw); setText(normalizeOcrText(raw)); setProgress(100); setStatus("done");
      } finally { await worker.terminate(); }
    } catch (err) { console.error("OCR failed", err); setStatus("error"); setError(err instanceof Error ? err.message : "پردازش فایل انجام نشد. لطفاً دوباره تلاش کنید."); }
  }, [mode, settings]);

  const cleanText = () => setText(cleanOcrText(text || rawText));
  const copyText = async () => { if (text) await navigator.clipboard.writeText(text); };
  const downloadTxt = () => { if (!text) return; const blob = new Blob([text], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${fileName.replace(/\.[^.]+$/, "") || "ocr-result"}.txt`; a.click(); URL.revokeObjectURL(url); };
  const downloadWord = () => { if (!text) return; const safe = text.split(/\r?\n/).map((line) => `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "&nbsp;"}</p>`).join(""); const blob = new Blob(["\ufeff", `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Tahoma,sans-serif;direction:rtl;line-height:2;font-size:14px}p{margin:0 0 10px}</style></head><body>${safe}</body></html>`], { type: "application/msword;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${fileName.replace(/\.[^.]+$/, "") || "ocr-result"}.doc`; a.click(); URL.revokeObjectURL(url); };

  return (
    <main dir="rtl" className="min-h-screen page-background py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary)]/10 text-[var(--primary)]"><FileText size={32} /></div><h1 className="mt-5 text-3xl font-black text-[var(--text)] md:text-4xl">تبدیل عکس و PDF به متن</h1><p className="mt-3 text-[var(--text-muted)]">استخراج متن فارسی و انگلیسی از تصویر و PDF، با پیش‌پردازش مخصوص اسناد.</p></div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-secondary)] p-1"><button type="button" onClick={() => setMode("fast")} className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "fast" ? "bg-[var(--surface)] shadow-sm" : "text-[var(--text-muted)]"}`}>⚡ سریع</button><button type="button" onClick={() => setMode("accurate")} className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "accurate" ? "bg-[var(--surface)] shadow-sm" : "text-[var(--text-muted)]"}`}>🎯 دقیق</button></div>
            <div className="mb-4 rounded-2xl bg-[var(--surface-secondary)] p-3"><div className="mb-2 text-sm font-black">بهبود تصویر</div><div className="grid grid-cols-2 gap-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={settings.contrast} onChange={(e) => setSettings((s) => ({ ...s, contrast: e.target.checked }))} /> افزایش کنتراست</label><label className="flex items-center gap-2"><input type="checkbox" checked={settings.threshold} onChange={(e) => setSettings((s) => ({ ...s, threshold: e.target.checked }))} /> سیاه‌وسفید</label><label className="flex items-center gap-2"><input type="checkbox" checked={settings.denoise} onChange={(e) => setSettings((s) => ({ ...s, denoise: e.target.checked }))} /> حذف نویز</label><label className="flex items-center gap-2"><input type="checkbox" checked={settings.sharpen} onChange={(e) => setSettings((s) => ({ ...s, sharpen: e.target.checked }))} /> افزایش وضوح</label></div></div>
            <p className="mb-4 text-xs leading-5 text-[var(--text-muted)]">حالت دقیق برای اسناد فارسی و اسکن‌های متوسط مناسب‌تر است. دست‌خط فارسی ممکن است دقت پایینی داشته باشد.</p>
            <button type="button" disabled={status === "loading" || status === "processing"} onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); void runOcr(e.dataTransfer.files[0]); }} className={`flex min-h-60 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${isDragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}><Upload className="text-[var(--primary)]" size={38} /><strong className="mt-4">{status === "loading" || status === "processing" ? "در حال پردازش..." : "فایل را اینجا رها کنید"}</strong><span className="mt-2 text-sm text-[var(--text-muted)]">یا برای انتخاب فایل کلیک کنید</span><span className="mt-4 text-xs text-[var(--text-muted)]">JPG، PNG، WEBP و PDF · حداکثر ۲۵ مگابایت</span><input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void runOcr(f); }} /></button>
            {fileName && <div className="mt-4 break-all rounded-xl bg-[var(--surface-secondary)] p-3 text-sm font-bold">{fileName}</div>}
            {(status === "loading" || status === "processing") && <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-bold"><span>پیشرفت</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-2 text-xs text-[var(--text-muted)]">پردازش تصویر و تشخیص حروف ممکن است کمی زمان ببرد.</div></div>}
            {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</div>}
            <div className="mt-5 flex gap-2"><button type="button" onClick={reset} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold"><RotateCcw size={16}/> شروع مجدد</button>{text && <button type="button" onClick={cleanText} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white"><Sparkles size={16}/> پاک‌سازی متن</button>}</div>
          </section>
          <section className="space-y-6">
            {(previewOriginal || previewProcessed) && <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 font-black"><Eye size={18}/> پیش‌نمایش پردازش تصویر</div><div className="grid gap-4 md:grid-cols-2">{previewOriginal && <div><div className="mb-2 text-xs font-bold text-[var(--text-muted)]">تصویر اصلی</div><div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-2"><img src={previewOriginal} alt="تصویر اصلی" className="max-h-72 w-full object-contain" /></div></div>}{previewProcessed && <div><div className="mb-2 text-xs font-bold text-[var(--text-muted)]">تصویر پردازش‌شده برای OCR</div><div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-2"><img src={previewProcessed} alt="تصویر پردازش‌شده" className="max-h-72 w-full object-contain" /></div></div>}</div></div>}
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">متن استخراج‌شده</h2><p className="mt-1 text-xs text-[var(--text-muted)]">می‌توانید متن را مستقیماً ویرایش کنید.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!text} onClick={() => void copyText()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-40"><Copy size={16}/> کپی</button><button type="button" disabled={!text} onClick={downloadTxt} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-40"><Download size={16}/> TXT</button><button type="button" disabled={!text} onClick={downloadWord} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-40"><FileText size={16}/> Word</button></div></div><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="متن استخراج‌شده اینجا نمایش داده می‌شود..." className="min-h-[480px] w-full resize-y rounded-2xl border border-[var(--border)] bg-transparent p-4 text-sm leading-8 outline-none focus:border-[var(--primary)]" /></div>
            {status === "done" && <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4 text-sm leading-7 text-[var(--text-muted)]">نکته: برای رسیدها و اسناد چاپی، «حالت دقیق» و افزایش کنتراست معمولاً نتیجه بهتری می‌دهد. OCR دست‌خط فارسی محدودیت ذاتی دارد و ممکن است قابل استفاده نباشد.</div>}
          </section>
        </div>
      </div>
    </main>
  );
}
