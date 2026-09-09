"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

async function getFFmpeg(onProgress?: (value: number) => void) {
  if (instance) return instance;
  if (!loading) {
    loading = (async () => {
      const ffmpeg = new FFmpeg();
      if (onProgress) ffmpeg.on("progress", ({ progress }) => onProgress(Math.max(0, Math.min(1, progress))));
      const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      instance = ffmpeg;
      return ffmpeg;
    })().catch((error) => { loading = null; instance = null; throw error; });
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
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
    return new File([bytes], outputName, { type: mime });
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
