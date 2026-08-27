"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, RotateCcw, Upload } from "lucide-react";

type PdfTextItem = { str?: string; transform?: number[]; width?: number; height?: number; hasEOL?: boolean };
type PdfPage = { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<unknown> }; getTextContent?: () => Promise<{ items: PdfTextItem[] }>; cleanup?: () => void };
type PdfDocument = { numPages: number; getPage: (n: number) => Promise<PdfPage>; cleanup?: () => void; destroy?: () => void };
type PdfJs = { GlobalWorkerOptions: { workerSrc: string }; getDocument: (o: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> } };
type DocxApi = { Document: new (o: any) => any; Packer: { toBlob: (d: any) => Promise<Blob> }; Paragraph: new (o: any) => any; TextRun: new (o: any) => any; Table: new (o: any) => any; TableRow: new (o: any) => any; TableCell: new (o: any) => any; WidthType: { PERCENTAGE: string } };
type OcrApi = { createWorker: (langs?: string, oem?: number, options?: { logger?: (m: { status?: string; progress?: number }) => void }) => Promise<any> };
type BrowserLibraries = { pdfjsLib?: PdfJs; docx?: DocxApi; Tesseract?: OcrApi };
const libs = () => window as unknown as BrowserLibraries;
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const DOCX_URL = "https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js";
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

function libraryReady(id: string) {
  const w = libs();
  if (id === "tusan-pdfjs") return Boolean(w.pdfjsLib);
  if (id === "tusan-docx") return Boolean(w.docx);
  if (id === "tusan-tesseract") return Boolean(w.Tesseract);
  return false;
}

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    if (libraryReady(id)) return resolve();
    const old = globalThis.document.getElementById(id) as HTMLScriptElement | null;
    if (old?.dataset.loaded === "true" && libraryReady(id)) return resolve();

    let settled = false;
    let poll: ReturnType<typeof globalThis.setInterval> | undefined;
    let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (poll !== undefined) globalThis.clearInterval(poll);
      if (timeout !== undefined) globalThis.clearTimeout(timeout);
      old?.removeEventListener("load", onLoad);
      old?.removeEventListener("error", onError);
      error ? reject(error) : resolve();
    };
    const onLoad = () => {
      if (libraryReady(id)) finish();
      else finish(new Error(`کتابخانه بارگذاری شد اما آماده استفاده نیست: ${src}`));
    };
    const onError = () => finish(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`));

    if (old) {
      old.addEventListener("load", onLoad, { once: true });
      old.addEventListener("error", onError, { once: true });
      poll = globalThis.setInterval(() => { if (libraryReady(id)) finish(); }, 100);
    } else {
      const s = globalThis.document.createElement("script");
      s.id = id;
      s.src = src;
      s.async = true;
      s.onload = () => { s.dataset.loaded = "true"; onLoad(); };
      s.onerror = onError;
      globalThis.document.head.appendChild(s);
      poll = globalThis.setInterval(() => { if (libraryReady(id)) finish(); }, 100);
    }
    timeout = globalThis.setTimeout(() => finish(new Error(`بارگذاری کتابخانه بیش از حد طول کشید. اتصال اینترنت یا مسدود بودن CDN را بررسی کنید و دوباره تلاش کنید.`)), 30000);
  });
}

function normalizeFa(s: string) {
  return s.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/ۀ/g, "هٔ").replace(/[\u200e\u200f]/g, "").replace(/\u00a0/g, " ");
}
function geometry(i: PdfTextItem) {
  const t = i.transform || [];
  return { x: Number(t[4] || 0), y: Number(t[5] || 0), width: Math.abs(Number(i.width || 0)), font: Math.max(6, Math.abs(Number(t[0] || t[3] || i.height || 10))) };
}
function useful(s: string) { return s.replace(/\s/g, "").length >= 20; }
type Item = { text: string; x: number; y: number; width: number; font: number; eol?: boolean };
type Line = { y: number; font: number; items: Item[] };
type AdvancedTable = { rows: string[][]; score: number };

function buildLines(items: PdfTextItem[]) {
  const sorted: Item[] = items.filter(i => (i.str || "").trim()).map(i => {
    const g = geometry(i);
    return { text: normalizeFa(i.str || ""), x: g.x, y: g.y, width: g.width, font: g.font, eol: i.hasEOL };
  }).sort((a, b) => b.y - a.y);
  const lines: Line[] = [];
  for (const item of sorted) {
    const tolerance = Math.max(2.2, item.font * 0.42);
    let line = lines.find(l => Math.abs(l.y - item.y) <= tolerance);
    if (!line) { line = { y: item.y, font: item.font, items: [] }; lines.push(line); }
    line.items.push(item);
    line.font = Math.max(line.font, item.font);
  }
  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) line.items.sort((a, b) => b.x - a.x);
  return lines;
}

function reconstruct(line: Line) {
  let out = "";
  for (let n = 0; n < line.items.length; n++) {
    const cur = line.items[n];
    const prev = line.items[n - 1];
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

function plainParagraphs(lines: Line[]) {
  const result: Array<{ text: string; before: number; after: number; line: number }> = [];
  let previousY: number | null = null;
  let previousFont = 10;
  for (const line of lines) {
    const text = reconstruct(line);
    if (!text) continue;
    const distance = previousY === null ? 0 : Math.abs(previousY - line.y);
    const normal = Math.max(previousFont, line.font) * 1.35;
    const isParagraphBreak = previousY !== null && distance > normal * 1.9;
    result.push({ text, before: isParagraphBreak ? 180 : 0, after: isParagraphBreak ? 220 : 80, line: 300 });
    previousY = line.y;
    previousFont = line.font;
  }
  return result;
}

function clusterColumns(lines: Line[]) {
  const xs = lines.flatMap(l => l.items.map(i => i.x)).sort((a, b) => b - a);
  const clusters: number[] = [];
  for (const x of xs) {
    const index = clusters.findIndex(c => Math.abs(c - x) <= 12);
    if (index < 0) clusters.push(x); else clusters[index] = (clusters[index] + x) / 2;
  }
  return clusters.sort((a, b) => b - a);
}

function advancedTable(lines: Line[]): AdvancedTable | null {
  const candidates = lines.filter(l => l.items.length >= 2);
  if (candidates.length < 3) return null;
  const columns = clusterColumns(candidates);
  if (columns.length < 2 || columns.length > 8) return null;
  const rows: string[][] = [];
  let strongRows = 0;
  for (const line of candidates) {
    const cells = columns.map(() => "");
    for (const item of line.items) {
      let best = -1;
      let bestDistance = Infinity;
      columns.forEach((column, index) => {
        const distance = Math.abs(column - item.x);
        if (distance < bestDistance) { bestDistance = distance; best = index; }
      });
      if (best >= 0 && bestDistance <= 24) cells[best] = cells[best] ? `${cells[best]} ${item.text}` : item.text;
    }
    const filled = cells.filter(Boolean).length;
    if (filled >= 2) {
      rows.push(cells.map(normalizeFa));
      if (filled >= Math.max(2, Math.ceil(columns.length * 0.55))) strongRows++;
    }
  }
  if (rows.length < 3) return null;
  const consistency = strongRows / rows.length;
  const density = rows.reduce((sum, row) => sum + row.filter(Boolean).length, 0) / (rows.length * columns.length);
  const score = consistency * 0.6 + density * 0.4;
  return score >= 0.62 ? { rows, score } : null;
}

function advancedParagraphs(lines: Line[]) {
  const result: Array<{ text: string; before: number; after: number; line: number }> = [];
  let previousY: number | null = null;
  for (const line of lines) {
    const text = reconstruct(line);
    if (!text) continue;
    const distance = previousY === null ? 0 : Math.abs(previousY - line.y);
    const normal = Math.max(7, line.font * 1.45);
    const paragraphBreak = previousY !== null && distance > normal * 1.8;
    result.push({ text, before: paragraphBreak ? 220 : 0, after: paragraphBreak ? 260 : 70, line: Math.round(Math.max(260, line.font * 24)) });
    previousY = line.y;
  }
  return result;
}

async function renderPage(page: PdfPage) {
  const viewport = page.getViewport({ scale: 1.25 });
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("امکان آماده‌سازی صفحه PDF وجود ندارد.");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

export default function PdfToWordPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "processing" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [layouts, setLayouts] = useState<Line[][]>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<"plain" | "advanced">("plain");
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);
  const [wordState, setWordState] = useState<"idle" | "building">("idle");

  const reset = () => {
    setFile(null); setPages(0); setProgress(0); setStatus("idle"); setText(""); setLayouts([]); setError(""); setWordBlob(null); setWordState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const convert = async (selected: File) => {
    if (selected.type !== "application/pdf") { setError("لطفاً فقط فایل PDF انتخاب کنید."); setStatus("error"); return; }
    if (selected.size > 50 * 1024 * 1024) { setError("حداکثر حجم فایل ۵۰ مگابایت است."); setStatus("error"); return; }
    setFile(selected); setError(""); setText(""); setLayouts([]); setWordBlob(null); setProgress(2); setStatus("loading");
    let worker: any = null;
    let pdf!: PdfDocument;
    try {
      setProgress(4);
      await loadScript(PDFJS_URL, "tusan-pdfjs");
      const p = libs().pdfjsLib;
      if (!p) throw new Error("کتابخانه PDF بارگذاری نشد. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.");
      p.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      setProgress(8);
      pdf = await p.getDocument({ data: await selected.arrayBuffer() }).promise;
      setPages(pdf.numPages); setStatus("processing");
      const totalPages = pdf.numPages;
      const chunks: string[] = []; const allLayouts: Line[][] = [];
      for (let n = 1; n <= totalPages; n++) {
        const page = await pdf.getPage(n);
        let lines: Line[] = []; let direct = "";
        try {
          if (page.getTextContent) {
            const content = await page.getTextContent();
            lines = buildLines(content.items || []);
            direct = plainParagraphs(lines).map(x => x.text).join("\n");
          }
          if (useful(direct)) {
            chunks.push(direct); allLayouts.push(lines); setProgress(Math.round(n / totalPages * 90));
          } else {
            if (!worker) {
              setProgress(Math.max(8, Math.round(((n - 1) / totalPages) * 90)));
              await loadScript(TESSERACT_URL, "tusan-tesseract");
              const t = libs().Tesseract;
              if (!t) throw new Error("موتور OCR بارگذاری نشد. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.");
              worker = await t.createWorker("fas+eng", 1, { logger: m => { if (m.progress) setProgress(Math.min(90, Math.round(((n - 1) + m.progress) / totalPages * 90))); } });
            }
            const canvas = await renderPage(page);
            const result = await worker.recognize(canvas);
            const ocrText = normalizeFa(result?.data?.text || "").trim();
            if (ocrText) chunks.push(ocrText);
            allLayouts.push(lines);
            setProgress(Math.round(n / totalPages * 90));
          }
        } finally { page.cleanup?.(); }
      }
      setText(chunks.join("\n\n")); setLayouts(allLayouts); setProgress(100); setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تبدیل PDF انجام نشد."); setStatus("error");
    } finally {
      pdf?.cleanup?.(); pdf?.destroy?.();
      if (worker?.terminate) await worker.terminate().catch(() => undefined);
    }
  };

  const makeWord = async () => {
    if (!text.trim()) return;
    setWordState("building"); setError("");
    try {
      await loadScript(DOCX_URL, "tusan-docx");
      const api = libs().docx;
      if (!api) throw new Error("کتابخانه Word بارگذاری نشد. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.");
      const children = mode === "advanced" ? layouts.flatMap(lines => {
        const table = advancedTable(lines);
        if (table) return [new api.Table({ rows: table.rows.map(row => new api.TableRow({ children: row.map(cell => new api.TableCell({ children: [new api.Paragraph({ children: [new api.TextRun({ text: cell, rightToLeft: true })] })] }) ) })) , width: { size: 100, type: api.WidthType.PERCENTAGE } })];
        return advancedParagraphs(lines).map(p => new api.Paragraph({ text: p.text, bidirectional: true, spacing: { before: p.before, after: p.after, line: p.line } }));
      }) : text.split(/\n+/).filter(Boolean).map(value => new api.Paragraph({ text: value, bidirectional: true, spacing: { after: 120 } }));
      const doc = new api.Document({ sections: [{ properties: {}, children }] });
      setWordBlob(await api.Packer.toBlob(doc));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ساخت فایل Word انجام نشد.");
    } finally { setWordState("idle"); }
  };

  const downloadWord = () => {
    if (!wordBlob) return;
    const url = URL.createObjectURL(wordBlob); const a = globalThis.document.createElement("a"); a.href = url; a.download = `${file?.name.replace(/\.pdf$/i, "") || "converted"}.docx`; a.click(); URL.revokeObjectURL(url);
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => { const selected = event.target.files?.[0]; if (selected) void convert(selected); };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); const selected = event.dataTransfer.files?.[0]; if (selected) void convert(selected); };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8" dir="rtl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black">تبدیل PDF به Word</h1><p className="mt-1 text-sm text-[var(--text-muted)]">تبدیل داخل مرورگر؛ فایل شما به سرور ارسال نمی‌شود.</p></div>
        {file && <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><RotateCcw size={16} /> شروع مجدد</button>}
      </div>
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onInput} />
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`rounded-3xl border-2 border-dashed p-8 text-center transition ${dragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"}`}>
        <FileText className="mx-auto mb-3" size={42} /><h2 className="font-bold">فایل PDF را انتخاب یا اینجا رها کنید</h2><p className="mt-1 text-xs text-[var(--text-muted)]">حداکثر ۵۰ مگابایت</p><button onClick={() => inputRef.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 font-bold text-white"><Upload size={17} /> انتخاب PDF</button>
      </div>
      {status !== "idle" && <div className="mt-5 rounded-2xl border border-[var(--border)] p-4">{status === "error" ? <p className="text-sm text-red-600">{error}</p> : <><div className="flex items-center justify-between text-sm font-bold"><span>{status === "done" ? "تبدیل انجام شد" : "در حال پردازش..."}</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} /></div>{pages > 0 && <p className="mt-2 text-xs text-[var(--text-muted)]">تعداد صفحات: {pages}</p>}</>}</div>}
      {status === "done" && <div className="mt-5 space-y-4 rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap gap-2"><button onClick={() => setMode("plain")} className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === "plain" ? "bg-[var(--primary)] text-white" : "border"}`}>متن ساده</button><button onClick={() => setMode("advanced")} className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === "advanced" ? "bg-[var(--primary)] text-white" : "border"}`}>حفظ ساختار</button></div><textarea value={text} onChange={e => setText(e.target.value)} className="min-h-64 w-full rounded-xl border bg-transparent p-3 text-sm" /><div className="flex flex-wrap gap-2"><button onClick={() => void makeWord()} disabled={wordState === "building"} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white disabled:opacity-60">{wordState === "building" ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} ساخت Word</button>{wordBlob && <button onClick={downloadWord} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold"><Download size={16} /> دانلود Word</button>}</div>{error && <p className="text-sm text-red-600">{error}</p>}</div>}
    </main>
  );
}
