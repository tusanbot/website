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
      ffmpeg.on("log", ({ message }) => {
        lastFfmpegLog = message;
      });
      if (onProgress) ffmpeg.on("progress", ({ progress }) => onProgress(Math.max(0, Math.min(1, progress))));
      const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      instance = ffmpeg;
      return ffmpeg;
    })().catch(error => {
      loading = null;
      instance = null;
      throw error;
    });
  }
  return loading;
}

async function runTranscode(file: File, outputName: string, args: string[], mime: string, onProgress?: (value: number) => void) {
  const ffmpeg = await getFFmpeg(onProgress);
  const input = `input-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop() || "bin"}`;
  try {
    await ffmpeg.writeFile(input, await fetchFile(file));
    await ffmpeg.exec(["-i", input, ...args, outputName]);
    const data = await ffmpeg.readFile(outputName);
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new File([buffer], outputName, { type: mime });
  } finally {
    try { await ffmpeg.deleteFile(input); } catch {}
    try { await ffmpeg.deleteFile(outputName); } catch {}
  }
}

export async function makeBrowserPlayable(file: File, onProgress?: (value: number) => void) {
  return runTranscode(file, `playable-${Date.now()}.webm`, ["-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-c:a", "libopus", "-b:a", "96k", "-deadline", "realtime", "-cpu-used", "4"], "video/webm", onProgress);
}

export async function convertVideoFormat(file: File, format: "mp4" | "webm", onProgress?: (value: number) => void) {
  if (format === "webm") return runTranscode(file, `tusan-converted-${Date.now()}.webm`, ["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-c:a", "libopus", "-b:a", "96k"], "video/webm", onProgress);
  return runTranscode(file, `tusan-converted-${Date.now()}.mp4`, ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"], "video/mp4", onProgress);
}

type SlideInput = { file: File; duration: number; audio?: File; audioStart?: number; audioEnd?: number };

export async function encodeSlideSequence(slides: SlideInput[], onProgress?: (percent: number) => void) {
  const ffmpeg = await getFFmpeg(progress => onProgress?.(55 + Math.round(progress * 45)));
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const imageNames: string[] = [];
  const audioNames: string[] = [];
  try {
    if (!slides.length) throw new Error("هیچ اسلایدی برای خروجی وجود ندارد.");

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (!slide) throw new Error(`اسلاید شماره ${i + 1} پیدا نشد.`);
      const imageName = `studio-${token}-${i}.png`;
      await ffmpeg.writeFile(imageName, await fetchFile(slide.file));
      imageNames.push(imageName);
      const audio = slide.audio;
      if (audio) {
        const extension = audio.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "wav";
        const audioName = `studio-${token}-${i}.${extension}`;
        await ffmpeg.writeFile(audioName, await fetchFile(audio));
        audioNames.push(audioName);
      } else {
        audioNames.push("");
      }
    }

    const inputs: string[] = [];
    const filters: string[] = [];
    let inputIndex = 0;

    slides.forEach((slide, i) => {
      const duration = Math.max(0.5, Number(slide.duration) || 0.5);
      inputs.push("-loop", "1", "-t", String(duration), "-i", imageNames[i]);
      const videoIndex = inputIndex++;
      filters.push(`[${videoIndex}:v]fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setpts=PTS-STARTPTS[v${i}]`);

      const audioName = audioNames[i];
      if (audioName) {
        inputs.push("-i", audioName);
        const audioIndex = inputIndex++;
        const start = Math.max(0, Number(slide.audioStart) || 0);
        const end = Math.max(start + 0.05, Number(slide.audioEnd) || start + duration);
        filters.push(`[${audioIndex}:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,apad=pad_dur=${duration},atrim=0:${duration},asetpts=PTS-STARTPTS[a${i}]`);
      } else {
        filters.push(`anullsrc=r=48000:cl=stereo,atrim=0:${duration},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a${i}]`);
      }
    });

    const concatInputs = slides.map((_, i) => `[v${i}][a${i}]`).join("");
    filters.push(`${concatInputs}concat=n=${slides.length}:v=1:a=1[v][a]`);

    const output = `tusan-studio-${token}.mp4`;
    lastFfmpegLog = "";
    try {
      await ffmpeg.exec([
        ...inputs,
        "-filter_complex", filters.join(";"),
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-ar", "48000",
        "-ac", "2",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "-y", output,
      ]);
    } catch (error) {
      const detail = lastFfmpegLog ? ` ${lastFfmpegLog}` : "";
      throw new Error(`ساخت MP4 در مرحله رمزگذاری ناموفق بود.${detail}`);
    }

    const data = await ffmpeg.readFile(output);
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new File([buffer], output, { type: "video/mp4" });
  } finally {
    for (const name of imageNames) try { await ffmpeg.deleteFile(name); } catch {}
    for (const name of audioNames) if (name) try { await ffmpeg.deleteFile(name); } catch {}
    try { await ffmpeg.deleteFile(`tusan-studio-${token}.mp4`); } catch {}
  }
}
