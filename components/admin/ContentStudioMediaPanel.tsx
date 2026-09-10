"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Film, Mic2, Play, Pause, Plus, Trash2, Upload } from "lucide-react";
import html2canvas from "html2canvas-pro";
import { encodeSlideSequence } from "@/lib/video/ffmpeg";

type Slot = { id: string; sourceIndex: number; enabled: boolean };
type Segment = { start: number; end: number };
type SlideCapture = { file: File; duration: number; audio?: File; audioStart?: number; audioEnd?: number };
const uid = () => Math.random().toString(36).slice(2, 10);
const voices = [["Kore", "Kore"], ["Puck", "Puck"], ["Charon", "Charon"], ["Fenrir", "Fenrir"], ["Aoede", "Aoede"]] as const;
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

function wait(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
function findPreview(): HTMLElement | null {
  let best: HTMLElement | null = null; let bestArea = 0;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
    const r = el.getBoundingClientRect();
    if (r.width < 220 || r.height < 320 || r.height > 1300) continue;
    const ratio = r.width / r.height; if (ratio < 0.50 || ratio > 0.66) continue;
    const area = r.width * r.height; if (area > bestArea) { best = el; bestArea = area; }
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
  for (let i = 0; i < 40; i++) { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); await wait(12); }
  for (let i = 0; i < index; i++) { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); await wait(55); }
  await wait(140);
}
function canvasToFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], name, { type: "image/png" })) : reject(new Error("ساخت تصویر اسلاید ناموفق بود.")), "image/png"));
}
function equalSegments(count: number, total: number): Segment[] {
  const safe = Math.max(0.1, total); return Array.from({ length: count }, (_, i) => ({ start: safe * i / count, end: safe * (i + 1) / count }));
}
function formatTime(value: number) { return value < 60 ? `${value.toFixed(2)} ثانیه` : `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`; }

export default function ContentStudioMediaPanel({ children }: { children: ReactNode }) {
  const [editorCount, setEditorCount] = useState(1);
  const [current, setCurrent] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([{ id: uid(), sourceIndex: 0, enabled: true }]);
  const [segments, setSegments] = useState<Segment[]>([{ start: 0, end: 3 }]);
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioDuration, setAudioDuration] = useState(0);
  const [ttsText, setTtsText] = useState("");
  const [voice, setVoice] = useState<(typeof voices)[number][0]>("Kore");
  const [speed, setSpeed] = useState(1);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => { const s = readSlideState(); setEditorCount(s.count); setCurrent(s.index); setSlots(prev => Array.from({ length: Math.max(s.count, prev.length) }, (_, i) => prev[i] ?? { id: uid(), sourceIndex: Math.min(i, s.count - 1), enabled: true })); };
    sync(); const timer = window.setInterval(sync, 500); return () => window.clearInterval(timer);
  }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed, audioUrl]);
  useEffect(() => { if (audioDuration > 0) setSegments(prev => prev.length === slots.length && Math.abs(prev[prev.length - 1].end - audioDuration) < 0.05 ? prev : equalSegments(slots.length, audioDuration)); }, [audioDuration, slots.length]);

  const enabledCount = useMemo(() => slots.filter(x => x.enabled).length, [slots]);
  const totalDuration = audioDuration || (segments[segments.length - 1]?.end || 0);

  function setSegment(index: number, key: "start" | "end", value: number) {
    setSegments(prev => prev.map((s, i) => i === index ? { ...s, [key]: value } : s));
  }
  function addSlide() {
    const sourceIndex = Math.min(editorCount - 1, current);
    setSlots(prev => [...prev, { id: uid(), sourceIndex, enabled: true }]);
    setSelected(slots.length);
    setMessage("اسلاید خروجی جدید اضافه شد؛ محتوای آن از اسلاید جاری کپی می‌شود.");
  }
  function deleteSlide(index: number) {
    if (slots.length <= 1) { setMessage("حداقل یک اسلاید باید باقی بماند."); return; }
    setSlots(prev => prev.filter((_, i) => i !== index));
    setSegments(prev => prev.filter((_, i) => i !== index));
    setSelected(Math.max(0, Math.min(selected, slots.length - 2)));
  }
  function toggleSlide(index: number) { setSlots(prev => prev.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s)); }

  async function generateTts() {
    if (!ttsText.trim()) return;
    setTtsLoading(true); setMessage("");
    try {
      const res = await fetch("/api/ai/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: ttsText, voice, speed }) });
      const data = await res.json();
      if (res.status === 401) { window.location.href = `/tools/ai-profile?returnTo=${encodeURIComponent('/admin/content-studio')}`; return; }
      if (!res.ok) throw new Error(data.error || "تبدیل متن به صوت انجام نشد.");
      const bytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
      const file = new File([blob], "تولید-شده-در-استودیو.wav", { type: blob.type });
      const url = URL.createObjectURL(file); const probe = document.createElement("audio"); probe.preload = "metadata"; probe.src = url;
      probe.onloadedmetadata = () => { const duration = Number.isFinite(probe.duration) ? probe.duration : 3; setAudio(file); setAudioUrl(url); setAudioDuration(duration); setPlaying(false); setMessage(`صوت ${duration.toFixed(2)} ثانیه‌ای آماده شد. حالا مرز اسلایدها را روی نوار زمان تنظیم کن.`); };
    } catch (e) { setMessage(e instanceof Error ? e.message : "تولید صوت ناموفق بود."); }
    finally { setTtsLoading(false); }
  }
  function attachAudio(file?: File) {
    if (!file) return; const url = URL.createObjectURL(file); const probe = document.createElement("audio"); probe.preload = "metadata"; probe.src = url;
    probe.onloadedmetadata = () => { setAudio(file); setAudioUrl(url); setAudioDuration(Number.isFinite(probe.duration) ? probe.duration : 3); };
  }
  function seekTo(value: number) { if (audioRef.current) { audioRef.current.currentTime = value; if (!playing) audioRef.current.play().then(() => setPlaying(true)).catch(() => undefined); } }
  function togglePlay() { const el = audioRef.current; if (!el) return; if (el.paused) el.play().then(() => setPlaying(true)).catch(() => undefined); else { el.pause(); setPlaying(false); } }

  async function exportVideo() {
    if (exporting) return; setExporting(true); setProgress(0); setMessage("در حال آماده‌سازی خروجی...");
    try {
      const preview = findPreview(); if (!preview) throw new Error("پیش‌نمایش اسلاید پیدا نشد.");
      const captures: SlideCapture[] = []; const active = slots.map((s, i) => ({ s, i })).filter(x => x.s.enabled);
      for (let n = 0; n < active.length; n++) {
        const { s, i } = active[n]; const source = Math.max(0, Math.min(editorCount - 1, s.sourceIndex)); await goToSlide(source);
        const state = readSlideState(); const canvas = await html2canvas(findPreview() || preview, { scale: 1.5, backgroundColor: null, useCORS: true, logging: false });
        const file = await canvasToFile(canvas, `slide-${String(i + 1).padStart(3, "0")}.png`); const seg = segments[i] || { start: 0, end: state.duration || 3 }; const duration = Math.max(0.5, seg.end - seg.start);
        captures.push(audio ? { file, duration, audio, audioStart: seg.start, audioEnd: seg.end } : { file, duration }); setProgress(Math.round((n + 1) / Math.max(active.length, 1) * 50));
      }
      if (!captures.length) throw new Error("حداقل یک اسلاید فعال لازم است.");
      setMessage("در حال ساخت MP4..."); const output = await encodeSlideSequence(captures, setProgress); const url = URL.createObjectURL(output); const a = document.createElement("a"); a.href = url; a.download = `tusan-reel-${Date.now()}.mp4`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); setProgress(100); setMessage("ویدیو آماده شد.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "ساخت ویدیو ناموفق بود."); }
    finally { setExporting(false); }
  }

  const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-orange-500", "bg-rose-500", "bg-cyan-500", "bg-amber-500", "bg-fuchsia-500"];
  return <div className="space-y-4">
    {children}
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 font-bold"><Film className="h-5 w-5" /> تدوین ویدیو + صوت</div><p className="mt-1 text-xs text-slate-600">ابزار تبدیل متن به صوت داخل همین استودیو قرار گرفته و زمان‌بندی با نوار صوت انجام می‌شود.</p></div><button onClick={exportVideo} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" />{exporting ? `در حال ساخت ${progress}%` : "ساخت ویدیو MP4"}</button></div>
      {message && <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm">{message}</div>}

      <div className="mt-4 rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center gap-2 font-bold"><Mic2 className="h-5 w-5 text-emerald-600" /> تبدیل متن به صوت</div>
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_120px_auto]"><textarea value={ttsText} onChange={e => setTtsText(e.target.value)} maxLength={8000} placeholder="متن کامل صوت این ویدیو را وارد کن..." className="min-h-24 rounded-xl border p-3" /><select value={voice} onChange={e => setVoice(e.target.value as typeof voice)} className="rounded-xl border bg-white px-3"><option value="Kore">Kore</option><option value="Puck">Puck</option><option value="Charon">Charon</option><option value="Fenrir">Fenrir</option><option value="Aoede">Aoede</option></select><select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="rounded-xl border bg-white px-3">{speeds.map(v => <option key={v} value={v}>{v}×</option>)}</select><button onClick={generateTts} disabled={ttsLoading || !ttsText.trim()} className="rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50">{ttsLoading ? "در حال ساخت..." : "تولید صوت"}</button></div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => attachAudio(e.target.files?.[0])} /><button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm"><Upload className="h-4 w-4" /> انتخاب فایل صوتی</button>{audioUrl && <><button onClick={togglePlay} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "توقف" : "پخش"}</button><span className="text-xs text-slate-500">مدت صوت: {formatTime(audioDuration)}</span><audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="hidden" /></>}</div>
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-bold">نوار زمان و تقسیم صوت بین اسلایدها</div><p className="mt-1 text-xs text-slate-500">مثلاً ۰ تا ۳٫۷ ثانیه برای اسلاید ۱. برای دقت، شروع و پایان هر بخش را با گام ۰٫۰۱ ثانیه تنظیم کن.</p></div><button onClick={addSlide} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4" /> افزودن اسلاید</button></div>
        {audioDuration > 0 ? <div className="mt-4"><div className="relative h-16 overflow-hidden rounded-xl border bg-slate-100" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(Math.max(0, Math.min(audioDuration, (e.clientX - r.left) / r.width * audioDuration))); }}>{segments.map((seg, i) => { const left = seg.start / audioDuration * 100; const width = Math.max(1, (seg.end - seg.start) / audioDuration * 100); return <button key={i} onClick={e => { e.stopPropagation(); setSelected(i); seekTo(seg.start); }} className={`absolute inset-y-0 ${colors[i % colors.length]} ${i === selected ? "ring-4 ring-white/70" : "opacity-80"}`} style={{ left: `${left}%`, width: `${width}%` }}><span className="text-xs font-bold text-white">اسلاید {i + 1}</span></button>; })}<div className="pointer-events-none absolute inset-y-0 border-l-2 border-slate-900" style={{ left: `${((audioRef.current?.currentTime || 0) / audioDuration) * 100}%` }} /></div><div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>۰:۰۰</span><span>{formatTime(audioDuration)}</span></div>
          {slots.map((slot, i) => { const seg = segments[i] || { start: 0, end: audioDuration }; return <div key={slot.id} className={`mt-2 rounded-xl border p-3 ${selected === i ? "ring-2 ring-emerald-500" : ""}`}><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={slot.enabled} onChange={() => toggleSlide(i)} /> اسلاید {i + 1}</label><select value={slot.sourceIndex} onChange={e => setSlots(prev => prev.map((s, n) => n === i ? { ...s, sourceIndex: Number(e.target.value) } : s))} className="rounded-lg border bg-white px-2 py-1 text-xs">{Array.from({ length: editorCount }, (_, n) => <option key={n} value={n}>محتوای اسلاید {n + 1}</option>)}</select><button onClick={() => deleteSlide(i)} className="mr-auto rounded-lg p-1.5 text-slate-400 hover:text-red-600" title="حذف اسلاید از خروجی"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs">شروع: <b>{formatTime(seg.start)}</b><input type="range" min={0} max={audioDuration} step={0.01} value={seg.start} onChange={e => setSegment(i, "start", Math.min(Number(e.target.value), seg.end - 0.05))} className="w-full" /></label><label className="text-xs">پایان: <b>{formatTime(seg.end)}</b><input type="range" min={0} max={audioDuration} step={0.01} value={seg.end} onChange={e => setSegment(i, "end", Math.max(Number(e.target.value), seg.start + 0.05))} className="w-full" /></label></div></div>; })}
        </div> : <div className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">ابتدا یک صوت تولید یا انتخاب کن تا نوار زمان فعال شود.</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600"><span>{enabledCount} اسلاید فعال</span><span>·</span><span>{slots.length} اسلاید در خروجی</span><span>·</span><span>1080×1920 MP4</span></div>
    </section>
  </div>;
}
