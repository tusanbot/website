"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let lastFfmpegLog = "";

async function getFFmpeg(onProgress?: (value: number) => void) {
  if (instance) return instance;
  if (!loading) {
    loading = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => { lastFfmpegLog = message; });
      if (onProgress) ffmpeg.on("progress", ({ progress }) => onProgress(Math.max(0, Math.min(1, progress))));
      const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await ffmpeg.load({
        coreURL: `${base}/ffmpeg-core.js`,
        wasmURL: `${base}/ffmpeg-core.wasm`,
        classWorkerURL: `${origin}/ffmpeg/worker.js`,
      });
      instance = ffmpeg;
      return ffmpeg;
    })().catch(error => { loading = null; instance = null; throw error; });
  }
  return loading;
}

function errorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") { try { const text = JSON.stringify(error); if (text && text !== "{}") return text; } catch {} }
  const log = lastFfmpegLog.trim();
  return log ? `${fallback} ${log}` : fallback;
}

async function execChecked(ffmpeg: FFmpeg, args: string[], label: string) {
  lastFfmpegLog = "";
  try {
    const code = await ffmpeg.exec(args);
    if (typeof code === "number" && code !== 0) throw new Error(lastFfmpegLog.trim() ? `${label} کد خطا ${code}: ${lastFfmpegLog.trim()}` : `${label} کد خطا ${code}.`);
  } catch (error) { throw new Error(errorText(error, `${label} ${lastFfmpegLog.trim()}`.trim())); }
}

async function runTranscode(file: File, outputName: string, args: string[], mime: string, onProgress?: (value: number) => void) {
  const ffmpeg = await getFFmpeg(onProgress);
  const input = `input-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop() || "bin"}`;
  try {
    await ffmpeg.writeFile(input, await fetchFile(file));
    await execChecked(ffmpeg, ["-i", input, ...args, outputName], "تبدیل ویدیو ناموفق بود.");
    const data = await ffmpeg.readFile(outputName);
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    if (buffer.byteLength === 0) throw new Error("فایل خروجی خالی است.");
    return new File([buffer], outputName, { type: mime });
  } finally { try { await ffmpeg.deleteFile(input); } catch {} try { await ffmpeg.deleteFile(outputName); } catch {} }
}

export async function makeBrowserPlayable(file: File, onProgress?: (value: number) => void) { return runTranscode(file, `playable-${Date.now()}.webm`, ["-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-c:a", "libopus", "-b:a", "96k", "-deadline", "realtime", "-cpu-used", "4"], "video/webm", onProgress); }
export async function convertVideoFormat(file: File, format: "mp4" | "webm", onProgress?: (value: number) => void) {
  if (format === "webm") return runTranscode(file, `tusan-converted-${Date.now()}.webm`, ["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-c:a", "libopus", "-b:a", "96k"], "video/webm", onProgress);
  return runTranscode(file, `tusan-converted-${Date.now()}.mp4`, ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"], "video/mp4", onProgress);
}

type SlideInput = { file: File; duration: number; audio?: File; audioStart?: number; audioEnd?: number };
type StudioTransition = "zoom" | "slide" | "blur" | "pop";

const transitionMap: Record<StudioTransition, string> = {
  zoom: "zoomin",
  slide: "slideleft",
  blur: "hblur",
  pop: "squeezeh",
};

export async function encodeSlideSequence(slides: SlideInput[], onProgress?: (percent: number) => void, transition: StudioTransition = "zoom") {
  const ffmpeg = await getFFmpeg(progress => onProgress?.(55 + Math.round(progress * 45)));
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const imageNames: string[] = []; const audioNames: string[] = []; const clipNames: string[] = [];
  const output = `tusan-studio-${token}.mp4`;
  try {
    if (!slides.length) throw new Error("هیچ اسلایدی برای خروجی وجود ندارد.");
    const transitionDuration = slides.length > 1
      ? Math.min(0.5, ...slides.map(slide => Math.max(0.1, Number(slide.duration) || 0.1)) / 2)
      : 0;
    const xfadeTransition = transitionMap[transition] || "zoomin";

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]; if (!slide) throw new Error(`اسلاید شماره ${i + 1} پیدا نشد.`);
      const duration = Math.max(0.5, Number(slide.duration) || 0.5);
      const clipDuration = i < slides.length - 1 ? duration + transitionDuration : duration;
      const imageName = `studio-${token}-${i}.png`; const clipName = `studio-${token}-${i}.mp4`;
      await ffmpeg.writeFile(imageName, await fetchFile(slide.file)); imageNames.push(imageName);
      const clipArgs: string[] = ["-loop", "1", "-framerate", "30", "-i", imageName];
      if (slide.audio) {
        const extension = slide.audio.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "wav"; const audioName = `studio-${token}-${i}.${extension}`;
        await ffmpeg.writeFile(audioName, await fetchFile(slide.audio)); audioNames.push(audioName);
        const start = Math.max(0, Number(slide.audioStart) || 0);
        const end = Math.max(start + 0.05, Number(slide.audioEnd) || start + duration);
        const segmentDuration = Math.max(0.5, Math.min(duration, end - start));
        const silence = Math.max(0, clipDuration - segmentDuration);
        clipArgs.push("-ss", start.toFixed(3), "-i", audioName, "-map", "0:v:0", "-map", "1:a:0", "-t", clipDuration.toFixed(3), "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p", ...(silence > 0 ? ["-af", `apad=pad_dur=${silence.toFixed(3)}`] : []), "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-threads", "1", "-y", clipName);
      } else {
        clipArgs.push("-f", "lavfi", "-i", `anullsrc=r=48000:cl=stereo:d=${clipDuration.toFixed(3)}`, "-map", "0:v:0", "-map", "1:a:0", "-t", clipDuration.toFixed(3), "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-threads", "1", "-y", clipName);
      }
      await execChecked(ffmpeg, clipArgs, `رمزگذاری اسلاید ${i + 1} ناموفق بود.`); clipNames.push(clipName); onProgress?.(55 + Math.round(((i + 1) / slides.length) * 35));
    }

    if (slides.length === 1) {
      await execChecked(ffmpeg, ["-i", clipNames[0], "-c:v", "copy", "-c:a", "copy", "-movflags", "+faststart", "-y", output], "ساخت MP4 ناموفق بود.");
    } else {
      const graph: string[] = [];
      for (let i = 0; i < clipNames.length; i++) {
        graph.push(`[${i}:v]fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p,settb=AVTB[v${i}]`);
        graph.push(`[${i}:a]aresample=48000,asetpts=PTS-STARTPTS[a${i}]`);
      }
      let videoLabel = "v0";
      let audioLabel = "a0";
      let mergedDuration = Math.max(0.5, Number(slides[0].duration) || 0.5) + transitionDuration;
      for (let i = 1; i < slides.length; i++) {
        const offset = Math.max(0, mergedDuration - transitionDuration);
        const nextVideo = `vx${i}`;
        graph.push(`[${videoLabel}][v${i}]xfade=transition=${xfadeTransition}:duration=${transitionDuration.toFixed(3)}:offset=${offset.toFixed(3)}[${nextVideo}]`);
        videoLabel = nextVideo;
        const nextAudio = `ax${i}`;
        graph.push(`[${audioLabel}][a${i}]acrossfade=d=${transitionDuration.toFixed(3)}:c1=tri:c2=tri[${nextAudio}]`);
        audioLabel = nextAudio;
        mergedDuration = mergedDuration - transitionDuration + Math.max(0.5, Number(slides[i].duration) || 0.5);
      }
      const inputArgs = clipNames.flatMap(name => ["-i", name]);
      await execChecked(ffmpeg, [...inputArgs, "-filter_complex", graph.join(";"), "-map", `[${videoLabel}]`, "-map", `[${audioLabel}]`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", "-y", output], "اتصال و انیمیشن اسلایدها برای ساخت MP4 ناموفق بود.");
    }

    const data = await ffmpeg.readFile(output); const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data; const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    if (buffer.byteLength === 0) throw new Error("فایل MP4 خروجی خالی است."); onProgress?.(100); return new File([buffer], output, { type: "video/mp4" });
  } catch (error) { throw new Error(errorText(error, "ساخت ویدیو ناموفق بود.")); }
  finally { for (const name of imageNames) try { await ffmpeg.deleteFile(name); } catch {} for (const name of audioNames) try { await ffmpeg.deleteFile(name); } catch {} for (const name of clipNames) try { await ffmpeg.deleteFile(name); } catch {} try { await ffmpeg.deleteFile(output); } catch {} }
}
