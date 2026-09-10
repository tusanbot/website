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
      await ffmpeg.load({ coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"), wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm") });
      instance = ffmpeg;
      return ffmpeg;
    })().catch(error => { loading = null; instance = null; throw error; });
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

type SlideInput = { file: File; duration: number; audio?: File };

export async function encodeSlideSequence(slides: SlideInput[], onProgress?: (percent: number) => void) {
  const ffmpeg = await getFFmpeg(progress => onProgress?.(55 + Math.round(progress * 45)));
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const imageNames: string[] = [];
  const audioNames: string[] = [];
  try {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (!slide) throw new Error(`اسلاید شماره ${i + 1} پیدا نشد.`);
      const imageName = `studio-${token}-${i}.png`;
      await ffmpeg.writeFile(imageName, await fetchFile(slide.file));
      imageNames.push(imageName);
      const audio = slide.audio;
      if (audio) {
        const audioName = `studio-${token}-${i}.${audio.name.split(".").pop() || "wav"}`;
        await ffmpeg.writeFile(audioName, await fetchFile(audio));
        audioNames.push(audioName);
      } else audioNames.push("");
    }

    const inputs: string[] = [];
    const filters: string[] = [];
    const audioInputIndex: number[] = [];
    let inputIndex = 0;
    slides.forEach((slide, i) => {
      inputs.push("-loop", "1", "-t", String(Math.max(0.5, slide.duration)), "-i", imageNames[i]);
      const videoIndex = inputIndex++;
      filters.push(`[${videoIndex}:v]fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setpts=PTS-STARTPTS[v${i}]`);
      const audioName = audioNames[i];
      if (audioName) {
        inputs.push("-i", audioName);
        const currentAudioIndex = inputIndex++;
        audioInputIndex[i] = currentAudioIndex;
        filters.push(`[${currentAudioIndex}:a]atrim=0:${Math.max(0.5, slide.duration)},asetpts=PTS-STARTPTS[a${i}]`);
      } else {
        filters.push(`anullsrc=r=48000:cl=stereo,atrim=0:${Math.max(0.5, slide.duration)},asetpts=PTS-STARTPTS[a${i}]`);
      }
    });
    const concatInputs = slides.map((_, i) => `[v${i}][a${i}]`).join("");
    filters.push(`${concatInputs}concat=n=${slides.length}:v=1:a=1[v][a]`);
    const output = `tusan-studio-${token}.mp4`;
    await ffmpeg.exec([...inputs, "-filter_complex", filters.join(";"), "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-y", output]);
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
