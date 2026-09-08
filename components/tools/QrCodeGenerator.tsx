"use client";

import { useState } from "react";
import QRCode from "qrcode";

export default function QrCodeGenerator() {
  const [text, setText] = useState("");
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const value = text.trim();
    setError("");
    setSrc("");
    if (!value) return;
    setLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(value, { width: 640, margin: 3, errorCorrectionLevel: "M" });
      setSrc(dataUrl);
    } catch {
      setError("ساخت QR Code انجام نشد. متن یا لینک واردشده را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
      <label className="text-sm font-bold">
        متن یا لینک
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="https://www.tusancn.ir" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent p-4" dir="ltr" onKeyDown={(e) => { if (e.key === "Enter") void generate(); }} />
      </label>
      <button type="button" onClick={() => void generate()} disabled={loading || !text.trim()} className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? "در حال ساخت QR Code..." : "ساخت QR Code"}
      </button>
      {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-600">{error}</div>}
      {src && <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] p-5"><img src={src} alt="QR Code" className="h-64 w-64 rounded-xl" /><a href={src} download="tusan-qr-code.png" className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-black">دانلود PNG</a></div>}
      <p className="mt-5 text-xs leading-6 text-[var(--text-muted)]">متن فقط برای ساخت QR در مرورگر استفاده می‌شود و به سرور توسن ارسال نمی‌شود.</p>
    </section>
  );
}
