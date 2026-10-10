"use client";

import { useState } from "react";
import { BookmarkCheck, Chrome, Download, ExternalLink, FolderTree, Globe, ShieldCheck, CheckCircle2, Copy, ChevronDown } from "lucide-react";

const browsers = [
  { id: "chrome", name: "Google Chrome", detail: "بسته نصب و دانلود مستقیم", accent: "from-emerald-500 to-teal-600", badge: "پیشنهاد ما" },
  { id: "firefox", name: "Mozilla Firefox", detail: "بسته سازگار؛ نصب نهایی نیازمند امضای افزونه است", accent: "from-orange-500 to-rose-600", badge: "نسخه سازگار" },
  { id: "edge", name: "Microsoft Edge", detail: "بسته نصب و دانلود مستقیم", accent: "from-cyan-500 to-blue-600", badge: "Chromium" },
];

const features = [
  { icon: FolderTree, title: "پوشه‌بندی منظم", description: "مالیات، بیمه، خودرو، خدمات دولت، دانشگاه، امور قضایی و دسته‌های تخصصی دیگر." },
  { icon: CheckCircle2, title: "انتخاب دلخواه", description: "پیش از افزودن بوکمارک‌ها، هر دسته یا هر سایت را جداگانه انتخاب یا لغو انتخاب کنید." },
  { icon: ShieldCheck, title: "بدون حساب کاربری", description: "افزونه روی مرورگر شما کار می‌کند و برای افزودن بوکمارک‌ها نیازی به ساخت حساب ندارد." },
  { icon: BookmarkCheck, title: "ابزارهای آنلاین توسن", description: "دسترسی سریع به PDF به Word، مدیریت PDF، مدیریت عکس، فاکتورساز، رزومه‌ساز و QR ساز." },
];

export default function ExtensionPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <main dir="rtl" className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <section className="relative isolate overflow-hidden border-b border-[var(--border)] bg-gradient-to-br from-[#063e37] via-[#087d69] to-[#0b9b83] text-white">
        <div aria-hidden="true" className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_.8fr] md:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur"><BookmarkCheck size={15}/> افزونه رسمی ابزارهای کافی‌نت توسن</div>
            <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">همه سامانه‌های کافی‌نت،<br className="hidden sm:block"/> همیشه دم دست شما</h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-white/85 sm:text-base">بوکمارک‌های کاربردی کافی‌نت را با چند کلیک به مرورگر اضافه کنید. دسته‌ها را انتخاب کنید، سایت‌های موردنیاز را مشخص کنید و مجموعه‌ای مرتب در نوار بوکمارک بسازید.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#downloads" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-900 shadow-lg transition hover:-translate-y-0.5"><Download size={18}/> دریافت افزونه</a>
              <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15">آشنایی با امکانات <ChevronDown size={16}/></a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/75"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14}/> انتخاب دسته و سایت</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14}/> ابزارهای توسن</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14}/> بدون هزینه نصب</span></div>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 border-b border-white/15 pb-4"><div className="grid size-12 place-items-center rounded-2xl bg-white text-emerald-800"><BookmarkCheck size={26}/></div><div><div className="font-black">بوکمارک‌های کافی‌نت</div><div className="mt-1 text-xs text-white/70">پوشه خدمات کافی‌نت توسن</div></div></div>
              <div className="mt-4 space-y-2.5">
                {["مالیات و امور مالیاتی","بیمه و تأمین اجتماعی","خودرو و راهور","خدمات دولت و یارانه","ابزارهای آنلاین توسن"].map((name, i) => <div key={name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-3"><FolderTree size={17} className="text-amber-200"/><span className="flex-1 text-sm font-semibold">{name}</span><span className="text-xs text-white/60">{[6,5,7,5,14][i]} لینک</span></div>)}
              </div>
              <div className="mt-4 rounded-xl bg-white px-3 py-3 text-center text-xs font-bold text-emerald-900">انتخاب کنید و به نوار بوکمارک اضافه کنید</div>
            </div>
          </div>
        </div>
      </section>

      <section id="downloads" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-12 sm:px-8 md:py-16">
        <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-[var(--primary)]">دانلود و نصب</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">مرورگر خودت را انتخاب کن</h2><p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">بسته افزونه برای هر سه مرورگر آماده دانلود است. نصب مستقیم فایل در مرورگرهای معمولی به تأیید کاربر نیاز دارد؛ نصب از فروشگاه با انتشار نسخه رسمی فعال می‌شود.</p></div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {browsers.map((browser) => <article key={browser.id} className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3"><div className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${browser.accent} text-white shadow`}>{browser.id === "chrome" ? <Chrome size={25}/> : browser.id === "firefox" ? <Globe size={25}/> : <ExternalLink size={25}/>}</div><span className="rounded-full bg-[var(--primary-light)] px-2.5 py-1 text-[10px] font-black text-[var(--primary-dark)]">{browser.badge}</span></div>
            <h3 className="mt-4 text-lg font-black">{browser.name}</h3><p className="mt-1 min-h-12 text-xs leading-6 text-[var(--text-secondary)]">{browser.detail}</p>
            <a href={`/tools/extension/download/${browser.id}`} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white transition hover:bg-[var(--primary-dark)]"><Download size={17}/> دانلود بسته {browser.id === "firefox" ? "Firefox" : browser.id === "edge" ? "Edge" : "Chrome"}</a>
            <p className="mt-3 text-center text-[10px] leading-5 text-[var(--text-muted)]">ZIP · نصب دستی از بخش افزونه‌های مرورگر</p>
          </article>)}
        </div>
        <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><strong>توجه درباره نصب:</strong> فایل دانلودی، افزونه را خودکار نصب نمی‌کند. در Chrome و Edge باید صفحه مدیریت افزونه‌ها و حالت توسعه‌دهنده را باز کنید. برای Firefox، انتشار عمومی و نصب معمول به بسته امضاشده از Firefox Add-ons نیاز دارد.</div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="https://chromewebstore.google.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-bold hover:border-[var(--primary)]">فروشگاه Chrome <ExternalLink size={14}/></a>
          <a href="https://addons.mozilla.org/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-bold hover:border-[var(--primary)]">فروشگاه Firefox <ExternalLink size={14}/></a>
          <a href="https://microsoftedge.microsoft.com/addons/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-bold hover:border-[var(--primary)]">فروشگاه Edge <ExternalLink size={14}/></a>
        </div>
      </section>

      <section id="features" className="border-y border-[var(--border)] bg-[var(--surface-muted)] px-5 py-12 sm:px-8 md:py-16">
        <div className="mx-auto max-w-7xl"><div className="text-center"><p className="text-sm font-black text-[var(--primary)]">ساخته‌شده برای کافی‌نت</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">ابزارهای پرکاربرد، در یک پوشه</h2></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(({icon: Icon, title, description}) => <article key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="grid size-11 place-items-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)]"><Icon size={22}/></div><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{description}</p></article>)}</div>
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><h3 className="text-lg font-black">ابزارهای آنلاین سایت توسن</h3><p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">در پوشه اختصاصی توسن، لینک ابزارهای زیر قرار می‌گیرد:</p><div className="mt-4 flex flex-wrap gap-2">{["PDF به Word","مدیریت PDF","مدیریت عکس","فاکتورساز","رزومه‌ساز","QR ساز","عکس و PDF به متن (OCR)","مدیریت ویدیو","برنامه درس هفتگی","پوستر شورای دانش‌آموزی","تبدیل متن به صوت","اصلاح نگارش"].map(x => <span key={x} className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-bold">{x}</span>)}</div><a href="/tools" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">دیدن همه ابزارهای توسن <ExternalLink size={15}/></a></div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <h2 className="text-center text-2xl font-black">راهنمای نصب</h2>
        <div className="mt-6 space-y-3">{[
          ["۱. فایل را دانلود و استخراج کنید","بسته متناسب با مرورگرتان را دانلود کنید و فایل ZIP را در یک پوشه استخراج کنید."],
          ["۲. صفحه افزونه‌های مرورگر را باز کنید","در Chrome آدرس chrome://extensions و در Edge آدرس edge://extensions را باز کنید."],
          ["۳. حالت توسعه‌دهنده را فعال کنید","کلید Developer mode را فعال کنید و گزینه Load unpacked را بزنید؛ سپس پوشه استخراج‌شده را انتخاب کنید."],
          ["۴. دسته‌های موردنیاز را انتخاب کنید","افزونه را باز کنید، دسته‌ها یا سایت‌های دلخواه را انتخاب کنید و روی افزودن بوکمارک‌ها بزنید."]
        ].map(([title, description], i) => <div key={title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"><button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center gap-3 p-4 text-right"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--primary-light)] text-xs font-black text-[var(--primary-dark)]">{i+1}</span><span className="flex-1 font-bold">{title}</span><ChevronDown size={17} className={openFaq === i ? "rotate-180 transition" : "transition"}/></button>{openFaq === i && <p className="border-t border-[var(--border)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>}</div>)}</div>
      </section>
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-7 text-center text-xs leading-6 text-[var(--text-muted)]">© کافی‌نت توسن · ابزارهای آنلاین و خدمات اینترنتی<br/><a href="/" className="font-bold text-[var(--primary)]">بازگشت به سایت توسن</a></footer>
    </main>
  );
}
