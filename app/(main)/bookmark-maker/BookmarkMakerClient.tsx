"use client";

import { useMemo, useState } from "react";
import { Bookmark, Check, Download, ExternalLink, Folder, Info, ShieldCheck } from "lucide-react";

type BookmarkLink = { title: string; url: string };
type BookmarkFolder = { title: string; links: BookmarkLink[] };

const site = "https://www.tusancn.ir";

const folders: BookmarkFolder[] = [
  { title: "خودرو", links: [
    { title: "راهور ۱۲۰", url: "https://www.rahvar120.ir/" },
    { title: "خدمات الکترونیک انتظامی", url: "https://epolice.ir/" },
  ]},
  { title: "دانشگاهی", links: [
    { title: "سازمان سنجش آموزش کشور", url: "https://www.sanjesh.org/" },
    { title: "سامانه مای مدیو", url: "https://my.medu.ir/" },
    { title: "سامانه امور دانشجویان (سجاد)", url: "https://portal.saorg.ir/" },
  ]},
  { title: "خدمات انتظامی", links: [
    { title: "درگاه خدمات الکترونیک انتظامی", url: "https://epolice.ir/" },
    { title: "راهور ۱۲۰", url: "https://www.rahvar120.ir/" },
  ]},
  { title: "خدمات قضائی", links: [
    { title: "درگاه خدمات الکترونیک قضایی (عدل ایران)", url: "https://adliran.ir/" },
    { title: "سامانه ثنا", url: "https://sana.adliran.ir/" },
    { title: "سامانه ابلاغ الکترونیک قضایی", url: "https://eblagh.adliran.ir/" },
  ]},
  { title: "وام و تسهیلات", links: [
    { title: "درگاه ملی خدمات دولت هوشمند", url: "https://my.gov.ir/" },
    { title: "بانک مرکزی جمهوری اسلامی ایران", url: "https://www.cbi.ir/" },
  ]},
  { title: "املاک و اسکان", links: [
    { title: "سامانه ملی املاک و اسکان", url: "https://amlak.mrud.ir/" },
  ]},
  { title: "مالیات", links: [
    { title: "درگاه ملی خدمات الکترونیک مالیاتی", url: "https://my.tax.gov.ir/" },
    { title: "سازمان امور مالیاتی کشور", url: "https://www.tax.gov.ir/" },
  ]},
  { title: "سایر خدمات", links: [
    { title: "درگاه ملی خدمات دولت هوشمند", url: "https://my.gov.ir/" },
    { title: "خدمات کافی‌نت توسن", url: site + "/services" },
  ]},
  { title: "ابزارهای آنلاین", links: [
    { title: "تبدیل PDF به Word", url: site + "/tools/pdf-to-word" },
    { title: "مدیریت PDF", url: site + "/tools/pdf-manager" },
    { title: "مدیریت عکس", url: site + "/tools/image-manager" },
    { title: "فاکتورساز آنلاین", url: site + "/tools/invoice" },
    { title: "رزومه‌ساز آنلاین", url: site + "/tools/resume-builder" },
    { title: "همه ابزارهای آنلاین توسن", url: site + "/tools" },
  ]},
];

const topLevelLinks: BookmarkLink[] = [
  { title: "همه ابزارها | توسن", url: site + "/tools" },
  { title: "کافی نت توسن | صفحه اصلی", url: site },
];

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function makeBookmarksHtml(selectedFolders: BookmarkFolder[], includeTopLevel: boolean) {
  const folderMarkup = selectedFolders.map((folder) => {
    const links = folder.links.map((link) =>
      `    <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="0">${escapeHtml(link.title)}</A>`
    ).join("\n");
    return `  <DT><H3 ADD_DATE="0" LAST_MODIFIED="0">${escapeHtml(folder.title)}</H3>\n  <DL><p>\n${links}\n  </DL><p>`;
  }).join("\n");
  const topLinksMarkup = includeTopLevel ? topLevelLinks.map((link) =>
    `  <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="0">${escapeHtml(link.title)}</A>`
  ).join("\n") : "";
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. It will be read and overwritten. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>بوکمارک‌های کافی‌نت توسن</TITLE>
<H1>بوکمارک‌های کافی‌نت توسن</H1>
<DL><p>
${folderMarkup}
${topLinksMarkup}
</DL><p>
`;
}

export default function BookmarkMakerClient() {
  const [selected, setSelected] = useState<string[]>(folders.map((folder) => folder.title));
  const [includeTopLevel, setIncludeTopLevel] = useState(true);
  const [downloaded, setDownloaded] = useState(false);
  const selectedFolders = useMemo(() => folders.filter((folder) => selected.includes(folder.title)), [selected]);

  function toggleFolder(title: string) {
    setDownloaded(false);
    setSelected((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  }

  function downloadFile() {
    const html = makeBookmarksHtml(selectedFolders, includeTopLevel);
    const blob = new Blob(["\uFEFF", html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tusan-bookmarks.html";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  return (
    <main dir="rtl" className="min-h-screen page-background text-[var(--text)]">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <Bookmark size={32} />
          </div>
          <p className="mt-5 text-sm font-black text-[var(--primary)]">ابزار رایگان کافی‌نت توسن</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">نشانک‌ساز کافی‌نت توسن</h1>
          <p className="mt-4 text-sm leading-8 text-[var(--text-muted)] sm:text-base">
            لینک‌های پرکاربرد کافی‌نت و ابزارهای آنلاین توسن را به‌صورت پوشه‌بندی‌شده دریافت کنید و یک‌بار در Chrome وارد کنید.
          </p>
        </header>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_300px]">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">پوشه‌های نشانک</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">پوشه‌هایی را که لازم دارید انتخاب کنید.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setSelected(folders.map((folder) => folder.title)); setDownloaded(false); }} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:border-[var(--primary)]">انتخاب همه</button>
                <button type="button" onClick={() => { setSelected([]); setDownloaded(false); }} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:border-[var(--primary)]">پاک‌کردن انتخاب</button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {folders.map((folder) => {
                const checked = selected.includes(folder.title);
                return (
                  <label key={folder.title} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checked ? "border-[var(--primary)]/50 bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/30"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleFolder(folder.title)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                    <Folder size={22} className="mt-0.5 shrink-0 text-amber-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold">{folder.title}</span>
                      <span className="mt-1 block text-xs leading-6 text-[var(--text-muted)]">{folder.links.length} نشانک</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border)] p-4">
              <input type="checkbox" checked={includeTopLevel} onChange={(event) => { setIncludeTopLevel(event.target.checked); setDownloaded(false); }} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
              <span className="flex-1">
                <span className="block font-extrabold">لینک‌های اصلی در کنار پوشه‌ها</span>
                <span className="mt-1 block text-xs leading-6 text-[var(--text-muted)]">«همه ابزارها | توسن» و «کافی نت توسن | صفحه اصلی» جداگانه در فایل نشانک قرار می‌گیرند.</span>
              </span>
            </label>

            <button type="button" onClick={downloadFile} disabled={selected.length === 0 && !includeTopLevel} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-4 font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
              <Download size={20} />
              دریافت فایل نشانک‌های توسن
            </button>
            {downloaded && <p role="status" className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-emerald-600"><Check size={18} /> فایل ساخته شد؛ حالا آن را در Chrome وارد کنید.</p>}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2"><Info size={20} className="text-[var(--primary)]" /><h2 className="font-black">روش نصب در Chrome</h2></div>
              <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-7 text-[var(--text-muted)]">
                <li>فایل نشانک‌ها را دریافت کنید.</li>
                <li>در Chrome از منوی سه‌نقطه وارد بخش <strong className="text-[var(--text)]">Bookmarks and lists</strong> شوید.</li>
                <li>گزینه <strong className="text-[var(--text)]">Import bookmarks</strong> را انتخاب کنید.</li>
                <li>فایل <code dir="ltr" className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">tusan-bookmarks.html</code> را انتخاب کنید.</li>
              </ol>
              <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3 text-xs leading-6 text-[var(--text-muted)]">Chrome ممکن است نشانک‌های واردشده را داخل پوشه‌ای با نام Imported قرار دهد. بعد از واردکردن می‌توانید پوشه‌ها را به نوار نشانک‌ها منتقل کنید.</p>
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-600" /><h2 className="font-black">شفاف و مستقیم</h2></div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">نشانک‌ها مستقیماً به آدرس سایت مقصد می‌روند. اطلاعات صفحه‌های بازشده جمع‌آوری نمی‌شود و انتقال مخفی از طریق سایت دیگری انجام نمی‌گیرد.</p>
            </section>

            <a href={site} className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-black transition hover:border-[var(--primary)]/40">
              بازدید از کافی‌نت توسن <ExternalLink size={17} />
            </a>
          </aside>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-6 text-[var(--text-muted)]">
          لینک سامانه‌های بیرونی ممکن است با تغییرات سازمان مربوطه عوض شود. پیش از ارائه خدمت، نشانی و رسمی‌بودن هر سامانه را بررسی کنید.
        </p>
      </section>
    </main>
  );
}
