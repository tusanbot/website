"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import html2canvas from "html2canvas";

type ContentType = "reel" | "cover" | "intro" | "outro";
type TemplateId = "five" | "education" | "comparison" | "service" | "mistakes" | "news" | "tool" | "cta";
type Transition = "zoom" | "slide" | "blur" | "pop";
type ThemeId = "tusan" | "student" | "tools" | "list" | "education" | "comparison" | "service" | "mistakes" | "news" | "cta" | "midnight" | "paper";

type Slide = {
  id: string;
  eyebrow?: string;
  title: string;
  body?: string;
  icon: string;
  duration: number;
};

type Theme = {
  id: ThemeId;
  label: string;
  description: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  style: "brand" | "student" | "tools" | "list" | "education" | "comparison" | "service" | "alert" | "news" | "cta" | "dark" | "paper";
};

const DEFAULT_TEXT = `۵ کاری که لازم نیست برای انجامش بری کافی‌نت
۱. انتخاب واحد و خدمات دانشگاهی
۲. انتخاب رشته
۳. اظهارنامه و خدمات مالیاتی
۴. پاورپوینت و خدمات فایل
۵. چاپ و خدمات اداری`;

const ICONS = ["🎓", "📝", "💰", "🖥️", "🖨️", "🚗", "🏦", "🛠️", "📌", "⚡", "✨", "📱", "🏠", "📄", "⚠️", "📢"];

const TEMPLATES: Array<{ id: TemplateId; label: string; description: string }> = [
  { id: "five", label: "۵ مورد", description: "لیست سریع و قابل ذخیره" },
  { id: "education", label: "آموزشی", description: "نکته به نکته و مرحله‌ای" },
  { id: "comparison", label: "مقایسه‌ای", description: "دو گزینه یا دو وضعیت" },
  { id: "service", label: "معرفی", description: "مشکل → راه‌حل → اقدام" },
  { id: "mistakes", label: "۳ اشتباه", description: "هشدار و محتوای تعاملی" },
  { id: "news", label: "خبر / اطلاعیه", description: "خبر، تمدید و مهلت‌های مهم" },
  { id: "tool", label: "ابزار هفته", description: "ابزار و ترفند کاربردی" },
  { id: "cta", label: "CTA", description: "پایان‌بندی و دعوت به اقدام" },
];

// هر سری یک هویت بصری مستقل دارد؛ این باعث می‌شود مخاطب فقط با دیدن ظاهر، سری را بشناسد.
const THEMES: Theme[] = [
  {
    id: "student", label: "توسن‌یار 🎓", description: "هویت ثابت محتوای دانشجویی و خدمات دانشگاهی",
    accent: "#2563eb", background: "radial-gradient(circle at 15% 12%, rgba(37,99,235,.24), transparent 30%), linear-gradient(150deg,#eff6ff 0%,#dbeafe 52%,#f0f9ff 100%)",
    surface: "rgba(255,255,255,.9)", text: "#172554", muted: "#475569", border: "rgba(37,99,235,.18)", style: "student",
  },
  {
    id: "tools", label: "ابزار هفته 🛠️", description: "دیجیتال، جسور و متفاوت برای ابزارها و ترفندها",
    accent: "#7c3aed", background: "radial-gradient(circle at 82% 10%, rgba(124,58,237,.35), transparent 28%), radial-gradient(circle at 18% 88%, rgba(236,72,153,.2), transparent 30%), linear-gradient(145deg,#1e1033 0%,#31205a 52%,#111827 100%)",
    surface: "rgba(255,255,255,.1)", text: "#faf5ff", muted: "#ddd6fe", border: "rgba(196,181,253,.22)", style: "tools",
  },
  {
    id: "list", label: "۵ مورد #", description: "شماره‌محور، سریع و مناسب محتوای Save/Share",
    accent: "#ea580c", background: "radial-gradient(circle at 85% 12%, rgba(234,88,12,.2), transparent 28%), linear-gradient(145deg,#fff7ed 0%,#ffedd5 52%,#fef2f2 100%)",
    surface: "rgba(255,255,255,.9)", text: "#431407", muted: "#7c2d12", border: "rgba(234,88,12,.18)", style: "list",
  },
  {
    id: "education", label: "آموزشی 📚", description: "مرتب، خوانا و شبیه صفحه‌های آموزشی",
    accent: "#0f766e", background: "linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%)",
    surface: "rgba(255,255,255,.92)", text: "#134e4a", muted: "#475569", border: "rgba(15,118,110,.18)", style: "education",
  },
  {
    id: "comparison", label: "مقایسه‌ای ⚖️", description: "دوگانه، split و مناسب مقایسه سریع",
    accent: "#0891b2", background: "linear-gradient(135deg,#ecfeff 0%,#cffafe 50%,#f0fdfa 100%)",
    surface: "rgba(255,255,255,.9)", text: "#164e63", muted: "#475569", border: "rgba(8,145,178,.18)", style: "comparison",
  },
  {
    id: "service", label: "معرفی خدمت 🚀", description: "حرفه‌ای و تبدیل‌محور برای معرفی خدمات توسن",
    accent: "#09967c", background: "radial-gradient(circle at 84% 12%, rgba(9,150,124,.28), transparent 30%), linear-gradient(155deg,#ffffff 0%,#ecfdf5 50%,#d1fae5 100%)",
    surface: "rgba(255,255,255,.9)", text: "#064e3b", muted: "#475569", border: "rgba(9,150,124,.2)", style: "service",
  },
  {
    id: "mistakes", label: "۳ اشتباه ⚠️", description: "هویت هشدار و خطا؛ کاملاً متفاوت از محتوای عادی",
    accent: "#dc2626", background: "radial-gradient(circle at 82% 8%, rgba(220,38,38,.22), transparent 30%), linear-gradient(145deg,#450a0a 0%,#7f1d1d 52%,#1c1917 100%)",
    surface: "rgba(255,255,255,.1)", text: "#fff7ed", muted: "#fecaca", border: "rgba(254,202,202,.22)", style: "alert",
  },
  {
    id: "news", label: "خبر / اطلاعیه 📢", description: "حال‌وهوای newsroom با برچسب خبر و مهلت",
    accent: "#b91c1c", background: "linear-gradient(145deg,#fff 0%,#f8fafc 58%,#fee2e2 100%)",
    surface: "rgba(255,255,255,.96)", text: "#111827", muted: "#475569", border: "rgba(185,28,28,.18)", style: "news",
  },
  {
    id: "cta", label: "CTA 🎯", description: "تمرکز بالا روی اقدام نهایی و برند",
    accent: "#0891b2", background: "radial-gradient(circle at 50% 0%, rgba(34,211,238,.3), transparent 35%), linear-gradient(145deg,#082f49 0%,#164e63 52%,#0f172a 100%)",
    surface: "rgba(255,255,255,.1)", text: "#ecfeff", muted: "#bae6fd", border: "rgba(186,230,253,.2)", style: "cta",
  },
  {
    id: "tusan", label: "برند توسن", description: "تم عمومی برند برای محتوای متفرقه",
    accent: "#09967c", background: "radial-gradient(circle at 82% 8%, rgba(9,150,124,.24), transparent 32%), linear-gradient(155deg,#ffffff 0%,#effaf7 100%)",
    surface: "rgba(255,255,255,.88)", text: "#0f172a", muted: "#475569", border: "rgba(9,150,124,.18)", style: "brand",
  },
  {
    id: "midnight", label: "شب مدرن", description: "تم جایگزین تیره برای محتوای خاص",
    accent: "#5eead4", background: "radial-gradient(circle at 82% 8%, rgba(45,212,191,.22), transparent 30%), linear-gradient(145deg,#07131a 0%,#102c35 55%,#07131a 100%)",
    surface: "rgba(15,31,38,.82)", text: "#f8fafc", muted: "#cbd5e1", border: "rgba(94,234,212,.2)", style: "dark",
  },
  {
    id: "paper", label: "کاغذی", description: "گزینه متفاوت برای کاور و Carousel",
    accent: "#a16207", background: "linear-gradient(135deg,#fefce8 0%,#fef9c3 100%)",
    surface: "rgba(255,255,255,.72)", text: "#422006", muted: "#713f12", border: "rgba(161,98,7,.18)", style: "paper",
  },
];

const TRANSITIONS: Array<{ id: Transition; label: string }> = [
  { id: "zoom", label: "Zoom نرم" },
  { id: "slide", label: "Slide" },
  { id: "blur", label: "Blur" },
  { id: "pop", label: "Pop" },
];

const id = () => Math.random().toString(36).slice(2, 10);
const lines = (text: string) => text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const cleanItem = (line: string) => line.replace(/^\s*(?:\d+|[۰-۹]+)[.)،-]?\s*/, "").trim();

function themeForTemplate(template: TemplateId, type: ContentType): ThemeId {
  if (type === "outro") return "cta";
  if (type === "intro") return "service";
  if (type === "cover") return template === "news" ? "news" : template === "tool" ? "tools" : "service";
  const map: Record<TemplateId, ThemeId> = {
    five: "list",
    education: "education",
    comparison: "comparison",
    service: "service",
    mistakes: "mistakes",
    news: "news",
    tool: "tools",
    cta: "cta",
  };
  return map[template];
}

function inferIcon(text: string, index = 0) {
  const value = text.toLowerCase();
  const matches: Array<[string[], string]> = [
    [["دانشگاه", "دانشجو", "انتخاب واحد", "انتخاب رشته", "کنکور"], "🎓"],
    [["مالیات", "اظهارنامه", "فیش", "مؤدیان", "ارزش افزوده"], "💰"],
    [["چاپ", "پرینت"], "🖨️"],
    [["خودرو", "ماشین", "ثبت نام خودرو"], "🚗"],
    [["بیمه", "تأمین اجتماعی", "تامین اجتماعی"], "🛡️"],
    [["پاورپوینت", "فایل", "ورد", "pdf"], "🖥️"],
    [["بانک", "فرابانک", "سجام", "بورس"], "🏦"],
    [["ابزار", "ترفند", "سایت"], "🛠️"],
    [["خبر", "اطلاعیه", "تمدید", "مهلت"], "📢"],
    [["اشتباه", "هشدار"], "⚠️"],
  ];
  for (const [keywords, icon] of matches) if (keywords.some((keyword) => value.includes(keyword))) return icon;
  return ICONS[index % ICONS.length];
}

function generateSlides(text: string, template: TemplateId, type: ContentType): Slide[] {
  const source = lines(text);
  const first = source[0] || "محتوای جدید توسن";
  const items = source.slice(1).map(cleanItem).filter(Boolean);
  if (type === "cover") return [{ id: id(), eyebrow: "ربات کافی‌نت توسن", title: first, body: items[0] || "خدمات اینترنتی، ساده‌تر از چیزی که فکر می‌کنی", icon: inferIcon(first), duration: 4 }];
  if (type === "intro" || type === "outro") return [{ id: id(), eyebrow: type === "intro" ? "توسن" : "ربات کافی‌نت توسن", title: type === "intro" ? first : "خدمتت رو انتخاب کن", body: type === "intro" ? "خدمات اینترنتی، ساده‌تر از چیزی که فکر می‌کنی" : "tusancn.ir", icon: type === "intro" ? inferIcon(first) : "👇", duration: 3 }];
  if (template === "cta") return [
    { id: id(), eyebrow: "یک قدم تا انجامش", title: first, body: items[0], icon: inferIcon(first), duration: 3 },
    { id: id(), eyebrow: "ربات کافی‌نت توسن", title: "خدمتت رو انتخاب کن", body: "از خانه شروع کن 👇", icon: "🚀", duration: 3 },
  ];
  const result: Slide[] = [{ id: id(), eyebrow: "ربات کافی‌نت توسن", title: first, body: "چند نکته کاربردی که انجام کارها را برایت ساده‌تر می‌کند", icon: inferIcon(first), duration: 3 }];
  if (template === "comparison" && items.length >= 2) {
    result.push({ id: id(), eyebrow: "مقایسه", title: items[0], body: "گزینه اول", icon: "①", duration: 3 }, { id: id(), eyebrow: "مقایسه", title: items[1], body: "گزینه دوم", icon: "②", duration: 3 });
  } else if (template === "mistakes") {
    (items.length ? items.slice(0, 3) : ["اطلاعات ناقص", "بی‌توجهی به مهلت", "انتخاب خدمت اشتباه"]).forEach((item, i) => result.push({ id: id(), eyebrow: `اشتباه شماره ${i + 1}`, title: item, body: "قبل از ثبت نهایی دوباره بررسی کن.", icon: "⚠️", duration: 3 }));
  } else if (template === "news") {
    (items.length ? items : ["مهلت ثبت‌نام یا انتخاب رشته تمدید شد", "جزئیات و شرایط را بررسی کن", "قبل از پایان مهلت اقدام کن"]).slice(0, 5).forEach((item, i) => result.push({ id: id(), eyebrow: i === 0 ? "خبر مهم" : "جزئیات اطلاعیه", title: item, body: "تاریخ و شرایط را قبل از اقدام بررسی کن.", icon: i === 0 ? "📢" : "🗓️", duration: 3 }));
  } else {
    const fallback = ["انتخاب واحد و خدمات دانشگاهی", "انتخاب رشته", "اظهارنامه و خدمات مالیاتی", "پاورپوینت و خدمات فایل", "چاپ و خدمات اداری"];
    (items.length ? items : fallback).forEach((item, i) => result.push({ id: id(), eyebrow: template === "five" ? `مورد ${i + 1}` : template === "tool" ? "ابزار هفته" : template === "education" ? `مرحله ${i + 1}` : template === "service" ? "معرفی خدمت" : "توسن‌یار", title: item, body: template === "service" ? "بدون رفت‌وآمد غیرضروری، درخواستت را آنلاین شروع کن." : template === "tool" ? "این نکته می‌تواند چند دقیقه از وقتت را نجات بدهد." : "ساده، سریع و آنلاین با توسن.", icon: inferIcon(item, i), duration: 3 }));
  }
  result.push({ id: id(), eyebrow: "ربات کافی‌نت توسن", title: "کافی‌نت، همیشه یه جای دور نیست.", body: "توسن، آنلاین کنارته 👇", icon: "🚀", duration: 4 });
  return result;
}

function Stage({ slide, progress, transition, theme, playing, onToggle, onPrev, onNext, onFullscreen, fullscreen, activeIndex, total }: {
  slide: Slide; progress: number; transition: Transition; theme: ThemeId; playing: boolean; onToggle: () => void; onPrev: () => void; onNext: () => void; onFullscreen: () => void; fullscreen: boolean; activeIndex: number; total: number;
}) {
  const selectedTheme = THEMES.find((item) => item.id === theme) || THEMES[0];
  const isDark = selectedTheme.style === "tools" || selectedTheme.style === "alert" || selectedTheme.style === "dark" || selectedTheme.style === "cta";
  return <div className={`stage-shell relative w-full max-w-[430px] overflow-hidden rounded-[30px] bg-white shadow-2xl ${fullscreen ? "fullscreen-stage" : ""}`}>
    <div className="stage-frame relative aspect-[9/16] w-full overflow-hidden" style={{ fontFamily: "var(--font-vazirmatn), sans-serif", background: selectedTheme.background }}>
      <div className="absolute -left-24 top-1/3 h-64 w-64 rounded-full opacity-10 blur-3xl" style={{ background: selectedTheme.accent }} />
      <div key={`${slide.id}-${transition}`} className={`slide-animation transition-${transition} absolute inset-0`}>
        {selectedTheme.style === "list" && <div className="absolute left-7 top-7 text-[72px] font-black leading-none opacity-10" style={{ color: selectedTheme.accent }}>#</div>}
        {selectedTheme.style === "comparison" && <div className="absolute inset-y-0 left-1/2 w-px opacity-15" style={{ background: selectedTheme.accent }} />}
        {selectedTheme.style === "alert" && <div className="absolute inset-x-0 top-0 h-3" style={{ background: selectedTheme.accent }} />}
        {selectedTheme.style === "news" && <div className="absolute inset-x-0 top-0 flex h-12 items-center justify-between px-7 text-xs font-black" style={{ background: selectedTheme.accent, color: "white" }}><span>خبر / اطلاعیه</span><span>توسن</span></div>}
        <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black shadow-sm backdrop-blur" style={{ background: selectedTheme.surface, color: selectedTheme.text, borderColor: selectedTheme.border }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: selectedTheme.accent }} />{selectedTheme.style === "student" ? "توسن‌یار" : selectedTheme.style === "tools" ? "ابزار هفته" : selectedTheme.style === "news" ? "توسن نیوز" : "توسن"}
        </div>
        <div className="absolute inset-x-8 bottom-24 top-24 flex flex-col justify-center text-right">
          <div className="mb-5 text-7xl leading-none drop-shadow-sm">{slide.icon}</div>
          {slide.eyebrow && <div className="mb-3 text-base font-black" style={{ color: selectedTheme.accent }}>{slide.eyebrow}</div>}
          <h2 className="text-[clamp(30px,6vw,56px)] font-black leading-[1.38] tracking-tight" style={{ color: selectedTheme.text }}>{slide.title}</h2>
          {slide.body && <p className="mt-5 text-[clamp(17px,3vw,24px)] font-medium leading-9" style={{ color: selectedTheme.muted }}>{slide.body}</p>}
        </div>
        {selectedTheme.style === "service" && <div className="absolute bottom-28 right-8 rounded-2xl border px-4 py-2 text-xs font-black" style={{ color: selectedTheme.accent, background: selectedTheme.surface, borderColor: selectedTheme.border }}>آنلاین با توسن</div>}
        {selectedTheme.style === "tools" && <div className="absolute bottom-28 left-8 rounded-full border px-4 py-2 text-xs font-black" style={{ color: selectedTheme.text, background: selectedTheme.surface, borderColor: selectedTheme.border }}>TOOL OF THE WEEK</div>}
        {selectedTheme.style === "alert" && <div className="absolute bottom-28 left-8 rounded-full px-4 py-2 text-xs font-black" style={{ color: "white", background: selectedTheme.accent }}>قبل از ارسال بررسی کن!</div>}
        <div className="absolute bottom-16 left-8 right-8 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full origin-right" style={{ width: `${progress}%`, background: selectedTheme.accent }} /></div>
        <div className="absolute bottom-5 left-8 rounded-full px-3 py-1.5 text-[clamp(16px,2.7vw,21px)] font-black tracking-wide shadow-sm" style={{ background: selectedTheme.surface, color: selectedTheme.text, border: `1px solid ${selectedTheme.border}` }}>tusancn.ir</div>
        <div className="absolute bottom-5 right-8 text-sm font-bold opacity-70" style={{ color: selectedTheme.muted }}>{activeIndex + 1} / {total}</div>
      </div>
    </div>
    <div className="stage-controls flex shrink-0 items-center justify-between gap-2 bg-slate-950/95 px-4 py-3 text-white backdrop-blur">
      <button onClick={onPrev} className="rounded-full p-2 hover:bg-white/15" aria-label="قبلی"><ChevronRight /></button>
      <button onClick={onToggle} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg" aria-label={playing ? "توقف" : "پخش"}>{playing ? <Pause size={21} /> : <Play size={21} />}</button>
      <div className="min-w-0 flex-1 text-center text-xs font-bold text-white/80">{playing ? "در حال پخش" : "توقف"} · {activeIndex + 1}/{total}</div>
      <button onClick={onNext} className="rounded-full p-2 hover:bg-white/15" aria-label="بعدی"><ChevronLeft /></button>
      <button onClick={onFullscreen} className="rounded-full p-2 hover:bg-white/15" aria-label={fullscreen ? "خروج از تمام صفحه" : "تمام صفحه"}>{fullscreen ? <X size={20} /> : <Maximize2 size={20} />}</button>
    </div>
  </div>;
}

export default function ContentStudio() {
  const [contentType, setContentType] = useState<ContentType>("reel");
  const [template, setTemplate] = useState<TemplateId>("five");
  const [theme, setTheme] = useState<ThemeId>(themeForTemplate("five", "reel"));
  const [text, setText] = useState(DEFAULT_TEXT);
  const [slides, setSlides] = useState<Slide[]>(() => generateSlides(DEFAULT_TEXT, "five", "reel"));
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editing, setEditing] = useState(false);
  const [transition, setTransition] = useState<Transition>("zoom");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const active = slides[activeIndex] || slides[0];
  const totalDuration = useMemo(() => slides.reduce((sum, s) => sum + s.duration, 0), [slides]);
  const selectedTheme = THEMES.find((item) => item.id === theme) || THEMES[0];

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!playing || !active) return;
    const started = performance.now();
    const duration = active.duration * 1000;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - started;
      setProgress(Math.min(100, (elapsed / duration) * 100));
      if (elapsed >= duration) {
        if (activeIndex >= slides.length - 1) { setPlaying(false); setProgress(100); return; }
        setActiveIndex((x) => x + 1); setProgress(0); return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, activeIndex, active, slides.length]);

  const regenerate = () => { setSlides(generateSlides(text, template, contentType)); setActiveIndex(0); setProgress(0); setPlaying(false); setTheme(themeForTemplate(template, contentType)); };
  const selectTemplate = (next: TemplateId) => { setTemplate(next); setTheme(themeForTemplate(next, contentType)); };
  const selectContentType = (type: ContentType) => { const nextTemplate = type === "cover" ? "service" : type === "outro" ? "cta" : template; setContentType(type); setTemplate(nextTemplate); setTheme(themeForTemplate(nextTemplate, type)); };
  const reset = () => { setText(DEFAULT_TEXT); setTemplate("five"); setContentType("reel"); setTheme(themeForTemplate("five", "reel")); setSlides(generateSlides(DEFAULT_TEXT, "five", "reel")); setActiveIndex(0); setProgress(0); setPlaying(false); };
  const prev = () => { setActiveIndex((x) => Math.max(0, x - 1)); setProgress(0); };
  const next = () => { setActiveIndex((x) => Math.min(slides.length - 1, x + 1)); setProgress(0); };
  const togglePlay = () => { if (!playing && activeIndex >= slides.length - 1 && progress >= 100) { setActiveIndex(0); setProgress(0); } setPlaying((x) => !x); };
  const fullscreen = async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await stageRef.current?.requestFullscreen?.(); };
  const update = (field: keyof Pick<Slide, "title" | "body" | "eyebrow" | "icon">, value: string) => setSlides((all) => all.map((s, i) => i === activeIndex ? { ...s, [field]: value } : s));
  const exportSlide = async () => { if (!stageRef.current) return; const frame = stageRef.current.querySelector(".stage-frame") as HTMLElement | null; if (!frame) return; const canvas = await html2canvas(frame, { scale: 2, backgroundColor: "#fff", useCORS: true }); const a = document.createElement("a"); a.download = `tusan-slide-${activeIndex + 1}.png`; a.href = canvas.toDataURL("image/png"); a.click(); };
  const copyScript = async () => navigator.clipboard?.writeText(slides.map((s) => `${s.title}${s.body ? ` — ${s.body}` : ""}`).join("\n"));

  return <main dir="rtl" className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--text)] sm:px-6">
    <style>{`@keyframes tsZoom{from{opacity:0;transform:scale(1.08)}to{opacity:1;transform:scale(1)}}@keyframes tsSlide{from{opacity:0;transform:translateX(-9%)}to{opacity:1;transform:translateX(0)}}@keyframes tsBlur{from{opacity:0;filter:blur(14px);transform:scale(1.03)}to{opacity:1;filter:blur(0);transform:scale(1)}}@keyframes tsPop{0%{opacity:0;transform:scale(.82)}70%{opacity:1;transform:scale(1.025)}100%{opacity:1;transform:scale(1)}}.transition-zoom{animation:tsZoom .7s cubic-bezier(.22,1,.36,1)}.transition-slide{animation:tsSlide .65s cubic-bezier(.22,1,.36,1)}.transition-blur{animation:tsBlur .75s ease-out}.transition-pop{animation:tsPop .65s cubic-bezier(.22,1,.36,1)}.fullscreen-stage{width:min(100vw,calc((100vh - 74px)*.5625))!important;max-width:none!important;height:auto!important;max-height:100vh!important;border-radius:0!important;background:#020617!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;overflow:visible!important}.fullscreen-stage .stage-frame{width:100%!important;height:auto!important;aspect-ratio:9/16!important;flex:none!important;border-radius:0!important}.fullscreen-stage .stage-controls{width:100%!important;flex:none!important;border-radius:0!important}.fullscreen-stage .stage-frame>div{border-radius:0!important}`}</style>
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#09967c]/10 px-3 py-1.5 text-sm font-black text-[#09967c]"><Sparkles size={16}/> Tusan Content Studio</div><h1 className="text-2xl font-black sm:text-3xl">استودیو تولید محتوای اینستاگرام</h1><p className="mt-1 text-sm text-slate-500">هر سری محتوایی هویت بصری خودش را دارد؛ با یک نگاه می‌توانی «توسن‌یار»، «ابزار هفته» یا «خبر» را تشخیص بدهی.</p></div><div className="flex gap-2"><button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold"><RotateCcw size={16}/> بازنشانی</button><button onClick={copyScript} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold"><Copy size={16}/> کپی سناریو</button></div></header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="space-y-5 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div><label className="mb-2 block text-sm font-black">نوع محتوا</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["reel","cover","intro","outro"] as ContentType[]).map((type) => <button key={type} onClick={() => selectContentType(type)} className={`rounded-xl border px-3 py-3 text-sm font-black ${contentType===type?"border-[#09967c] bg-[#09967c]/10 text-[#09967c]":"border-black/10"}`}>{type === "reel" ? "🎬 Reel" : type === "cover" ? "🖼️ کاور" : type === "intro" ? "⚡ Intro" : "🚀 Outro"}</button>)}</div></div>
          <div><label className="mb-2 block text-sm font-black">سری / قالب محتوا</label><div className="grid gap-2 sm:grid-cols-2">{TEMPLATES.map((t) => { const activeThemeId = themeForTemplate(t.id, contentType); const tTheme = THEMES.find((x) => x.id === activeThemeId)!; return <button key={t.id} onClick={() => selectTemplate(t.id)} className={`relative overflow-hidden rounded-2xl border p-3 text-right ${template===t.id?"ring-2 ring-offset-1":"border-black/10"}`} style={template===t.id?{borderColor:tTheme.accent, boxShadow:`0 0 0 2px ${tTheme.accent}30`}:undefined}><span className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full" style={{background:tTheme.accent}}/><div className="font-black">{t.label}</div><div className="mt-1 text-xs text-slate-500">{t.description}</div><div className="mt-2 text-[10px] font-bold" style={{color:tTheme.accent}}>هویت بصری: {tTheme.label}</div></button>; })}</div></div>
          <div><label className="mb-2 block text-sm font-black">هویت بصری</label><div className="rounded-2xl border p-4" style={{borderColor:selectedTheme.border, background:selectedTheme.background}}><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-black" style={{color:selectedTheme.text}}>{selectedTheme.label}</div><div className="mt-1 text-xs font-medium" style={{color:selectedTheme.muted}}>{selectedTheme.description}</div></div><button onClick={() => setTheme(themeForTemplate(template, contentType))} className="rounded-xl border px-3 py-2 text-xs font-black" style={{borderColor:selectedTheme.border, background:selectedTheme.surface, color:selectedTheme.text}}>بازگشت به تم سری</button></div></div></div>
          <div><label className="mb-2 block text-sm font-black">متن خام</label><textarea value={text} onChange={(e)=>setText(e.target.value)} className="min-h-48 w-full rounded-2xl border border-black/10 bg-slate-50 p-4 text-right text-sm leading-7 outline-none focus:border-[#09967c]" placeholder="عنوان و موارد را هرکدام در یک خط وارد کن..."/></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-slate-500">ترنزیشن اسلاید</label><select value={transition} onChange={(e)=>setTransition(e.target.value as Transition)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm font-bold">{TRANSITIONS.map((x)=><option key={x.id} value={x.id}>{x.label}</option>)}</select></div><div><label className="mb-2 block text-xs font-bold text-slate-500">اسلاید فعال</label><div className="rounded-xl border border-black/10 bg-slate-50 px-3 py-3 text-sm font-black">{activeIndex+1} از {slides.length} · حدود {totalDuration} ثانیه</div></div></div>
          <button onClick={regenerate} className="w-full rounded-2xl bg-[#09967c] px-4 py-3.5 font-black text-white shadow-lg shadow-[#09967c]/20">✨ تولید / بازسازی اسلایدها</button>
          <div className="flex flex-wrap gap-2"><button onClick={exportSlide} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-black"><Download size={16}/> خروجی PNG اسلاید</button></div>
        </section>
        <section ref={stageRef} className="mx-auto w-full max-w-[430px] lg:sticky lg:top-5 lg:self-start"><Stage slide={active} progress={progress} transition={transition} theme={theme} playing={playing} onToggle={togglePlay} onPrev={prev} onNext={next} onFullscreen={fullscreen} fullscreen={isFullscreen} activeIndex={activeIndex} total={slides.length}/></section>
      </div>
      <section className="mt-6 rounded-3xl border border-black/5 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-black">ویرایش اسلاید فعال</h2><p className="text-xs text-slate-500">آیکون هر اسلاید مستقل است و هنگام تولید، بر اساس موضوع متن هم پیشنهاد می‌شود.</p></div><button onClick={()=>setEditing((x)=>!x)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">{editing?"بستن":"ویرایش"}</button></div>{editing && active && <div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-bold">متن اصلی<input value={active.title} onChange={(e)=>update("title",e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5"/></label><label className="text-sm font-bold">ایموجی / آیکون<input value={active.icon} onChange={(e)=>update("icon",e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 text-center text-2xl"/></label><div className="md:col-span-2"><div className="mb-2 text-xs font-bold text-slate-500">انتخاب سریع ایموجی</div><div className="flex flex-wrap gap-2">{ICONS.map((icon)=><button key={icon} onClick={()=>update("icon",icon)} className="h-11 w-11 rounded-xl border border-black/10 bg-slate-50 text-2xl hover:border-[#09967c]">{icon}</button>)}</div></div><label className="text-sm font-bold">عنوان کوچک<input value={active.eyebrow||""} onChange={(e)=>update("eyebrow",e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5"/></label><label className="text-sm font-bold">توضیح<textarea value={active.body||""} onChange={(e)=>update("body",e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-black/10 px-3 py-2.5"/></label></div>}</section>
    </div>
  </main>;
}
