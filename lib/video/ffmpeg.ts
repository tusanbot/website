"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

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
      await ffmpeg.load({ coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"), wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm") });
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

export async function encodeSlideSequence(slides: SlideInput[], onProgress?: (percent: number) => void) {
  const ffmpeg = await getFFmpeg(progress => onProgress?.(55 + Math.round(progress * 45)));
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const imageNames: string[] = []; const audioNames: string[] = []; const clipNames: string[] = [];
  const concatName = `tusan-studio-${token}.txt`; const output = `tusan-studio-${token}.mp4`;
  try {
    if (!slides.length) throw new Error("هیچ اسلایدی برای خروجی وجود ندارد.");
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]; if (!slide) throw new Error(`اسلاید شماره ${i + 1} پیدا نشد.`);
      const duration = Math.max(0.5, Number(slide.duration) || 0.5);
      const imageName = `studio-${token}-${i}.png`; const clipName = `studio-${token}-${i}.mp4`;
      await ffmpeg.writeFile(imageName, await fetchFile(slide.file)); imageNames.push(imageName);
      const clipArgs: string[] = ["-loop", "1", "-framerate", "30", "-i", imageName];
      if (slide.audio) {
        const extension = slide.audio.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "wav"; const audioName = `studio-${token}-${i}.${extension}`;
        await ffmpeg.writeFile(audioName, await fetchFile(slide.audio)); audioNames.push(audioName);
        const start = Math.max(0, Number(slide.audioStart) || 0); const end = Math.max(start + 0.05, Number(slide.audioEnd) || start + duration); const segmentDuration = Math.max(0.5, Math.min(duration, end - start));
        clipArgs.push("-ss", start.toFixed(3), "-i", audioName, "-map", "0:v:0", "-map", "1:a:0", "-t", segmentDuration.toFixed(3), "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-threads", "1", "-y", clipName);
      } else {
        clipArgs.push("-f", "lavfi", "-i", `anullsrc=r=48000:cl=stereo:d=${duration.toFixed(3)}`, "-map", "0:v:0", "-map", "1:a:0", "-t", duration.toFixed(3), "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-threads", "1", "-y", clipName);
      }
      await execChecked(ffmpeg, clipArgs, `رمزگذاری اسلاید ${i + 1} ناموفق بود.`); clipNames.push(clipName); onProgress?.(55 + Math.round(((i + 1) / slides.length) * 35));
    }
    await ffmpeg.writeFile(concatName, new TextEncoder().encode(clipNames.map(name => `file '${name}'`).join("\n")));
    await execChecked(ffmpeg, ["-f", "concat", "-safe", "0", "-i", concatName, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", "-y", output], "اتصال اسلایدها برای ساخت MP4 ناموفق بود.");
    const data = await ffmpeg.readFile(output); const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data; const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    if (buffer.byteLength === 0) throw new Error("فایل MP4 خروجی خالی است."); onProgress?.(100); return new File([buffer], output, { type: "video/mp4" });
  } catch (error) { throw new Error(errorText(error, "ساخت ویدیو ناموفق بود.")); }
  finally { for (const name of imageNames) try { await ffmpeg.deleteFile(name); } catch {} for (const name of audioNames) try { await ffmpeg.deleteFile(name); } catch {} for (const name of clipNames) try { await ffmpeg.deleteFile(name); } catch {} try { await ffmpeg.deleteFile(concatName); } catch {} try { await ffmpeg.deleteFile(output); } catch {} }
}
