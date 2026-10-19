"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  Search, CarFront, GraduationCap, ShieldCheck, Scale, Wallet, House,
  ReceiptText, Landmark, HeartPulse, BriefcaseBusiness, Building2, FileText,
  Wrench, ExternalLink, BookmarkPlus, Clock3, Newspaper, CalendarDays,
  ArrowUpLeft, Sparkles, Globe2, CircleHelp, ChevronLeft, BadgeCheck,
  Image as ImageIcon, FileOutput, ClipboardList, Vote, Calculator, ScanLine, Eraser, type LucideIcon,
} from "lucide-react";
import { tools } from "@/lib/tools";
import { extraTools } from "@/lib/extra-tools";

const SITE = "https://www.tusancn.ir";
const DASHBOARD_URL = SITE + "/bookmark-maker";

type SystemLink = { title: string; url: string; note?: string };
type SystemGroup = { id: string; title: string; description: string; icon: LucideIcon; links: SystemLink[] };

const systemGroups: SystemGroup[] = [
  { id: "popular", title: "سامانه‌های پرکاربرد", description: "دسترسی سریع به خدماتی که بیشتر مراجعه می‌شوند", icon: Sparkles, links: [
    { title: "درگاه ملی خدمات دولت هوشمند", url: "https://my.gov.ir/" },
    { title: "درگاه ملی مجوزهای کشور", url: "https://mojavez.ir/" },
    { title: "پنجره ملی خدمات هوشمند آموزش‌وپرورش", url: "https://my.medu.ir/" },
    { title: "سازمان سنجش آموزش کشور", url: "https://www.sanjesh.org/" },
  ]},
  { id: "vehicle", title: "خودرو و حمل‌ونقل", description: "خدمات راهور، خلافی و امور خودرو", icon: CarFront, links: [
    { title: "راهور ۱۲۰", url: "https://www.rahvar120.ir/" },
    { title: "پلیس من / خدمات انتظامی", url: "https://epolice.ir/" },
    { title: "سامانه نوبت‌دهی تعویض پلاک", url: "https://nobatdehi.epolice.ir/" },
    { title: "سازمان راهداری و حمل‌ونقل جاده‌ای", url: "https://www.rmto.ir/" },
  ]},
  { id: "education", title: "دانشگاهی، کنکور و مدارس", description: "ثبت‌نام آزمون‌ها، دانش‌آموزی و امور دانشجویان", icon: GraduationCap, links: [
    { title: "سازمان سنجش آموزش کشور", url: "https://www.sanjesh.org/" },
    { title: "پنجره واحد خدمات آموزش‌وپرورش (مای مدیو)", url: "https://my.medu.ir/" },
    { title: "سامانه سجاد امور دانشجویان", url: "https://portal.saorg.ir/" },
    { title: "وزارت علوم، تحقیقات و فناوری", url: "https://www.msrt.ir/" },
    { title: "دانشگاه آزاد اسلامی", url: "https://iau.ir/" },
    { title: "مرکز سنجش آموزش پزشکی", url: "https://sanjeshp.ir/" },
  ]},
  { id: "police", title: "خدمات انتظامی و هویتی", description: "خدمات پلیس و ثبت احوال", icon: ShieldCheck, links: [
    { title: "درگاه خدمات الکترونیک انتظامی", url: "https://epolice.ir/" },
    { title: "سازمان ثبت احوال کشور", url: "https://www.sabteahval.ir/" },
    { title: "سامانه سهیم ثبت احوال", url: "https://sahim.sabteahval.ir/" },
    { title: "سازمان وظیفه عمومی فراجا", url: "https://vazifeh.police.ir/" },
  ]},
  { id: "judiciary", title: "خدمات قضایی و حقوقی", description: "ثنا، ابلاغیه و درگاه خدمات قضایی", icon: Scale, links: [
    { title: "درگاه ملی خدمات قضایی عدل ایران", url: "https://adliran.ir/" },
    { title: "سامانه ثنا", url: "https://sana.adliran.ir/" },
    { title: "سامانه ابلاغ الکترونیک قضایی", url: "https://eblagh.adliran.ir/" },
    { title: "روزنامه رسمی کشور", url: "https://rrk.ir/" },
  ]},
  { id: "finance", title: "وام، بانک و تسهیلات", description: "اطلاع‌رسانی بانکی و خدمات مالی", icon: Wallet, links: [
    { title: "بانک مرکزی جمهوری اسلامی ایران", url: "https://www.cbi.ir/" },
    { title: "درگاه ملی خدمات دولت هوشمند", url: "https://my.gov.ir/" },
    { title: "سامانه اعتبارسنجی بانکی", url: "https://www.mycredit.ir/" },
  ]},
  { id: "housing", title: "املاک، مسکن و اسکان", description: "امور مربوط به ملک و طرح‌های مسکن", icon: House, links: [
    { title: "سامانه ملی املاک و اسکان", url: "https://amlak.mrud.ir/" },
    { title: "وزارت راه و شهرسازی", url: "https://www.mrud.ir/" },
    { title: "سامانه طرح‌های حمایتی مسکن", url: "https://saman.mrud.ir/" },
  ]},
  { id: "tax", title: "مالیات و امور اقتصادی", description: "خدمات مالیاتی و پرونده‌های کسب‌وکار", icon: ReceiptText, links: [
    { title: "درگاه ملی خدمات مالیاتی", url: "https://my.tax.gov.ir/" },
    { title: "سازمان امور مالیاتی کشور", url: "https://www.tax.gov.ir/" },
    { title: "سامانه مؤدیان", url: "https://tp.tax.gov.ir/" },
    { title: "سامانه جامع تجارت ایران", url: "https://www.ntsw.ir/" },
  ]},
  { id: "insurance", title: "بیمه، کار و تأمین اجتماعی", description: "خدمات بیمه‌ای، سوابق و امور کار", icon: HeartPulse, links: [
    { title: "سازمان تأمین اجتماعی", url: "https://www.tamin.ir/" },
    { title: "خدمات غیرحضوری تأمین اجتماعی", url: "https://eservices.tamin.ir/" },
    { title: "سامانه جامع روابط کار", url: "https://prkar.mcls.gov.ir/" },
    { title: "وزارت تعاون، کار و رفاه اجتماعی", url: "https://www.mcls.gov.ir/" },
    { title: "بیمه سلامت ایران", url: "https://ihio.gov.ir/" },
  ]},
  { id: "business", title: "کسب‌وکار، مجوز و شرکت‌ها", description: "مجوزها، ثبت شرکت و امور اصناف", icon: BriefcaseBusiness, links: [
    { title: "درگاه ملی مجوزهای کشور", url: "https://mojavez.ir/" },
    { title: "سامانه ثبت شرکت‌ها", url: "https://irsherkat.ssaa.ir/" },
    { title: "سازمان ثبت اسناد و املاک کشور", url: "https://ssaa.ir/" },
    { title: "سامانه جامع تجارت", url: "https://www.ntsw.ir/" },
    { title: "سازمان ملی استاندارد ایران", url: "https://www.inso.gov.ir/" },
  ]},
  { id: "social", title: "یارانه و خدمات حمایتی", description: "خدمات رفاهی و طرح‌های حمایتی", icon: Landmark, links: [
    { title: "پنجره ملی خدمات دولت هوشمند", url: "https://my.gov.ir/" },
    { title: "وزارت تعاون، کار و رفاه اجتماعی", url: "https://www.mcls.gov.ir/" },
    { title: "سازمان هدفمندسازی یارانه‌ها", url: "https://www.hadafmandi.ir/" },
  ]},
  { id: "postal", title: "پست، ارتباطات و خدمات عمومی", description: "خدمات عمومی موردنیاز روزانه", icon: Building2, links: [
    { title: "شرکت ملی پست ایران", url: "https://post.ir/" },
    { title: "سازمان تنظیم مقررات و ارتباطات رادیویی", url: "https://www.cra.ir/" },
    { title: "درگاه ملی خدمات دولت هوشمند", url: "https://my.gov.ir/" },
  ]},
];

const toolShortcuts = [
  { title: "مدیریت PDF", description: "ادغام، تقسیم، کاهش حجم و ابزارهای PDF", href: "/tools/pdf-manager", icon: FileOutput, tone: "teal" },
  { title: "تبدیل PDF به Word", description: "تبدیل فایل به سند قابل ویرایش", href: "/tools/pdf-to-word", icon: FileText, tone: "blue" },
  { title: "مدیریت عکس", description: "تغییر اندازه، فشرده‌سازی و تبدیل فرمت", href: "/tools/image-manager", icon: ImageIcon, tone: "violet" },
  { title: "فاکتورساز آنلاین", description: "ساخت و چاپ فاکتور", href: "/tools/invoice", icon: ReceiptText, tone: "amber" },
  { title: "تراکت انتخابات شورای دانش‌آموزی", description: "طراحی پوستر انتخاباتی آماده چاپ", href: "/tools/student-council-poster", icon: Vote, tone: "rose" },
  { title: "عکس و PDF به متن", description: "استخراج متن از تصویر و فایل اسکن‌شده", href: "/tools/ocr", icon: ClipboardList, tone: "blue" },
  { title: "رزومه‌ساز", description: "ساخت رزومه حرفه‌ای قابل چاپ", href: "/tools/resume-builder", icon: FileText, tone: "violet" },
  { title: "محاسبه اقساط وام", description: "برآورد اقساط و سود وام", href: "/tools/loan-calculator", icon: Calculator, tone: "teal" },
  { title: "بهبود اسکن PDF", description: "برش، صاف‌کردن و اصلاح نور اسکن مدارک", href: "/tools/pdf-manager/highlight-pdf", icon: ScanLine, tone: "blue" },
  { title: "حذف واترمارک PDF", description: "شناسایی واترمارک‌های استاندارد PDF", href: "/tools/pdf-manager/remove-watermark", icon: Eraser, tone: "rose" },
  { title: "همه ابزارهای توسن", description: "مشاهده فهرست کامل ابزارهای آنلاین", href: "/tools", icon: Wrench, tone: "amber" },
];

type Announcement = {
  id: string; title: string; summary: string | null; content?: string | null; type: string;
  start_at: string | null; end_at: string | null; extended_end_at: string | null;
  button_label: string | null; service_id: string | null;
  service: { title: string; slug: string | null; description: string | null; icon: string | null; price: number | null } | null;
};

function persianDate(value: string | null) {
  if (!value) return "تاریخ اعلام نشده";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "تاریخ اعلام نشده";
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric" }).format(new Date(time));
}

export default function BookmarkMakerClient() {
  const [query, setQuery] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementError, setAnnouncementError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    let mounted = true;
    fetch("/api/home/announcements", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!mounted) return;
        if (payload?.ok) setAnnouncements(Array.isArray(payload.items) ? payload.items : []);
        else setAnnouncementError(true);
      })
      .catch(() => { if (mounted) setAnnouncementError(true); });
    return () => { mounted = false; };
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase("fa-IR");
  const filteredGroups = useMemo(() => systemGroups
    .filter((group) => selectedCategory === "all" || group.id === selectedCategory)
    .map((group) => ({ ...group, links: group.links.filter((link) => (group.title + " " + link.title + " " + (link.note || "")).toLocaleLowerCase("fa-IR").includes(normalizedQuery)) }))
    .filter((group) => group.links.length > 0), [normalizedQuery, selectedCategory]);

  const filteredTools = useMemo(() => toolShortcuts.filter((tool) =>
    (tool.title + " " + tool.description).toLocaleLowerCase("fa-IR").includes(normalizedQuery)), [normalizedQuery]);

  const activeRegistrations = announcements.filter((item) => item.type === "registration");
  const tickerItems = announcements.slice(0, 12);
  const tickerDisplayItems: Announcement[] = tickerItems.length ? tickerItems : [{ id: "empty", title: "برای مشاهده تازه‌ترین اطلاعیه‌ها و ثبت‌نام‌ها، بخش اطلاعیه‌های سایت توسن را بررسی کنید.", summary: null, content: null, type: "notice", start_at: null, end_at: null, extended_end_at: null, button_label: null, service_id: null, service: null }];
  const allToolsCount = [...tools, ...extraTools].filter((tool) => tool.enabled && tool.href).length;

  function handleBookmarkDrag(event: DragEvent<HTMLAnchorElement>) {
    event.dataTransfer.setData("text/uri-list", DASHBOARD_URL);
    event.dataTransfer.setData("text/plain", DASHBOARD_URL);
    event.dataTransfer.effectAllowed = "copy";
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--text)]">
      <style>{".tusan-ticker-track{display:flex;width:max-content;animation:tusan-ticker 42s linear infinite}.tusan-ticker:hover .tusan-ticker-track{animation-play-state:paused}@keyframes tusan-ticker{from{transform:translateX(0)}to{transform:translateX(50%)}}"}</style>
      <section className="relative overflow-hidden bg-[#0d1b2d] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 85% 20%, rgba(45,212,191,.24), transparent 28%), radial-gradient(circle at 10% 80%, rgba(59,130,246,.2), transparent 30%), linear-gradient(135deg, transparent 45%, rgba(255,255,255,.035) 45%, rgba(255,255,255,.035) 46%, transparent 46%)" }} />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-200/10 px-3 py-1.5 text-xs font-extrabold text-teal-100"><Sparkles size={15} /> میز کار دیجیتال کافی‌نت توسن</div>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">همه سامانه‌ها، <span className="text-teal-300">یک کلیک</span> تا شما فاصله دارند.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-300 sm:text-base">میانبر سامانه‌های رسمی، ثبت‌نام‌های فعال و ابزارهای روزمره کافی‌نت؛ یک صفحه برای شروع کار هر روز.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#systems" className="inline-flex items-center gap-2 rounded-xl bg-teal-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-200"><Globe2 size={18} /> ورود به سامانه‌ها</a>
                <a href="#tools" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"><Wrench size={18} /> ابزارهای کاربردی</a>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck size={15} className="text-teal-300" /> بدون نصب افزونه</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 size={15} className="text-teal-300" /> دسترسی سریع</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} className="text-teal-300" /> به‌روزرسانی از سایت</span>
              </div>
            </div>
            <div className="w-full rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur sm:p-5 lg:max-w-md">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold text-slate-400">جست‌وجوی یکپارچه</p><h2 className="mt-1 text-lg font-black">چی لازم داری؟</h2></div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-300/15 text-teal-200"><Search size={22} /></div>
              </div>
              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#071321]/70 px-4 py-3 focus-within:border-teal-300/60">
                <Search size={19} className="shrink-0 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثلاً مالیات، سنجش، تبدیل PDF..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" aria-label="جست‌وجوی سامانه‌ها و ابزارها" />
                {query && <button type="button" onClick={() => setQuery("")} className="text-xs font-bold text-teal-200">پاک‌کردن</button>}
              </label>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/5 px-2 py-3"><div className="text-xl font-black text-teal-200">{systemGroups.length}</div><div className="mt-1 text-[11px] text-slate-400">دسته سامانه</div></div>
                <div className="rounded-xl bg-white/5 px-2 py-3"><div className="text-xl font-black text-teal-200">{systemGroups.reduce((sum, group) => sum + group.links.length, 0)}</div><div className="mt-1 text-[11px] text-slate-400">میانبر سامانه</div></div>
                <div className="rounded-xl bg-white/5 px-2 py-3"><div className="text-xl font-black text-teal-200">{allToolsCount}</div><div className="mt-1 text-[11px] text-slate-400">ابزار توسن</div></div>
              </div>
            </div>
          </div>
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200"><BookmarkPlus size={21} /></div>
              <div><p className="text-sm font-black">این صفحه را یک بار بوکمارک کن</p><p className="mt-1 text-xs leading-6 text-slate-400">لینک را به نوار بوکمارک بکش، یا در Chrome کلیدهای Ctrl + D را بزن.</p></div>
            </div>
            <a href={DASHBOARD_URL} draggable onDragStart={handleBookmarkDrag} className="mt-3 inline-flex shrink-0 cursor-grab items-center justify-center gap-2 rounded-xl border border-teal-200/30 bg-teal-200/10 px-4 py-2.5 text-xs font-black text-teal-100 transition hover:bg-teal-200/20 active:cursor-grabbing sm:mt-0" title="این لینک را به نوار بوکمارک مرورگر بکشید"><BookmarkPlus size={16} /> کشیدن به نوار بوکمارک <ArrowUpLeft size={15} /></a>
          </div>
        </div>
      </section>

      <section id="registrations" className="mx-auto max-w-7xl scroll-mt-5 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-black text-[var(--primary)]">فرصت‌ها و مهلت‌ها</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">ثبت‌نام‌های فعال</h2><p className="mt-2 text-sm text-[var(--text-muted)]">این بخش از همان منبع اطلاعیه‌های صفحه اصلی سایت تغذیه می‌شود.</p></div>
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--primary)] hover:underline">مشاهده صفحه اصلی <ChevronLeft size={16} /></Link>
        </div>
        {announcementError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">دریافت ثبت‌نام‌ها در حال حاضر ممکن نیست. لطفاً صفحه اصلی سایت را بررسی کنید.</div> :
          activeRegistrations.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center"><CalendarDays className="mx-auto text-[var(--primary)]" size={28} /><p className="mt-3 font-black">در حال حاضر ثبت‌نام فعالی در این فهرست اعلام نشده است.</p><p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">با ثبت اطلاعیه جدید در بخش مدیریت سایت، این قسمت به‌روز می‌شود.</p></div> :
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activeRegistrations.map((item) => {
            const end = item.extended_end_at || item.end_at;
            const href = item.service?.slug ? "/services/" + encodeURIComponent(item.service.slug) : "/services";
            return <article key={item.id} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-md">
              <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">{item.service?.icon || "📅"}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-700">فعال</span>{item.start_at && <span className="text-[10px] text-[var(--text-muted)]">شروع: {persianDate(item.start_at)}</span>}</div><h3 className="mt-2 font-black leading-7">{item.title}</h3></div></div>
              <p className="mt-2 line-clamp-2 text-xs leading-6 text-[var(--text-muted)]">{item.summary || item.content || item.service?.description || "برای مشاهده جزئیات اطلاعیه، وارد بخش خدمات شوید."}</p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3"><span className="text-[11px] font-bold text-[var(--text-muted)]">پایان مهلت: {persianDate(end)}</span><Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-black text-white">{item.button_label || "جزئیات"} <ChevronLeft size={14} /></Link></div>
            </article>;
          })}</div>}
      </section>

      <section id="systems" className="scroll-mt-5 border-y border-[var(--border)] bg-[var(--surface-secondary)]/50 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5"><p className="text-xs font-black text-[var(--primary)]">سامانه‌های رسمی و عمومی</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">سامانه‌های موردنیاز کافی‌نت</h2><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">دسته‌بندی کن یا نام سامانه را جست‌وجو کن؛ لینک‌ها مستقیماً به مقصد باز می‌شوند.</p></div>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
            {[{ id: "all", title: "همه دسته‌ها" }, ...systemGroups.map(({ id, title }) => ({ id, title }))].map((item) => <button key={item.id} type="button" onClick={() => setSelectedCategory(item.id)} className={"shrink-0 rounded-full border px-3.5 py-2 text-xs font-extrabold transition " + (selectedCategory === item.id ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--primary)]/50")}>{item.title}</button>)}
          </div>
          {filteredGroups.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">سامانه‌ای با این عبارت پیدا نشد.</div> :
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredGroups.map((group) => {
              const Icon = group.icon;
              return <section key={group.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-3 border-b border-[var(--border)] p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Icon size={22} /></span><div><h3 className="font-black">{group.title}</h3><p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">{group.description}</p></div></div>
                <div className="p-2">{group.links.map((link) => <a key={link.title + link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-[var(--primary)]/5"><span className="font-bold leading-6">{link.title}</span><ExternalLink size={15} className="shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--primary)]" /></a>)}</div>
              </section>;
            })}</div>}
          <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">نشانی سامانه‌های دولتی ممکن است تغییر کند؛ پیش از ثبت اطلاعات حساس، دامنه و هویت سایت مقصد را بررسی کنید.</p>
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-7xl scroll-mt-5 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black text-[var(--primary)]">کارهای روزمره، ساده‌تر</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">ابزارهای کاربردی کافی‌نت</h2><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">ابزارهای توسن برای آماده‌سازی فایل‌ها، چاپ مدارک و امور روزانه.</p></div><Link href="/tools" className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--primary)] hover:underline">فهرست کامل ابزارها <ChevronLeft size={16} /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredTools.map((tool) => {
          const Icon = tool.icon;
          const toneClass = tool.tone === "teal" ? "bg-teal-500/10 text-teal-700" : tool.tone === "blue" ? "bg-blue-500/10 text-blue-700" : tool.tone === "violet" ? "bg-violet-500/10 text-violet-700" : tool.tone === "rose" ? "bg-rose-500/10 text-rose-700" : "bg-amber-500/10 text-amber-700";
          return <Link key={tool.href} href={tool.href} className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-md"><span className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-xl " + toneClass}><Icon size={23} /></span><span className="min-w-0 flex-1"><span className="block font-black">{tool.title}</span><span className="mt-1 block text-xs leading-6 text-[var(--text-muted)]">{tool.description}</span></span><ChevronLeft size={17} className="shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--primary)]" /></Link>;
        })}</div>
        {filteredTools.length === 0 && <p className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">ابزاری با این عبارت پیدا نشد.</p>}
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4 text-sky-950"><CircleHelp size={20} className="mt-0.5 shrink-0 text-sky-700" /><p className="text-xs leading-7">فایل‌های شخصی مشتریان را فقط در ابزارهای مورداعتماد پردازش کنید و پس از پایان کار، فایل‌های دانلودشده و نسخه‌های موقت را از رایانه عمومی پاک کنید.</p></div>
      </section>

      <section className="tusan-ticker border-y border-slate-800 bg-[#101e31] py-3 text-white" aria-label="نوار اخبار و اطلاعیه‌ها">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-2 rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-slate-950"><Newspaper size={16} /> اخبار و اطلاعیه‌ها</div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="tusan-ticker-track gap-8 whitespace-nowrap py-1">
              {tickerDisplayItems.concat(tickerDisplayItems).map((item, index) => <Link key={item.id + "-" + index} href={item.type === "registration" ? "#registrations" : "/"} className="inline-flex items-center gap-2 text-xs font-bold text-slate-200 transition hover:text-teal-200"><span className="h-1.5 w-1.5 rounded-full bg-teal-300" />{item.title}<span className="text-slate-500">•</span></Link>)}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0b1422] px-4 py-7 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-lg font-black">کافی‌نت توسن</p><p className="mt-1 text-xs leading-6 text-slate-400">میز کار روزانه خدمات اینترنتی و سامانه‌ها</p></div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold"><Link href="/services" className="text-slate-300 hover:text-teal-200">خدمات توسن</Link><Link href="/tools" className="text-slate-300 hover:text-teal-200">ابزارها</Link><a href={SITE} className="inline-flex items-center gap-2 rounded-xl bg-teal-300 px-4 py-2.5 font-black text-slate-950 hover:bg-teal-200">ورود به tusancn.ir <ExternalLink size={14} /></a></div>
        </div>
      </footer>
    </main>
  );
}
