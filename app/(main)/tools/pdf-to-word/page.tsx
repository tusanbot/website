"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, RotateCcw, Upload } from "lucide-react";

type PdfTextItem = { str?: string; transform?: number[]; width?: number; height?: number; hasEOL?: boolean };
type PdfPage = { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<unknown> }; getTextContent?: () => Promise<{ items: PdfTextItem[] }> };
type PdfDocument = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfJs = { GlobalWorkerOptions: { workerSrc: string }; getDocument: (o: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> } };
type DocxApi = { Document: new (o: any) => any; Packer: { toBlob: (d: any) => Promise<Blob> }; Paragraph: new (o: any) => any; TextRun: new (o: any) => any; Table: new (o: any) => any; TableRow: new (o: any) => any; TableCell: new (o: any) => any; WidthType: { PERCENTAGE: string } };
type OcrApi = { createWorker: (langs?: string, oem?: number, options?: { logger?: (m: { status?: string; progress?: number }) => void }) => Promise<any> };
type BrowserLibraries = { pdfjsLib?: PdfJs; docx?: DocxApi; Tesseract?: OcrApi };
const libs = () => window as unknown as BrowserLibraries;
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const DOCX_URL = "https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js";
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

function loadScript(src: string, id: string) { return new Promise<void>((resolve, reject) => { const old = globalThis.document.getElementById(id) as HTMLScriptElement | null; if (old?.dataset.loaded === "true") return resolve(); if (old) { old.addEventListener("load", () => resolve(), { once: true }); old.addEventListener("error", () => reject(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`)), { once: true }); return; } const s = globalThis.document.createElement("script"); s.id = id; s.src = src; s.async = true; s.onload = () => { s.dataset.loaded = "true"; resolve(); }; s.onerror = () => reject(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`)); globalThis.document.head.appendChild(s); }); }
function normalizeFa(s: string) { return s.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/ۀ/g, "هٔ").replace(/[\u200e\u200f]/g, "").replace(/\u00a0/g, " "); }
function geometry(i: PdfTextItem) { const t = i.transform || []; return { x: Number(t[4] || 0), y: Number(t[5] || 0), width: Math.abs(Number(i.width || 0)), font: Math.max(6, Math.abs(Number(t[0] || t[3] || i.height || 10))) }; }
function useful(s: string) { return s.replace(/\s/g, "").length >= 20; }

type Item = { text: string; x: number; y: number; width: number; font: number; eol?: boolean };
type Line = { y: number; font: number; items: Item[] };

function buildLines(items: PdfTextItem[]) {
  const sorted: Item[] = items.filter(i => (i.str || "").trim()).map(i => { const g = geometry(i); return { text: normalizeFa(i.str || ""), x: g.x, y: g.y, width: g.width, font: g.font, eol: i.hasEOL }; }).sort((a, b) => b.y - a.y);
  const lines: Line[] = [];
  for (const item of sorted) {
    const tolerance = Math.max(2.2, item.font * 0.42);
    let line = lines.find(l => Math.abs(l.y - item.y) <= tolerance);
    if (!line) { line = { y: item.y, font: item.font, items: [] }; lines.push(line); }
    line.items.push(item); line.font = Math.max(line.font, item.font);
  }
  lines.sort((a, b) => b.y - a.y);
  // PDF coordinates increase from left to right. For RTL documents the visual reading order is right-to-left.
  for (const line of lines) line.items.sort((a, b) => b.x - a.x);
  return lines;
}

function reconstruct(line: Line) {
  let out = "";
  for (let n = 0; n < line.items.length; n++) {
    const cur = line.items[n]; const prev = line.items[n - 1];
    if (prev) {
      const gap = prev.x - (cur.x + cur.width);
      const threshold = Math.max(1.5, Math.min(10, Math.max(prev.font, cur.font) * 0.18));
      const punctuation = /^[،؛:!؟.,)%\]}]/.test(cur.text) || /[(\[{]$/.test(prev.text);
      const joiner = /^[\u200c]/.test(cur.text) || /[\u200c]$/.test(prev.text);
      const explicit = /\s$/.test(prev.text);
      if ((gap > threshold || explicit) && !punctuation && !joiner && !out.endsWith(" ")) out += " ";
    }
    out += cur.text;
  }
  return normalizeFa(out).replace(/[ \t]{2,}/g, " ").trim();
}

function paragraphs(lines: Line[]) {
  const result: Array<{ text: string; before: number; after: number; line: number }> = [];
  let previousY: number | null = null;
  let previousFont = 10;
  for (const line of lines) {
    const text = reconstruct(line); if (!text) continue;
    const distance = previousY === null ? 0 : Math.abs(previousY - line.y);
    const normal = Math.max(previousFont, line.font) * 1.35;
    const isParagraphBreak = previousY !== null && distance > normal * 1.9;
    result.push({ text, before: isParagraphBreak ? 180 : 0, after: isParagraphBreak ? 220 : 80, line: 300 });
    previousY = line.y; previousFont = line.font;
  }
  return result;
}

function detectTable(lines: Line[]) {
  if (lines.length < 3) return null;
  const multi = lines.filter(l => l.items.length >= 2);
  if (multi.length < 3) return null;
  const counts = new Map<number, number>(); for (const l of multi) counts.set(l.items.length, (counts.get(l.items.length) || 0) + 1);
  const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]; if (!mode || mode[0] < 2 || mode[1] < 3) return null;
  if (mode[1] / multi.length < 0.65) return null;
  const rows = multi.filter(l => l.items.length === mode[0]).map(l => l.items.map(i => i.text));
  return rows.length >= 3 ? rows : null;
}

async function renderPage(page: PdfPage) { const viewport = page.getViewport({ scale: 2 }); const canvas = globalThis.document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("امکان آماده‌سازی صفحه PDF وجود ندارد."); await page.render({ canvasContext: ctx, viewport }).promise; return canvas; }

export default function PdfToWordPage() {
  const inputRef = useRef<HTMLInputElement>(null); const [file, setFile] = useState<File | null>(null); const [pages, setPages] = useState(0); const [progress, setProgress] = useState(0); const [status, setStatus] = useState<"idle" | "loading" | "processing" | "done" | "error">("idle"); const [text, setText] = useState(""); const [layouts, setLayouts] = useState<Line[][]>([]); const [error, setError] = useState(""); const [dragging, setDragging] = useState(false); const [mode, setMode] = useState<"smart" | "plain">("smart");
  const reset = () => { setFile(null); setPages(0); setProgress(0); setStatus("idle"); setText(""); setLayouts([]); setError(""); if (inputRef.current) inputRef.current.value = ""; };
  const convert = async (selected: File) => {
    if (selected.type !== "application/pdf") { setError("لطفاً فقط فایل PDF انتخاب کنید."); setStatus("error"); return; }
    if (selected.size > 50 * 1024 * 1024) { setError("حداکثر حجم فایل ۵۰ مگابایت است."); setStatus("error"); return; }
    setFile(selected); setError(""); setText(""); setLayouts([]); setProgress(2); setStatus("loading"); let worker: any = null;
    try {
      await loadScript(PDFJS_URL, "tusan-pdfjs"); const p = libs().pdfjsLib; if (!p) throw new Error("کتابخانه PDF بارگذاری نشد. صفحه را تازه‌سازی کنید و دوباره تلاش کنید."); p.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; const pdf = await p.getDocument({ data: await selected.arrayBuffer() }).promise; setPages(pdf.numPages); setStatus("processing");
      const chunks: string[] = []; const allLayouts: Line[][] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n); let lines: Line[] = []; let direct = "";
        if (page.getTextContent) { const content = await page.getTextContent(); lines = buildLines(content.items || []); direct = paragraphs(lines).map(x => x.text).join("\n"); }
        if (useful(direct)) { chunks.push(direct); allLayouts.push(lines); setProgress(Math.round(n / pdf.numPages * 90)); continue; }
        if (!worker) { await loadScript(TESSERACT_URL, "tusan-tesseract"); const t = libs().Tesseract; if (!t) throw new Error("موتور OCR بارگذاری نشد. صفحه را تازه‌سازی کنید و دوباره تلاش کنید."); worker = await t.createWorker("fas+eng", 1, { logger: m => { if (m.status === "recognizing text" && typeof m.progress === "number") setProgress(Math.min(95, Math.round(((n - 1 + m.progress) / pdf.numPages) * 90))); } }); if (worker.setParameters) await worker.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: "6" }); }
        const result = await worker.recognize(await renderPage(page)); const ocr = normalizeFa(result?.data?.text || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(); chunks.push(ocr); allLayouts.push(ocr.split(/\r?\n/).filter(Boolean).map(s => ({ y: 0, font: 10, items: [{ text: s, x: 0, y: 0, width: s.length, font: 10 }] }))); setProgress(Math.round(n / pdf.numPages * 90));
      }
      setText(chunks.map((c, i) => `صفحه ${i + 1}\n${c}`).join("\n\n").trim()); setLayouts(allLayouts); setProgress(100); setStatus("done");
    } catch (e) { console.error(e); setStatus("error"); setError(e instanceof Error ? e.message : "تبدیل فایل انجام نشد."); } finally { if (worker) await worker.terminate(); }
  };
  const onInput = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void convert(f); }; const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void convert(f); };
  const downloadWord = async () => {
    if (!text) return; try {
      await loadScript(DOCX_URL, "tusan-docx"); const d = libs().docx; if (!d) throw new Error("کتابخانه ساخت Word بارگذاری نشد."); const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = d; const children: any[] = [];
      layouts.forEach((lines, pageIndex) => {
        const title = new Paragraph({ bidirectional: true, alignment: "right", spacing: { after: 160 }, children: [new TextRun({ text: `صفحه ${pageIndex + 1}`, bold: true, rightToLeft: true })] }); children.push(title);
        const tableRows = mode === "smart" ? detectTable(lines) : null;
        if (tableRows) {
          const count = tableRows[0].length; children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows.map(row => new TableRow({ children: row.slice(0, count).map(cell => new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: "right", spacing: { before: 60, after: 60 }, children: [new TextRun({ text: cell, rightToLeft: true })] })] })) })) })); children.push(new Paragraph({ spacing: { after: 180 }, children: [new TextRun({ text: "" })] }));
        } else {
          for (const p of paragraphs(lines)) children.push(new Paragraph({ bidirectional: true, alignment: "right", spacing: { before: p.before, after: p.after, line: p.line }, children: [new TextRun({ text: p.text, rightToLeft: true })] }));
        }
        if (pageIndex < layouts.length - 1) children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: "" })] }));
      });
      const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] }); const blob = await Packer.toBlob(doc); const url = globalThis.URL.createObjectURL(blob); const a = globalThis.document.createElement("a"); a.href = url; a.download = `${file?.name.replace(/\.pdf$/i, "") || "converted"}.docx`; globalThis.document.body.appendChild(a); a.click(); a.remove(); globalThis.URL.revokeObjectURL(url);
    } catch (e) { setStatus("error"); setError(e instanceof Error ? e.message : "ساخت فایل Word انجام نشد."); }
  };
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary)]/10 text-[var(--primary)]"><FileText size={32}/></div><h1 className="mt-5 text-3xl font-black text-[var(--text)] md:text-4xl">تبدیل PDF به Word</h1><p className="mt-3 text-[var(--text-muted)]">تبدیل PDF متنی به Word با حفظ بهتر راست‌به‌چپ، فاصله‌ها، پاراگراف‌ها و جدول‌های ساده.</p></div><div className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"><section className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()} className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center ${dragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}><Upload size={40} className="text-[var(--primary)]"/><strong className="mt-4">PDF را اینجا رها کنید</strong><span className="mt-2 text-sm text-[var(--text-muted)]">یا برای انتخاب فایل کلیک کنید</span><span className="mt-4 text-xs text-[var(--text-muted)]">PDF · حداکثر ۵۰ مگابایت</span><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onInput}/></div>{file && <div className="mt-4 rounded-2xl bg-[var(--surface-secondary)] p-4"><div className="break-all text-sm font-black">{file.name}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{formatBytes(file.size)} · {pages || "در حال بررسی"} صفحه</div></div>}<div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode("smart")} className={`rounded-xl border p-3 text-xs font-bold ${mode === "smart" ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"}`}>حفظ ساختار</button><button type="button" onClick={() => setMode("plain")} className={`rounded-xl border p-3 text-xs font-bold ${mode === "plain" ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"}`}>متن ساده</button></div>{(status === "loading" || status === "processing") && <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold"><span>در حال تبدیل</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }}/></div><div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin"/> در حال تحلیل ساختار PDF...</div></div>}{error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</div>}<div className="mt-5 flex gap-2"><button type="button" onClick={e => { e.stopPropagation(); reset(); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold"><RotateCcw size={16}/> شروع مجدد</button>{text && <button type="button" onClick={e => { e.stopPropagation(); void downloadWord(); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white"><Download size={16}/> دریافت Word</button>}</div></section><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-4"><h2 className="font-black">پیش‌نمایش متن</h2><p className="mt-1 text-xs text-[var(--text-muted)]">متن استخراج‌شده را قبل از دریافت Word می‌توانید ویرایش کنید.</p></div><textarea value={text} onChange={e => setText(e.target.value)} placeholder="بعد از انتخاب PDF، متن اینجا نمایش داده می‌شود..." className="min-h-[520px] w-full resize-y rounded-2xl border border-[var(--border)] bg-transparent p-4 text-sm leading-8 outline-none focus:border-[var(--primary)]"/></section></div></div></main>;
}
