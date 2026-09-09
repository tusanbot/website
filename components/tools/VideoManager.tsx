"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Film, Loader2, Maximize2, RotateCcw, Scissors, Subtitles, Upload, Volume2, VolumeX } from "lucide-react";
import { makeBrowserPlayable, convertVideoFormat } from "@/lib/video/ffmpeg";

type Meta = { duration: number; width: number; height: number; size: number; type: string };
type Crop = { x: number; y: number; width: number; height: number };
type SubtitleCue = { start: number; end: number; text: string };
type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: { mediaTime: number }) => void) => number;
};
type CanvasWithCapture = HTMLCanvasElement & { captureStream?: (frameRate?: number) => MediaStream };

const MB = 1024 * 1024;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60).toString().padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function parseTime(value: string) {
  const parts = value.replace(",", ".").split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

function parseSubtitles(text: string): SubtitleCue[] {
  const normalized = text.replace(/\r/g, "").trim();
  if (!normalized) return [];
  return normalized.split(/\n\s*\n/).flatMap((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const index = lines.findIndex((line) => line.includes(" --> "));
    if (index < 0) return [];
    const [startValue, endValue] = lines[index].split(" --> ");
    const start = parseTime(startValue);
    const end = parseTime((endValue || "").split(" ")[0]);
    const cueText = lines.slice(index + 1).join("\n");
    return end > start && cueText ? [{ start, end, text: cueText }] : [];
  });
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|avi|mkv|mpeg|mpg|ogv|3gp|ts|mts|m2ts)$/i.test(file.name);
}

function pickMime(format: "webm" | "mp4") {
  const list = format === "mp4"
    ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"]
    : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return list.find((value) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(value)) || "";
}

export default function VideoManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const subtitleRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceUrlRef = useRef("");
  const outputUrlRef = useRef("");
  const thumbnailUrlRef = useRef("");

  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [output, setOutput] = useState<{ url: string; name: string; size: number } | null>(null);
  const [thumbnail, setThumbnail] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [operation, setOperation] = useState("آماده");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [quality, setQuality] = useState(70);
  const [fps, setFps] = useState(30);
  const [format, setFormat] = useState<"webm" | "mp4">("webm");
  const [muted, setMuted] = useState(false);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 1, height: 1 });
  const [subtitleText, setSubtitleText] = useState("");
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [thumbnailTime, setThumbnailTime] = useState(0);
  const [codecFallback, setCodecFallback] = useState(false);

  const duration = meta?.duration || 0;

  useEffect(() => () => {
    [sourceUrlRef, outputUrlRef, thumbnailUrlRef].forEach((ref) => {
      if (ref.current) URL.revokeObjectURL(ref.current);
    });
  }, []);

  const applyMetadata = (video: HTMLVideoElement, selected: File) => {
    if (video.videoWidth <= 0 || video.videoHeight <= 0 || !Number.isFinite(video.duration)) return;
    const next = { duration: video.duration, width: video.videoWidth, height: video.videoHeight, size: selected.size, type: selected.type || "video/" };
    setMeta(next);
    setStart(0);
    setEnd(next.duration);
    setWidth(next.width);
    setHeight(next.height);
    setThumbnailTime(next.duration / 2);
    setOperation("آماده");
    setMessage(codecFallback ? "کدک با موفقیت سازگار شد." : "ویدیو آماده پردازش است.");
  };

  const select = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    if (!next) return;
    if (!isVideoFile(next)) {
      setMessage("فقط فایل ویدیویی انتخاب کنید.");
      return;
    }
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    const url = URL.createObjectURL(next);
    sourceUrlRef.current = url;
    setFile(next);
    setSourceUrl(url);
    setMeta(null);
    setOutput(null);
    setThumbnail("");
    setCodecFallback(false);
    setMessage("در حال آماده‌سازی ویدیو و خواندن مشخصات فایل...");
    setOperation("در حال آماده‌سازی");
  };

  const failed = async () => {
    if (!file || codecFallback || busy) return;
    setCodecFallback(true);
    setBusy(true);
    setProgress(0);
    setOperation("در حال سازگار کردن کدک");
    setMessage("در حال تبدیل موقت ویدیو با FFmpeg...");
    try {
      const playable = await makeBrowserPlayable(file, (value) => setProgress(Math.round(value * 100)));
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      const url = URL.createObjectURL(playable);
      sourceUrlRef.current = url;
      setFile(playable);
      setSourceUrl(url);
      setMeta(null);
      setProgress(0);
      setOperation("در حال آماده‌سازی");
    } catch (error) {
      setOperation("خطا");
      setMessage(error instanceof Error ? `تبدیل کدک انجام نشد: ${error.message}` : "تبدیل کدک انجام نشد.");
    } finally {
      setBusy(false);
    }
  };

  const seek = async (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(time, duration));
    if (Math.abs(video.currentTime - target) < 0.02) return;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        video.removeEventListener("seeked", done);
        reject(new Error("جابجایی به زمان انتخاب‌شده انجام نشد."));
      }, 8000);
      const done = () => {
        window.clearTimeout(timer);
        video.removeEventListener("seeked", done);
        resolve();
      };
      video.addEventListener("seeked", done);
      video.currentTime = target;
    });
  };

  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !meta) return;
    setBusy(true);
    setOperation("استخراج تصویر شاخص");
    try {
      await seek(thumbnailTime);
      canvas.width = meta.width;
      canvas.height = meta.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas در این مرورگر در دسترس نیست.");
      context.drawImage(video, 0, 0, meta.width, meta.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("استخراج فریم ناموفق بود.")), "image/jpeg", 0.92));
      if (thumbnailUrlRef.current) URL.revokeObjectURL(thumbnailUrlRef.current);
      thumbnailUrlRef.current = URL.createObjectURL(blob);
      setThumbnail(thumbnailUrlRef.current);
      download(blob, "tusan-video-thumbnail.jpg");
      setMessage("تصویر شاخص با موفقیت استخراج شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "استخراج فریم انجام نشد.");
    } finally {
      setBusy(false);
      setOperation("آماده");
    }
  };

  const processVideo = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !meta || !file) return;
    const mimeType = pickMime(format);
    if (!mimeType) {
      setMessage(format === "mp4" ? "این مرورگر خروجی MP4 را مستقیم پشتیبانی نمی‌کند." : "خروجی WebM در این مرورگر پشتیبانی نمی‌شود.");
      return;
    }

    const outW = Math.max(2, Math.round(width / 2) * 2);
    const outH = Math.max(2, Math.round(height / 2) * 2);
    const from = Math.max(0, Math.min(start, duration));
    const to = Math.min(duration, Math.max(from + 0.05, end || duration));

    setBusy(true);
    setProgress(0);
    setOperation("در حال پردازش ویدیو");

    try {
      canvas.width = outW;
      canvas.height = outH;
      const context = canvas.getContext("2d");
      const canvasMedia = canvas as CanvasWithCapture;
      if (!context || typeof canvasMedia.captureStream !== "function") throw new Error("پردازش ویدیویی Canvas در این مرورگر پشتیبانی نمی‌شود.");

      const stream = canvasMedia.captureStream(fps);
      const videoMedia = video as HTMLVideoElement & { captureStream?: () => MediaStream };
      if (!muted && typeof videoMedia.captureStream === "function") {
        videoMedia.captureStream().getAudioTracks().forEach((track: MediaStreamTrack) => stream.addTrack(track));
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: Math.max(250000, Math.round(4000000 * (quality / 100) ** 1.7)),
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size) chunks.push(event.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      const draw = () => {
        const sx = cropEnabled ? crop.x * meta.width : 0;
        const sy = cropEnabled ? crop.y * meta.height : 0;
        const sw = cropEnabled ? crop.width * meta.width : meta.width;
        const sh = cropEnabled ? crop.height * meta.height : meta.height;
        context.clearRect(0, 0, outW, outH);
        context.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
        const cue = subtitles.find((item: SubtitleCue) => video.currentTime >= item.start && video.currentTime <= item.end);
        if (!cue) return;
        const lines = cue.text.split("\n");
        context.font = `${Math.max(18, Math.round(outW / 38))}px Vazirmatn, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "bottom";
        lines.forEach((line: string, index: number) => {
          const y = outH - 35 - (lines.length - 1 - index) * Math.max(28, outH / 22);
          const metrics = context.measureText(line);
          context.fillStyle = "rgba(0,0,0,.72)";
          context.fillRect((outW - metrics.width) / 2 - 14, y - 30, metrics.width + 28, 36);
          context.fillStyle = "#fff";
          context.fillText(line, outW / 2, y);
        });
      };

      const finish = () => {
        if (video.currentTime >= to - 0.04) {
          video.pause();
          if (recorder.state === "recording") recorder.stop();
          return true;
        }
        return false;
      };

      const frameVideo = video as VideoWithFrameCallback;
      const render = () => {
        if (recorder.state !== "recording") return;
        draw();
        setProgress(Math.min(96, Math.round(((video.currentTime - from) / Math.max(0.05, to - from)) * 96)));
        if (!finish()) window.requestAnimationFrame(render);
      };
      const onFrame = (_now: number, metadata: { mediaTime: number }) => {
        if (recorder.state !== "recording") return;
        draw();
        setProgress(Math.min(96, Math.round(((metadata.mediaTime - from) / Math.max(0.05, to - from)) * 96)));
        if (!finish() && frameVideo.requestVideoFrameCallback) frameVideo.requestVideoFrameCallback(onFrame);
      };

      recorder.start(250);
      await seek(from);
      await video.play();
      if (typeof frameVideo.requestVideoFrameCallback === "function") frameVideo.requestVideoFrameCallback(onFrame);
      else window.requestAnimationFrame(render);

      await new Promise<void>((resolve) => {
        const timer = window.setInterval(() => {
          if (recorder.state === "inactive") {
            window.clearInterval(timer);
            resolve();
          }
        }, 100);
      });
      await stopped;
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());

      const raw = new Blob(chunks, { type: mimeType });
      if (!raw.size) throw new Error("خروجی خالی تولید شد.");

      let finalFile = new File([raw], `tusan-video-${Date.now()}.webm`, { type: "video/webm" });
      if (format === "mp4") {
        setOperation("در حال تبدیل به MP4");
        finalFile = await convertVideoFormat(finalFile, "mp4", (value) => setProgress(96 + Math.round(value * 4)));
      }

      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = URL.createObjectURL(finalFile);
      setOutput({ url: outputUrlRef.current, name: finalFile.name, size: finalFile.size });
      setProgress(100);
      setOperation("تمام شد");
      setMessage(`خروجی ${format.toUpperCase()} آماده است؛ حجم ${(finalFile.size / MB).toFixed(2)} MB.`);
    } catch (error) {
      setOperation("خطا");
      setMessage(error instanceof Error ? error.message : "پردازش ویدیو ناموفق بود.");
    } finally {
      setBusy(false);
    }
  };

  const loadSubtitles = (event: ChangeEvent<HTMLInputElement>) => {
    const subtitleFile = event.target.files?.[0];
    if (!subtitleFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setSubtitleText(text);
      setSubtitles(parseSubtitles(text));
      setMessage("زیرنویس بارگذاری شد.");
    };
    reader.readAsText(subtitleFile);
  };

  const reset = () => {
    [sourceUrlRef, outputUrlRef, thumbnailUrlRef].forEach((ref) => {
      if (ref.current) URL.revokeObjectURL(ref.current);
      ref.current = "";
    });
    setFile(null);
    setSourceUrl("");
    setMeta(null);
    setOutput(null);
    setThumbnail("");
    setMessage("");
    setOperation("آماده");
    setProgress(0);
    setSubtitleText("");
    setSubtitles([]);
    setCropEnabled(false);
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
    if (inputRef.current) inputRef.current.value = "";
    if (subtitleRef.current) subtitleRef.current.value = "";
  };

  return (
    <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7" dir="rtl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-lg font-bold"><Film className="h-5 w-5" />مدیریت ویدیو</div>
            <p className="text-sm text-[var(--muted)]">برش، تغییر اندازه، کراپ، زیرنویس، استخراج تصویر شاخص و تبدیل فرمت در مرورگر.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white"><Upload className="h-4 w-4" />انتخاب ویدیو</button>
            {file ? <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold"><RotateCcw className="h-4 w-4" />شروع مجدد</button> : null}
          </div>
        </div>

        <input ref={inputRef} type="file" accept="video/*,.mkv,.avi,.ts,.mts,.m2ts" className="hidden" onChange={select} />
        <input ref={subtitleRef} type="file" accept=".srt,.vtt,text/plain" className="hidden" onChange={loadSubtitles} />

        {!file ? (
          <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] p-8 text-center hover:bg-[var(--muted-bg)]">
            <Upload className="h-10 w-10 opacity-60" />
            <strong>ویدیو را انتخاب کنید</strong>
            <span className="text-sm text-[var(--muted)]">فرمت‌های رایج ویدیویی پشتیبانی می‌شوند.</span>
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} src={sourceUrl} controls playsInline className="mx-auto max-h-[520px] w-full object-contain" onLoadedMetadata={(event) => applyMetadata(event.currentTarget, file)} onError={() => { if (!codecFallback) void failed(); }} />
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {meta ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-xl bg-[var(--muted-bg)] p-3"><span className="text-[var(--muted)]">مدت</span><div className="font-bold">{formatTime(meta.duration)}</div></div>
                  <div className="rounded-xl bg-[var(--muted-bg)] p-3"><span className="text-[var(--muted)]">ابعاد</span><div className="font-bold">{meta.width} × {meta.height}</div></div>
                  <div className="rounded-xl bg-[var(--muted-bg)] p-3"><span className="text-[var(--muted)]">حجم</span><div className="font-bold">{(meta.size / MB).toFixed(2)} MB</div></div>
                  <div className="rounded-xl bg-[var(--muted-bg)] p-3"><span className="text-[var(--muted)]">وضعیت</span><div className="font-bold">{operation}</div></div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="mb-4 flex items-center gap-2 font-bold"><Scissors className="h-4 w-4" />برش و اندازه</div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm">شروع<input type="number" min={0} max={duration} step="0.1" value={start} onChange={(event) => setStart(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2.5" /></label>
                      <label className="text-sm">پایان<input type="number" min={0} max={duration} step="0.1" value={end} onChange={(event) => setEnd(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2.5" /></label>
                      <label className="text-sm">عرض<input type="number" min={2} max={meta.width} step="2" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2.5" /></label>
                      <label className="text-sm">ارتفاع<input type="number" min={2} max={meta.height} step="2" value={height} onChange={(event) => setHeight(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2.5" /></label>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={cropEnabled} onChange={(event) => setCropEnabled(event.target.checked)} />فعال‌سازی کراپ</label>
                    {cropEnabled ? (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="text-sm">X<input type="number" min={0} max={1} step="0.01" value={crop.x} onChange={(event) => setCrop({ ...crop, x: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2" /></label>
                        <label className="text-sm">Y<input type="number" min={0} max={1} step="0.01" value={crop.y} onChange={(event) => setCrop({ ...crop, y: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2" /></label>
                        <label className="text-sm">عرض کراپ<input type="number" min={0.01} max={1} step="0.01" value={crop.width} onChange={(event) => setCrop({ ...crop, width: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2" /></label>
                        <label className="text-sm">ارتفاع کراپ<input type="number" min={0.01} max={1} step="0.01" value={crop.height} onChange={(event) => setCrop({ ...crop, height: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2" /></label>
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="mb-4 flex items-center gap-2 font-bold"><Film className="h-4 w-4" />خروجی</div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm">فرمت<select value={format} onChange={(event) => setFormat(event.target.value as "webm" | "mp4")} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2.5"><option value="webm">WebM</option><option value="mp4">MP4</option></select></label>
                      <label className="text-sm">نرخ فریم<select value={fps} onChange={(event) => setFps(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent p-2.5"><option value="24">24 FPS</option><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label>
                    </div>
                    <label className="mt-3 block text-sm">کیفیت: {quality}%<input type="range" min="20" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="mt-2 w-full" /></label>
                    <button type="button" onClick={() => setMuted((value) => !value)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{muted ? "بدون صدا" : "همراه صدا"}</button>
                  </section>

                  <section className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="mb-4 flex items-center gap-2 font-bold"><Subtitles className="h-4 w-4" />زیرنویس</div>
                    <textarea value={subtitleText} onChange={(event) => { setSubtitleText(event.target.value); setSubtitles(parseSubtitles(event.target.value)); }} placeholder="متن SRT/VTT را وارد کنید..." className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm" />
                    <button type="button" onClick={() => subtitleRef.current?.click()} className="mt-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold">بارگذاری فایل زیرنویس</button>
                    {subtitles.length > 0 ? <span className="mr-3 text-xs text-[var(--muted)]">{subtitles.length} بخش آماده درج</span> : null}
                  </section>

                  <section className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="mb-4 flex items-center gap-2 font-bold"><Maximize2 className="h-4 w-4" />تصویر شاخص</div>
                    <label className="text-sm">زمان فریم: {formatTime(thumbnailTime)}<input type="range" min="0" max={duration || 1} step="0.1" value={thumbnailTime} onChange={(event) => setThumbnailTime(Number(event.target.value))} className="mt-2 w-full" /></label>
                    <button type="button" disabled={busy} onClick={() => void capture()} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-50"><Download className="h-4 w-4" />استخراج و دانلود تصویر</button>
                    {thumbnail ? <img src={thumbnail} alt="تصویر شاخص" className="mt-3 max-h-32 rounded-xl object-contain" /> : null}
                  </section>
                </div>

                {message ? <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-3 text-sm">{message}</div> : null}
                {busy ? <div><div className="mb-1 flex items-center justify-between text-xs"><span>{operation}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--muted-bg)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} /></div></div> : null}
                <button type="button" disabled={busy} onClick={() => void processVideo()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}پردازش ویدیو</button>
                {output ? <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong>خروجی آماده است</strong><p className="mt-1 text-sm text-[var(--muted)]">{output.name} · {(output.size / MB).toFixed(2)} MB</p></div><a href={output.url} download={output.name} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white"><Download className="h-4 w-4" />دانلود خروجی</a></div> : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
