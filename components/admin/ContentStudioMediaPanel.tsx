"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Film, Mic2, Pause, Play, Plus, Trash2, Upload } from "lucide-react";
import html2canvas from "html2canvas";
import { encodeSlideSequence } from "@/lib/video/ffmpeg";

type Slot = { id: string; sourceIndex: number; enabled: boolean };
type Segment = { start: number; end: number };
type SlideCapture = { file: File; duration: number; audio?: File; audioStart?: number; audioEnd?: number };
type TimelineItem = { slotIndex: number; slot: Slot; segment: Segment; start: number; end: number };
type StudioTransition = "zoom" | "slide" | "blur" | "pop";

const uid = () => Math.random().toString(36).slice(2, 10);
const voices = [["Kore", "Kore"], ["Puck", "Puck"], ["Charon", "Charon"], ["Fenrir", "Fenrir"], ["Aoede", "Aoede"]] as const;
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

function wait(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
function findStageFrame(): HTMLElement | null { return document.querySelector<HTMLElement>(".stage-frame"); }
function getStageIndex() {
  const root = document.querySelector<HTMLElement>(".stage-controls");
  const match = root?.innerText.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return Number.isFinite(index) ? index : null;
}
function readTransition(): StudioTransition {
  const select = document.querySelector<HTMLElement>("main select");
  const value = select instanceof HTMLSelectElement ? select.value : "zoom";
  return value === "slide" || value === "blur" || value === "pop" || value === "zoom" ? value : "zoom";
}
function stageButtons() {
  const root = document.querySelector<HTMLElement>(".stage-controls");
  return root ? Array.from(root.querySelectorAll<HTMLButtonElement>("button")) : [];
}
async function goToSlide(index: number) {
  const buttons = stageButtons();
  const previous = buttons[0];
  const next = buttons[2];
  if (!previous || !next) throw new Error("کنترل اسلاید برای خروجی پیدا نشد.");
  const target = Math.max(0, index);
  for (let attempt = 0; attempt < 50; attempt++) {
    const current = getStageIndex();
    if (current === target) return;
    if (current == null || current > target) previous.click();
    else next.click();
    await wait(90);
  }
  if (getStageIndex() !== target) throw new Error(`اسلاید ${target + 1} برای خروجی انتخاب نشد.`);
}
async function waitForStableRender() {
  try { await document.fonts?.ready; } catch {}
  await wait(350);
}
function canvasToFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], name, { type: "image/png" })) : reject(new Error("ساخت تصویر اسلاید ناموفق بود.")), "image/png"));
}
function equalSegments(count: number, total: number): Segment[] {
  const safeCount = Math.max(1, count);
  const safe = Math.max(0.5, total);
  return Array.from({ length: safeCount }, (_, i) => ({ start: safe * i / safeCount, end: safe * (i + 1) / safeCount }));
}
function formatTime(value: number) { return value < 60 ? `${value.toFixed(2)} ثانیه` : `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`; }
function errorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") { try { const text = JSON.stringify(error); if (text && text !== "{}") return text; } catch {} }
  return fallback;
}

export default function ContentStudioMediaPanel({ children }: { children: ReactNode }) {
  const [editorCount, setEditorCount] = useState(1);
  const [current, setCurrent] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([{ id: uid(), sourceIndex: 0, enabled: true }]);
  const [segments, setSegments] = useState<Segment[]>([{ start: 0, end: 3 }]);
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
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
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncEditorState = () => {
      const s = getStageIndex();
      const root = document.querySelector<HTMLElement>(".stage-controls");
      const totalText = root?.innerText.match(/(\d+)\s*\/\s*(\d+)/)?.[2];
      const count = totalText ? Number(totalText) : 1;
      setEditorCount(Math.max(1, count));
      setCurrent(Math.max(0, Math.min(count - 1, s ?? 0)));
    };
    syncEditorState();
    const timer = window.setInterval(syncEditorState, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed, audioUrl]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    let cursor = 0;
    return slots.map((slot, slotIndex) => {
      const segment = segments[slotIndex] || { start: cursor, end: cursor + 3 };
      const duration = Math.max(0.5, segment.end - segment.start);
      const item = { slot, slotIndex, segment, start: cursor, end: cursor + duration };
      cursor += duration;
      return item;
    });
  }, [slots, segments]);

  const activeItems = useMemo(() => timelineItems.filter(item => item.slot.enabled), [timelineItems]);
  const timelineDuration = useMemo(() => timelineItems.reduce((sum, item) => sum + Math.max(0, item.segment.end - item.segment.start), 0), [timelineItems]);
  const totalDuration = timelineDuration || audioDuration || 0;

  function seekTo(value: number) {
    if (!audioRef.current) {
      const index = timelineItems.findIndex(item => value >= item.start && value <= item.end);
      if (index >= 0) setSelected(index);
      return;
    }
    const next = Math.max(0, Math.min(audioDuration || timelineDuration || value, value));
    audioRef.current.currentTime = next;
    setAudioCurrentTime(next);
    if (!playing) audioRef.current.play().then(() => setPlaying(true)).catch(() => undefined);
  }
  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setPlaying(true)).catch(() => undefined); else { el.pause(); setPlaying(false); }
  }
  function pointerTime(clientX: number) {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !timelineDuration) return 0;
    return Math.max(0, Math.min(timelineDuration, ((clientX - rect.left) / rect.width) * timelineDuration));
  }
  function moveBoundary(boundaryIndex: number, clientX: number) {
    const visible = pointerTime(clientX);
    const leftItem = timelineItems[boundaryIndex];
    const rightItem = timelineItems[boundaryIndex + 1];
    if (!leftItem || !rightItem) return;
    const minBoundary = leftItem.start + 0.5;
    const maxBoundary = leftItem.end + (rightItem.end - rightItem.start) - 0.5;
    const target = Math.max(minBoundary, Math.min(maxBoundary, visible));
    const leftDuration = target - leftItem.start;
    const rightDuration = rightItem.end - target;
    if (leftDuration < 0.5 || rightDuration < 0.5) return;
    setSegments(prev => prev.map((segment, index) => {
      if (index === leftItem.slotIndex) return { start: segment.start, end: segment.start + leftDuration };
      if (index === rightItem.slotIndex) {
        const shift = leftDuration - (leftItem.end - leftItem.start);
        return { start: segment.start + shift, end: segment.start + shift + rightDuration };
      }
      return segment;
    }));
  }
  function startBoundaryDrag(boundaryIndex: number, event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const move = (e: PointerEvent) => moveBoundary(boundaryIndex, e.clientX);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }
  function addSlide() {
    const sourceIndex = Math.min(Math.max(0, editorCount - 1), current);
    setSlots(prev => [...prev, { id: uid(), sourceIndex, enabled: true }]);
    setSegments(prev => {
      const last = prev[prev.length - 1];
      const duration = Math.max(0.5, last ? last.end - last.start : 3);
      if (audioDuration > 0 && last) {
        const lastDuration = last.end - last.start;
        const split = Math.max(last.start + 0.5, last.end - Math.max(0.5, Math.min(1, lastDuration / 2)));
        return [...prev.slice(0, -1), { ...last, end: split }, { start: split, end: audioDuration }];
      }
      const end = last?.end || 0;
      return [...prev, { start: end, end: end + duration }];
    });
    setSelected(slots.length);
    setMessage("اسلاید جدید فقط در تایم‌لاین ایجاد شد؛ مدت آن مستقل است.");
  }
  function deleteSlide(index: number) {
    if (slots.length <= 1) { setMessage("حداقل یک اسلاید باید باقی بماند."); return; }
    setSlots(prev => prev.filter((_, i) => i !== index));
    setSegments(prev => {
      const removed = prev[index] ? Math.max(0.5, prev[index].end - prev[index].start) : 0;
      const remaining = prev.filter((_, i) => i !== index);
      if (!remaining.length) return [];
      const receiver = index > 0 ? index - 1 : 0;
      const durations = remaining.map(s => Math.max(0.5, s.end - s.start));
      durations[receiver] += removed;
      let cursor = 0;
      return durations.map(duration => { const next = { start: cursor, end: cursor + duration }; cursor = next.end; return next; });
    });
    setSelected(prev => Math.max(0, Math.min(prev > index ? prev - 1 : prev, slots.length - 2)));
    setMessage("اسلاید حذف شد و زمان آن به اسلاید مجاور منتقل شد.");
  }
  function toggleSlide(index: number) { setSlots(prev => prev.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s)); }

  function applyAudio(file: File, url: string, duration: number) {
    setAudio(file);
    setAudioUrl(url);
    setAudioDuration(duration);
    setAudioCurrentTime(0);
    setPlaying(false);
    setSegments(equalSegments(slots.length, duration));
  }
  async function generateTts() {
    if (!ttsText.trim()) return;
    setTtsLoading(true); setMessage("");
    try {
      const res = await fetch("/api/ai/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: ttsText, voice, speed }) });
      const data = await res.json();
      if (res.status === 401) { window.location.href = `/tools/ai-profile?returnTo=${encodeURIComponent('/content-studio')}`; return; }
      if (!res.ok) throw new Error(data.error || "تبدیل متن به صوت انجام نشد.");
      const bytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
      const file = new File([blob], "تولید-شده-در-استودیو.wav", { type: blob.type });
      const url = URL.createObjectURL(file);
      const probe = document.createElement("audio"); probe.preload = "metadata"; probe.src = url;
      probe.onloadedmetadata = () => { const duration = Number.isFinite(probe.duration) ? probe.duration : 3; applyAudio(file, url, duration); setMessage(`صوت ${duration.toFixed(2)} ثانیه‌ای آماده شد و تایم‌لاین بر اساس مدت صوت تقسیم شد.`); };
    } catch (e) { setMessage(errorText(e, "تولید صوت ناموفق بود.")); } finally { setTtsLoading(false); }
  }
  function attachAudio(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = document.createElement("audio"); probe.preload = "metadata"; probe.src = url;
    probe.onloadedmetadata = () => { const duration = Number.isFinite(probe.duration) ? probe.duration : 3; applyAudio(file, url, duration); setMessage(`صوت ${duration.toFixed(2)} ثانیه‌ای اضافه شد.`); };
  }

  async function exportVideo() {
    if (exporting) return;
    setExporting(true); setProgress(0); setMessage("در حال آماده‌سازی خروجی...");
    let stage = "capture";
    try {
      if (!findStageFrame()) throw new Error("پیش‌نمایش اسلاید پیدا نشد.");
      const captures: SlideCapture[] = [];
      const active = activeItems;
      for (let n = 0; n < active.length; n++) {
        const item = active[n];
        const source = Math.max(0, Math.min(editorCount - 1, item.slot.sourceIndex));
        await goToSlide(source);
        await waitForStableRender();
        const currentFrame = findStageFrame();
        if (!currentFrame || getStageIndex() !== source) throw new Error(`اسلاید ${source + 1} برای ثبت تصویر آماده نشد.`);
        const canvas = await html2canvas(currentFrame, {
          scale: 2,
          backgroundColor: null,
          useCORS: true,
          logging: false,
          removeContainer: true,
          onclone: clonedDocument => {
            const style = clonedDocument.createElement("style");
            style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;transform:none!important;filter:none!important;caret-color:transparent!important;}";
            clonedDocument.head.appendChild(style);
          },
        });
        const file = await canvasToFile(canvas, `slide-${String(n + 1).padStart(3, "0")}.png`);
        const rawDuration = Math.max(0.5, item.segment.end - item.segment.start);
        captures.push(audio ? { file, duration: rawDuration, audio, audioStart: item.segment.start, audioEnd: item.segment.end } : { file, duration: rawDuration });
        setProgress(Math.round((n + 1) / Math.max(active.length, 1) * 50));
      }
      if (!captures.length) throw new Error("حداقل یک اسلاید فعال لازم است.");
      const transition = readTransition();
      stage = "ffmpeg";
      setMessage("در حال ساخت MP4... ممکن است چند لحظه طول بکشد.");
      const output = await encodeSlideSequence(captures, setProgress, transition);
      stage = "download";
      const url = URL.createObjectURL(output);
      const a = document.createElement("a"); a.href = url; a.download = `tusan-reel-${Date.now()}.mp4`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setProgress(100); setMessage("ویدیو آماده شد.");
    } catch (e) { setMessage(`مرحله ${stage}: ${errorText(e, "ساخت ویدیو ناموفق بود.")}`); } finally { setExporting(false); }
  }

  const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-orange-500", "bg-rose-500", "bg-cyan-500", "bg-amber-500", "bg-fuchsia-500"];
  return <div className="space-y-4">{children}<section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 font-bold"><Film className="h-5 w-5" /> تدوین ویدیو + صوت</div><p className="mt-1 text-xs text-slate-600">تایم‌لاین منبع اصلی اسلایدهای خروجی است؛ اسلاید جدید فقط با افزودن دستی ساخته می‌شود و زمان آن مستقل است.</p></div><button onClick={exportVideo} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" />{exporting ? `در حال ساخت ${progress}%` : "ساخت ویدیو MP4"}</button></div>
    {message && <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm">{message}</div>}
    <div className="mt-4 rounded-2xl border bg-white p-4"><div className="mb-3 flex items-center gap-2 font-bold"><Mic2 className="h-5 w-5 text-emerald-600" /> تبدیل متن به صوت</div><div className="grid gap-3 lg:grid-cols-[1fr_160px_120px_auto]"><textarea value={ttsText} onChange={e => setTtsText(e.target.value)} maxLength={8000} placeholder="متن کامل صوت این ویدیو را وارد کن..." className="min-h-24 rounded-xl border p-3" /><select value={voice} onChange={e => setVoice(e.target.value as typeof voice)} className="rounded-xl border bg-white px-3"><option value="Kore">Kore</option><option value="Puck">Puck</option><option value="Charon">Charon</option><option value="Fenrir">Fenrir</option><option value="Aoede">Aoede</option></select><select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="rounded-xl border bg-white px-3">{speeds.map(v => <option key={v} value={v}>{v}×</option>)}</select><button onClick={generateTts} disabled={ttsLoading || !ttsText.trim()} className="rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50">{ttsLoading ? "در حال ساخت..." : "تولید صوت"}</button></div><div className="mt-3 flex flex-wrap items-center gap-2"><input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => attachAudio(e.target.files?.[0])} /><button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm"><Upload className="h-4 w-4" /> انتخاب فایل صوتی</button>{audioUrl && <><button onClick={togglePlay} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "توقف" : "پخش"}</button><span className="text-xs text-slate-500">مدت صوت: {formatTime(audioDuration)}</span><audio ref={audioRef} src={audioUrl} onTimeUpdate={e => setAudioCurrentTime(e.currentTarget.currentTime)} onEnded={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="hidden" /></>}</div></div>
    <div className="mt-4 rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-bold">نوار زمان و تقسیم زمان بین اسلایدها</div><p className="mt-1 text-xs text-slate-500">اسلایدهای این بخش دستی ساخته می‌شوند. اسلایدهای غیرفعال در تایم‌لاین دیده می‌شوند اما وارد خروجی نمی‌شوند. گیره بین دو اسلاید زمان هر دو را تغییر می‌دهد.</p></div><button onClick={addSlide} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4" /> افزودن اسلاید</button></div>
      <div ref={timelineRef} className="relative mt-4 h-20 select-none overflow-hidden rounded-xl border bg-slate-100" onClick={e => { const visible = pointerTime(e.clientX); const item = timelineItems.find(x => visible >= x.start && visible <= x.end); if (item) { setSelected(item.slotIndex); seekTo(item.segment.start + (visible - item.start)); } }}>
        {timelineItems.map(item => { const duration = Math.max(0.1, timelineDuration); const left = Math.max(0, Math.min(100, item.start / duration * 100)); const width = Math.max(0.5, Math.min(100 - left, (item.end - item.start) / duration * 100)); return <button key={item.slot.id} onClick={e => { e.stopPropagation(); setSelected(item.slotIndex); seekTo(item.segment.start); }} className={`absolute inset-y-0 ${colors[item.slotIndex % colors.length]} ${item.slot.enabled ? "opacity-90" : "opacity-25 grayscale"} ${item.slotIndex === selected ? "ring-4 ring-white/70" : ""}`} style={{ left: `${left}%`, width: `${width}%` }}><span className="text-xs font-bold text-white drop-shadow">اسلاید {item.slotIndex + 1}</span></button>; })}
        {timelineItems.slice(0, -1).map((item, i) => { const position = Math.max(0, Math.min(100, item.end / Math.max(timelineDuration, 0.1) * 100)); return <button key={`handle-${item.slot.id}`} type="button" aria-label={`تغییر مرز اسلاید ${item.slotIndex + 1} و ${timelineItems[i + 1].slotIndex + 1}`} onPointerDown={e => startBoundaryDrag(i, e)} onClick={e => e.stopPropagation()} className="absolute left-0 top-1/2 z-20 flex h-12 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-md border-2 border-white bg-slate-900 shadow-lg" style={{ left: `${position}%` }}><span className="h-7 w-1 rounded-full bg-white" /></button>; })}
        {audioDuration > 0 && <div className="pointer-events-none absolute inset-y-0 z-30 border-l-2 border-slate-900" style={{ left: `${(audioCurrentTime / Math.max(timelineDuration, 0.1)) * 100}%` }} />}
      </div><div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>۰:۰۰</span><span>{audioDuration > 0 ? `${formatTime(audioCurrentTime)} / ${formatTime(audioDuration)}` : `مدت تایم‌لاین: ${formatTime(timelineDuration)}`}</span><span>{formatTime(timelineDuration)}</span></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{slots.map((slot, i) => <div key={slot.id} className={`flex items-center gap-2 rounded-xl border p-2 ${selected === i ? "ring-2 ring-emerald-500" : ""}`}><input type="checkbox" checked={slot.enabled} onChange={() => toggleSlide(i)} title="فعال/غیرفعال در خروجی" /><button type="button" onClick={() => { setSelected(i); seekTo(segments[i]?.start || 0); }} className="text-xs font-semibold">اسلاید {i + 1}</button><span className="text-[11px] text-slate-500">{formatTime(Math.max(0, (segments[i]?.end || 0) - (segments[i]?.start || 0)))}</span><select value={slot.sourceIndex} onChange={e => setSlots(prev => prev.map((s, n) => n === i ? { ...s, sourceIndex: Number(e.target.value) } : s))} className="min-w-0 flex-1 rounded-lg border bg-white px-2 py-1 text-xs">{Array.from({ length: editorCount }, (_, n) => <option key={n} value={n}>محتوای اسلاید {n + 1}</option>)}</select><button onClick={() => deleteSlide(i)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600" title="حذف اسلاید از خروجی"><Trash2 className="h-4 w-4" /></button></div>)}</div>
    </div><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600"><span>{activeItems.length} اسلاید فعال</span><span>·</span><span>{slots.length} اسلاید در خروجی</span><span>·</span><span>مدت تایم‌لاین: {formatTime(totalDuration)}</span><span>·</span><span>1080×1920 MP4</span></div>
  </section></div>;
}
