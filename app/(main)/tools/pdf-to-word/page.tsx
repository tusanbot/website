"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, RotateCcw, Upload } from "lucide-react";

type PdfItem = { str?: string; transform?: number[]; width?: number; height?: number };
type PdfPage = { getTextContent: () => Promise<{ items: PdfItem[] }>; cleanup?: () => void };
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; cleanup?: () => void; destroy?: () => void };
type PdfJs = { GlobalWorkerOptions: { workerSrc: string }; getDocument: (o: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> } };
type DocxApi = { Document: new (o: any) => any; Packer: { toBlob: (d: any) => Promise<Blob> }; Paragraph: new (o: any) => any; TextRun: new (o: any) => any };
type Libs = { pdfjsLib?: PdfJs; docx?: DocxApi };
type ExtractedLine = { text: string; y: number; x: number; width: number };

const libs = () => window as unknown as Libs;
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const DOCX_URL = "https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js";

function scriptReady(id: string) {
  const w = libs();
  return id === "tusan-pdfjs" ? Boolean(w.pdfjsLib) : Boolean(w.docx);
}

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    if (scriptReady(id)) return resolve();
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    let settled = false;
    let poll: number | undefined;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (poll !== undefined) window.clearInterval(poll);
      error ? reject(error) : resolve();
    };
    const timer = window.setTimeout(() => finish(new Error(`بارگذاری کتابخانه بیش از حد طول کشید: ${src}`)), 30000);
    const check = () => { if (scriptReady(id)) finish(); };
    poll = window.setInterval(check, 100);
    if (existing) {
      if (scriptReady(id)) return finish();
      existing.addEventListener("load", check, { once: true });
      existing.addEventListener("error", () => finish(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`)), { once: true });
    } else {
      const script = document.createElement("script");
      script.id = id; script.src = src; script.async = true;
      script.onload = check;
      script.onerror = () => finish(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`));
      document.head.appendChild(script);
    }
  });
}

function normalizeFa(value: string) {
  return value.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u200e\u200f]/g, "").replace(/\u00a0/g, " ");
}

function reconstruct(items: PdfItem[]): ExtractedLine[] {
  const prepared = items.filter(i => (i.str || "").trim()).map(i => {
    const t = i.transform || [];
    return { text: normalizeFa(i.str || ""), x: Number(t[4] || 0), y: Number(t[5] || 0), width: Math.abs(Number(i.width || 0)) };
  }).sort((a, b) => b.y - a.y || b.x - a.x);
  const lines: Array<{ y: number; items: typeof prepared }> = [];
  for (const item of prepared) {
    const line = lines.find(l => Math.abs(l.y - item.y) <= 3);
    if (line) line.items.push(item); else lines.push({ y: item.y, items: [item] });
  }
  return lines.sort((a, b) => b.y - a.y).map(line => {
    const sorted = line.items.sort((a, b) => b.x - a.x);
    let text = "";
    sorted.forEach((item, index) => {
      if (index > 0) {
        const previous = sorted[index - 1];
        const gap = previous.x - (item.x + item.width);
        if (gap > 2 && !/^[،؛:!؟.,)%\]}]/.test(item.text) && !text.endsWith(" ")) text += " ";
      }
      text += item.text;
    });
    return { text: normalizeFa(text).replace(/[ \t]{2,}/g, " ").trim(), y: line.y, x: 0, width: 0 };
  }).filter(l => l.text);
}

export default function PdfToWordPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "processing" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);
  const [building, setBuilding] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reset = () => { setFile(null); setPages(0); setProgress(0); setStatus("idle"); setText(""); setError(""); setWordBlob(null); setBuilding(false); if (inputRef.current) inputRef.current.value = ""; };

  const convert = async (selected: File) => {
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) { setStatus("error"); setError("لطفاً فقط فایل PDF انتخاب کنید."); return; }
    if (selected.size > 50 * 1024 * 1024) { setStatus("error"); setError("حداکثر حجم فایل ۵۰ مگابایت است."); return; }
    setFile(selected); setError(""); setText(""); setWordBlob(null); setProgress(2); setStatus("loading");
    let pdf: PdfDoc | null = null;
    try {
      await loadScript(PDFJS_URL, "tusan-pdfjs");
      const pdfjs = libs().pdfjsLib;
      if (!pdfjs) throw new Error("کتابخانه PDF.js در دسترس نیست.");
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      setProgress(8);
      pdf = await pdfjs.getDocument({ data: await selected.arrayBuffer() }).promise;
      setPages(pdf.numPages); setStatus("processing");
      const chunks: string[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        try {
          const content = await Promise.race([
            page.getTextContent(),
            new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error(`خواندن متن صفحه ${n} بیش از حد طول کشید.`)), 20000)),
          ]);
          const lines = reconstruct(content.items || []);
          if (lines.length) chunks.push(lines.map(line => line.text).join("\n"));
          setProgress(8 + Math.round((n / pdf.numPages) * 87));
        } finally { page.cleanup?.(); }
      }
      const result = chunks.join("\n\n").trim();
      if (!result) throw new Error("این PDF متن قابل استخراج ندارد. پشتیبانی OCR در مرحله جداگانه اضافه خواهد شد.");
      setText(result); setProgress(100); setStatus("done");
    } catch (e) { console.error(e); setStatus("error"); setError(e instanceof Error ? e.message : "تبدیل PDF انجام نشد."); }
    finally { pdf?.cleanup?.(); pdf?.destroy?.(); }
  };

  const buildWord = async () => {
    if (!text.trim() || building) return null;
    if (wordBlob) return wordBlob;
    setBuilding(true); setError("");
    try {
      await loadScript(DOCX_URL, "tusan-docx");
      const d = libs().docx;
      if (!d) throw new Error("کتابخانه Word در دسترس نیست.");
      const { Document, Packer, Paragraph, TextRun } = d;
      const children = text.split(/\n+/).filter(Boolean).map(value => new Paragraph({ bidirectional: true, alignment: "right", spacing: { after: 120, line: 300 }, children: [new TextRun({ text: value, rightToLeft: true })] }));
      const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
      const blob = await Promise.race([Packer.toBlob(doc), new Promise<Blob>((_, reject) => window.setTimeout(() => reject(new Error("ساخت فایل Word بیش از ۶۰ ثانیه طول کشید.")), 60000))]);
      if (blob.size < 100) throw new Error("فایل Word تولیدشده معتبر نیست.");
      setWordBlob(blob); return blob;
    } catch (e) { setError(e instanceof Error ? e.message : "ساخت فایل Word انجام نشد."); return null; }
    finally { setBuilding(false); }
  };

  const download = async () => {
    const blob = await buildWord(); if (!blob) return;
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${file?.name.replace(/\.pdf$/i, "") || "converted"}.docx`; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void convert(f); };
  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void convert(f); };

  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary)]/10 text-[var(--primary)]"><FileText size={32} /></div><h1 className="mt-5 text-3xl font-black text-[var(--text)] md:text-4xl">تبدیل PDF به Word</h1><p className="mt-3 text-[var(--text-muted)]">تبدیل PDF متنی داخل مرورگر؛ فایل شما به سرور ارسال نمی‌شود.</p></div><div className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"><section className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop} onClick={()=>inputRef.current?.click()} className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center ${dragging?"border-[var(--primary)] bg-[var(--primary)]/5":"border-[var(--border)] hover:border-[var(--primary)]/50"}`}><Upload size={40} className="text-[var(--primary)]"/><strong className="mt-4">PDF را اینجا رها کنید</strong><span className="mt-2 text-sm text-[var(--text-muted)]">یا برای انتخاب فایل کلیک کنید</span><span className="mt-4 text-xs text-[var(--text-muted)]">PDF · حداکثر ۵۰ مگابایت</span><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onChange}/></div>{file&&<div className="mt-4 rounded-2xl bg-[var(--surface-secondary)] p-4"><div className="break-all text-sm font-black">{file.name}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{(file.size/1024/1024).toFixed(2)} MB · {pages||"در حال بررسی"} صفحه</div></div>}{(status==="loading"||status==="processing")&&<div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold"><span>در حال استخراج متن</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{width:`${progress}%`}}/></div><div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin"/> PDF در حال پردازش است.</div></div>}{status==="error"&&<div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}{file&&<button onClick={reset} className="mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><RotateCcw size={16}/> شروع مجدد</button>}</section>{status==="done"&&<section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">متن استخراج‌شده</h2><p className="mt-1 text-xs text-[var(--text-muted)]">پس از بررسی متن، فایل Word را بسازید.</p></div><span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">۱۰۰٪ آماده</span></div><textarea value={text} onChange={e=>{setText(e.target.value);setWordBlob(null)}} className="mt-4 min-h-[420px] w-full rounded-2xl border border-[var(--border)] bg-transparent p-4 text-sm leading-7 outline-none"/><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>void download()} disabled={building} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 font-bold text-white disabled:opacity-60">{building?<Loader2 size={17} className="animate-spin"/>:<Download size={17}/>} {building?"در حال ساخت Word...":"ساخت و دریافت Word"}</button>{wordBlob&&<button onClick={()=>void download()} className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 font-bold"><Download size={17}/> دریافت مجدد Word</button>}</div>{error&&<p className="mt-3 text-sm text-red-600">{error}</p>}</section>}</div></div></main>;
}
