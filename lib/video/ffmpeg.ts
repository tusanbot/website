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
      const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      instance = ffmpeg;
      return ffmpeg;
    })();
  }
  return loading;
}

export async function makeBrowserPlayable(file: File, onProgress?: (value: number) => void) {
  const ffmpeg = await getFFmpeg(onProgress);
  const input = `input-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop() || "bin"}`;
  const output = `playable-${Date.now()}.webm`;
  try {
    await ffmpeg.writeFile(input, await fetchFile(file));
    await ffmpeg.exec([
      "-i", input,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-c:v", "libvpx-vp9",
      "-crf", "34",
      "-b:v", "0",
      "-c:a", "libopus",
      "-b:a", "96k",
      "-deadline", "realtime",
      "-cpu-used", "4",
      output,
    ]);
    const data = await ffmpeg.readFile(output);
    const blob = new Blob([data instanceof Uint8Array ? data.buffer as ArrayBuffer : data], { type: "video/webm" });
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-browser.webm`, { type: "video/webm" });
  } finally {
    try { await ffmpeg.deleteFile(input); } catch {}
    try { await ffmpeg.deleteFile(output); } catch {}
  }
}
