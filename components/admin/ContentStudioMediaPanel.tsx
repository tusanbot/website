"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Film, Mic2, Music2, Trash2, Upload } from "lucide-react";
import html2canvas from "html2canvas";
import { encodeSlideSequence } from "@/lib/video/ffmpeg";

type AudioItem = { file: File; duration: number; name: string };
type SlideCapture = { file: File; duration: number; audio?: File };
const DB_NAME = "tusan-content-studio";
const STORE = "audio-inbox";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readLatestStudioAudio(): Promise<{ blob: Blob; text?: string } | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get("latest");
    req.onsuccess = () => resolve(req.result ? { blob: req.result.blob, text: req.result.text } : null);
    req.onerror = () => reject(req.error);
  });
}

function wait(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

function findPreview(): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("body *"));
  let best: HTMLElement | null = null;
  let bestArea = 0;
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width < 220 || r.height < 320 || r.height > 1300) continue;
    const ratio = r.width / r.height;
    if (ratio < 0.50 || ratio > 0.66) continue;
    const area = r.width * r.height;
    if (area > bestArea) { best = el; bestArea = area; }
  }
  return best;
}

function readSlideState() {
  const text = document.body.innerText;
  const m = text.match(/(?:در حال پخش\s*·\s*)?(\d+)\s*\/\s*(\d+)/);
  const d = text.match(/(\d+(?:[.,]\d+)?)\s*ثانیه/);
  return { index: m ? Number(m[1]) - 1 : 0, count: m ? Number(m[2]) : 1, duration: d ? Number(d[1].replace(",", ".")) : 3 };
}

async function goToSlide(index: number) {
  for (let i = 0; i < 30; i++) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await wait(20);
  }
  for (let i = 0; i < index; i++) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await wait(60);
  }
  await wait(180);
}

function canvasToFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      blob => blob
        ? resolve(new File([blob], name, { type: "image/png" }))
        : reject(new Error("ساخت تصویر اسلاید ناموفق بود.")),
      "image/png",
    );
  });
}

export default function ContentStudioMediaPanel({ children }: { children: ReactNode }) {
  const [slideCount, setSlideCount] = useState(1);
  const [current, setCurrent] = useState(0);
  const [enabled, setEnabled] = useState<boolean[]>([true]);
  const [audios, setAudios] = useState<Record<number, AudioItem>>({});
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    const sync = () => {
      const state = readSlideState();
      setSlideCount(state.count);
      setCurrent(state.index);
      setEnabled(prev => Array.from({ length: state.count }, (_, i) => prev[i] ?? true));
    };
    sync();
    const timer = window.setInterval(sync, 500);
    return () => window.clearInterval(timer);
  }, []);

  const enabledCount = useMemo(() => enabled.filter(Boolean).length, [enabled]);

  async function importLatestTts() {
    try {
      const item = await readLatestStudioAudio();
      if (!item) { setMessage("هنوز صوتی از ابزار تبدیل متن به صوت ارسال نشده است."); return; }
      const file = new File([item.blob], "تولید-شده-از-تبدیل-متن-به-صوت.wav", { type: item.blob.type || "audio/wav" });
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        setAudios(prev => ({ ...prev, [current]: { file, duration: Number.isFinite(audio.duration) ? audio.duration : 3, name: file.name } }));
        URL.revokeObjectURL(audio.src);
        setMessage(`صوت آخر ابزار TTS به اسلاید ${current + 1} متصل شد.`);
      };
    } catch { setMessage("خواندن صوت ذخیره‌شده ناموفق بود."); }
  }

  function attachAudio(index: number, file?: File) {
    if (!file) return;
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      setAudios(prev => ({ ...prev, [index]: { file, duration: Number.isFinite(audio.duration) ? audio.duration : 3, name: file.name } }));
      URL.revokeObjectURL(audio.src);
    };
  }

  async function exportVideo() {
    if (exporting) return;
    setExporting(true); setProgress(0); setMessage("در حال آماده‌سازی اسلایدها...");
    try {
      const captures: SlideCapture[] = [];
      const preview = findPreview();
      if (!preview) throw new Error("پیش‌نمایش اسلاید پیدا نشد.");
      let captured = 0;
      for (let i = 0; i < slideCount; i++) {
        if (!enabled[i]) continue;
        await goToSlide(i);
        const state = readSlideState();
        const canvas = await html2canvas(findPreview() || preview, { scale: 1.5, backgroundColor: null, useCORS: true, logging: false });
        const file = await canvasToFile(canvas, `slide-${String(i + 1).padStart(3, "0")}.png`);
        const audio = audios[i];
        captures.push({ file, duration: audio?.duration || state.duration || 3, audio: audio?.file });
        captured++;
        setProgress(Math.round((captured / Math.max(enabledCount, 1)) * 55));
      }
      if (!captures.length) throw new Error("حداقل یک اسلاید فعال لازم است.");
      setMessage("در حال ساخت ویدیوی MP4 با صوت و زمان‌بندی اسلایدها...");
      const output = await encodeSlideSequence(captures, setProgress);
      const url = URL.createObjectURL(output);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tusan-reel-${Date.now()}.mp4`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setProgress(100); setMessage("ویدیو آماده شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ساخت ویدیو ناموفق بود.");
    } finally { setExporting(false); }
  }

  return <div className="space-y-4">
    {children}
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2 font-bold"><Film className="h-5 w-5" /> خروجی ویدیو و صوت</div><p className="mt-1 text-xs text-slate-600">اسلایدهای فعال به ویدیوی عمودی MP4 تبدیل می‌شوند و صوت هر اسلاید زمان آن را تعیین می‌کند.</p></div>
        <button onClick={exportVideo} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" />{exporting ? `در حال ساخت ${progress}%` : "ساخت ویدیو MP4"}</button>
      </div>
      {message && <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm">{message}</div>}
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={importLatestTts} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"><Mic2 className="h-4 w-4 text-emerald-600" /> اتصال آخرین صوت TTS به اسلاید {current + 1}</button><a href="/tools/text-to-speech" target="_blank" rel="noreferrer" className="rounded-xl border bg-white px-4 py-2 text-sm">باز کردن ابزار تبدیل متن به صوت</a></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: slideCount }, (_, i) => <div key={i} className={`rounded-xl border bg-white p-3 ${current === i ? "ring-2 ring-emerald-500" : ""}`}>
          <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={enabled[i] ?? true} onChange={e => setEnabled(prev => prev.map((v, n) => n === i ? e.target.checked : v))} /> اسلاید {i + 1}</label><button title="حذف صوت" onClick={() => setAudios(prev => { const next = { ...prev }; delete next[i]; return next; })} className="rounded-lg p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
          <div className="mt-2 text-xs text-slate-500">{audios[i] ? `🎙️ ${audios[i].name} · ${audios[i].duration.toFixed(1)} ثانیه` : "بدون صوت؛ زمان متن/پیش‌نمایش"}</div>
          <input ref={el => { fileRefs.current[i] = el; }} type="file" accept="audio/*" className="hidden" onChange={e => attachAudio(i, e.target.files?.[0])} />
          <button onClick={() => fileRefs.current[i]?.click()} className="mt-2 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"><Upload className="h-3.5 w-3.5" /> انتخاب صوت</button>
          {current === i && <span className="mr-2 inline-flex items-center gap-1 text-xs text-emerald-700"><Music2 className="h-3.5 w-3.5" /> انتخاب‌شده</span>}
        </div>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600"><span>{enabledCount} اسلاید فعال</span><span>·</span><span>صوت هر اسلاید مستقل</span><span>·</span><span>خروجی 1080×1920</span></div>
      <div className="mt-3 rounded-xl border bg-white px-3 py-2 text-xs">اسلایدهای غیرفعال از خروجی ویدیو حذف می‌شوند؛ صوت انتخاب‌شده برای هر اسلاید، زمان همان اسلاید را تعیین می‌کند.</div>
    </section>
  </div>;
}
