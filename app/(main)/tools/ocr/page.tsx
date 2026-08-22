"use client";

import { useCallback, useRef, useState } from "react";
import { Copy, Download, FileText, Loader2, RotateCcw, Upload } from "lucide-react";

type Status = "idle" | "loading" | "processing" | "done" | "error";
type OcrPage = { index: number; text: string };

declare global {
    interface Window {
        Tesseract?: {
            createWorker: (langs?: string, oem?: number, options?: { logger?: (message: { status?: string; progress?: number }) => void }) => Promise<{
                recognize: (image: File | HTMLCanvasElement) => Promise<{ data: { text: string } }>;
                terminate: () => Promise<unknown>;
            }>;
        };
        pdfjsLib?: {
            version: string;
            GlobalWorkerOptions: { workerSrc: string };
            getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<{
                numPages: number;
                getPage: (pageNumber: number) => Promise<{
                    getViewport: (options: { scale: number }) => { width: number; height: number };
                    render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<unknown> };
                }>;
            }> };
        };
    }
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function loadScript(id: string, src: string) {
    return new Promise<void>((resolve, reject) => {
        const existing = document.getElementById(id) as HTMLScriptElement | null;
        if (existing?.dataset.loaded === "true") { resolve(); return; }
        if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }
        const script = document.createElement("script");
        script.id = id; script.src = src; script.async = true;
        script.onload = () => { script.dataset.loaded = "true"; resolve(); };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

async function ensureLibraries(needsPdf: boolean) {
    if (!window.Tesseract) await loadScript("tesseract-js-cdn", TESSERACT_URL);
    if (needsPdf && !window.pdfjsLib) await loadScript("pdfjs-cdn", PDFJS_URL);
}

export default function OcrToolPage() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState("");
    const [text, setText] = useState("");
    const [error, setError] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    const reset = () => {
        setStatus("idle"); setProgress(0); setFileName(""); setText(""); setError("");
        if (inputRef.current) inputRef.current.value = "";
    };

    const runOcr = useCallback(async (file: File) => {
        setError(""); setText(""); setFileName(file.name);
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
            setStatus("error"); setError("فقط فایل‌های تصویری و PDF قابل پردازش هستند."); return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setStatus("error"); setError("حجم فایل نباید بیشتر از ۲۵ مگابایت باشد."); return;
        }
        try {
            setStatus("loading"); setProgress(3);
            await ensureLibraries(file.type === "application/pdf");
            if (!window.Tesseract) throw new Error("Tesseract unavailable");
            const worker = await window.Tesseract.createWorker("fas+eng", 1, {
                logger: (message) => {
                    if (message.status === "recognizing text" && typeof message.progress === "number") {
                        setStatus("processing"); setProgress(Math.min(95, Math.max(8, Math.round(message.progress * 85))));
                    }
                },
            });
            try {
                const pages: OcrPage[] = [];
                if (file.type === "application/pdf") {
                    if (!window.pdfjsLib) throw new Error("PDF.js unavailable");
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
                    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
                    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                        setStatus("processing"); setProgress(Math.round(((pageNumber - 1) / pdf.numPages) * 80) + 10);
                        const page = await pdf.getPage(pageNumber);
                        const viewport = page.getViewport({ scale: 2 });
                        const canvas = document.createElement("canvas");
                        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
                        const context = canvas.getContext("2d");
                        if (!context) throw new Error("Canvas unavailable");
                        await page.render({ canvasContext: context, viewport }).promise;
                        const result = await worker.recognize(canvas);
                        pages.push({ index: pageNumber, text: result.data.text.trim() });
                    }
                } else {
                    const result = await worker.recognize(file);
                    pages.push({ index: 1, text: result.data.text.trim() });
                }
                setProgress(100);
                setText(pages.map((page) => pages.length > 1 ? `--- صفحه ${page.index} ---\n${page.text}` : page.text).join("\n\n").trim());
                setStatus("done");
            } finally { await worker.terminate(); }
        } catch (err) {
            console.error("OCR failed", err); setStatus("error");
            setError("پردازش فایل انجام نشد. اتصال اینترنت و حجم فایل را بررسی کنید و دوباره تلاش کنید.");
        }
    }, []);

    const handleFile = (file?: File) => { if (file) void runOcr(file); };
    const copyText = async () => { if (text) await navigator.clipboard.writeText(text); };
    const downloadTxt = () => {
        if (!text) return;
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${fileName.replace(/\.[^.]+$/, "") || "ocr-result"}.txt`; a.click(); URL.revokeObjectURL(url);
    };
    const downloadWord = () => {
        if (!text) return;
        const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Vazirmatn,Tahoma,sans-serif;direction:rtl;line-height:2;font-size:14px}p{margin:0 0 10px}</style></head><body>${text.split(/\r?\n/).map((line) => `<p>${line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") || "&nbsp;"}</p>`).join("")}</body></html>`;
        const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" }); const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${fileName.replace(/\.[^.]+$/, "") || "ocr-result"}.doc`; a.click(); URL.revokeObjectURL(url);
    };

    return (
        <main dir="rtl" className="min-h-screen page-background py-12 md:py-20">
            <div className="mx-auto max-w-6xl px-5 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary)]/10 text-[var(--primary)]"><FileText size={32} /></div>
                    <h1 className="mt-5 text-3xl font-black text-[var(--text)] md:text-4xl">تبدیل عکس و PDF به متن</h1>
                    <p className="mt-3 text-[var(--text-muted)]">متن فارسی و انگلیسی را از تصاویر و فایل‌های PDF استخراج و ویرایش کنید.</p>
                </div>
                <div className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                    <section className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                        <button type="button" disabled={status === "loading" || status === "processing"} onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }} className={`flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${isDragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}>
                            {status === "loading" || status === "processing" ? <Loader2 className="animate-spin text-[var(--primary)]" size={38} /> : <Upload className="text-[var(--primary)]" size={38} />}
                            <strong className="mt-4">{status === "loading" || status === "processing" ? "در حال پردازش..." : "فایل را اینجا رها کنید"}</strong>
                            <span className="mt-2 text-sm text-[var(--text-muted)]">یا برای انتخاب فایل کلیک کنید</span>
                            <span className="mt-4 text-xs text-[var(--text-muted)]">JPG، PNG، WEBP و PDF · حداکثر ۲۵ مگابایت</span>
                            <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                        </button>
                        {fileName && <div className="mt-4 break-all rounded-xl bg-[var(--surface-secondary)] p-3 text-sm font-bold">{fileName}</div>}
                        {(status === "loading" || status === "processing") && <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-bold"><span>پیشرفت</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} /></div></div>}
                        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</div>}
                        <div className="mt-5 flex gap-2"><button type="button" onClick={reset} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-bold"><RotateCcw size={17} /> شروع مجدد</button></div>
                    </section>
                    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4"><div><h2 className="font-black">متن استخراج‌شده</h2><p className="mt-1 text-xs text-[var(--text-muted)]">می‌توانید متن را مستقیماً ویرایش کنید.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!text} onClick={() => void copyText()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-40"><Copy size={16} /> کپی</button><button type="button" disabled={!text} onClick={downloadTxt} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold disabled:opacity-40"><Download size={16} /> TXT</button><button type="button" disabled={!text} onClick={downloadWord} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white disabled:opacity-40"><Download size={16} /> Word</button></div></div><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="بعد از پردازش فایل، متن اینجا نمایش داده می‌شود..." className="mt-4 min-h-[520px] w-full resize-y rounded-2xl border border-[var(--border)] bg-transparent p-5 text-sm leading-8 outline-none focus:border-[var(--primary)]" />
                    </section>
                </div>
            </div>
        </main>
    );
}
