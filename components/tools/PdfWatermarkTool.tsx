"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileUp, LoaderCircle, ScanSearch, RotateCcw } from "lucide-react";

type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<any> };
};
function getPdfJs(): PdfJs | undefined {
  return (window as unknown as { pdfjsLib?: PdfJs }).pdfjsLib;
}
function getPdfLib(): any {
  return (window as unknown as { PDFLib?: any }).PDFLib;
}

const PDFLIB_URL = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

type WatermarkAnnotation = {
  key: string;
  pageIndex: number;
  annotationIndex: number;
  subtype: string;
  label: string;
};

function loadScript(id: string, src: string, isReady: () => boolean) {
  return new Promise<void>((resolve, reject) => {
    if (isReady()) {
      resolve();
      return;
    }

    let script = document.getElementById(id) as HTMLScriptElement | null;
    const onLoad = () => {
      if (isReady()) resolve();
      else reject(new Error("کتابخانه پردازش PDF به‌درستی بارگذاری نشد."));
    };
    const onError = () => reject(new Error("بارگذاری موتور PDF ناموفق بود؛ اتصال اینترنت را بررسی کنید."));

    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });
}

function decodePdfValue(value: any): string {
  if (!value) return "";
  if (typeof value.decodeText === "function") {
    try {
      return value.decodeText();
    } catch {
      return "";
    }
  }
  if (typeof value.asString === "function") return value.asString().replace(/^\//, "");
  return String(value);
}

function getAnnotationLabel(dict: any, PDFName: any): string {
  const parts = ["T", "Subj", "Contents"]
    .map((key) => decodePdfValue(dict.get(PDFName.of(key))).trim())
    .filter(Boolean);
  return parts.join(" — ") || "واترمارک بدون توضیحات";
}

function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([(() => { const copy = new Uint8Array(bytes.byteLength); copy.set(bytes); return copy.buffer; })()], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PdfWatermarkTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [candidates, setCandidates] = useState<WatermarkAnnotation[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      if (!file || !canvasRef.current) return;

      try {
        await loadScript("tusan-pdfjs-watermark", PDFJS_URL, () => !!getPdfJs());
        const pdfjs = getPdfJs();
        if (!pdfjs) throw new Error("کتابخانه PDF.js آماده نیست.");
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

        if (cancelled) {
          await pdf.destroy();
          return;
        }

        setPageCount(pdf.numPages);
        const safePageNumber = Math.min(Math.max(1, pageNumber), pdf.numPages);
        const page = await pdf.getPage(safePageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1.4, 760 / baseViewport.width) });
        const canvas = canvasRef.current;
        if (!canvas) {
          await pdf.destroy();
          return;
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("امکان نمایش پیش‌نمایش PDF وجود ندارد.");

        await page.render({ canvasContext: context, viewport }).promise;
        await pdf.destroy();
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "پیش‌نمایش PDF انجام نشد.");
      }
    }

    void renderPreview();
    return () => {
      cancelled = true;
    };
  }, [file, pageNumber]);

  const resetFile = () => {
    setFile(null);
    setPageCount(0);
    setPageNumber(1);
    setCandidates([]);
    setSelectedKeys([]);
    setScanned(false);
    setStatus("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const scan = async () => {
    if (!file) return;

    setBusy(true);
    setError("");
    setStatus("در حال بررسی ساختار PDF و annotationهای واترمارک...");
    try {
      await loadScript("tusan-pdflib-watermark", PDFLIB_URL, () => !!getPdfLib());
      const { PDFDocument, PDFName } = getPdfLib();
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const found: WatermarkAnnotation[] = [];

      pdf.getPages().forEach((page: any, pageIndex: number) => {
        const annotations = page.node.Annots();
        if (!annotations) return;

        for (let annotationIndex = 0; annotationIndex < annotations.size(); annotationIndex += 1) {
          const annotation = pdf.context.lookup(annotations.get(annotationIndex));
          if (!annotation || typeof annotation.get !== "function") continue;

          const subtype = decodePdfValue(annotation.get(PDFName.of("Subtype")));
          // Only select the PDF-standard /Watermark annotation automatically.
          // Stamp/signature annotations are intentionally left untouched.
          if (subtype.toLowerCase() !== "watermark") continue;

          found.push({
            key: `${pageIndex}:${annotationIndex}`,
            pageIndex,
            annotationIndex,
            subtype,
            label: getAnnotationLabel(annotation, PDFName),
          });
        }
      });

      setCandidates(found);
      setSelectedKeys(found.map((candidate) => candidate.key));
      setScanned(true);
      setStatus(
        found.length
          ? `${found.length} واترمارکِ ساختاری از نوع annotation در PDF پیدا شد. موارد انتخاب‌شده را بررسی و تأیید کنید.`
          : "واترمارک استانداردِ annotation پیدا نشد. این نتیجه به معنی نبودن واترمارک نیست؛ واترمارک‌های داخل content stream یا تصویر در این مرحله شناسایی نمی‌شوند.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تحلیل ساختار PDF انجام نشد.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  const removeSelected = async () => {
    if (!file || selectedKeys.length === 0) {
      setError("ابتدا فایل را تحلیل و حداقل یک واترمارک را انتخاب کنید.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("در حال حذف annotationهای انتخاب‌شده از ساختار PDF...");
    try {
      await loadScript("tusan-pdflib-watermark", PDFLIB_URL, () => !!getPdfLib());
      const { PDFDocument, PDFName } = getPdfLib();
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const selected = new Set(selectedKeys);
      let removedCount = 0;

      pdf.getPages().forEach((page: any, pageIndex: number) => {
        const annotations = page.node.Annots();
        if (!annotations) return;

        const indicesToRemove: number[] = [];
        for (let annotationIndex = 0; annotationIndex < annotations.size(); annotationIndex += 1) {
          const key = `${pageIndex}:${annotationIndex}`;
          if (!selected.has(key)) continue;

          const annotation = pdf.context.lookup(annotations.get(annotationIndex));
          const subtype = annotation?.get?.(PDFName.of("Subtype"));
          if (decodePdfValue(subtype).toLowerCase() === "watermark") {
            indicesToRemove.push(annotationIndex);
          }
        }

        indicesToRemove.sort((a, b) => b - a).forEach((index) => {
          annotations.remove(index);
          removedCount += 1;
        });

        if (annotations.size === 0) page.node.delete(PDFName.of("Annots"));
      });

      if (removedCount === 0) {
        throw new Error("هیچ annotation واترمارک مطابق انتخاب‌ها پیدا نشد؛ فایل اصلی تغییری نکرد.");
      }

      const bytes = await pdf.save({ useObjectStreams: true });
      downloadPdf(bytes, file.name.replace(/\.pdf$/i, "") + "-watermark-removed.pdf");
      setStatus(`${removedCount} annotation واترمارک از ساختار PDF حذف شد. فایل اصلی دست‌نخورده باقی ماند.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حذف واترمارک انجام نشد.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  const toggleCandidate = (key: string, checked: boolean) => {
    setSelectedKeys((current) =>
      checked ? [...current, key] : current.filter((item) => item !== key),
    );
  };

  return (
    <section dir="rtl" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
      <header className="mb-5">
        <h2 className="text-xl font-black">شناسایی و حذف ساختاری واترمارک PDF</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
          این نسخه واترمارک‌های استانداردی را که به‌شکل annotation در ساختار PDF ذخیره شده‌اند شناسایی و حذف می‌کند؛ پوشش سفید روی صفحه نمی‌کشد و فایل به سرور ارسال نمی‌شود.
        </p>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          if (!nextFile) return;
          setFile(nextFile);
          setPageCount(0);
          setPageNumber(1);
          setCandidates([]);
          setSelectedKeys([]);
          setScanned(false);
          setStatus("");
          setError("");
        }}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] p-6"
        >
          <FileUp size={32} className="text-[var(--primary)]" />
          <span className="mt-3 font-black">انتخاب فایل PDF</span>
          <span className="mt-1 text-xs text-[var(--text-muted)]">پردازش در مرورگر انجام می‌شود</span>
        </button>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="max-w-full truncate text-sm font-bold">{file.name}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{pageCount || "…"} صفحه</div>
            </div>
            <button
              type="button"
              onClick={resetFile}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"
            >
              <RotateCcw size={14} /> تغییر فایل
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-bold">
              صفحه پیش‌نمایش
              <select
                value={pageNumber}
                onChange={(event) => setPageNumber(Number(event.target.value))}
                className="mr-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                {Array.from({ length: pageCount }, (_, index) => (
                  <option key={index} value={index + 1}>{index + 1}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void scan()}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)]/40 px-4 py-2 text-sm font-black text-[var(--primary)] disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="animate-spin" size={17} /> : <ScanSearch size={17} />}
              تحلیل و شناسایی واترمارک
            </button>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border)] bg-slate-100 p-3">
            <canvas ref={canvasRef} className="mx-auto block h-auto max-w-full shadow-md" />
          </div>

          {scanned && (
            <div className="mt-5 rounded-2xl border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black">واترمارک‌های شناسایی‌شده</h3>
                {candidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedKeys(selectedKeys.length === candidates.length ? [] : candidates.map((item) => item.key))}
                    className="text-xs font-bold text-[var(--primary)]"
                  >
                    {selectedKeys.length === candidates.length ? "لغو انتخاب همه" : "انتخاب همه"}
                  </button>
                )}
              </div>
              {candidates.length === 0 ? (
                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                  موردی از نوع استاندارد /Watermark annotation پیدا نشد. واترمارک ممکن است به‌صورت متن/بردار در content stream یا داخل تصویر اسکن‌شده باشد؛ این نسخه آن نوع‌ها را حذف نمی‌کند و برای جلوگیری از خراب‌شدن سند، آن‌ها را حدس نمی‌زند.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {candidates.map((candidate) => (
                    <label key={candidate.key} className="flex items-start gap-3 rounded-xl bg-[var(--surface-secondary)] p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(candidate.key)}
                        onChange={(event) => toggleCandidate(candidate.key, event.target.checked)}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{candidate.label}</span>
                        <span className="mt-1 block text-xs text-[var(--text-muted)]">صفحه {candidate.pageIndex + 1} · نوع: {candidate.subtype}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={busy || selectedKeys.length === 0}
                onClick={() => void removeSelected()}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 font-black text-white disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Download size={18} />}
                حذف واقعی موارد انتخاب‌شده و دانلود PDF
              </button>
            </div>
          )}
        </>
      )}

      {status && <p role="status" className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{status}</p>}
      {error && <p role="alert" className="mt-4 text-sm leading-7 text-red-600">{error}</p>}

      <div className="mt-5 rounded-2xl border border-amber-300/60 bg-amber-50/60 p-4 text-xs leading-6 text-amber-900">
        حذف خودکار فقط برای annotationهای استاندارد از نوع Watermark فعال است. واترمارک‌های ادغام‌شده با محتوای صفحه یا تصویر اسکن‌شده هنوز پشتیبانی نمی‌شوند. فایل اصلی تغییر نمی‌کند؛ قبل از استفاده از خروجی، صفحات را بررسی کنید.
      </div>
    </section>
  );
}
