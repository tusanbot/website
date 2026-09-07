"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, GripVertical, Loader2, RotateCcw, Trash2, Upload } from "lucide-react";
import { jsPDF } from "jspdf";

type Tab = "manager" | "merge" | "split" | "compress" | "image-to-pdf";
type PdfLib = { PDFDocument: { load: (bytes: ArrayBuffer) => Promise<any>; create: () => Promise<any> } };
type PdfJs = { getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<any> } };
type CompressionPreset = "light" | "balanced" | "strong";

const PDFLIB_URL = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const tabs: Array<{ id: Tab; label: string; en: string; href: string }> = [
  { id: "manager", label: "مدیریت PDF", en: "PDF Manager", href: "/tools/pdf-manager" },
  { id: "merge", label: "ادغام PDF", en: "Merge PDF", href: "/tools/pdf-manager/merge-pdf" },
  { id: "split", label: "تقسیم PDF", en: "Split PDF", href: "/tools/pdf-manager/split-pdf" },
  { id: "compress", label: "کاهش حجم", en: "Compress PDF", href: "/tools/pdf-manager/compress-pdf" },
  { id: "image-to-pdf", label: "عکس به PDF", en: "JPG to PDF", href: "/tools/pdf-manager/image-to-pdf" },
];

function loadScript<T>(id: string, src: string, getValue: () => T | undefined, timeoutMs = 60000) {
  return new Promise<T>((resolve, reject) => {
    const value = getValue();
    if (value) return resolve(value);
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    let done = false;
    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      if (error) reject(error);
      else {
        const loaded = getValue();
        loaded ? resolve(loaded) : reject(new Error("موتور پردازش فایل آماده نشد."));
      }
    };
    const timer = window.setTimeout(() => finish(new Error("بارگذاری موتور پردازش بیش از حد طول کشید.")), timeoutMs);
    const check = () => finish();
    if (existing) {
      existing.addEventListener("load", check, { once: true });
      existing.addEventListener("error", () => finish(new Error("موتور پردازش فایل بارگذاری نشد.")), { once: true });
      window.setTimeout(check, 0);
    } else {
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = check;
      script.onerror = () => finish(new Error("موتور پردازش فایل بارگذاری نشد."));
      document.head.appendChild(script);
    }
  });
}

function loadPdfLib() {
  return loadScript<PdfLib>("tusan-pdf-lib", PDFLIB_URL, () => (window as unknown as { PDFLib?: PdfLib }).PDFLib);
}

function loadPdfJs() {
  return loadScript<PdfJs>("tusan-pdf-js", PDFJS_URL, () => (window as unknown as { pdfjsLib?: PdfJs }).pdfjsLib);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function imageToDataUrl(file: File) {
  return new Promise<{ data: string; width: number; height: number }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("خواندن تصویر انجام نشد."));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve({ data: String(reader.result), width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("تصویر معتبر نیست."));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const compressionPresets: Array<{ id: CompressionPreset; label: string; en: string; scale: number; quality: number; description: string }> = [
  { id: "light", label: "کم", en: "Light", scale: 1.7, quality: 0.82, description: "کیفیت بالاتر، کاهش حجم کمتر" },
  { id: "balanced", label: "متعادل", en: "Balanced", scale: 1.35, quality: 0.68, description: "تعادل مناسب برای استفاده روزمره" },
  { id: "strong", label: "قوی", en: "Strong", scale: 1, quality: 0.52, description: "کاهش حجم بیشتر، کیفیت تصویر پایین‌تر" },
];

export default function PdfManagerV2({ activeTab = "manager" }: { activeTab?: Tab }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>("balanced");
  const [compressionStats, setCompressionStats] = useState<{ before: number; after: number; method: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const current = useMemo(() => tabs.find(t => t.id === activeTab) ?? tabs[0], [activeTab]);

  const reset = () => {
    setFiles([]);
    setDragIndex(null);
    setPageCount(0);
    setStartPage(1);
    setEndPage(1);
    setCompressionStats(null);
    setStatus("idle");
    setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(f => activeTab === "image-to-pdf" ? f.type.startsWith("image/") : f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!valid.length) {
      setStatus("error");
      setMessage(activeTab === "image-to-pdf" ? "فقط JPG و PNG انتخاب کنید." : "فقط فایل PDF انتخاب کنید.");
      return;
    }
    setFiles(prev => activeTab === "merge" || activeTab === "image-to-pdf" ? [...prev, ...valid] : [valid[0]]);
    setCompressionStats(null);
    setStatus("idle");
    setMessage("");
  };

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files || []));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    setFiles(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const remove = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));
  const onReorderDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    move(dragIndex, index);
    setDragIndex(null);
  };

  const inspect = async (file: File) => {
    const lib = await loadPdfLib();
    const doc = await lib.PDFDocument.load(await file.arrayBuffer());
    const count = doc.getPageCount();
    setPageCount(count);
    setStartPage(1);
    setEndPage(count);
  };

  const compressPdf = async (file: File, preset: CompressionPreset) => {
    const pdfjs = await loadPdfJs();
    const workerOptions = pdfjs as PdfJs & { GlobalWorkerOptions?: { workerSrc: string } };
    if (workerOptions.GlobalWorkerOptions) workerOptions.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    const config = compressionPresets.find(item => item.id === preset) ?? compressionPresets[1];
    const sourceBytes = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: sourceBytes.slice(0) }).promise;
    const output = new jsPDF({ unit: "pt", compress: true, putOnlyUsedFonts: true });

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setMessage(`در حال فشرده‌سازی صفحه ${pageNumber} از ${pdf.numPages}...`);
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: config.scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("مرورگر امکان پردازش تصویر PDF را فراهم نکرد.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const imageData = canvas.toDataURL("image/jpeg", config.quality);
      if (pageNumber > 1) output.addPage([baseViewport.width, baseViewport.height]);
      output.setPage(pageNumber);
      output.addImage(imageData, "JPEG", 0, 0, baseViewport.width, baseViewport.height, undefined, "FAST");
      canvas.width = 1;
      canvas.height = 1;
      page.cleanup();
    }

    await pdf.destroy();
    const bytes = output.output("arraybuffer") as ArrayBuffer;
    return new Blob([bytes], { type: "application/pdf" });
  };

  const run = async () => {
    setStatus("working");
    setMessage("در حال پردازش...");
    setCompressionStats(null);
    try {
      if (activeTab === "merge") {
        if (files.length < 2) throw new Error("برای ادغام حداقل دو PDF انتخاب کنید.");
        const lib = await loadPdfLib();
        const output = await lib.PDFDocument.create();
        for (const file of files) {
          const source = await lib.PDFDocument.load(await file.arrayBuffer());
          const pages = await output.copyPages(source, source.getPageIndices());
          pages.forEach((p: any) => output.addPage(p));
        }
        downloadBlob(new Blob([await output.save({ useObjectStreams: true })], { type: "application/pdf" }), "tusan-merged.pdf");
      } else if (activeTab === "split") {
        if (!files[0]) throw new Error("یک PDF انتخاب کنید.");
        const lib = await loadPdfLib();
        const source = await lib.PDFDocument.load(await files[0].arrayBuffer());
        const total = source.getPageCount();
        const from = Math.max(1, Math.min(startPage, total));
        const to = Math.max(from, Math.min(endPage, total));
        const output = await lib.PDFDocument.create();
        const pages = await output.copyPages(source, Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i));
        pages.forEach((p: any) => output.addPage(p));
        downloadBlob(new Blob([await output.save({ useObjectStreams: true })], { type: "application/pdf" }), `tusan-pages-${from}-${to}.pdf`);
      } else if (activeTab === "compress") {
        if (!files[0]) throw new Error("یک PDF انتخاب کنید.");
        const before = files[0].size;
        let compressed = await compressPdf(files[0], compressionPreset);
        let method = "فشرده‌سازی تصویری";

        if (compressed.size >= before) {
          setMessage("نسخه تصویری کوچک‌تر نبود؛ در حال امتحان بهینه‌سازی ساختار PDF...");
          const lib = await loadPdfLib();
          const source = await lib.PDFDocument.load(await files[0].arrayBuffer());
          const structuralBytes = await source.save({ useObjectStreams: true, addDefaultPage: false });
          const structuralBlob = new Blob([structuralBytes], { type: "application/pdf" });
          if (structuralBlob.size < compressed.size) {
            compressed = structuralBlob;
            method = "بهینه‌سازی ساختار PDF";
          }
        }

        const after = compressed.size;
        setCompressionStats({ before, after, method });
        downloadBlob(compressed, "tusan-compressed.pdf");
        setMessage(after < before ? `حجم از ${formatBytes(before)} به ${formatBytes(after)} رسید؛ ${Math.round((1 - after / before) * 100)}٪ کاهش.` : `خروجی جدید ${formatBytes(after)} است؛ کاهش حجم محسوسی ممکن نبود.`);
      } else if (activeTab === "image-to-pdf") {
        if (!files.length) throw new Error("حداقل یک تصویر انتخاب کنید.");
        const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
        const pageW = 210, pageH = 297, margin = 8;
        for (let i = 0; i < files.length; i++) {
          const image = await imageToDataUrl(files[i]);
          if (i) pdf.addPage();
          const ratio = Math.min((pageW - margin * 2) / image.width, (pageH - margin * 2) / image.height);
          const w = image.width * ratio, h = image.height * ratio;
          pdf.addImage(image.data, files[i].type === "image/png" ? "PNG" : "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, "FAST");
        }
        pdf.save("tusan-images.pdf");
      } else {
        throw new Error("یکی از ابزارهای PDF را انتخاب کنید.");
      }
      setStatus("done");
      if (activeTab !== "compress") setMessage("فایل آماده شد و دانلود آن آغاز شد.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "پردازش فایل انجام نشد.");
    }
  };

  return <div className="space-y-6">
    <div className="overflow-x-auto pb-1"><nav className="flex min-w-max gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-2">{tabs.map(tab => <a key={tab.id} href={tab.href} aria-current={tab.id === activeTab ? "page" : undefined} className={`rounded-xl px-4 py-3 text-center transition ${tab.id === activeTab ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text)] hover:bg-[var(--surface)]"}`}><span className="block text-sm font-black">{tab.label}</span><span className="mt-0.5 block text-[10px] font-semibold opacity-80">{tab.en}</span></a>)}</nav></div>
    {activeTab === "manager" ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tabs.slice(1).map(tab => <a key={tab.id} href={tab.href} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--primary)]"><div className="text-lg font-black">{tab.label}</div><div className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{tab.en}</div><p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{tab.id === "merge" ? "ترکیب چند PDF با ترتیب دلخواه" : tab.id === "split" ? "استخراج صفحات دلخواه" : tab.id === "compress" ? "کاهش واقعی حجم با سطح فشرده‌سازی" : "تبدیل چند عکس به PDF"}</p></a>)}</div><div className="grid gap-4 sm:grid-cols-2"><a href="/tools/pdf-to-word" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--primary)]"><div className="font-black">PDF به Word · PDF to Word</div><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">استخراج متن PDF و تبدیل آن به فایل Word قابل ویرایش.</p></a><a href="/tools/ocr" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--primary)]"><div className="font-black">OCR · عکس و PDF به متن</div><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">تشخیص متن فارسی و انگلیسی از تصویر و PDF، ویرایش و خروجی Word.</p></a></div></> : <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-black text-[var(--primary)]">{current.en}</div><h2 className="mt-1 text-2xl font-black">{current.label}</h2><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{activeTab === "merge" ? "چند فایل PDF را به ترتیب دلخواه در یک فایل واحد ترکیب کنید." : activeTab === "split" ? "بازه صفحات مورد نظر را از PDF جدا کنید." : activeTab === "compress" ? "حجم PDF را با فشرده‌سازی تصویری کنترل کنید و حجم قبل و بعد را ببینید." : "چند تصویر را مرتب کنید و به یک PDF قابل چاپ تبدیل کنید."}</p></div><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><RotateCcw size={15}/> پاک کردن همه</button></div>
      {activeTab === "compress" && <div className="mt-5 grid gap-3 sm:grid-cols-3">{compressionPresets.map(preset => <button key={preset.id} type="button" onClick={() => setCompressionPreset(preset.id)} className={`rounded-2xl border p-4 text-right transition ${compressionPreset === preset.id ? "border-[var(--primary)] bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]" : "border-[var(--border)] bg-[var(--surface-secondary)] hover:border-[var(--primary)]"}`}><div className="flex items-center justify-between gap-2"><span className="font-black">{preset.label}</span><span className="text-[10px] font-bold opacity-70">{preset.en}</span></div><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{preset.description}</p></button>)}</div>}
      <div className="mt-7" onDragOver={e => e.preventDefault()} onDrop={onDrop}><label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] p-6 text-center hover:border-[var(--primary)]"><Upload size={34} className="text-[var(--primary)]"/><strong className="mt-3">{activeTab === "image-to-pdf" ? "تصاویر را انتخاب یا اینجا رها کنید" : "PDF را انتخاب یا اینجا رها کنید"}</strong><span className="mt-2 text-xs text-[var(--text-muted)]">{activeTab === "merge" ? "چند PDF · سپس ترتیب را مدیریت کنید" : activeTab === "image-to-pdf" ? "JPG و PNG · چند انتخابی" : "PDF · پردازش داخل مرورگر"}</span><input ref={inputRef} type="file" multiple={activeTab === "merge" || activeTab === "image-to-pdf"} accept={activeTab === "image-to-pdf" ? "image/jpeg,image/png" : "application/pdf,.pdf"} className="hidden" onChange={onFiles}/></label></div>
      {files.length > 0 && <div className="mt-5 rounded-2xl border border-[var(--border)] p-3"><div className="mb-3 flex items-center justify-between gap-2"><span className="text-sm font-black">فایل‌های انتخاب‌شده ({files.length})</span>{(activeTab === "merge" || activeTab === "image-to-pdf") && <span className="text-[11px] text-[var(--text-muted)]">با کشیدن یا دکمه‌ها ترتیب را تغییر دهید</span>}</div><div className="space-y-2">{files.map((file, index) => <div key={`${file.name}-${file.size}-${index}`} draggable={activeTab === "merge" || activeTab === "image-to-pdf"} onDragStart={() => setDragIndex(index)} onDragOver={e => e.preventDefault()} onDrop={() => onReorderDrop(index)} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-2.5"><button type="button" aria-label="جابجایی" className="hidden shrink-0 cursor-grab touch-none p-1 text-[var(--text-muted)] sm:block"><GripVertical size={17}/></button><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{file.name}</div><div className="mt-1 text-[10px] text-[var(--text-muted)]">{formatBytes(file.size)} · صفحه/خروجی {index + 1}</div></div>{(activeTab === "merge" || activeTab === "image-to-pdf") && <div className="flex shrink-0 items-center gap-1"><button type="button" aria-label="انتقال به بالا" disabled={index === 0} onClick={() => move(index, index - 1)} className="rounded-lg border p-1.5 disabled:opacity-30"><ArrowUp size={15}/></button><button type="button" aria-label="انتقال به پایین" disabled={index === files.length - 1} onClick={() => move(index, index + 1)} className="rounded-lg border p-1.5 disabled:opacity-30"><ArrowDown size={15}/></button></div>}<button type="button" aria-label="حذف فایل" onClick={() => remove(index)} className="shrink-0 rounded-lg border p-1.5 text-red-600"><Trash2 size={15}/></button></div>)}</div></div>}
      {activeTab === "split" && files[0] && <button type="button" onClick={() => void inspect(files[0]).catch(e => { setStatus("error"); setMessage(e instanceof Error ? e.message : "خواندن PDF انجام نشد."); })} className="mt-4 rounded-xl border px-4 py-2 text-xs font-bold">بررسی تعداد صفحات</button>}
      {activeTab === "split" && pageCount > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">از صفحه<input type="number" min={1} max={pageCount} value={startPage} onChange={e => setStartPage(Number(e.target.value))} className="mt-2 w-full rounded-xl border bg-transparent px-3 py-3"/></label><label className="text-sm font-bold">تا صفحه<input type="number" min={1} max={pageCount} value={endPage} onChange={e => setEndPage(Number(e.target.value))} className="mt-2 w-full rounded-xl border bg-transparent px-3 py-3"/></label></div>}
      {activeTab === "compress" && compressionStats && <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"><div className="text-[11px] font-bold text-[var(--text-muted)]">حجم اولیه</div><div className="mt-1 text-lg font-black">{formatBytes(compressionStats.before)}</div></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"><div className="text-[11px] font-bold text-[var(--text-muted)]">حجم خروجی</div><div className="mt-1 text-lg font-black">{formatBytes(compressionStats.after)}</div></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"><div className="text-[11px] font-bold text-[var(--text-muted)]">نتیجه</div><div className="mt-1 text-lg font-black">{compressionStats.after < compressionStats.before ? `${Math.round((1 - compressionStats.after / compressionStats.before) * 100)}٪ کاهش` : "بدون کاهش محسوس"}</div></div></div>}
      {activeTab === "compress" && <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50/60 p-4 text-xs leading-6 text-amber-900">برای کاهش واقعی حجم، نسخه فشرده‌شده صفحات را به تصویر JPEG تبدیل می‌کند؛ در نتیجه در فایل خروجی متن قابل جست‌وجو، لایه‌های برداری و برخی قابلیت‌های تعاملی PDF ممکن است حفظ نشوند. اگر این روش حجم را کم نکند، ابزار به‌صورت خودکار نسخه ساختاری را بررسی می‌کند.</div>}
      <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void run()} disabled={status === "working" || !files.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 font-black text-white disabled:opacity-50 sm:w-auto">{status === "working" ? <Loader2 size={18} className="animate-spin"/> : <Download size={18}/>} پردازش و دانلود</button>{message && <span className={`text-sm ${status === "error" ? "text-red-600" : "text-[var(--text-muted)]"}`}>{message}</span>}</div>
      <p className="mt-5 text-xs leading-6 text-[var(--text-muted)]">فایل‌ها برای این ابزارها روی دستگاه شما پردازش می‌شوند و برای عملیات اصلی به سرور توسن ارسال نمی‌شوند.</p>
    </section>}
  </div>;
}
