"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, RotateCcw, Upload } from "lucide-react";

type PdfTextItem = { str?: string; transform?: number[]; width?: number; height?: number };
type PdfTextContent = { items: PdfTextItem[] };
type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<unknown> };
  getTextContent?: () => Promise<PdfTextContent>;
};
type PdfDocument = { numPages: number; getPage: (page: number) => Promise<PdfPage> };
type PdfJs = { GlobalWorkerOptions: { workerSrc: string }; getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> } };
type DocxApi = {
  Document: new (options: any) => any;
  Packer: { toBlob: (document: any) => Promise<Blob> };
  Paragraph: new (options: any) => any;
  TextRun: new (options: any) => any;
  Table: new (options: any) => any;
  TableRow: new (options: any) => any;
  TableCell: new (options: any) => any;
  WidthType: { AUTO: string; PERCENTAGE: string; DXA: string };
};
type OcrApi = { createWorker: (langs?: string, oem?: number, options?: { logger?: (message: { status?: string; progress?: number }) => void }) => Promise<any> };
type BrowserLibraries = { pdfjsLib?: PdfJs; docx?: DocxApi; Tesseract?: OcrApi };
const getLibraries = () => window as unknown as BrowserLibraries;

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const DOCX_URL = "https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js";
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = globalThis.document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`)), { once: true });
      return;
    }
    const script = globalThis.document.createElement("script");
    script.id = id; script.src = src; script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`));
    globalThis.document.head.appendChild(script);
  });
}

function normalizePersian(value: string) {
  return value.normalize("NFKC")
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/ۀ/g, "هٔ")
    .replace(/[\u200c\u200d]/g, "\u200c").replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ").trim();
}

function formatBytes(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`; }
function textLooksUseful(text: string) { return text.replace(/\s/g, "").length >= 20; }

async function renderPage(page: PdfPage, scale = 2) {
  const viewport = page.getViewport({ scale });
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("امکان آماده‌سازی صفحه PDF وجود ندارد.");
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

type StructuredLine = { y: number; items: Array<{ text: string; x: number; width: number }> };

function getItemPosition(item: PdfTextItem) {
  const t = item.transform || [];
  return { x: Number(t[4] || 0), y: Number(t[5] || 0), width: Math.abs(Number(item.width || 0)) };
}

function buildStructuredLines(items: PdfTextItem[]) {
  const lines: StructuredLine[] = [];
  const sorted = items
    .filter(item => typeof item.str === "string" && item.str.trim())
    .map(item => ({ item, ...getItemPosition(item) }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  for (const current of sorted) {
    const tolerance = Math.max(2, Math.abs(Number(current.item.height || 0)) * 0.55);
    let line = lines.find(candidate => Math.abs(candidate.y - current.y) <= tolerance);
    if (!line) { line = { y: current.y, items: [] }; lines.push(line); }
    line.items.push({ text: normalizePersian(current.item.str || ""), x: current.x, width: current.width });
  }

  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) line.items.sort((a, b) => a.x - b.x);
  return lines;
}

function reconstructLine(items: StructuredLine["items"]) {
  if (!items.length) return "";
  let result = "";
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i];
    const previous = items[i - 1];
    if (previous) {
      const gap = current.x - (previous.x + previous.width);
      const prevText = previous.text;
      const nextText = current.text;
      const needsSpace = gap > Math.max(1.5, Math.min(8, previous.width * 0.18))
        && !/^[،؛:!؟.,)%\]}]/.test(nextText)
        && !/[([{]$/.test(prevText)
        && !/^[\u200c]/.test(nextText);
      if (needsSpace && !result.endsWith(" ")) result += " ";
    }
    result += current.text;
  }
  return normalizePersian(result);
}

function detectSimpleTable(lines: StructuredLine["items"][]) {
  if (lines.length < 3) return null;
  const candidates = lines.map(line => line.filter(item => item.text.trim()).length);
  const multi = candidates.filter(count => count >= 2);
  if (multi.length < 3) return null;
  const mode = [...new Set(multi)].sort((a, b) => b - a)[0];
  if (!mode || mode < 2) return null;
  const ratio = multi.filter(count => count >= Math.max(2, mode - 1)).length / multi.length;
  if (ratio < 0.7) return null;
  return mode;
}

function makeTableRows(lines: StructuredLine["items"][], columnCount: number) {
  return lines.map(line => {
    const sorted = [...line].sort((a, b) => a.x - b.x);
    if (sorted.length === 0) return Array(columnCount).fill("");
    if (sorted.length === columnCount) return sorted.map(item => item.text);
    const cells = Array(columnCount).fill("");
    sorted.forEach((item, index) => { cells[Math.min(index, columnCount - 1)] += `${cells[Math.min(index, columnCount - 1)] ? " " : ""}${item.text}`; });
    return cells;
  });
}

export default function PdfToWordPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "processing" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [structuredPages, setStructuredPages] = useState<Array<{ lines: StructuredLine["items"][]; tableColumns: number | null }>>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"smart" | "text">("smart");

  const reset = () => { setFile(null); setPages(0); setProgress(0); setStatus("idle"); setText(""); setStructuredPages([]); setError(""); if (inputRef.current) inputRef.current.value = ""; };

  const convert = async (selected: File) => {
    if (selected.type !== "application/pdf") { setError("لطفاً فقط فایل PDF انتخاب کنید."); setStatus("error"); return; }
    if (selected.size > 50 * 1024 * 1024) { setError("حداکثر حجم فایل ۵۰ مگابایت است."); setStatus("error"); return; }
    setFile(selected); setError(""); setText(""); setStructuredPages([]); setProgress(2); setStatus("loading");
    let worker: any = null;
    try {
      await loadScript(PDFJS_URL, "tusan-pdfjs");
      const libraries = getLibraries();
      if (!libraries.pdfjsLib) throw new Error("کتابخانه PDF بارگذاری نشد. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.");
      libraries.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      const pdf = await libraries.pdfjsLib.getDocument({ data: await selected.arrayBuffer() }).promise;
      setPages(pdf.numPages); setStatus("processing");
      const chunks: string[] = [];
      const pageLayouts: Array<{ lines: StructuredLine["items"][]; tableColumns: number | null }> = [];

      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        let directText = "";
        let layoutLines: StructuredLine["items"][] = [];
        let tableColumns: number | null = null;
        if (page.getTextContent) {
          const direct = await page.getTextContent();
          const structured = buildStructuredLines(direct.items || []);
          layoutLines = structured.map(line => line.items);
          tableColumns = detectSimpleTable(layoutLines);
          directText = structured.map(line => reconstructLine(line.items)).filter(Boolean).join("\n");
        }

        if (textLooksUseful(directText)) {
          chunks.push(directText);
          pageLayouts.push({ lines: layoutLines, tableColumns });
          setProgress(Math.round((i / pdf.numPages) * 90));
          continue;
        }

        if (!worker) {
          await loadScript(TESSERACT_URL, "tusan-tesseract");
          const ocr = getLibraries();
          if (!ocr.Tesseract) throw new Error("موتور OCR بارگذاری نشد. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.");
          worker = await ocr.Tesseract.createWorker("fas+eng", 1, { logger: message => {
            if (message.status === "recognizing text" && typeof message.progress === "number") setProgress(Math.min(95, Math.round(((i - 1 + message.progress) / pdf.numPages) * 90)));
          }});
          if (worker.setParameters) await worker.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: "6" });
        }
        const canvas = await renderPage(page, 2);
        const result = await worker.recognize(canvas);
        const ocrText = normalizePersian(result?.data?.text || "");
        chunks.push(ocrText);
        pageLayouts.push({ lines: ocrText.split(/\r?\n/).map((line: string) => [{ text: line, x: 0, width: line.length }]), tableColumns: null });
        setProgress(Math.round((i / pdf.numPages) * 90));
      }

      const output = chunks.map((chunk, i) => `صفحه ${i + 1}\n${chunk.trim()}`).join("\n\n").trim();
      setText(output); setStructuredPages(pageLayouts); setProgress(100); setStatus("done");
    } catch (err) {
      console.error("PDF to Word failed", err); setStatus("error"); setError(err instanceof Error ? err.message : "تبدیل فایل انجام نشد.");
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
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = libraries.docx;
      const children: any[] = [];

      if (layoutMode === "smart" && structuredPages.length) {
        structuredPages.forEach((pageLayout, pageIndex) => {
          children.push(new Paragraph({ bidirectional: true, alignment: "right", spacing: { after: 120 }, children: [new TextRun({ text: `صفحه ${pageIndex + 1}`, bold: true })] }));
          if (pageLayout.tableColumns && pageLayout.lines.length >= 3) {
            const rows = makeTableRows(pageLayout.lines, pageLayout.tableColumns);
            children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows.map(row => new TableRow({ children: row.map(cell => new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: "right", spacing: { before: 0, after: 60 }, children: [new TextRun({ text: normalizePersian(cell) })] })] }) })) }) }));
            children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "" })] }));
          } else {
            pageLayout.lines.forEach(line => {
              const lineText = reconstructLine(line);
              if (!lineText) return;
              const isHeading = lineText.length < 90 && !/[.!؟:؛]$/.test(lineText);
              children.push(new Paragraph({ bidirectional: true, alignment: "right", spacing: { before: isHeading ? 120 : 0, after: isHeading ? 180 : 90, line: 320 }, children: [new TextRun({ text: lineText, bold: isHeading })] }));
            });
          }
          if (pageIndex < structuredPages.length - 1) children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: "" })] }));
        });
      } else {
        text.split(/\r?\n/).forEach(line => children.push(new Paragraph({ bidirectional: true, alignment: "right", spacing: { after: 90, line: 320 }, children: [new TextRun({ text: normalizePersian(line) })] })));
      }

      const docxDocument = new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
      const blob = await Packer.toBlob(docxDocument);
      const url = globalThis.URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement("a");
      anchor.href = url; anchor.download = `${file?.name.replace(/\.pdf$/i, "") || "converted"}.docx`;
      globalThis.document.body.appendChild(anchor); anchor.click(); anchor.remove(); globalThis.URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : "ساخت فایل Word انجام نشد."); setStatus("error"); }
  };

  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary)]/10 text-[var(--primary)]"><FileText size={32}/></div><h1 className="mt-5 text-3xl font-black text-[var(--text)] md:text-4xl">تبدیل PDF به Word</h1><p className="mt-3 text-[var(--text-muted)]">تبدیل PDF متنی به Word با حفظ بهتر فاصله‌ها، خطوط، پاراگراف‌ها و جدول‌های ساده.</p></div><div className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"><section className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()} className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center ${dragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}><Upload size={40} className="text-[var(--primary)]"/><strong className="mt-4">PDF را اینجا رها کنید</strong><span className="mt-2 text-sm text-[var(--text-muted)]">یا برای انتخاب فایل کلیک کنید</span><span className="mt-4 text-xs text-[var(--text-muted)]">PDF · حداکثر ۵۰ مگابایت</span><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onInput}/></div>{file && <div className="mt-4 rounded-2xl bg-[var(--surface-secondary)] p-4"><div className="break-all text-sm font-black">{file.name}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{formatBytes(file.size)} · {pages || "در حال بررسی"} صفحه</div></div>}{(status === "loading" || status === "processing") && <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold"><span>در حال تبدیل</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }}/></div><div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin"/> متن و ساختار صفحه در حال تحلیل است...</div></div>}{text && <div className="mt-5 rounded-2xl border border-[var(--border)] p-4"><div className="mb-3 text-sm font-black">نوع خروجی</div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setLayoutMode("smart")} className={`rounded-xl px-3 py-2 text-sm font-bold ${layoutMode === "smart" ? "bg-[var(--primary)] text-white" : "border border-[var(--border)]"}`}>حفظ ساختار</button><button type="button" onClick={() => setLayoutMode("text")} className={`rounded-xl px-3 py-2 text-sm font-bold ${layoutMode === "text" ? "bg-[var(--primary)] text-white" : "border border-[var(--border)]"}`}>متن ساده</button></div></div>}{error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</div>}<div className="mt-5 flex gap-2"><button type="button" onClick={e => { e.stopPropagation(); reset(); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold"><RotateCcw size={16}/> شروع مجدد</button>{text && <button type="button" onClick={e => { e.stopPropagation(); void downloadWord(); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white"><Download size={16}/> دریافت Word</button>}</div></section><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-4"><h2 className="font-black">پیش‌نمایش متن</h2><p className="mt-1 text-xs text-[var(--text-muted)]">متن استخراج‌شده قابل ویرایش است.</p></div><textarea value={text} onChange={e => setText(e.target.value)} placeholder="بعد از انتخاب PDF، متن اینجا نمایش داده می‌شود..." className="min-h-[520px] w-full resize-y rounded-2xl border border-[var(--border)] bg-transparent p-4 text-sm leading-8 outline-none focus:border-[var(--primary)]"/><div className="mt-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4 text-xs leading-6 text-[var(--text-muted)]">حالت «حفظ ساختار» برای PDFهای متنی، فاصله‌ها و خطوط را از مختصات واقعی PDF بازسازی می‌کند و جدول‌های ساده را به جدول Word تبدیل می‌کند. برای PDFهای پیچیده، متن ساده معمولاً پایدارتر است.</div></section></div></div></main>;
}
