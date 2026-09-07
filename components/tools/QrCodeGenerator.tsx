"use client";
import { useEffect, useState } from "react";

type QRCodeApi = { toDataURL: (text: string, options: object) => Promise<string> };

const QR_SRC = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";
let qrLoadPromise: Promise<QRCodeApi> | null = null;

function loadQRCode(): Promise<QRCodeApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser-only"));
  const existing = (window as Window & { QRCode?: QRCodeApi }).QRCode;
  if (existing) return Promise.resolve(existing);
  if (qrLoadPromise) return qrLoadPromise;

  qrLoadPromise = new Promise<QRCodeApi>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>("script[data-tusan-qrcode]");
    if (current) {
      current.addEventListener("load", () => {
        const api = (window as Window & { QRCode?: QRCodeApi }).QRCode;
        api ? resolve(api) : reject(new Error("QRCode global missing"));
      }, { once: true });
      current.addEventListener("error", () => reject(new Error("QRCode script failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = QR_SRC;
    script.async = true;
    script.dataset.tusanQrcode = "1";
    script.onload = () => {
      const api = (window as Window & { QRCode?: QRCodeApi }).QRCode;
      api ? resolve(api) : reject(new Error("QRCode global missing"));
    };
    script.onerror = () => reject(new Error("QRCode script failed"));
    document.head.appendChild(script);
  }).catch((error) => {
    qrLoadPromise = null;
    throw error;
  });

  return qrLoadPromise;
}

export default function QrCodeGenerator() {
  const [text, setText] = useState("");
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQRCode().then(() => setLoading(false)).catch(() => {
      setLoading(false);
      setError("بارگذاری کتابخانه QR Code انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.");
    });
  }, []);

  const generate = async () => {
    setError("");
    if (!text.trim()) {
      setSrc("");
      return;
    }

    setLoading(true);
    try {
      const QR = await loadQRCode();
      const result = await QR.toDataURL(text.trim(), {
        width: 640,
        margin: 3,
        errorCorrectionLevel: "M",
      });
      setSrc(result);
    } catch {
      setError("ساخت QR Code انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
      <label className="text-sm font-bold">
        متن یا لینک
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://www.tusancn.ir"
          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent p-4"
          dir="ltr"
        />
      </label>
      <button
        onClick={generate}
        disabled={loading || !text.trim()}
        className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "در حال آماده‌سازی..." : "ساخت QR Code"}
      </button>
      {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-600">{error}</div>}
      {src && (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] p-5">
          <img src={src} alt="QR Code" className="h-64 w-64 rounded-xl" />
          <a href={src} download="tusan-qr-code.png" className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-black">دانلود PNG</a>
        </div>
      )}
      <p className="mt-5 text-xs leading-6 text-[var(--text-muted)]">متن فقط برای ساخت QR در مرورگر استفاده می‌شود و به سرور توسن ارسال نمی‌شود.</p>
    </section>
  );
}
