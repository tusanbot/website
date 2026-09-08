"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";

type QrType = "url" | "text" | "email" | "phone" | "sms" | "wifi" | "contact";
type QrStyle = "classic" | "dots" | "rounded" | "soft";
type Theme = { name: string; foreground: string; background: string };

const themes: Theme[] = [
  { name: "توسن", foreground: "#09967c", background: "#ffffff" },
  { name: "مشکی", foreground: "#111827", background: "#ffffff" },
  { name: "آبی", foreground: "#2563eb", background: "#eff6ff" },
  { name: "بنفش", foreground: "#7c3aed", background: "#faf5ff" },
  { name: "قرمز", foreground: "#dc2626", background: "#fff7f7" },
  { name: "طلایی", foreground: "#a16207", background: "#fffbeb" },
];

const normalizeDigits = (value: string) => value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

function buildPayload(type: QrType, fields: Record<string, string>) {
  const value = fields.value?.trim() ?? "";
  if (type === "url" || type === "text") return value;
  if (type === "email") {
    const subject = fields.subject?.trim() ?? "";
    const body = fields.body?.trim() ?? "";
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    return `mailto:${value}${params.toString() ? `?${params.toString()}` : ""}`;
  }
  if (type === "phone") return `tel:${normalizeDigits(value)}`;
  if (type === "sms") {
    const body = fields.body?.trim() ?? "";
    return `SMSTO:${normalizeDigits(value)}:${body}`;
  }
  if (type === "wifi") {
    const ssid = fields.ssid?.trim() ?? "";
    const password = fields.password ?? "";
    const security = fields.security ?? "WPA";
    const hidden = fields.hidden === "true" ? "true" : "false";
    return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`;
  }
  const name = fields.name?.trim() ?? "";
  const organization = fields.organization?.trim() ?? "";
  const email = fields.email?.trim() ?? "";
  const phone = normalizeDigits(fields.phone?.trim() ?? "");
  const website = fields.website?.trim() ?? "";
  return [
    "BEGIN:VCARD", "VERSION:3.0",
    `FN:${name}`,
    organization ? `ORG:${organization}` : "",
    phone ? `TEL:${phone}` : "",
    email ? `EMAIL:${email}` : "",
    website ? `URL:${website}` : "",
    "END:VCARD",
  ].filter(Boolean).join("\n");
}

function drawStyledQr(payload: string, theme: Theme, style: QrStyle) {
  const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const size = 720;
  const margin = 64;
  const modules = qr.modules.size;
  const cell = (size - margin * 2) / modules;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = theme.foreground;

  const isFinder = (row: number, col: number) =>
    (row < 7 && col < 7) || (row < 7 && col >= modules - 7) || (row >= modules - 7 && col < 7);

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (!qr.modules.get(row, col)) continue;
      const x = margin + col * cell;
      const y = margin + row * cell;
      const radius = Math.max(1, cell * 0.22);

      if (style === "dots") {
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else if (style === "rounded" || style === "soft") {
        const r = style === "soft" ? cell * 0.32 : radius;
        ctx.beginPath();
        ctx.roundRect(x + cell * 0.04, y + cell * 0.04, cell * 0.92, cell * 0.92, r);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, Math.ceil(cell + 0.2), Math.ceil(cell + 0.2));
      }
    }
  }

  // Keep the three position markers crisp and recognizable.
  for (const [row, col] of [[0, 0], [0, modules - 7], [modules - 7, 0]]) {
    const x = margin + col * cell;
    const y = margin + row * cell;
    ctx.fillStyle = theme.background;
    ctx.fillRect(x, y, cell * 7, cell * 7);
    ctx.fillStyle = theme.foreground;
    ctx.beginPath();
    ctx.roundRect(x, y, cell * 7, cell * 7, cell * 0.8);
    ctx.fill();
    ctx.fillStyle = theme.background;
    ctx.fillRect(x + cell, y + cell, cell * 5, cell * 5);
    ctx.fillStyle = theme.foreground;
    ctx.beginPath();
    ctx.roundRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell * 0.45);
    ctx.fill();
  }

  return canvas.toDataURL("image/png");
}

const labels: Record<QrType, string> = {
  url: "لینک / Website",
  text: "متن / Text",
  email: "ایمیل / Email",
  phone: "تماس تلفنی / Phone",
  sms: "پیامک / SMS",
  wifi: "وای‌فای / Wi‑Fi",
  contact: "کارت ویزیت / Contact",
};

export default function QrCodeGenerator() {
  const [type, setType] = useState<QrType>("url");
  const [fields, setFields] = useState<Record<string, string>>({ value: "" });
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [themeIndex, setThemeIndex] = useState(0);
  const [style, setStyle] = useState<QrStyle>("classic");

  const theme = themes[themeIndex];
  const currentValue = useMemo(() => buildPayload(type, fields), [type, fields]);

  const updateField = (key: string, value: string) => setFields((prev) => ({ ...prev, [key]: value }));
  const changeType = (next: QrType) => {
    setType(next);
    setFields({ value: "" });
    setSrc("");
    setError("");
  };

  const generate = async () => {
    setError("");
    setSrc("");
    if (!currentValue.trim()) {
      setError("لطفاً اطلاعات لازم را وارد کنید.");
      return;
    }
    setLoading(true);
    try {
      setSrc(drawStyledQr(currentValue, theme, style));
    } catch {
      setError("ساخت QR Code انجام نشد. اطلاعات واردشده را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]";

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(labels) as QrType[]).map((key) => (
          <button key={key} type="button" onClick={() => changeType(key)} className={`rounded-xl border px-3 py-3 text-xs font-black transition ${type === key ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}>
            {labels[key]}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {(type === "url" || type === "text" || type === "phone") && (
          <label className="block text-sm font-bold">
            {type === "url" ? "آدرس لینک" : type === "phone" ? "شماره تلفن" : "متن"}
            <input value={fields.value ?? ""} onChange={(e) => updateField("value", e.target.value)} placeholder={type === "url" ? "https://www.tusancn.ir" : type === "phone" ? "09120000000" : "متن موردنظر شما"} className={inputClass} dir={type === "text" ? "rtl" : "ltr"} />
          </label>
        )}

        {type === "email" && <>
          <label className="block text-sm font-bold">آدرس ایمیل<input type="email" value={fields.value ?? ""} onChange={(e) => updateField("value", e.target.value)} placeholder="info@example.com" className={inputClass} dir="ltr" /></label>
          <label className="block text-sm font-bold">موضوع (اختیاری)<input value={fields.subject ?? ""} onChange={(e) => updateField("subject", e.target.value)} className={inputClass} /></label>
          <label className="block text-sm font-bold">متن ایمیل (اختیاری)<textarea value={fields.body ?? ""} onChange={(e) => updateField("body", e.target.value)} className={`${inputClass} min-h-28`} /></label>
        </>}

        {type === "sms" && <>
          <label className="block text-sm font-bold">شماره گیرنده<input value={fields.value ?? ""} onChange={(e) => updateField("value", e.target.value)} placeholder="09120000000" className={inputClass} dir="ltr" /></label>
          <label className="block text-sm font-bold">متن پیام<textarea value={fields.body ?? ""} onChange={(e) => updateField("body", e.target.value)} className={`${inputClass} min-h-28`} /></label>
        </>}

        {type === "wifi" && <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">نام شبکه (SSID)<input value={fields.ssid ?? ""} onChange={(e) => updateField("ssid", e.target.value)} className={inputClass} dir="ltr" /></label>
          <label className="block text-sm font-bold">رمز Wi‑Fi<input value={fields.password ?? ""} onChange={(e) => updateField("password", e.target.value)} className={inputClass} dir="ltr" /></label>
          <label className="block text-sm font-bold">نوع امنیت<select value={fields.security ?? "WPA"} onChange={(e) => updateField("security", e.target.value)} className={inputClass}><option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">بدون رمز</option></select></label>
          <label className="flex items-center gap-3 pt-8 text-sm font-bold"><input type="checkbox" checked={fields.hidden === "true"} onChange={(e) => updateField("hidden", String(e.target.checked))} /> شبکه مخفی است</label>
        </div>}

        {type === "contact" && <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">نام و نام خانوادگی<input value={fields.name ?? ""} onChange={(e) => updateField("name", e.target.value)} className={inputClass} /></label>
          <label className="block text-sm font-bold">شرکت / سازمان<input value={fields.organization ?? ""} onChange={(e) => updateField("organization", e.target.value)} className={inputClass} /></label>
          <label className="block text-sm font-bold">شماره تماس<input value={fields.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} className={inputClass} dir="ltr" /></label>
          <label className="block text-sm font-bold">ایمیل<input value={fields.email ?? ""} onChange={(e) => updateField("email", e.target.value)} className={inputClass} dir="ltr" /></label>
          <label className="block text-sm font-bold sm:col-span-2">وب‌سایت<input value={fields.website ?? ""} onChange={(e) => updateField("website", e.target.value)} placeholder="https://" className={inputClass} dir="ltr" /></label>
        </div>}
      </div>

      <div className="mt-7 rounded-2xl border border-[var(--border)] p-4">
        <div className="mb-3 text-sm font-black">تم و رنگ QR</div>
        <div className="flex flex-wrap gap-2">
          {themes.map((item, index) => <button key={item.name} type="button" onClick={() => { setThemeIndex(index); setSrc(""); }} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${themeIndex === index ? "ring-2 ring-[var(--primary)]" : ""}`}><span className="h-4 w-4 rounded-full border" style={{ backgroundColor: item.foreground }} />{item.name}</button>)}
        </div>
        <div className="mt-5 mb-3 text-sm font-black">طرح QR</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([['classic', 'کلاسیک'], ['dots', 'نقطه‌ای'], ['rounded', 'گرد'], ['soft', 'نرم']] as const).map(([key, name]) => <button key={key} type="button" onClick={() => { setStyle(key); setSrc(""); }} className={`rounded-xl border px-3 py-2 text-xs font-bold ${style === key ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"}`}>{name}</button>)}
        </div>
      </div>

      <button type="button" onClick={() => void generate()} disabled={loading} className="mt-5 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? "در حال ساخت QR Code..." : "ساخت QR Code"}
      </button>
      {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-600">{error}</div>}
      {src && <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] p-5"><div className="rounded-2xl p-2" style={{ backgroundColor: theme.background }}><img src={src} alt="QR Code ساخته‌شده" className="h-64 w-64 max-w-full rounded-xl" /></div><a href={src} download="tusan-qr-code.png" className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-black">دانلود PNG</a></div>}
      <p className="mt-5 text-xs leading-6 text-[var(--text-muted)]">اطلاعات فقط در مرورگر شما برای ساخت QR پردازش می‌شود و به سرور توسن ارسال یا ذخیره نمی‌شود.</p>
    </section>
  );
}
