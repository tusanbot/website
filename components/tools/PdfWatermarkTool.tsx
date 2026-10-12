"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileUp, LoaderCircle, RotateCcw } from "lucide-react";

declare global {
  interface Window { PDFLib?: any; pdfjsLib?: any; }
}
const PDFLIB = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
type Rect = { x: number; y: number; w: number; h: number };

function loadGlobal(id: string, src: string, ready: () => boolean) {
  return new Promise<void>((resolve, reject) => {
    if (ready()) return resolve();
    let script = document.getElementById(id) as HTMLScriptElement | null;
    const fail = () => reject(new Error("موتور پردازش PDF بارگذاری نشد. اتصال اینترنت را بررسی کنید."));
    if (!script) { script = document.createElement("script"); script.id = id; script.src = src; script.async = true; document.head.appendChild(script); }
    script.addEventListener("load", () => ready() ? resolve() : fail(), { once: true });
    script.addEventListener("error", fail, { once: true });
  });
}
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export default function PdfWatermarkTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [allPages, setAllPages] = useState(true);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dragStart, setDragStart] = useState<{x:number;y:number}|null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!file || !canvasRef.current) return;
      try {
        await loadGlobal("tusan-pdfjs-watermark", PDFJS, () => !!window.pdfjsLib);
        const pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = WORKER;
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        if (cancelled) { await pdf.destroy(); return; }
        setPages(pdf.numPages); setPageNo(p => Math.min(Math.max(1,p), pdf.numPages));
        const page = await pdf.getPage(Math.min(Math.max(1,pageNo), pdf.numPages));
        const viewport = page.getViewport({ scale: Math.min(1.35, 720 / page.getViewport({scale:1}).width) });
        const canvas = canvasRef.current; if (!canvas) return;
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        await pdf.destroy();
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "نمایش PDF ممکن نشد."); }
    }
    void render(); return () => { cancelled = true; };
  }, [file, pageNo]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return {x:0,y:0};
    const box = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX-box.left)/box.width)), y: Math.max(0, Math.min(1, (event.clientY-box.top)/box.height)) };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => { const p = point(e); setDragStart(p); setRect({x:p.x,y:p.y,w:0,h:0}); e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!dragStart) return; const p=point(e); setRect({x:Math.min(p.x,dragStart.x),y:Math.min(p.y,dragStart.y),w:Math.abs(p.x-dragStart.x),h:Math.abs(p.y-dragStart.y)}); };
  const finish = () => setDragStart(null);
  const process = async () => {
    if (!file || !rect || rect.w < .01 || rect.h < .01) { setError("ابتدا محدوده واترمارک را روی پیش‌نمایش با ماوس یا لمس مشخص کنید."); return; }
    setBusy(true); setError(""); setStatus("در حال ساخت PDF اصلاح‌شده...");
    try {
      await loadGlobal("tusan-pdflib-watermark", PDFLIB, () => !!window.PDFLib);
      const { PDFDocument, rgb } = window.PDFLib;
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const targetPages = allPages ? pdf.getPages().map((_:unknown,i:number)=>i) : [pageNo-1];
      for (const idx of targetPages) {
        const page = pdf.getPage(idx); const size = page.getSize();
        page.drawRectangle({ x: rect.x*size.width, y: size.height-(rect.y+rect.h)*size.height, width: rect.w*size.width, height: rect.h*size.height, color: rgb(1,1,1), opacity: 1, borderWidth: 0 });
      }
      const bytes = await pdf.save({ useObjectStreams: true });
      saveBlob(new Blob([bytes], {type:"application/pdf"}), file.name.replace(/\.pdf$/i,"")+"-watermark-removed.pdf");
      setStatus("فایل آماده شد. محدوده انتخاب‌شده با پوشش سفید اصلاح شد؛ نتیجه را بررسی کنید.");
    } catch (e) { setError(e instanceof Error ? e.message : "پردازش PDF انجام نشد."); setStatus(""); }
    finally { setBusy(false); }
  };

  return <section dir="rtl" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
    <div className="mb-5"><h2 className="text-xl font-black">حذف واترمارک PDF</h2><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">فایل در مرورگر پردازش می‌شود. محدوده واترمارک را روی پیش‌نمایش بکشید تا پوشانده شود؛ این ابزار شیء واترمارک را از ساختار PDF استخراج نمی‌کند.</p></div>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f){setFile(f);setRect(null);setError("");setStatus("");setPages(0);setPageNo(1);}}}/>
    {!file ? <button type="button" onClick={()=>inputRef.current?.click()} className="flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] p-6"><FileUp size={32} className="text-[var(--primary)]"/><span className="mt-3 font-black">انتخاب فایل PDF</span><span className="mt-1 text-xs text-[var(--text-muted)]">فایل از دستگاه شما خارج نمی‌شود</span></button> : <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><div className="max-w-full truncate text-sm font-bold">{file.name}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{pages || "…"} صفحه</div></div><button type="button" onClick={()=>{setFile(null);setRect(null);setError("");setStatus("");}} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"><RotateCcw size={14}/> تغییر فایل</button></div>
      <div className="flex flex-wrap items-center gap-3"><label className="text-sm font-bold">صفحه پیش‌نمایش <select value={pageNo} onChange={e=>{setPageNo(Number(e.target.value));setRect(null);}} className="mr-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">{Array.from({length:pages},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allPages} onChange={e=>setAllPages(e.target.checked)}/> اعمال همین محدوده در همه صفحات</label></div>
      <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border)] bg-slate-100 p-3"><div className="relative mx-auto w-fit max-w-full"><canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} className="block h-auto max-w-full cursor-crosshair shadow-md"/>{rect && <div className="pointer-events-none absolute border-2 border-red-500 bg-red-300/25" style={{left:`${rect.x*100}%`,top:`${rect.y*100}%`,width:`${rect.w*100}%`,height:`${rect.h*100}%`}}/>}</div></div>
      <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">روی واترمارک کلیک کنید و بکشید تا محدوده انتخاب شود. این پوشش سفید است و ممکن است محتوای زیر واترمارک را نیز بپوشاند؛ برای واترمارک مورب یا چندتکه، هر بخش را جداگانه نمی‌توان با یک انتخاب حذف کرد.</p>
      <button type="button" disabled={busy || !rect} onClick={()=>void process()} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 font-black text-white disabled:opacity-50">{busy?<LoaderCircle className="animate-spin" size={18}/>:<Download size={18}/>} ساخت و دانلود PDF</button>
    </>}
    {status && <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{status}</p>}{error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
    <div className="mt-5 rounded-2xl border border-amber-300/60 bg-amber-50/60 p-4 text-xs leading-6 text-amber-900">فقط فایل‌هایی را ویرایش کنید که اجازه تغییرشان را دارید. اگر واترمارک داخل تصویر اسکن‌شده ادغام شده باشد، حذف واقعی آن ممکن نیست؛ پوشاندن آن ممکن است متن یا تصویر زیرین را هم از بین ببرد.</div>
  </section>;
}
