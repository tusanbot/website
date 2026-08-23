"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type Theme = "classic" | "modern" | "school" | "minimal";

const themes: { id: Theme; title: string; desc: string }[] = [
  { id: "classic", title: "کلاسیک", desc: "رسمی و مناسب چاپ" },
  { id: "modern", title: "مدرن", desc: "جوان‌پسند و پرانرژی" },
  { id: "school", title: "مدرسه‌ای", desc: "شاد و مناسب دانش‌آموزان" },
  { id: "minimal", title: "مینیمال", desc: "ساده و کم‌جوهر" },
];

const presets: Record<Theme, { bg: string; accent: string; text: string; muted: string }> = {
  classic: { bg: "#fffaf0", accent: "#991b1b", text: "#1f2937", muted: "#6b7280" },
  modern: { bg: "#f8fafc", accent: "#7c3aed", text: "#172033", muted: "#64748b" },
  school: { bg: "#fff7ed", accent: "#ea580c", text: "#263238", muted: "#64748b" },
  minimal: { bg: "#ffffff", accent: "#111827", text: "#111827", muted: "#6b7280" },
};

export default function StudentCouncilPosterPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [number, setNumber] = useState("");
  const [slogan, setSlogan] = useState("");
  const [theme, setTheme] = useState<Theme>("modern");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [fontSize, setFontSize] = useState(58);
  const [accent, setAccent] = useState(presets.modern.accent);

  useEffect(() => {
    setAccent(presets[theme].accent);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = presets[theme];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative frame / theme-specific header
    ctx.fillStyle = accent;
    if (theme === "modern") {
      ctx.fillRect(0, 0, canvas.width, 190);
      ctx.beginPath(); ctx.arc(1050, 80, 260, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fill();
    } else if (theme === "school") {
      ctx.fillRect(0, 0, canvas.width, 145);
      ctx.fillStyle = "rgba(234,88,12,.12)"; ctx.fillRect(0, 145, canvas.width, 28);
    } else if (theme === "classic") {
      ctx.strokeStyle = accent; ctx.lineWidth = 10; ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);
      ctx.lineWidth = 2; ctx.strokeRect(55, 55, canvas.width - 110, canvas.height - 110);
    } else {
      ctx.fillRect(0, 0, 24, canvas.height);
      ctx.fillRect(24, 0, canvas.width - 24, 10);
    }

    const center = canvas.width / 2;
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.fillStyle = theme === "modern" || theme === "school" ? "#fff" : p.text;
    ctx.font = "bold 34px Arial";
    ctx.fillText("انتخابات شورای دانش‌آموزی", center, 105);

    const photoX = center - 175, photoY = 225, photoSize = 350;
    if (image) {
      ctx.save(); ctx.beginPath(); ctx.arc(center, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2); ctx.clip();
      const scale = Math.max(photoSize / image.width, photoSize / image.height);
      const w = image.width * scale, h = image.height * scale;
      ctx.drawImage(image, center - w / 2, photoY + photoSize / 2 - h / 2, w, h); ctx.restore();
    } else {
      ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.arc(center, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.muted; ctx.font = "bold 28px Arial"; ctx.fillText("عکس کاندیدا", center, photoY + photoSize / 2 + 10);
    }

    ctx.fillStyle = p.text; ctx.font = `bold ${fontSize}px Arial`; ctx.fillText(name || "نام کاندیدا", center, 660);
    ctx.fillStyle = accent; ctx.font = "bold 30px Arial"; ctx.fillText(slogan || "شعار انتخاباتی شما", center, 725);
    ctx.fillStyle = p.muted; ctx.font = "24px Arial";
    const meta = [className && `پایه/کلاس: ${className}`, number && `شماره: ${number}`].filter(Boolean).join("   •   ");
    ctx.fillText(meta || "پایه و شماره کاندیدا", center, 785);
    if (number) {
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(170, 790, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 48px Arial"; ctx.fillText(number, 170, 807);
    }
    ctx.fillStyle = p.muted; ctx.font = "18px Arial"; ctx.fillText("رأی شما، انتخاب فردای بهتر", center, 845);
  }, [name, className, number, slogan, theme, image, fontSize, accent]);

  const onImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
  };

  const download = (type: "png" | "jpeg") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `poster-shora-${Date.now()}.${type === "png" ? "png" : "jpg"}`;
    a.href = canvas.toDataURL(type === "png" ? "image/png" : "image/jpeg", 0.95);
    a.click();
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-[var(--text)]">پوستر انتخابات شورای دانش‌آموزی</h1>
          <p className="mt-2 text-[var(--text-muted)]">پوستر انتخاباتی را بساز، شخصی‌سازی کن و با کیفیت چاپ دریافت کن.</p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="order-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:order-1">
            <h2 className="text-lg font-black">اطلاعات پوستر</h2>
            <div className="mt-4 space-y-3">
              {[["نام کاندیدا", name, setName], ["پایه / کلاس", className, setClassName], ["شماره کاندیدا", number, setNumber], ["شعار انتخاباتی", slogan, setSlogan]].map(([label, value, setter]) => (
                <label key={label as string} className="block text-sm font-bold text-[var(--text)]">
                  {label as string}
                  <input value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-[var(--primary)]" />
                </label>
              ))}
              <label className="block text-sm font-bold">عکس کاندیدا<input type="file" accept="image/*" onChange={onImage} className="mt-1 block w-full text-sm" /></label>
              {imageUrl && <button type="button" onClick={() => { setImage(null); URL.revokeObjectURL(imageUrl); setImageUrl(""); }} className="text-sm font-bold text-red-600">حذف عکس</button>}
              <label className="block text-sm font-bold">اندازه نام: {fontSize}px<input type="range" min="38" max="72" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="mt-2 w-full" /></label>
              <label className="block text-sm font-bold">رنگ اصلی<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-lg" /></label>
            </div>
            <h2 className="mt-7 text-lg font-black">قالب</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {themes.map((t) => <button key={t.id} type="button" onClick={() => setTheme(t.id)} className={`rounded-xl border p-3 text-right transition ${theme === t.id ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"}`}><b className="block">{t.title}</b><span className="text-xs text-[var(--text-muted)]">{t.desc}</span></button>)}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => download("png")} className="rounded-xl bg-[var(--primary)] px-3 py-3 text-sm font-black text-white">دانلود PNG</button>
              <button type="button" onClick={() => download("jpeg")} className="rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-black">دانلود JPG</button>
            </div>
            <button type="button" onClick={() => window.print()} className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-black">چاپ پوستر</button>
          </aside>
          <section className="order-1 flex items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 sm:p-6 lg:order-2">
            <canvas ref={canvasRef} width={1200} height={900} className="h-auto w-full max-w-[760px] rounded-xl shadow-2xl" aria-label="پیش‌نمایش پوستر" />
          </section>
        </div>
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden !important; } canvas { visibility: visible !important; position: fixed; inset: 0; width: 100vw !important; height: auto !important; } }`}</style>
    </main>
  );
}
