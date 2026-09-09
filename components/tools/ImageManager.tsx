"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Download, Loader2, RotateCcw, Trash2, Upload } from "lucide-react";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";
type Item = { id: string; file: File; url: string; width: number; height: number };

function readImage(file: File) {
  return new Promise<{ url: string; width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file); const image = new Image();
    image.onload = () => resolve({ url, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تصویر معتبر نیست.")); }; image.src = url;
  });
}

function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }

export default function ImageManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]); const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(82); const [maxWidth, setMaxWidth] = useState(0); const [rotate, setRotate] = useState(0);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => () => items.forEach(i => URL.revokeObjectURL(i.url)), [items]);

  const add = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(f => f.type.startsWith("image/"));
    if (!files.length) { setMessage("فقط فایل‌های تصویری انتخاب کنید."); return; }
    const next: Item[] = []; for (const file of files) { const image = await readImage(file); next.push({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, ...image }); }
    setItems(prev => [...prev, ...next]); setMessage(`${next.length} تصویر اضافه شد.`); if (inputRef.current) inputRef.current.value = "";
  };
  const remove = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const reset = () => { items.forEach(i => URL.revokeObjectURL(i.url)); setItems([]); setMessage(""); };

  const process = async (item: Item) => {
    const source = await readImage(item.file); const image = new Image(); image.src = source.url; await new Promise<void>(r => { image.onload = () => r(); });
    const radians = (rotate * Math.PI) / 180; const swap = rotate === 90 || rotate === 270;
    const sourceW = image.naturalWidth, sourceH = image.naturalHeight; const scale = maxWidth > 0 ? Math.min(1, maxWidth / Math.max(1, swap ? sourceH : sourceW)) : 1;
    const w = Math.max(1, Math.round((swap ? sourceH : sourceW) * scale)); const h = Math.max(1, Math.round((swap ? sourceW : sourceH) * scale));
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("پردازش تصویر در مرورگر ممکن نیست.");
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(radians); ctx.drawImage(image, -sourceW * scale / 2, -sourceH * scale / 2, sourceW * scale, sourceH * scale); ctx.restore();
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("ساخت خروجی تصویر ناموفق بود.")), format, quality / 100));
    const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg"; download(blob, `tusan-${item.file.name.replace(/\.[^.]+$/, "")}.${ext}`); URL.revokeObjectURL(source.url);
  };
  const processAll = async () => { if (!items.length) { setMessage("ابتدا تصویر انتخاب کنید."); return; } setBusy(true); setMessage("در حال پردازش تصاویر..."); try { for (const item of items) await process(item); setMessage(`${items.length} تصویر آماده دانلود شد.`); } catch (e) { setMessage(e instanceof Error ? e.message : "پردازش انجام نشد."); } finally { setBusy(false); } };

  return <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7" dir="rtl">
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="rounded-2xl border border-dashed border-[var(--primary)]/35 bg-[var(--primary)]/5 p-8 text-center"><Upload className="mx-auto h-9 w-9 text-[var(--primary)]" /><h2 className="mt-3 text-lg font-black">تصاویر را انتخاب کنید</h2><p className="mt-2 text-sm text-[var(--text-muted)]">تغییر اندازه، فشرده‌سازی، تبدیل فرمت و چرخش؛ پردازش داخل مرورگر.</p><input ref={inputRef} type="file" accept="image/*" multiple onChange={add} className="hidden" /><button type="button" onClick={() => inputRef.current?.click()} className="mt-5 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">انتخاب تصاویر</button></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"><label className="text-sm font-black">فرمت خروجی</label><select value={format} onChange={e => setFormat(e.target.value as OutputFormat)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select><label className="mt-4 block text-sm font-black">کیفیت JPG/WebP: {quality}%</label><input type="range" min="30" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} className="mt-2 w-full" /><label className="mt-4 block text-sm font-black">حداکثر عرض (پیکسل)</label><input type="number" min="0" value={maxWidth} onChange={e => setMaxWidth(Math.max(0, Number(e.target.value)))} placeholder="بدون تغییر" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /><label className="mt-4 block text-sm font-black">چرخش</label><select value={rotate} onChange={e => setRotate(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"><option value={0}>بدون چرخش</option><option value={90}>۹۰ درجه</option><option value={180}>۱۸۰ درجه</option><option value={270}>۲۷۰ درجه</option></select><button type="button" onClick={processAll} disabled={busy || !items.length} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}پردازش و دانلود همه</button><button type="button" onClick={reset} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-bold"><RotateCcw className="h-4 w-4" /> پاک کردن همه</button></div>
    </div>
    {message && <div className="mt-4 rounded-xl bg-[var(--primary)]/10 px-4 py-3 text-sm font-bold text-[var(--primary)]">{message}</div>}
    {items.length > 0 && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <div key={item.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]"><img src={item.url} alt={item.file.name} className="aspect-[4/3] w-full object-contain bg-white" /><div className="p-3"><div className="truncate text-xs font-black">{item.file.name}</div><div className="mt-1 text-[11px] text-[var(--text-muted)]">{item.width}×{item.height}</div><div className="mt-3 flex gap-2"><button type="button" onClick={() => process(item)} disabled={busy} className="flex-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-black text-white"><Download className="ml-1 inline h-3.5 w-3.5" />دانلود</button><button type="button" onClick={() => remove(item.id)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><Trash2 className="h-3.5 w-3.5" /></button></div></div></div>)}</div>}
  </div>;
}
