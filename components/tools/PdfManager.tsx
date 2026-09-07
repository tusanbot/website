"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { FileDown, FileUp, Loader2, RotateCcw, Scissors, Shrink, Split, Upload } from "lucide-react";
import { jsPDF } from "jspdf";

export type PdfManagerTab = "manager" | "merge" | "split" | "compress" | "image-to-pdf";

type PdfLib = {
  PDFDocument: {
    load: (bytes: ArrayBuffer) => Promise<any>;
    create: () => Promise<any>;
  };
};

const PDFLIB_URL = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";

const tabs = [
  { id: "manager", label: "مدیریت PDF", en: "PDF Manager", href: "/tools/pdf-manager" },
  { id: "merge", label: "ادغام PDF", en: "Merge PDF", href: "/tools/pdf-manager/merge-pdf" },
  { id: "split", label: "تقسیم PDF", en: "Split PDF", href: "/tools/pdf-manager/split-pdf" },
  { id: "compress", label: "کاهش حجم", en: "Compress PDF", href: "/tools/pdf-manager/compress-pdf" },
  { id: "image-to-pdf", label: "عکس به PDF", en: "JPG to PDF", href: "/tools/pdf-manager/image-to-pdf" },
] as const;

function getLib() {
  return window as unknown as { PDFLib?: PdfLib };
}

function loadPdfLib() {
  return new Promise<PdfLib>((resolve, reject) => {
    if (getLib().PDFLib) return resolve(getLib().PDFLib!);
    const id = "tusan-pdf-lib";
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    let done = false;
    const finish = (error?: Error) => { if (done) return; done = true; error ? reject(error) : resolve(getLib().PDFLib!); };
    const timer = window.setTimeout(() => finish(new Error("بارگذاری موتور PDF بیش از حد طول کشید.")), 60000);
    const check = () => { if (getLib().PDFLib) { window.clearTimeout(timer); finish(); } };
    if (existing) { existing.addEventListener("load", check, { once: true }); existing.addEventListener("error", () => finish(new Error("موتور PDF بارگذاری نشد.")), { once: true }); } else {
      const script = document.createElement("script"); script.id = id; script.src = PDFLIB_URL; script.async = true; script.onload = check; script.onerror = () => finish(new Error("موتور PDF بارگذاری نشد.")); document.head.appendChild(script);
    }
  });
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

async function imageToDataUrl(file: File) {
  return new Promise<{ data: string; width: number; height: number }>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error("خواندن تصویر انجام نشد.")); reader.onload = () => { const image = new Image(); image.onload = () => resolve({ data: String(reader.result), width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error("تصویر معتبر نیست.")); image.src = String(reader.result); }; reader.readAsDataURL(file);
  });
}

export default function PdfManager({ activeTab = "manager" }: { activeTab?: PdfManagerTab }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const current = useMemo(() => tabs.find((tab) => tab.id === activeTab) ?? tabs[0], [activeTab]);
  const isPdf = activeTab !== "image-to-pdf";

  const reset = () => { setFiles([]); setPageCount(0); setStartPage(1); setEndPage(1); setStatus("idle"); setMessage(""); if (inputRef.current) inputRef.current.value = ""; };
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => { const next = Array.from(event.target.files || []); if (!next.length) return; setFiles(next); setStatus("idle"); setMessage(""); };

  const inspectPdf = async (file: File) => { const lib = await loadPdfLib(); const doc = await lib.PDFDocument.load(await file.arrayBuffer()); setPageCount(doc.getPageCount()); setStartPage(1); setEndPage(doc.getPageCount()); };

  const merge = async () => {
    if (files.length < 2) throw new Error("برای ادغام حداقل دو فایل PDF انتخاب کنید.");
    const lib = await loadPdfLib(); const output = await lib.PDFDocument.create();
    for (const file of files) { const source = await lib.PDFDocument.load(await file.arrayBuffer()); const pages = await output.copyPages(source, source.getPageIndices()); pages.forEach((page: any) => output.addPage(page)); }
    const bytes = await output.save({ useObjectStreams: true }); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "tusan-merged.pdf");
  };

  const split = async () => {
    if (!files[0]) throw new Error("یک فایل PDF انتخاب کنید.");
    const lib = await loadPdfLib(); const source = await lib.PDFDocument.load(await files[0].arrayBuffer()); const total = source.getPageCount(); const from = Math.max(1, Math.min(startPage, total)); const to = Math.max(from, Math.min(endPage, total));
    const output = await lib.PDFDocument.create(); const pages = await output.copyPages(source, Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i)); pages.forEach((page: any) => output.addPage(page));
    const bytes = await output.save({ useObjectStreams: true }); downloadBlob(new Blob([bytes], { type: "application/pdf" }), `tusan-pages-${from}-${to}.pdf`);
  };

  const compress = async () => {
    if (!files[0]) throw new Error("یک فایل PDF انتخاب کنید.");
    const lib = await loadPdfLib(); const source = await lib.PDFDocument.load(await files[0].arrayBuffer()); const bytes = await source.save({ useObjectStreams: true, addDefaultPage: false });
    const before = files[0].size; const after = bytes.byteLength; setMessage(`حجم اولیه: ${formatBytes(before)} · خروجی: ${formatBytes(after)} · ${after < before ? `${Math.round((1 - after / before) * 100)}٪ کاهش` : "کاهش محسوسی ایجاد نشد"}`);
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "tusan-compressed.pdf");
  };

  const imagePdf = async () => {
    if (!files.length) throw new Error("حداقل یک تصویر انتخاب کنید.");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true }); const pageW = 210; const pageH = 297; const margin = 8;
    for (let i = 0; i < files.length; i++) { const image = await imageToDataUrl(files[i]); if (i) pdf.addPage("a4", "p"); const ratio = Math.min((pageW - margin * 2) / image.width, (pageH - margin * 2) / image.height); const w = image.width * ratio; const h = image.height * ratio; pdf.addImage(image.data, files[i].type === "image/png" ? "PNG" : "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, "FAST"); }
    pdf.save("tusan-images.pdf");
  };

  const run = async () => { setStatus("working"); setMessage("در حال پردازش..."); try { if (activeTab === "merge") await merge(); else if (activeTab === "split") await split(); else if (activeTab === "compress") await compress(); else if (activeTab === "image-to-pdf") await imagePdf(); else throw new Error("از یکی از تب‌های ابزار PDF استفاده کنید."); setStatus("done"); if (activeTab !== "compress") setMessage("فایل آماده شد و دانلود آن آغاز شد."); } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "پردازش فایل انجام نشد."); } };

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => { onFiles(event); const selected = Array.from(event.target.files || []); if (activeTab !== "image-to-pdf" && selected[0]) void inspectPdf(selected[0]).catch((error) => { setStatus("error"); setMessage(error instanceof Error ? error.message : "خواندن PDF انجام نشد."); }); };

  return <div className="space-y-6">
    <div className="overflow-x-auto pb-1"><nav className="flex min-w-max gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-2">{tabs.map((tab) => <a key={tab.id} href={tab.href} aria-current={tab.id === activeTab ? "page" : undefined} className={`rounded-xl px-4 py-3 text-center transition ${tab.id === activeTab ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text)] hover:bg-[var(--surface)]"}`}><span className="block text-sm font-black">{tab.label}</span><span className="mt-0.5 block text-[10px] font-semibold opacity-80">{tab.en}</span></a>)}</nav></div>
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-bold text-[var(--primary)]">{current.en}</div><h2 className="mt-1 text-2xl font-black">{current.label}</h2><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{activeTab === "manager" ? "ابزارهای پرکاربرد PDF را از همین صفحه انتخاب کنید. هر ابزار صفحه اختصاصی و آدرس قابل ایندکس خودش را دارد." : activeTab === "merge" ? "چند فایل PDF را به ترتیب دلخواه در یک فایل واحد ترکیب کنید." : activeTab === "split" ? "یک بازه از صفحات PDF را انتخاب و در یک فایل جدید دریافت کنید." : activeTab === "compress" ? "PDF را بازنویسی و بهینه کنید و حجم قبل و بعد را مقایسه کنید." : "یک یا چند تصویر JPG یا PNG را در یک فایل PDF مرتب و قابل چاپ قرار دهید."}</p></div>{activeTab !== "manager" && <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><RotateCcw size={15}/> پاک کردن</button>}</div>
      {activeTab === "manager" ? <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{tabs.slice(1).map((tab) => <a key={tab.id} href={tab.href} className="rounded-2xl border border-[var(--border)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--primary)]"><div className="text-lg font-black">{tab.label}</div><div className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{tab.en}</div><p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{tab.id === "merge" ? "Merge PDF و ترکیب چند فایل" : tab.id === "split" ? "Split PDF و استخراج صفحات" : tab.id === "compress" ? "Compress PDF و کاهش حجم" : "JPG to PDF و تبدیل تصاویر"}</p></a>)}</div> : <div className="mt-7 space-y-5">
        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] p-6 text-center hover:border-[var(--primary)]"><Upload size={34} className="text-[var(--primary)]"/><strong className="mt-3">{activeTab === "image-to-pdf" ? "تصاویر را انتخاب کنید" : "فایل PDF را انتخاب کنید"}</strong><span className="mt-2 text-xs text-[var(--text-muted)]">{activeTab === "merge" ? "حداقل ۲ فایل PDF" : activeTab === "image-to-pdf" ? "JPG و PNG · امکان انتخاب چند تصویر" : "PDF · پردازش در مرورگر"}</span><input ref={inputRef} type="file" multiple={activeTab === "merge" || activeTab === "image-to-pdf"} accept={activeTab === "image-to-pdf" ? "image/jpeg,image/png" : "application/pdf,.pdf"} className="hidden" onChange={selectFiles}/></label>
        {files.length > 0 && <div className="rounded-2xl border border-[var(--border)] p-4"><div className="text-sm font-black">فایل‌های انتخاب‌شده: {files.length}</div><div className="mt-3 space-y-2">{files.map((file) => <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-secondary)] px-3 py-2 text-xs"><span className="min-w-0 truncate">{file.name}</span><span className="shrink-0 text-[var(--text-muted)]">{formatBytes(file.size)}</span></div>)}</div></div>}
        {activeTab === "split" && pageCount > 0 && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">از صفحه<input type="number" min={1} max={pageCount} value={startPage} onChange={(e) => setStartPage(Number(e.target.value))} className="mt-2 w-full rounded-xl border bg-transparent px-3 py-3"/></label><label className="text-sm font-bold">تا صفحه<input type="number" min={1} max={pageCount} value={endPage} onChange={(e) => setEndPage(Number(e.target.value))} className="mt-2 w-full rounded-xl border bg-transparent px-3 py-3"/></label></div>}
        {status === "error" && <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{message}</div>}
        {status === "done" && <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700">{message}</div>}
        {status === "working" && <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 size={17} className="animate-spin"/> در حال پردازش...</div>}
        <button type="button" disabled={status === "working" || !files.length} onClick={() => void run()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 font-black text-white disabled:opacity-50 sm:w-auto">{status === "working" ? <Loader2 size={18} className="animate-spin"/> : activeTab === "merge" ? <FileDown size={18}/> : activeTab === "split" ? <Split size={18}/> : activeTab === "compress" ? <Shrink size={18}/> : <FileDown size={18}/>} {activeTab === "merge" ? "ادغام و دانلود PDF" : activeTab === "split" ? "جدا کردن صفحات و دانلود" : activeTab === "compress" ? "کاهش حجم و دانلود" : "ساخت PDF و دانلود"}</button>
      </div>}
    </section>
    <div className="grid gap-3 text-xs leading-6 text-[var(--text-muted)] md:grid-cols-3"><div className="rounded-2xl border border-[var(--border)] p-4"><b className="text-[var(--text)]">Privacy</b><br/>در این ابزار فایل برای پردازش به سرور توسن ارسال نمی‌شود و عملیات در مرورگر انجام می‌شود.</div><div className="rounded-2xl border border-[var(--border)] p-4"><b className="text-[var(--text)]">Mobile Friendly</b><br/>طراحی تب‌ها و انتخاب فایل برای استفاده روی موبایل و تبلت بهینه شده است.</div><div className="rounded-2xl border border-[var(--border)] p-4"><b className="text-[var(--text)]">PDF Tools</b><br/>برای PDF به Word و OCR نیز می‌توانید از ابزارهای اختصاصی توسن استفاده کنید.</div></div>
  </div>;
}
