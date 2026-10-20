"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileUp, LoaderCircle, RotateCcw, ScanLine } from "lucide-react";
import { jsPDF } from "jspdf";

declare global { interface Window { cv?: any; } }
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const OPENCV = "https://docs.opencv.org/4.8.0/opencv.js";
type Pt = { x: number; y: number };
type Mode = "natural" | "bw" | "color";
function loadScript(id:string,src:string,ready:()=>boolean, waitReady?:()=>Promise<void>) {
  return new Promise<void>((resolve,reject)=>{
    if(ready()){ if(waitReady) waitReady().then(resolve,reject); else resolve(); return; }
    let s=document.getElementById(id) as HTMLScriptElement|null;
    const fail=()=>reject(new Error("کتابخانه پردازش بارگذاری نشد؛ اتصال اینترنت را بررسی کنید."));
    const done=()=>{ if(!ready()){fail();return;} if(waitReady) waitReady().then(resolve,reject); else resolve(); };
    if(!s){s=document.createElement("script");s.id=id;s.src=src;s.async=true;document.head.appendChild(s);}
    s.addEventListener("load",done,{once:true});s.addEventListener("error",fail,{once:true});
  });
}
function cvReady(): Promise<void> {
  return new Promise((resolve,reject)=>{
    const cv=window.cv;
    if(!cv){reject(new Error("OpenCV آماده نیست."));return;}
    if(cv.Mat) {resolve();return;}
    const old=cv.onRuntimeInitialized;
    cv.onRuntimeInitialized=()=>{if(old)old();resolve();};
    window.setTimeout(()=>cv.Mat?resolve():reject(new Error("راه‌اندازی موتور تشخیص سند طول کشید؛ دوباره تلاش کنید.")),45000);
  });
}
function loadCv(){return loadScript("tusan-opencv-js",OPENCV,()=>!!window.cv,cvReady);}
function loadPdfJs(){return loadScript("tusan-pdfjs-scan",PDFJS,()=>!!window.pdfjsLib);}
function download(blob:Blob,name:string){const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;a.click();window.setTimeout(()=>URL.revokeObjectURL(u),2000);}
const defaults:Pt[]=[{x:.04,y:.04},{x:.96,y:.04},{x:.96,y:.96},{x:.04,y:.96}];

function detectCorners(canvas:HTMLCanvasElement):Pt[] {
  const cv=window.cv;
  let src:any=null, gray:any=null, blur:any=null, edges:any=null, contours:any=null, hierarchy:any=null;
  try {
    src=cv.imread(canvas); gray=new cv.Mat(); blur=new cv.Mat(); edges=new cv.Mat(); contours=new cv.MatVector(); hierarchy=new cv.Mat();
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY); cv.GaussianBlur(gray,blur,new cv.Size(5,5),0); cv.Canny(blur,edges,40,120);
    cv.dilate(edges,edges,cv.Mat.ones(3,3,cv.CV_8U));
    cv.findContours(edges,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
    let best:Pt[]|null=null, bestArea=0;
    for(let i=0;i<contours.size();i++){
      const c=contours.get(i); const peri=cv.arcLength(c,true); const approx=new cv.Mat();
      cv.approxPolyDP(c,approx,.025*peri,true);
      if(approx.rows===4){
        const area=Math.abs(cv.contourArea(approx));
        if(area>bestArea && area>canvas.width*canvas.height*.12){
          const pts:Pt[]=[];
          for(let j=0;j<4;j++)pts.push({x:approx.intPtr(j,0)[0]/canvas.width,y:approx.intPtr(j,0)[1]/canvas.height});
          best=orderPoints(pts);bestArea=area;
        }
      }
      c.delete();approx.delete();
    }
    return best ?? defaults;
  } catch { return defaults; }
  finally { [src,gray,blur,edges,contours,hierarchy].forEach(x=>{if(x&&x.delete)x.delete();}); }
}
function orderPoints(p:Pt[]):Pt[]{
  const sum=p.map((v)=>v.x+v.y), diff=p.map(v=>v.y-v.x);
  return [p[sum.indexOf(Math.min(...sum))],p[diff.indexOf(Math.min(...diff))],p[sum.indexOf(Math.max(...sum))],p[diff.indexOf(Math.max(...diff))]];
}
function warpAndEnhance(source:HTMLCanvasElement, points:Pt[], mode:Mode, intensity:number):HTMLCanvasElement {
  const cv=window.cv; const src=cv.imread(source);
  const px=points.map(p=>({x:p.x*source.width,y:p.y*source.height}));
  const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
  const w=Math.max(400,Math.round(Math.max(dist(px[0],px[1]),dist(px[3],px[2]))));
  const h=Math.max(500,Math.round(Math.max(dist(px[0],px[3]),dist(px[1],px[2]))));
  let srcPts:any=null,dstPts:any=null,m:any=null,warped:any=null,gray:any=null,processed:any=null;
  const out=document.createElement("canvas");
  try{
    srcPts=cv.matFromArray(4,1,cv.CV_32FC2,px.flatMap(p=>[p.x,p.y]));
    dstPts=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,w,0,w,h,0,h]);
    m=cv.getPerspectiveTransform(srcPts,dstPts);warped=new cv.Mat();
    cv.warpPerspective(src,warped,m,new cv.Size(w,h),cv.INTER_CUBIC,cv.BORDER_CONSTANT,new cv.Scalar(255,255,255,255));
    if(mode==="color"){
      let lab=new cv.Mat(); cv.cvtColor(warped,lab,cv.COLOR_RGBA2RGB); cv.convertScaleAbs(lab,lab,1+intensity*.9,-intensity*22); cv.cvtColor(lab,warped,cv.COLOR_RGB2RGBA); lab.delete();
      processed=warped;
    } else {
      gray=new cv.Mat(); cv.cvtColor(warped,gray,cv.COLOR_RGBA2GRAY);
      if(mode==="bw") { processed=new cv.Mat(); cv.adaptiveThreshold(gray,processed,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY,31,Math.max(3,12-intensity*8)); }
      else { processed=new cv.Mat(); cv.convertScaleAbs(gray,processed,1+intensity*1.15,-intensity*38); cv.threshold(processed,processed,0,255,cv.THRESH_TOZERO); }
      cv.cvtColor(processed,processed,cv.COLOR_GRAY2RGBA);
    }
    out.width=w;out.height=h;cv.imshow(out,processed);return out;
  } finally { [src,srcPts,dstPts,m,warped,gray,processed].forEach(x=>{if(x&&x.delete)x.delete();}); }
}

export default function PdfScanEnhancer(){
  const inputRef=useRef<HTMLInputElement>(null);const previewRef=useRef<HTMLCanvasElement>(null);const sourceRef=useRef<HTMLCanvasElement|null>(null);
  const [file,setFile]=useState<File|null>(null);const [pageCount,setPageCount]=useState(0);const [pageNo,setPageNo]=useState(1);
  const [corners,setCorners]=useState<Pt[]>(defaults);const [mode,setMode]=useState<Mode>("bw");const [intensity,setIntensity]=useState(.55);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");const [previewUrl,setPreviewUrl]=useState("");
  const [dragIndex,setDragIndex]=useState<number|null>(null);
  useEffect(()=>{let cancelled=false;async function render(){if(!file)return;try{setError("");await loadPdfJs();const lib=(window as any).pdfjsLib;lib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;if(cancelled){await pdf.destroy();return;}setPageCount(pdf.numPages);const page=await pdf.getPage(pageNo);const raw=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(1.5,1100/raw.width)});const c=document.createElement("canvas");c.width=Math.ceil(viewport.width);c.height=Math.ceil(viewport.height);const ctx=c.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("مرورگر امکان نمایش PDF را ندارد.");await page.render({canvasContext:ctx,viewport}).promise;sourceRef.current=c;if(!cancelled){const dest=previewRef.current;if(dest){dest.width=c.width;dest.height=c.height;dest.getContext("2d")?.drawImage(c,0,0);}setCorners(defaults);setPreviewUrl("");}await pdf.destroy();}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"خواندن PDF انجام نشد.");}}void render();return()=>{cancelled=true;};},[file,pageNo]);
  useEffect(()=>{if(!sourceRef.current)return;let active=true;loadCv().then(()=>{if(!active||!sourceRef.current)return;setCorners(detectCorners(sourceRef.current));}).catch(e=>{if(active)setError(e instanceof Error?e.message:"تشخیص گوشه‌ها انجام نشد.");});return()=>{active=false;};},[file,pageNo]);
  const point=(e:React.PointerEvent<HTMLDivElement>)=>{const box=e.currentTarget.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))};};
  const moveCorner=(e:React.PointerEvent<HTMLDivElement>,idx:number)=>{if(dragIndex!==idx)return;const p=point(e);setCorners(prev=>prev.map((v,i)=>i===idx?p:v));};
  const makePreview=async()=>{if(!sourceRef.current)return;try{await loadCv();const out=warpAndEnhance(sourceRef.current,corners,mode,intensity);setPreviewUrl(out.toDataURL("image/jpeg",.9));}catch(e){setError(e instanceof Error?e.message:"ساخت پیش‌نمایش انجام نشد.");}};
  const exportPdf=async()=>{if(!file)return;setBusy(true);setError("");setMessage("در حال پردازش صفحات در مرورگر…");try{await loadPdfJs();await loadCv();const lib=(window as any).pdfjsLib;lib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;let output:jsPDF|null=null;for(let n=1;n<=pdf.numPages;n++){setMessage(`در حال بهبود صفحه ${n} از ${pdf.numPages}…`);const page=await pdf.getPage(n);const vp0=page.getViewport({scale:1});const vp=page.getViewport({scale:Math.min(1.35,1200/vp0.width)});const canvas=document.createElement("canvas");canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("ساخت تصویر صفحه ممکن نشد.");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);await page.render({canvasContext:ctx,viewport:vp}).promise;const pts=n===pageNo?corners:detectCorners(canvas);const result=warpAndEnhance(canvas,pts,mode,intensity);const orient=result.width>result.height?"landscape":"portrait";if(!output)output=new jsPDF({orientation:orient,unit:"pt",format:[result.width,result.height],compress:true});else output.addPage([result.width,result.height],orient);output.addImage(result.toDataURL("image/jpeg",mode==="bw"?.94:.9),"JPEG",0,0,result.width,result.height,undefined,"FAST");canvas.width=1;canvas.height=1;result.width=1;result.height=1;page.cleanup();}await pdf.destroy();if(!output)throw new Error("صفحه‌ای برای خروجی وجود ندارد.");output.save(file.name.replace(/\.pdf$/i,"")+"-enhanced.pdf");setMessage("PDF بهبود یافته دانلود شد. فایل اصلی تغییر نکرد.");}catch(e){setError(e instanceof Error?e.message:"پردازش PDF انجام نشد.");setMessage("");}finally{setBusy(false);}};
  return <section dir="rtl" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
    <div className="mb-5"><h2 className="text-xl font-black">هایلایت و بهبود اسکن PDF</h2><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">گوشه‌های صفحه را تشخیص می‌دهد، امکان اصلاح دستی برش و پرسپکتیو می‌دهد و سپس نور و پس‌زمینه را بهبود می‌دهد. پردازش در مرورگر انجام می‌شود.</p></div>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f){setFile(f);setPageNo(1);setPageCount(0);setError("");setMessage("");setPreviewUrl("");}}}/>
    {!file?<button type="button" onClick={()=>inputRef.current?.click()} className="flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] p-6"><FileUp size={32} className="text-[var(--primary)]"/><span className="mt-3 font-black">انتخاب PDF اسکن‌شده</span><span className="mt-1 text-xs text-[var(--text-muted)]">PDF چندصفحه‌ای پشتیبانی می‌شود</span></button>:<>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold">{file.name}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{pageCount} صفحه · پردازش محلی</div></div><button type="button" onClick={()=>{setFile(null);setPreviewUrl("");setMessage("");setError("");}} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"><RotateCcw size={14}/> تغییر فایل</button></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]"><div><div className="mb-2 flex flex-wrap items-center gap-2"><label className="text-sm font-bold">صفحه برای برش دستی</label><select value={pageNo} onChange={e=>setPageNo(Number(e.target.value))} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">{Array.from({length:pageCount},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select><button type="button" onClick={()=>{setCorners(defaults);setPreviewUrl("");}} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold">بازنشانی گوشه‌ها</button></div>
        <div className="relative mx-auto w-fit max-w-full touch-none overflow-hidden rounded-xl border border-[var(--border)] bg-slate-100" onPointerMove={e=>{if(dragIndex!==null)moveCorner(e,dragIndex);}} onPointerUp={()=>setDragIndex(null)} onPointerCancel={()=>setDragIndex(null)}><canvas ref={previewRef} className="block h-auto max-w-full"/><svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full"><polygon points={corners.map(p=>`${p.x*1000},${p.y*1000}`).join(" ")} fill="rgba(20,184,166,.12)" stroke="#0d9488" strokeWidth="5" vectorEffect="non-scaling-stroke"/></svg>{corners.map((p,i)=><button key={i} type="button" aria-label={`گوشه ${i+1}`} onPointerDown={e=>{e.preventDefault();setDragIndex(i);e.currentTarget.setPointerCapture(e.pointerId);}} className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-teal-600 shadow-md" style={{left:`${p.x*100}%`,top:`${p.y*100}%`}}/> )}</div>
        <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">دستگیره‌های چهارگوشه را روی لبه‌های کاغذ قرار دهید. اگر تشخیص خودکار دقیق نبود، گوشه‌ها را اصلاح کنید.</p>
      </div><aside className="space-y-4"><div><div className="mb-2 text-sm font-black">حالت بهبود</div><div className="grid gap-2">{([{id:"natural",title:"طبیعی",desc:"روشنایی و کنتراست با حفظ جزئیات"},{id:"bw",title:"سیاه‌وسفید اسکنری",desc:"پس‌زمینه روشن و نوشته تیره"},{id:"color",title:"رنگی",desc:"حفظ مهرها و امضاهای رنگی"}] as {id:Mode;title:string;desc:string}[]).map(m=><button key={m.id} type="button" onClick={()=>{setMode(m.id);setPreviewUrl("");}} className={`rounded-xl border p-3 text-right ${mode===m.id?"border-[var(--primary)] bg-[var(--primary)]/10":"border-[var(--border)]"}`}><div className="text-sm font-black">{m.title}</div><div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{m.desc}</div></button>)}</div></div><label className="block text-sm font-bold">شدت بهبود: {Math.round(intensity*100)}٪<input type="range" min="0" max="1" step=".05" value={intensity} onChange={e=>{setIntensity(Number(e.target.value));setPreviewUrl("");}} className="mt-3 w-full"/></label><button type="button" onClick={()=>void makePreview()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--primary)] px-4 py-3 text-sm font-black text-[var(--primary)]"><ScanLine size={17}/> پیش‌نمایش نتیجه</button></aside></div>
      {previewUrl&&<div className="mt-5 rounded-2xl border border-[var(--border)] p-3"><div className="mb-2 text-sm font-black">پیش‌نمایش خروجی صفحه {pageNo}</div><img src={previewUrl} alt="پیش‌نمایش بهبود اسکن" className="mx-auto max-h-[560px] max-w-full rounded-lg object-contain"/></div>}
      <button type="button" disabled={busy} onClick={()=>void exportPdf()} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 font-black text-white disabled:opacity-50">{busy?<LoaderCircle className="animate-spin" size={18}/>:<Download size={18}/>} پردازش همه صفحات و دانلود PDF</button>
    </>}
    {message&&<p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{message}</p>}{error&&<p role="alert" className="mt-4 text-sm leading-6 text-red-600">{error}</p>}
    <div className="mt-5 rounded-2xl border border-amber-300/60 bg-amber-50/60 p-4 text-xs leading-6 text-amber-900">برای جلوگیری از حذف ناخواسته محتوا، برش خودکار را بررسی کنید. خروجی صفحات پردازش‌شده تصویری است؛ ممکن است متن قابل جست‌وجو، فرم‌های تعاملی و لایه‌های اصلی PDF حفظ نشوند. برای فایل‌های حساس، ابتدا از نسخه پشتیبان استفاده کنید.</div>
  </section>;
}
