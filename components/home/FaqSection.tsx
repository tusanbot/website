"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { SectionHeader } from "@/components/ui";

const faqs = [
  { q: "چطور یک خدمت را در توسن ثبت سفارش کنم؟", a: "خدمت موردنظر را از بخش خدمات انتخاب کنید، فرم را تکمیل و در صورت نیاز مدارک را بارگذاری کنید؛ سپس سفارش را ثبت نمایید." },
  { q: "آیا برای ثبت سفارش باید حساب کاربری داشته باشم؟", a: "برای ثبت و پیگیری سفارش‌های آنلاین، ورود به حساب کاربری لازم است." },
  { q: "بعد از ثبت سفارش چه اتفاقی می‌افتد؟", a: "سفارش وارد صف بررسی می‌شود و کارشناسان در صورت نیاز با شما ارتباط می‌گیرند." },
  { q: "چطور وضعیت سفارش را پیگیری کنم؟", a: "از بخش پیگیری سفارش یا پنل کاربری، سفارش‌ها و آخرین وضعیت آن‌ها را ببینید." },
  { q: "اگر هنگام تکمیل فرم یا ارسال مدارک مشکل داشته باشم چه کنم؟", a: "از پشتیبانی آنلاین یا مسیرهای ارتباطی پایین صفحه کمک بگیرید." },
  { q: "آیا اطلاعات و مدارک من نزد توسن محفوظ می‌ماند؟", a: "اطلاعات برای ارائه و پیگیری خدمت استفاده می‌شود و دسترسی مدیریتی به داده‌های حساس محدود است." },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="faq" className="relative scroll-mt-28 py-8 md:py-10" dir="rtl">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls="tusan-faq-list" className="group mx-auto flex w-full max-w-2xl flex-col items-center rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 px-5 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40">
          <span className="flex items-center gap-2 text-lg font-black text-[var(--text)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><HelpCircle size={18} /></span>سوالات متداول</span>
          <span className="mt-1 text-xs text-[var(--text-muted)]">برای مشاهده پاسخ‌ها روی این بخش بزنید</span>
          <span className="mt-2 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--primary)]/25 text-[var(--primary)] transition-transform duration-300 group-hover:scale-110"><ChevronDown size={16} className={expanded ? "rotate-180" : "animate-bounce"} /></span>
        </button>

        <div id="tusan-faq-list" className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-out ${expanded ? "mt-5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0 overflow-hidden space-y-2">
            {faqs.map((item, index) => {
              const isOpen = open === index;
              return (
                <div key={item.q} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/85">
                  <button type="button" onClick={() => setOpen(isOpen ? null : index)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right">
                    <span className="text-sm font-black text-[var(--text)]">{item.q}</span>
                    <ChevronDown size={17} className={`shrink-0 text-[var(--primary)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="min-h-0 overflow-hidden"><div className="border-t border-[var(--border)] px-4 py-3 text-sm leading-7 text-[var(--text-muted)]">{item.a}</div></div></div>
                </div>
              );
            })}
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) }) }} />
      </div>
    </section>
  );
}
