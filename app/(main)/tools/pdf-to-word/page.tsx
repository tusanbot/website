"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, RotateCcw, Upload } from "lucide-react";

type PdfTextItem = { str?: string; transform?: number[]; width?: number; height?: number; hasEOL?: boolean };
type PdfPage = { getTextContent?: () => Promise<{ items: PdfTextItem[] }>; getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<unknown> }; cleanup?: () => void };
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; cleanup?: () => void; destroy?: () => void };
type PdfJs = { GlobalWorkerOptions: { workerSrc: string }; getDocument: (o: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> } };
type DocxApi = { Document: new (o: any) => any; Packer: { toBlob: (d: any) => Promise<Blob> }; Paragraph: new (o: any) => any; TextRun: new (o: any) => any; Table: new (o: any) => any; TableRow: new (o: any) => any; TableCell: new (o: any) => any; WidthType: { PERCENTAGE: string } };
type Tess = { createWorker: (langs?: string, oem?: number, options?: any) => Promise<any> };
type OcrResult = { data?: { text?: string } };
type Libs = { pdfjsLib?: PdfJs; docx?: DocxApi; Tesseract?: Tess };
const w = () => window as unknown as Libs;
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const DOCX_URL = "https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js";
const TESS_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

function ready(id: string) { const x = w(); return id === "tusan-pdfjs" ? !!x.pdfjsLib : id === "tusan-docx" ? !!x.docx : id === "tusan-tesseract" ? !!x.Tesseract : false; }
function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    if (ready(id)) return resolve();
    const old = document.getElementById(id) as HTMLScriptElement | null;
    let done = false; let poll: number | undefined; let timer: number | undefined;
    const finish = (e?: Error) => { if (done) return; done = true; if (poll) clearInterval(poll); if (timer) clearTimeout(timer); if (e) reject(e); else resolve(); };
    const check = () => ready(id) ? finish() : undefined;
    if (old) { old.addEventListener("load", check, { once: true }); old.addEventListener("error", () => finish(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`)), { once: true }); poll = window.setInterval(check, 100); }
    else { const s = document.createElement("script"); s.id = id; s.src = src; s.async = true; s.onload = check; s.onerror = () => finish(new Error(`بارگذاری کتابخانه انجام نشد: ${src}`)); document.head.appendChild(s); poll = window.setInterval(check, 100); }
    timer = window.setTimeout(() => finish(new Error("بارگذاری کتابخانه بیش از حد طول کشید. اتصال اینترنت یا محدودیت CDN را بررسی کنید.")), 30000);
  });
}
function norm(s: string) { return s.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u200e\u200f]/g, "").replace(/\u00a0/g, " "); }
type Line = { text: string; y: number; font: number };
function extractLines(items: PdfTextItem[]): Line[] {
  const arr = items.filter(i => (i.str || "").trim()).map(i => { const t = i.transform || []; return { text: norm(i.str || ""), y: Number(t[5] || 0), font: Math.max(6, Math.abs(Number(t[0] || t[3] || i.height || 10))), x: Number(t[4] || 0), width: Number(i.width || 0) }; }).sort((a,b) => b.y-a.y || b.x-a.x);
  const lines: Array<{ y:number; font:number; items: typeof arr }> = [];
  for (const item of arr) { let line = lines.find(l => Math.abs(l.y-item.y) <= Math.max(2.2,item.font*.42)); if (!line) { line={y:item.y,font:item.font,items:[]}; lines.push(line); } line.items.push(item); line.font=Math.max(line.font,item.font); }
  return lines.sort((a,b)=>b.y-a.y).map(l => ({ y:l.y, font:l.font, text: norm(l.items.sort((a,b)=>b.x-a.x).map((it,i)=> { const prev=l.items[i-1]; if (!prev) return it.text; const gap=prev.x-(it.x+prev.width); return (gap>Math.max(1.5,Math.min(10,l.font*.18)) && !/^[،؛:!؟.,)%\]}]/.test(it.text)) ? " "+it.text : it.text; }).join("")) }));
}
function withTimeout<T>(p: Promise<T>, ms: number, message: string) { return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))]); }
async function render(page: PdfPage) { const v=page.getViewport({scale:1.25}); const c=document.createElement("canvas"); c.width=Math.ceil(v.width); c.height=Math.ceil(v.height); const ctx=c.getContext("2d",{willReadFrequently:true}); if(!ctx) throw new Error("امکان آماده‌سازی صفحه PDF وجود ندارد."); await page.render({canvasContext:ctx,viewport:v}).promise; return c; }

export default function PdfToWordPage() {
  const input=useRef<HTMLInputElement>(null); const [file,setFile]=useState<File|null>(null); const [pages,setPages]=useState(0); const [progress,setProgress]=useState(0); const [status,setStatus]=useState<"idle"|"loading"|"processing"|"done"|"error">("idle"); const [text,setText]=useState(""); const [layouts,setLayouts]=useState<Line[][]>([]); const [error,setError]=useState(""); const [drag,setDrag]=useState(false); const [wordBlob,setWordBlob]=useState<Blob|null>(null); const [building,setBuilding]=useState(false);
  const reset=()=>{setFile(null);setPages(0);setProgress(0);setStatus("idle");setText("");setLayouts([]);setError("");setWordBlob(null);setBuilding(false);if(input.current)input.current.value="";};
  const convert=async(f:File)=>{
    if(f.type!=="application/pdf"){setError("لطفاً فقط فایل PDF انتخاب کنید.");setStatus("error");return;} if(f.size>50*1024*1024){setError("حداکثر حجم فایل ۵۰ مگابایت است.");setStatus("error");return;}
    setFile(f);setError("");setText("");setLayouts([]);setWordBlob(null);setProgress(2);setStatus("loading"); let pdf:PdfDoc|null=null; let worker:any=null;
    try{
      setProgress(4); await loadScript(PDFJS_URL,"tusan-pdfjs"); const p=w().pdfjsLib; if(!p)throw new Error("کتابخانه PDF.js بارگذاری نشد."); p.GlobalWorkerOptions.workerSrc=PDFJS_WORKER; setProgress(8);
      pdf=await p.getDocument({data:await f.arrayBuffer()}).promise; setPages(pdf.numPages); setStatus("processing"); const chunks:string[]=[]; const all:Line[][]=[];
      for(let n=1;n<=pdf.numPages;n++){
        const page=await pdf.getPage(n); try{
          const content=page.getTextContent?await withTimeout(page.getTextContent(),15000,"خواندن متن PDF بیش از حد طول کشید."):null; const lines=extractLines(content?.items||[]); const direct=lines.map(x=>x.text).filter(Boolean).join("\n").trim();
          const nativeText=direct.replace(/\s/g,"").length>=5;
          if(nativeText){chunks.push(direct);all.push(lines);setProgress(Math.max(10,Math.round(n/pdf.numPages*90)));continue;}
          if(!worker){setProgress(Math.max(8,Math.round((n-1)/pdf.numPages*70)));await loadScript(TESS_URL,"tusan-tesseract");const t=w().Tesseract;if(!t)throw new Error("موتور OCR بارگذاری نشد."); worker=await withTimeout(t.createWorker("fas+eng",1,{logger:(m:any)=>{if(m.status==="recognizing text"&&typeof m.progress==="number")setProgress(Math.min(90,Math.round(((n-1)+m.progress)/pdf!.numPages*90)));}}),60000,"راه‌اندازی موتور OCR بیش از حد طول کشید.");}
          const canvas=await render(page); try{const r=await withTimeout(worker.recognize(canvas) as Promise<OcrResult>,120000,"OCR این صفحه بیش از حد طول کشید و متوقف شد.");const o=norm(r.data?.text||"").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();if(o)chunks.push(o);all.push(o.split(/\n+/).filter(Boolean).map(s=>({text:s,y:0,font:10})));}finally{canvas.width=1;canvas.height=1;canvas.remove();} setProgress(Math.round(n/pdf.numPages*90));
        }finally{page.cleanup?.();}
      }
      const result=chunks.map((c,i)=>`صفحه ${i+1}\n${c}`).join("\n\n").trim(); if(!result)throw new Error("هیچ متن قابل استخراجی از PDF پیدا نشد."); setText(result);setLayouts(all);setProgress(100);setStatus("done");
    }catch(e){console.error(e);setStatus("error");setError(e instanceof Error?e.message:"تبدیل PDF انجام نشد.");}finally{if(worker)await worker.terminate().catch(()=>undefined);pdf?.cleanup?.();pdf?.destroy?.();}
  };
  const buildWord=async()=>{
    if(!text.trim()||building)return; if(wordBlob)return wordBlob; setBuilding(true);setError("");
    try{await loadScript(DOCX_URL,"tusan-docx");const d=w().docx;if(!d)throw new Error("کتابخانه Word بارگذاری نشد.");const {Document,Packer,Paragraph,TextRun}=d;const children:any[]=text.split(/\n{2,}/).filter(Boolean).map(v=>new Paragraph({bidirectional:true,alignment:"right",spacing:{after:120,line:300},children:[new TextRun({text:v,rightToLeft:true})]}));const doc=new Document({sections:[{properties:{page:{margin:{top:720,right:720,bottom:720,left:720}}},children}]});const blob=await withTimeout(Packer.toBlob(doc),120000,"ساخت فایل Word بیش از حد طول کشید.");if(blob.size<100)throw new Error("فایل Word تولیدشده معتبر نیست.");setWordBlob(blob);return blob;}catch(e){setError(e instanceof Error?e.message:"ساخت فایل Word انجام نشد.");return null;}finally{setBuilding(false);}
  };
  const download=async()=>{const blob=await buildWord();if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${file?.name.replace(/\.pdf$/i,"")||"converted"}.docx`;a.style.display="none";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);};
  const inputChange=(e:ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(f)void convert(f);}; const drop=(e:DragEvent<HTMLDivElement>)=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files?.[0];if(f)void convert(f);};
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary)]/10 text-[var(--primary)]"><FileText size={32}/></div><h1 className="mt-5 text-3xl font-black text-[var(--text)] md:text-4xl">تبدیل PDF به Word</h1><p className="mt-3 text-[var(--text-muted)]">تبدیل داخل مرورگر؛ فایل شما به سرور ارسال نمی‌شود.</p></div><div className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"><section className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={drop} onClick={()=>input.current?.click()} className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center ${drag?"border-[var(--primary)] bg-[var(--primary)]/5":"border-[var(--border)] hover:border-[var(--primary)]/50"}`}><Upload size={40} className="text-[var(--primary)]"/><strong className="mt-4">PDF را اینجا رها کنید</strong><span className="mt-2 text-sm text-[var(--text-muted)]">یا برای انتخاب فایل کلیک کنید</span><span className="mt-4 text-xs text-[var(--text-muted)]">PDF · حداکثر ۵۰ مگابایت</span><input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={inputChange}/></div>{file&&<div className="mt-4 rounded-2xl bg-[var(--surface-secondary)] p-4"><div className="break-all text-sm font-black">{file.name}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{(file.size/1024/1024).toFixed(2)} MB · {pages||"در حال بررسی"} صفحه</div></div>}{(status==="loading"||status==="processing")&&<div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold"><span>در حال تبدیل</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{width:`${progress}%`}}/></div><div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin"/> استخراج متن در حال انجام است.</div></div>}{building&&<div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--surface-secondary)] p-3 text-xs text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin"/> فایل Word در حال آماده‌سازی است.</div>}{error&&<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</div>}<div className="mt-5 flex gap-2"><button type="button" onClick={e=>{e.stopPropagation();reset()}} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold"><RotateCcw size={16}/> شروع مجدد</button>{text&&<button type="button" disabled={building} onClick={e=>{e.stopPropagation();void download()}} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"><Download size={16}/> {building?"در حال ساخت...":wordBlob?"دریافت Word":"ساخت و دریافت Word"}</button>}</div></section><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="font-black">پیش‌نمایش متن</h2><p className="mt-1 text-xs text-[var(--text-muted)]">متن استخراج‌شده قابل ویرایش است.</p><textarea value={text} onChange={e=>{setText(e.target.value);setWordBlob(null)}} placeholder="بعد از انتخاب PDF، متن اینجا نمایش داده می‌شود..." className="mt-4 min-h-[520px] w-full resize-y rounded-2xl border border-[var(--border)] bg-transparent p-4 text-sm leading-8 outline-none focus:border-[var(--primary)]"/></section></div></div></main>;
}