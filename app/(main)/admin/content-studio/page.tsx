"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Film,
    Image as ImageIcon,
    Maximize2,
    Pause,
    Play,
    Plus,
    RotateCcw,
    Sparkles,
    Type,
    X,
} from "lucide-react";
import html2canvas from "html2canvas";

type ContentType = "reel" | "cover" | "intro" | "outro";
type TemplateId =
    | "five"
    | "education"
    | "comparison"
    | "service"
    | "mistakes"
    | "news"
    | "tool"
    | "cta";

type Slide = {
    id: string;
    eyebrow?: string;
    title: string;
    body?: string;
    icon: string;
    accent?: string;
    duration: number;
};

const BRAND = "#09967c";
const DEFAULT_TEXT = `۵ کاری که لازم نیست برای انجامش بری کافی‌نت
۱. انتخاب واحد و خدمات دانشگاهی
۲. انتخاب رشته
۳. اظهارنامه و خدمات مالیاتی
۴. پاورپوینت و خدمات فایل
۵. چاپ و خدمات اداری`;

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

function makeId() {
    return Math.random().toString(36).slice(2, 10);
}

function splitLines(text: string) {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function parseListItems(lines: string[]) {
    return lines
        .map((line) => line.replace(/^\s*(?:\d+|[۰-۹]+)[.)、-]?\s*/, "").trim())
        .filter(Boolean);
}

function generateSlides(text: string, template: TemplateId, type: ContentType): Slide[] {
    const lines = splitLines(text);
    const first = lines[0] || "محتوای جدید توسن";
    const items = parseListItems(lines.slice(1));

    if (type === "cover") {
        return [
            {
                id: makeId(),
                eyebrow: "ربات کافی‌نت توسن",
                title: first,
                body: items.slice(0, 1)[0] || "خدمات اینترنتی، ساده‌تر از چیزی که فکر می‌کنی",
                icon: "✨",
                duration: 4,
            },
        ];
    }

    if (type === "intro" || type === "outro") {
        return [
            {
                id: makeId(),
                eyebrow: type === "intro" ? "توسن" : "ربات کافی‌نت توسن",
                title: type === "intro" ? first : "خدمتت رو انتخاب کن",
                body:
                    type === "intro"
                        ? "خدمات اینترنتی، ساده‌تر از چیزی که فکر می‌کنی"
                        : "tusancn.ir",
                icon: type === "intro" ? "⚡" : "👇",
                duration: 3,
            },
        ];
    }

    if (template === "cta") {
        return [
            { id: makeId(), eyebrow: "یک قدم تا انجامش", title: first, body: items[0], icon: "🚀", duration: 3 },
            { id: makeId(), eyebrow: "ربات کافی‌نت توسن", title: "خدمتت رو انتخاب کن", body: "از خانه شروع کن 👇", icon: "✨", duration: 3 },
        ];
    }

    const iconPool = ["🎓", "📝", "💰", "🖥️", "🖨️", "🛠️", "📌", "⚡"];
    const title = first;
    const generated: Slide[] = [
        {
            id: makeId(),
            eyebrow: "ربات کافی‌نت توسن",
            title,
            body: "چند نکته کاربردی که انجام کارها را برایت ساده‌تر می‌کند",
            icon: "✨",
            duration: 3,
        },
    ];

    if (template === "comparison" && items.length >= 2) {
        generated.push({ id: makeId(), eyebrow: "مقایسه", title: items[0], body: "گزینه اول", icon: "①", duration: 3 });
        generated.push({ id: makeId(), eyebrow: "مقایسه", title: items[1], body: "گزینه دوم", icon: "②", duration: 3 });
    } else if (template === "mistakes") {
        const mistakes = items.length ? items.slice(0, 3) : ["اطلاعات ناقص", "بی‌توجهی به مهلت", "انتخاب خدمت اشتباه"];
        mistakes.forEach((item, index) => {
            generated.push({ id: makeId(), eyebrow: `اشتباه شماره ${index + 1}`, title: item, body: "قبل از ثبت نهایی دوباره بررسی کن.", icon: "⚠️", duration: 3 });
        });
    } else {
        const source = items.length ? items : [
            "انتخاب واحد و خدمات دانشگاهی",
            "انتخاب رشته",
            "اظهارنامه و خدمات مالیاتی",
            "پاورپوینت و خدمات فایل",
            "چاپ و خدمات اداری",
        ];
        source.forEach((item, index) => {
            generated.push({
                id: makeId(),
                eyebrow: template === "five" ? `مورد ${index + 1}` : "توسن‌یار",
                title: item,
                body:
                    template === "service"
                        ? "بدون رفت‌وآمد غیرضروری، درخواستت را آنلاین شروع کن."
                        : template === "tool"
                            ? "این نکته می‌تواند چند دقیقه از وقتت را نجات بدهد."
                            : "ساده، سریع و آنلاین با توسن.",
                icon: iconPool[index % iconPool.length],
                duration: 3,
            });
        });
    }

    generated.push({
        id: makeId(),
        eyebrow: "ربات کافی‌نت توسن",
        title: "کافی‌نت، همیشه یه جای دور نیست.",
        body: "توسن، آنلاین کنارته 👇",
        icon: "🚀",
        duration: 4,
    });

    return generated;
}

function SlideCanvas({ slide, active, progress }: { slide: Slide; active: boolean; progress: number }) {
    return (
        <div
            className={`relative aspect-[9/16] w-full overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-2xl transition-all duration-500 ${active ? "scale-100" : "scale-[.98]"}`}
            style={{ fontFamily: "var(--font-vazirmatn), sans-serif" }}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(9,150,124,.18),transparent_32%),linear-gradient(160deg,#ffffff_0%,#f4faf8_100%)]" />
            <div className="absolute -left-20 top-1/3 h-56 w-56 rounded-full bg-[#09967c]/10 blur-3xl" />
            <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-black/5 bg-white/80 px-3 py-2 text-xs font-black backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#09967c]" />
                توسن
            </div>
            <div className="absolute inset-x-7 bottom-9 top-24 flex flex-col justify-center text-right">
                <div className="mb-5 text-6xl leading-none">{slide.icon}</div>
                {slide.eyebrow && <div className="mb-3 text-sm font-black text-[#09967c]">{slide.eyebrow}</div>}
                <h2 className="text-[clamp(28px,5vw,52px)] font-black leading-[1.35] tracking-tight text-slate-900">
                    {slide.title}
                </h2>
                {slide.body && <p className="mt-5 text-[clamp(15px,2.2vw,22px)] font-medium leading-8 text-slate-600">{slide.body}</p>}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
                <div className="h-full origin-right transition-[width] duration-100" style={{ width: `${Math.max(0, Math.min(100, progress))}%`, background: BRAND }} />
            </div>
            <div className="absolute bottom-4 left-7 text-[10px] font-bold text-slate-400">tusancn.ir</div>
        </div>
    );
}

export default function ContentStudioPage() {
    const [contentType, setContentType] = useState<ContentType>("reel");
    const [template, setTemplate] = useState<TemplateId>("five");
    const [text, setText] = useState(DEFAULT_TEXT);
    const [slides, setSlides] = useState<Slide[]>(() => generateSlides(DEFAULT_TEXT, "five", "reel"));
    const [activeIndex, setActiveIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [editing, setEditing] = useState(false);
    const stageRef = useRef<HTMLDivElement>(null);

    const activeSlide = slides[activeIndex] || slides[0];
    const totalDuration = useMemo(() => slides.reduce((sum, slide) => sum + slide.duration, 0), [slides]);

    useEffect(() => {
        if (!playing || !activeSlide) return;
        const start = performance.now();
        const duration = activeSlide.duration * 1000;
        let raf = 0;
        const tick = (now: number) => {
            const elapsed = now - start;
            const nextProgress = Math.min(100, (elapsed / duration) * 100);
            setProgress(nextProgress);
            if (elapsed >= duration) {
                if (activeIndex >= slides.length - 1) {
                    setPlaying(false);
                    setProgress(100);
                } else {
                    setActiveIndex((index) => index + 1);
                    setProgress(0);
                }
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing, activeIndex, activeSlide, slides.length]);

    function regenerate() {
        setSlides(generateSlides(text, template, contentType));
        setActiveIndex(0);
        setProgress(0);
        setPlaying(false);
    }

    function reset() {
        setText(DEFAULT_TEXT);
        setTemplate("five");
        setContentType("reel");
        setSlides(generateSlides(DEFAULT_TEXT, "five", "reel"));
        setActiveIndex(0);
        setProgress(0);
        setPlaying(false);
    }

    async function exportSlide() {
        if (!stageRef.current) return;
        const canvas = await html2canvas(stageRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        const link = document.createElement("a");
        link.download = `tusan-slide-${activeIndex + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }

    async function exportAll() {
        const previous = activeIndex;
        setPlaying(false);
        for (let index = 0; index < slides.length; index += 1) {
            setActiveIndex(index);
            setProgress(100);
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            if (!stageRef.current) continue;
            const canvas = await html2canvas(stageRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
            const link = document.createElement("a");
            link.download = `tusan-slide-${index + 1}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            await new Promise((resolve) => setTimeout(resolve, 180));
        }
        setActiveIndex(previous);
        setProgress(0);
    }

    async function fullscreen() {
        const element = stageRef.current;
        if (!element) return;
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }
        await element.requestFullscreen?.();
    }

    async function copyScript() {
        const script = slides.map((slide) => slide.title + (slide.body ? ` — ${slide.body}` : "")).join("\n");
        await navigator.clipboard?.writeText(script);
    }

    function updateActive(field: "title" | "body" | "eyebrow", value: string) {
        setSlides((current) => current.map((slide, index) => (index === activeIndex ? { ...slide, [field]: value } : slide)));
    }

    return (
        <main dir="rtl" className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--text)] sm:px-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="flex flex-col gap-4 rounded-3xl border border-black/5 bg-white/80 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-[#09967c]">
                            <Sparkles size={20} />
                            <span className="text-sm font-black">TUSAN CONTENT STUDIO</span>
                        </div>
                        <h1 className="text-2xl font-black sm:text-3xl">استودیو تولید محتوای توسن</h1>
                        <p className="mt-2 text-sm leading-7 text-slate-500">متن بده، اسلاید آماده کن، Preview بگیر و مستقیم از صفحه ضبط کن.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-slate-50"><RotateCcw size={16} /> بازنشانی</button>
                        <button onClick={copyScript} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-slate-50"><Copy size={16} /> کپی متن</button>
                    </div>
                </header>

                <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                    <aside className="space-y-5 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
                        <section>
                            <label className="mb-2 block text-sm font-black">نوع محتوا</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(["reel", "cover", "intro", "outro"] as ContentType[]).map((item) => {
                                    const labels: Record<ContentType, string> = { reel: "🎬 Reel", cover: "🖼️ کاور", intro: "⚡ Intro", outro: "🚀 Outro" };
                                    return <button key={item} onClick={() => { setContentType(item); setSlides(generateSlides(text, template, item)); setActiveIndex(0); }} className={`rounded-xl border px-3 py-3 text-sm font-black transition ${contentType === item ? "border-[#09967c] bg-[#09967c]/10 text-[#087b68]" : "hover:bg-slate-50"}`}>{labels[item]}</button>;
                                })}
                            </div>
                        </section>

                        <section>
                            <label className="mb-2 block text-sm font-black">Template</label>
                            <div className="space-y-2">
                                {TEMPLATES.map((item) => <button key={item.id} onClick={() => setTemplate(item.id)} className={`w-full rounded-xl border p-3 text-right transition ${template === item.id ? "border-[#09967c] bg-[#09967c]/10" : "hover:bg-slate-50"}`}><div className="font-black">{item.label}</div><div className="mt-1 text-xs text-slate-500">{item.description}</div></button>)}
                            </div>
                        </section>

                        <section>
                            <div className="mb-2 flex items-center justify-between"><label className="text-sm font-black">متن محتوا</label><Type size={16} className="text-slate-400" /></div>
                            <textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-56 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-8 outline-none transition focus:border-[#09967c] focus:ring-2 focus:ring-[#09967c]/10" placeholder="متن خام Reel را اینجا بنویس..." />
                        </section>

                        <button onClick={regenerate} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#09967c] px-5 py-3.5 font-black text-white shadow-lg shadow-[#09967c]/20 transition hover:translate-y-[-1px] hover:bg-[#087f6b]"><Sparkles size={18} /> تولید اسلایدها</button>
                    </aside>

                    <section className="min-w-0 rounded-3xl border border-black/5 bg-slate-950 p-4 shadow-xl sm:p-6">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-white">
                            <div><div className="text-xs font-bold text-white/50">PREVIEW</div><div className="mt-1 font-black">{activeIndex + 1} / {slides.length} اسلاید · حدود {totalDuration} ثانیه</div></div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setEditing((value) => !value)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15">{editing ? "بستن ویرایش" : "ویرایش اسلاید"}</button>
                                <button onClick={exportSlide} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15"><Download size={15} /> PNG</button>
                                <button onClick={exportAll} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15"><ImageIcon size={15} /> همه اسلایدها</button>
                                <button onClick={fullscreen} className="inline-flex items-center gap-2 rounded-xl bg-[#09967c] px-3 py-2 text-xs font-black hover:bg-[#087f6b]"><Maximize2 size={15} /> تمام‌صفحه</button>
                            </div>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
                            <div className="flex min-h-[650px] items-center justify-center" ref={stageRef}>
                                {activeSlide ? <div className="w-full max-w-[430px]"><SlideCanvas slide={activeSlide} active progress={progress} /></div> : <div className="text-white/50">اسلایدی وجود ندارد.</div>}
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-2xl bg-white/5 p-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => { setPlaying((value) => !value); if (activeIndex === slides.length - 1 && progress >= 100) setProgress(0); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#09967c] px-3 py-3 text-sm font-black text-white">{playing ? <Pause size={17} /> : <Play size={17} />} {playing ? "توقف" : "پخش"}</button>
                                        <button onClick={() => { setActiveIndex((index) => Math.max(0, index - 1)); setProgress(0); }} className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-3 text-white"><ChevronRight size={18} /></button>
                                        <button onClick={() => { setActiveIndex((index) => Math.min(slides.length - 1, index + 1)); setProgress(0); }} className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-3 text-white"><ChevronLeft size={18} /></button>
                                        <button onClick={() => { setActiveIndex(0); setProgress(0); }} className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-3 text-white"><RotateCcw size={17} /></button>
                                    </div>
                                </div>

                                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                                    {slides.map((slide, index) => <button key={slide.id} onClick={() => { setActiveIndex(index); setProgress(0); }} className={`w-full rounded-2xl border p-3 text-right transition ${index === activeIndex ? "border-[#09967c] bg-[#09967c]/15 text-white" : "border-white/5 bg-white/[.03] text-white/60 hover:bg-white/[.06]"}`}><div className="flex items-start gap-3"><span className="text-2xl">{slide.icon}</span><div className="min-w-0"><div className="text-[10px] font-bold opacity-60">اسلاید {index + 1} · {slide.duration}s</div><div className="mt-1 line-clamp-2 text-sm font-black">{slide.title}</div></div></div></button>)}
                                </div>
                            </div>
                        </div>

                        {editing && activeSlide && <div className="mt-5 grid gap-3 rounded-2xl bg-white p-4 text-slate-900 md:grid-cols-3"><div><label className="mb-1 block text-xs font-black">برچسب</label><input value={activeSlide.eyebrow || ""} onChange={(event) => updateActive("eyebrow", event.target.value)} className="w-full rounded-xl border p-3 text-sm" /></div><div><label className="mb-1 block text-xs font-black">عنوان</label><input value={activeSlide.title} onChange={(event) => updateActive("title", event.target.value)} className="w-full rounded-xl border p-3 text-sm" /></div><div><label className="mb-1 block text-xs font-black">توضیح</label><input value={activeSlide.body || ""} onChange={(event) => updateActive("body", event.target.value)} className="w-full rounded-xl border p-3 text-sm" /></div></div>}
                    </section>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-white p-4"><div className="mb-2 flex items-center gap-2 font-black"><Film size={18} className="text-[#09967c]" /> مناسب Reel</div><p className="text-sm leading-7 text-slate-500">اسلایدها را روی تمام‌صفحه ببر و با ضبط صفحه، ویدیو را سریع بساز.</p></div>
                    <div className="rounded-2xl border bg-white p-4"><div className="mb-2 flex items-center gap-2 font-black"><ImageIcon size={18} className="text-[#09967c]" /> خروجی تصویر</div><p className="text-sm leading-7 text-slate-500">هر اسلاید را جداگانه یا همه را به PNG تبدیل کن و در Canva/CapCut استفاده کن.</p></div>
                    <div className="rounded-2xl border bg-white p-4"><div className="mb-2 flex items-center gap-2 font-black"><Plus size={18} className="text-[#09967c]" /> آماده توسعه</div><p className="text-sm leading-7 text-slate-500">ساختار تولید اسلاید جداست و بعداً می‌توانیم AI را برای ساخت خودکار سناریو اضافه کنیم.</p></div>
                </div>
            </div>
        </main>
    );
}
