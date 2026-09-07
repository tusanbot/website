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
type ThemeId = "mint" | "midnight" | "sunset" | "editorial" | "violet" | "alert" | "paper";

type Slide = {
  id: string;
  eyebrow?: string;
  title: string;
  body?: string;
  icon: string;
  duration: number;
};

const BRAND = "#09967c";
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
  { id: "service", label: "معرفی خدمت", description: "مشکل → راه‌حل → اقدام" },
  { id: "mistakes", label: "۳ اشتباه", description: "هشدار و محتوای تعاملی" },
  { id: "news", label: "خبر فوری", description: "اطلاعیه کوتاه و واضح" },
  { id: "tool", label: "ابزار و ترفند", description: "یک ابزار با کاربرد مشخص" },
  { id: "cta", label: "CTA", description: "پایان‌بندی و دعوت به اقدام" },
];
const THEMES: Array<{ id: ThemeId; label: string; description: string; accent: string; background: string; surface: string; text: string; muted: string }> = [
  { id: "mint", label: "توسن سبز", description: "تم اصلی و تمیز برند", accent: "#09967c", background: "radial-gradient(circle at 82% 8%, rgba(9,150,124,.24), transparent 32%), linear-gradient(155deg,#ffffff 0%,#effaf7 100%)", surface: "rgba(255,255,255,.88)", text: "#0f172a", muted: "#475569" },
  { id: "midnight", label: "شب مدرن", description: "تیره، جدی و تکنولوژیک", accent: "#5eead4", background: "radial-gradient(circle at 82% 8%, rgba(45,212,191,.22), transparent 30%), linear-gradient(145deg,#07131a 0%,#102c35 55%,#07131a 100%)", surface: "rgba(15,31,38,.82)", text: "#f8fafc", muted: "#cbd5e1" },
  { id: "sunset", label: "گرم و انرژی‌بخش", description: "برای Reel و معرفی خدمات", accent: "#f97316", background: "radial-gradient(circle at 18% 15%, rgba(251,191,36,.32), transparent 28%), linear-gradient(150deg,#fff7ed 0%,#ffedd5 48%,#fce7f3 100%)", surface: "rgba(255,255,255,.84)", text: "#431407", muted: "#7c2d12" },
  { id: "editorial", label: "مجله‌ای", description: "مینیمال و حرفه‌ای برای آموزش", accent: "#334155", background: "linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%)", surface: "rgba(255,255,255,.9)", text: "#0f172a", muted: "#475569" },
  { id: "violet", label: "خلاق و دیجیتال", description: "برای ابزار و ترفند", accent: "#7c3aed", background: "radial-gradient(circle at 78% 12%, rgba(139,92,246,.34), transparent 32%), linear-gradient(145deg,#faf5ff 0%,#ede9fe 55%,#e0e7ff 100%)", surface: "rgba(255,255,255,.82)", text: "#2e1065", muted: "#5b21b6" },
  { id: "alert", label: "هشدار", description: "برای اشتباهات و اطلاعیه‌ها", accent: "#dc2626", background: "radial-gradient(circle at 85% 10%, rgba(239,68,68,.2), transparent 30%), linear-gradient(145deg,#fff 0%,#fef2f2 50%,#fff7ed 100%)", surface: "rgba(255,255,255,.88)", text: "#450a0a", muted: "#7f1d1d" },
  { id: "paper", label: "کاغذی", description: "متفاوت برای Carousel و کاور", accent: "#a16207", background: "linear-gradient(135deg,#fefce8 0%,#fef9c3 100%)", surface: "rgba(255,255,255,.72)", text: "#422006", muted: "#713f12" },
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
  } else {
    const fallback = ["انتخاب واحد و خدمات دانشگاهی", "انتخاب رشته", "اظهارنامه و خدمات مالیاتی", "پاورپوینت و خدمات فایل", "چاپ و خدمات اداری"];
    (items.length ? items : fallback).forEach((item, i) => result.push({ id: id(), eyebrow: template === "five" ? `مورد ${i + 1}` : "توسن‌یار", title: item, body: template === "service" ? "بدون رفت‌وآمد غیرضروری، درخواستت را آنلاین شروع کن." : template === "tool" ? "این نکته می‌تواند چند دقیقه از وقتت را نجات بدهد." : "ساده، سریع و آنلاین با توسن.", icon: inferIcon(item, i), duration: 3 }));
  }
  result.push({ id: id(), eyebrow: "ربات کافی‌نت توسن", title: "کافی‌نت، همیشه یه جای دور نیست.", body: "توسن، آنلاین کنارته 👇", icon: "🚀", duration: 4 });
  return result;
}

function Stage({ slide, progress, transition, theme, playing, onToggle, onPrev, onNext, onFullscreen, fullscreen, activeIndex, total }: {
  slide: Slide; progress: number; transition: Transition; theme: ThemeId; playing: boolean; onToggle: () => void; onPrev: () => void; onNext: () => void; onFullscreen: () => void; fullscreen: boolean; activeIndex: number; total: number;
}) {
  const selectedTheme = THEMES.find((item) => item.id === theme) || THEMES[0];
  return <div className={`stage-shell relative w-full max-w-[430px] overflow-hidden rounded-[30px] bg-white shadow-2xl ${fullscreen ? "fullscreen-stage" : ""}`}>
    <div className="stage-frame relative aspect-[9/16] w-full overflow-hidden" style={{ fontFamily: "var(--font-vazirmatn), sans-serif", background: selectedTheme.background }}>
      <div className="absolute -left-24 top-1/3 h-64 w-64 rounded-full opacity-10 blur-3xl" style={{ background: selectedTheme.accent }} />
      <div key={`${slide.id}-${transition}`} className={`slide-animation transition-${transition} absolute inset-0`}>
        <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-black/5 px-4 py-2 text-sm font-black shadow-sm backdrop-blur" style={{ background: selectedTheme.surface, color: selectedTheme.text }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: selectedTheme.accent }} />توسن
        </div>
        <div className="absolute inset-x-8 bottom-24 top-24 flex flex-col justify-center text-right">
          <div className="mb-5 text-7xl leading-none drop-shadow-sm">{slide.icon}</div>
          {slide.eyebrow && <div className="mb-3 text-base font-black" style={{ color: selectedTheme.accent }}>{slide.eyebrow}</div>}
          <h2 className="text-[clamp(30px,6vw,56px)] font-black leading-[1.38] tracking-tight" style={{ color: selectedTheme.text }}>{slide.title}</h2>
          {slide.body && <p className="mt-5 text-[clamp(17px,3vw,24px)] font-medium leading-9" style={{ color: selectedTheme.muted }}>{slide.body}</p>}
        </div>
        <div className="absolute bottom-16 left-8 right-8 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full origin-right" style={{ width: `${progress}%`, background: selectedTheme.accent }} /></div>
        <div className="absolute bottom-5 left-8 rounded-full px-3 py-1.5 text-[clamp(16px,2.7vw,21px)] font-black tracking-wide shadow-sm" style={{ background: selectedTheme.surface, color: selectedTheme.text }}>tusancn.ir</div>
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
  const [theme, setTheme] = useState<ThemeId>("mint");
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

  const regenerate = () => { setSlides(generateSlides(text, template, contentType)); setActiveIndex(0); setProgress(0); setPlaying(false); };
  const reset = () => { setText(DEFAULT_TEXT); setTemplate("five"); setContentType("reel"); setTheme("mint"); setSlides(generateSlides(DEFAULT_TEXT, "five", "reel")); setActiveIndex(0); setProgress(0); setPlaying(false); };
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#09967c]/10 px-3 py-1.5 text-sm font-black text-[#09967c]"><Sparkles size={16}/> Tusan Content Studio</div><h1 className="text-2xl font-black sm:text-3xl">استودیو تولید محتوای اینستاگرام</h1><p className="mt-1 text-sm text-slate-500">برای هر نوع محتوا قالب و حال‌وهوای متفاوت بساز؛ متن، اسلاید و ضبط را یکجا مدیریت کن.</p></div><div className="flex gap-2"><button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold"><RotateCcw size={16}/> بازنشانی</button><button onClick={copyScript} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold"><Copy size={16}/> کپی سناریو</button></div></header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="space-y-5 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div><label className="mb-2 block text-sm font-black">نوع محتوا</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["reel","cover","intro","outro"] as ContentType[]).map((type) => <button key={type} onClick={() => { setContentType(type); setTemplate(type === "cover" ? "service" : type === "outro" ? "cta" : template); }} className={`rounded-xl border px-3 py-3 text-sm font-black ${contentType===type?"border-[#09967c] bg-[#09967c]/10 text-[#09967c]":"border-black/10"}`}>{type === "reel" ? "🎬 Reel" : type === "cover" ? "🖼️ کاور" : type === "intro" ? "⚡ Intro" : "🚀 Outro"}</button>)}</div></div>
          <div><label className="mb-2 block text-sm font-black">قالب محتوا</label><div className="grid gap-2 sm:grid-cols-2">{TEMPLATES.map((t) => <button key={t.id} onClick={() => setTemplate(t.id)} className={`rounded-2xl border p-3 text-right ${template===t.id?"border-[#09967c] bg-[#09967c]/10":"border-black/10"}`}><div className="font-black">{t.label}</div><div className="mt-1 text-xs text-slate-500">{t.description}</div></button>)}</div></div>
          <div><label className="mb-2 block text-sm font-black">استایل بصری</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{THEMES.map((t) => <button key={t.id} onClick={() => setTheme(t.id)} className={`relative overflow-hidden rounded-2xl border p-3 text-right ${theme===t.id?"border-slate-900 ring-2 ring-[#09967c]/30":"border-black/10"}`}><span className="mb-2 block h-9 rounded-xl" style={{ background: t.background }} /><div className="text-sm font-black">{t.label}</div><div className="mt-1 text-[11px] text-slate-500">{t.description}</div></button>)}</div></div>
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
