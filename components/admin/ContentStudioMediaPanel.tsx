"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Film, Mic2, Play, Pause, Plus, Trash2, Upload } from "lucide-react";
import html2canvas from "html2canvas-pro";
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
function findPreview(): HTMLElement | null { let best: HTMLElement | null = null; let bestArea = 0; for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) { const r = el.getBoundingClientRect(); if (r.width < 220 || r.height < 320 || r.height > 1300) continue; const ratio = r.width / r.height; if (ratio < 0.50 || ratio > 0.66) continue; const area = r.width * r.height; if (area > bestArea) { best = el; bestArea = area; } } return best; }
function readSlideState() { const text = document.body.innerText; const m = text.match(/(?:در حال پخش\s*·\s*)?(\d+)\s*\/\s*(\d+)/); const d = text.match(/(\d+(?:[.,]\d+)?)\s*ثانیه/); return { index: m ? Number(m[1]) - 1 : 0, count: m ? Number(m[2]) : 1, duration: d ? Number(d[1].replace(",", ".")) : 3 }; }
function readTransition(): StudioTransition { const select = document.querySelector<HTMLElement>("main select"); const value = select instanceof HTMLSelectElement ? select.value : "zoom"; return value === "slide" || value === "blur" || value === "pop" || value === "zoom" ? value : "zoom"; }
function stageButtons() { const root = document.querySelector<HTMLElement>(".stage-controls"); return root ? Array.from(root.querySelectorAll<HTMLButtonElement>("button")) : []; }
async function goToSlide(index: number) {
  const buttons = stageButtons(); const previous = buttons[0]; const next = buttons[2];
  if (!previous || !next) throw new Error("کنترل اسلاید برای خروجی پیدا نشد.");
  for (let i = 0; i < 40; i++) { previous.click(); await wait(18); }
  for (let i = 0; i < index; i++) { next.click(); await wait(90); }
  await wait(180);
}
async function waitForStableRender() {
  try { await document.fonts?.ready; } catch {}
  await wait(220);
}
function canvasToFile(canvas: HTMLCanvasElement, name: string) { return new Promise<File>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], name, { type: "image/png" })) : reject(new Error("ساخت تصویر اسلاید ناموفق بود.")), "image/png")); }
function equalSegments(count: number, total: number): Segment[] { const safe = Math.max(0.1, total); return Array.from({ length: count }, (_, i) => ({ start: safe * i / count, end: safe * (i + 1) / count })); }
function formatTime(value: number) { return value < 60 ? `${value.toFixed(2)} ثانیه` : `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`; }
function errorText(error: unknown, fallback: string) { if (error instanceof Error && error.message.trim()) return error.message; if (typeof error === "string" && error.trim()) return error; if (error && typeof error === "object") { try { const text = JSON.stringify(error); if (text && text !== "{}") return text; } catch {} } return fallback; }

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
  const initializedEditorCount = useRef(0);

  useEffect(() => {
    const sync = () => {
      const s = readSlideState();
      setEditorCount(s.count);
      setCurrent(s.index);
      setSlots(prev => {
        if (initializedEditorCount.current === 0) {
          initializedEditorCount.current = s.count;
          return Array.from({ length: Math.max(1, s.count) }, (_, i) => ({ id: uid(), sourceIndex: i, enabled: true }));
        }
        if (s.count > initializedEditorCount.current) {
          const added = Array.from({ length: s.count - initializedEditorCount.current }, (_, n) => ({ id: uid(), sourceIndex: initializedEditorCount.current + n, enabled: true }));
          initializedEditorCount.current = s.count;
          return [...prev, ...added];
        }
        initializedEditorCount.current = s.count;
        return prev.map(slot => ({ ...slot, sourceIndex: Math.max(0, Math.min(s.count - 1, slot.sourceIndex)) }));
      });
    };
    sync();
    const timer = window.setInterval(sync, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed, audioUrl]);
  useEffect(() => {
    if (audioDuration > 0 && segments.length === 0 && slots.length > 0) setSegments(equalSegments(slots.length, audioDuration));
    setSelected(value => Math.min(value, Math.max(0, slots.length - 1)));
  }, [audioDuration, slots.length, segments.length]);

  const enabledCount = useMemo(() => slots.filter(x => x.enabled).length, [slots]);
  const timelineItems = useMemo<TimelineItem[]>(() => {
    let cursor = 0;
    return slots.map((slot, slotIndex) => ({ slot, slotIndex, segment: segments[slotIndex] || { start: 0, end: 0 }, start: 0, end: 0 })).filter(item => item.slot.enabled).map(item => {
      const duration = Math.max(0.05, item.segment.end - item.segment.start);
      const next = { ...item, start: cursor, end: cursor + duration };
      cursor += duration;
      return next;
    });
  }, [slots, segments]);
  const visibleDuration = useMemo(() => timelineItems.reduce((sum, item) => sum + Math.max(0, item.segment.end - item.segment.start), 0), [timelineItems]);
  const totalDuration = audioDuration || visibleDuration || (segments[segments.length - 1]?.end || 0);

  function seekTo(value: number) {
    if (!audioRef.current) return;
    const next = Math.max(0, Math.min(audioDuration || value, value));
    audioRef.current.currentTime = next; setAudioCurrentTime(next);
    if (!playing) audioRef.current.play().then(() => setPlaying(true)).catch(() => undefined);
  }
  function togglePlay() { const el = audioRef.current; if (!el) return; if (el.paused) el.play().then(() => setPlaying(true)).catch(() => undefined); else { el.pause(); setPlaying(false); } }
  function pointerTime(clientX: number) { const rect = timelineRef.current?.getBoundingClientRect(); if (!rect || !visibleDuration) return 0; return Math.max(0, Math.min(visibleDuration, ((clientX - rect.left) / rect.width) * visibleDuration)); }
  function visibleToRaw(value: number) { const item = timelineItems.find(x => value >= x.start && value <= x.end) || timelineItems[timelineItems.length - 1]; if (!item) return 0; return Math.max(item.segment.start, Math.min(item.segment.end, item.segment.start + (value - item.start))); }
  function rawToVisible(value: number) { const item = timelineItems.find(x => value >= x.segment.start && value <= x.segment.end) || timelineItems[timelineItems.length - 1]; if (!item) return 0; return Math.max(0, Math.min(visibleDuration, item.start + (Math.max(item.segment.start, Math.min(item.segment.end, value)) - item.segment.start))); }
  function moveBoundary(boundaryIndex: number, clientX: number) {
    const visible = pointerTime(clientX); const leftItem = timelineItems[boundaryIndex]; const rightItem = timelineItems[boundaryIndex + 1]; if (!leftItem || !rightItem) return;
    const rawValue = visibleToRaw(visible);
    setSegments(prev => prev.map((segment, index) => index === leftItem.slotIndex ? { ...segment, end: Math.max(segment.start + 0.05, Math.min(rightItem.segment.end - 0.05, rawValue)) } : index === rightItem.slotIndex ? { ...segment, start: Math.max(leftItem.segment.start + 0.05, Math.min(segment.end - 0.05, rawValue)) } : segment));
  }
  function startBoundaryDrag(boundaryIndex: number, event: React.PointerEvent<HTMLButtonElement>) { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); const move = (e: PointerEvent) => moveBoundary(boundaryIndex, e.clientX); const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true }); }
  function addSlide() {
    const sourceIndex = Math.min(Math.max(0, editorCount - 1), current); setSlots(prev => [...prev, { id: uid(), sourceIndex, enabled: true }]);
    setSegments(prev => { if (!audioDuration) return [...prev, { start: prev[prev.length - 1]?.end || 0, end: (prev[prev.length - 1]?.end || 0) + 1 }]; if (!prev.length) return [{ start: 0, end: audioDuration }]; const last = prev[prev.length - 1]; const minLast = 0.5; const newDuration = Math.min(1, Math.max(0.5, (last.end - last.start) / 2)); const splitEnd = Math.max(last.start + minLast, last.end - newDuration); return [...prev.slice(0, -1), { ...last, end: splitEnd }, { start: splitEnd, end: audioDuration }]; });
    setMessage("اسلاید خروجی جدید اضافه شد؛ محتوای آن از اسلاید جاری کپی می‌شود.");
  }
  function deleteSlide(index: number) {
    if (slots.length <= 1) { setMessage("حداقل یک اسلاید باید باقی بماند."); return; }
    setSlots(prev => prev.filter((_, i) => i !== index));
    setSegments(prev => {
      const source = prev[index]; const removed = source ? Math.max(0, source.end - source.start) : 0;
      const remaining = prev.filter((_, i) => i !== index);
      if (!remaining.length) return [];
      const receiver = index > 0 ? index - 1 : 0;
      const durations = remaining.map(s => Math.max(0.05, s.end - s.start));
      durations[receiver] += removed;
      let cursor = 0;
      return durations.map(duration => { const next = { start: cursor, end: cursor + duration }; cursor = next.end; return next; });
    });
    setSelected(prev => Math.max(0, Math.min(prev > index ? prev - 1 : prev, slots.length - 2)));
    setMessage("اسلاید حذف شد و زمان آن بدون ایجاد فضای خالی بین اسلایدهای باقی‌مانده توزیع شد.");
  }
  function toggleSlide(index: number) { setSlots(prev => prev.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s)); }

  async function generateTts() {
    if (!ttsText.trim()) return; setTtsLoading(true); setMessage("");
    try { const res = await fetch("/api/ai/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: ttsText, voice, speed }) }); const data = await res.json(); if (res.status === 401) { window.location.href = `/tools/ai-profile?returnTo=${encodeURIComponent('/content-studio')}`; return; } if (!res.ok) throw new Error(data.error || "تبدیل متن به صوت انجام نشد."); const bytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0)); const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" }); const file = new File([blob], "تولید-شده-در-استودیو.wav", { type: blob.type }); const url = URL.createObjectURL(file); const probe = document.createElement("audio"); probe.preload = "metadata"; probe.src = url; probe.onloadedmetadata = () => { const duration = Number.isFinite(probe.duration) ? probe.duration : 3; setAudio(file); setAudioUrl(url); setAudioDuration(duration); setAudioCurrentTime(0); setPlaying(false); setSegments(prev => prev.length ? equalSegments(prev.length, duration) : [{ start: 0, end: duration }]); setMessage(`صوت ${duration.toFixed(2)} ثانیه‌ای آماده شد.`); }; } catch (e) { setMessage(errorText(e, "تولید صوت ناموفق بود.")); } finally { setTtsLoading(false); }
  }
  function attachAudio(file?: File) { if (!file) return; const url = URL.createObjectURL(file); const probe = document.createElement("audio"); probe.preload = "metadata"; probe.src = url; probe.onloadedmetadata = () => { const duration = Number.isFinite(probe.duration) ? probe.duration : 3; setAudio(file); setAudioUrl(url); setAudioDuration(duration); setAudioCurrentTime(0); setPlaying(false); setSegments(prev => prev.length ? equalSegments(prev.length, duration) : [{ start: 0, end: duration }]); }; }

  async function exportVideo() {
    if (exporting) return; setExporting(true); setProgress(0); setMessage("در حال آماده‌سازی خروجی...");
    let stage = "capture";
    try {
      const preview = findPreview(); if (!preview) throw new Error("پیش‌نمایش اسلاید پیدا نشد.");
      const captures: SlideCapture[] = [];
      const active = timelineItems;
      for (let n = 0; n < active.length; n++) {
        const item = active[n];
        const source = Math.max(0, Math.min(editorCount - 1, item.slot.sourceIndex));
        await goToSlide(source);
        await waitForStableRender();
        const state = readSlideState();
        const canvas = await html2canvas(findPreview() || preview, {
          scale: 2,
          backgroundColor: null,
          useCORS: true,
          logging: false,
          normalizeDom: true,
          onclone: clonedDocument => {
            const style = clonedDocument.createElement("style");
            style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;transform:none!important;filter:none!important;caret-color:transparent!important;}";
            clonedDocument.head.appendChild(style);
          },
        });
        const file = await canvasToFile(canvas, `slide-${String(n + 1).padStart(3, "0")}.png`);
        const rawDuration = audio
          ? Math.max(0.5, item.segment.end - item.segment.start)
          : Math.max(0.5, state.duration);
        captures.push(audio
          ? { file, duration: rawDuration, audio, audioStart: item.segment.start, audioEnd: item.segment.end }
          : { file, duration: rawDuration });
        setProgress(Math.round((n + 1) / Math.max(active.length, 1) * 50));
      }
      if (!captures.length) throw new Error("حداقل یک اسلاید فعال لازم است.");
      const transition = readTransition();
      stage = "ffmpeg"; setMessage("در حال ساخت MP4... ممکن است چند لحظه طول بکشد."); const output = await encodeSlideSequence(captures, setProgress, transition);
      stage = "download"; const url = URL.createObjectURL(output); const a = document.createElement("a"); a.href = url; a.download = `tusan-reel-${Date.now()}.mp4`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); setProgress(100); setMessage("ویدیو آماده شد.");
    } catch (e) { setMessage(`مرحله ${stage}: ${errorText(e, "ساخت ویدیو ناموفق بود.")}`); } finally { setExporting(false); }
  }

  const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-orange-500", "bg-rose-500", "bg-cyan-500", "bg-amber-500", "bg-fuchsia-500"];
  return <div className="space-y-4">{children}<section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 font-bold"><Film className="h-5 w-5" /> تدوین ویدیو + صوت</div><p className="mt-1 text-xs text-slate-600">صوت، زمان‌بندی و خروجی ویدیو در همین استودیو مدیریت می‌شود.</p></div><button onClick={exportVideo} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" />{exporting ? `در حال ساخت ${progress}%` : "ساخت ویدیو MP4"}</button></div>
    {message && <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm">{message}</div>}
    <div className="mt-4 rounded-2xl border bg-white p-4"><div className="mb-3 flex items-center gap-2 font-bold"><Mic2 className="h-5 w-5 text-emerald-600" /> تبدیل متن به صوت</div><div className="grid gap-3 lg:grid-cols-[1fr_160px_120px_auto]"><textarea value={ttsText} onChange={e => setTtsText(e.target.value)} maxLength={8000} placeholder="متن کامل صوت این ویدیو را وارد کن..." className="min-h-24 rounded-xl border p-3" /><select value={voice} onChange={e => setVoice(e.target.value as typeof voice)} className="rounded-xl border bg-white px-3"><option value="Kore">Kore</option><option value="Puck">Puck</option><option value="Charon">Charon</option><option value="Fenrir">Fenrir</option><option value="Aoede">Aoede</option></select><select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="rounded-xl border bg-white px-3">{speeds.map(v => <option key={v} value={v}>{v}×</option>)}</select><button onClick={generateTts} disabled={ttsLoading || !ttsText.trim()} className="rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50">{ttsLoading ? "در حال ساخت..." : "تولید صوت"}</button></div><div className="mt-3 flex flex-wrap items-center gap-2"><input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => attachAudio(e.target.files?.[0])} /><button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm"><Upload className="h-4 w-4" /> انتخاب فایل صوتی</button>{audioUrl && <><button onClick={togglePlay} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "توقف" : "پخش"}</button><span className="text-xs text-slate-500">مدت صوت: {formatTime(audioDuration)}</span><audio ref={audioRef} src={audioUrl} onTimeUpdate={e => setAudioCurrentTime(e.currentTarget.currentTime)} onEnded={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="hidden" /></>}</div></div>
    <div className="mt-4 rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-bold">نوار زمان و تقسیم صوت بین اسلایدها</div><p className="mt-1 text-xs text-slate-500">اسلاید غیرفعال از تایم‌لاین خروجی حذف می‌شود و زمان آن باعث ایجاد فضای خالی نمی‌شود. گیره بین اسلایدهای فعال را جابه‌جا کن.</p></div><button onClick={addSlide} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4" /> افزودن اسلاید</button></div>
      {audioDuration > 0 ? <><div ref={timelineRef} className="relative mt-4 h-20 select-none overflow-hidden rounded-xl border bg-slate-100" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const visible = Math.max(0, Math.min(visibleDuration || audioDuration, ((e.clientX - r.left) / r.width) * (visibleDuration || audioDuration))); seekTo(visibleToRaw(visible)); }}>
        {timelineItems.map((item) => { const duration = Math.max(0.1, visibleDuration || audioDuration); const left = Math.max(0, Math.min(100, item.start / duration * 100)); const width = Math.max(0.5, Math.min(100 - left, (item.end - item.start) / duration * 100)); return <button key={item.slot.id} onClick={e => { e.stopPropagation(); setSelected(item.slotIndex); seekTo(item.segment.start); }} className={`absolute inset-y-0 ${colors[item.slotIndex % colors.length]} ${item.slotIndex === selected ? "ring-4 ring-white/70" : "opacity-80"}`} style={{ left: `${left}%`, width: `${width}%` }}><span className="text-xs font-bold text-white drop-shadow">اسلاید {item.slotIndex + 1}</span></button>; })}
        {timelineItems.slice(0, -1).map((item, i) => { const duration = Math.max(0.1, visibleDuration || audioDuration); const position = Math.max(0, Math.min(100, item.end / duration * 100)); return <button key={`handle-${item.slot.id}`} type="button" aria-label={`تغییر مرز اسلاید ${item.slotIndex + 1} و ${timelineItems[i + 1].slotIndex + 1}`} onPointerDown={e => startBoundaryDrag(i, e)} onClick={e => e.stopPropagation()} className="absolute left-0 top-1/2 z-20 flex h-12 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-md border-2 border-white bg-slate-900 shadow-lg" style={{ left: `${position}%` }}><span className="h-7 w-1 rounded-full bg-white" /></button>; })}
        <div className="pointer-events-none absolute inset-y-0 z-30 border-l-2 border-slate-900" style={{ left: `${((rawToVisible(audioCurrentTime) / Math.max(visibleDuration || audioDuration, 0.1)) * 100)}%` }} />
      </div><div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>۰:۰۰</span><span>{formatTime(audioCurrentTime)} / {formatTime(audioDuration)}</span><span>{formatTime(visibleDuration || audioDuration)}</span></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{slots.map((slot, i) => <div key={slot.id} className={`flex items-center gap-2 rounded-xl border p-2 ${selected === i ? "ring-2 ring-emerald-500" : ""}`}><input type="checkbox" checked={slot.enabled} onChange={() => toggleSlide(i)} title="فعال/غیرفعال در خروجی" /><button type="button" onClick={() => { setSelected(i); seekTo(segments[i]?.start || 0); }} className="text-xs font-semibold">اسلاید {i + 1}</button><select value={slot.sourceIndex} onChange={e => setSlots(prev => prev.map((s, n) => n === i ? { ...s, sourceIndex: Number(e.target.value) } : s))} className="min-w-0 flex-1 rounded-lg border bg-white px-2 py-1 text-xs">{Array.from({ length: editorCount }, (_, n) => <option key={n} value={n}>محتوای اسلاید {n + 1}</option>)}</select><button onClick={() => deleteSlide(i)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600" title="حذف اسلاید از خروجی"><Trash2 className="h-4 w-4" /></button></div>)}</div></> : <div className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">ابتدا یک صوت تولید یا انتخاب کن تا نوار زمان فعال شود.</div>}
    </div><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600"><span>{enabledCount} اسلاید فعال</span><span>·</span><span>{slots.length} اسلاید در خروجی</span><span>·</span><span>{formatTime(totalDuration)} صوت</span><span>·</span><span>1080×1920 MP4</span></div>
  </section></div>;
}
