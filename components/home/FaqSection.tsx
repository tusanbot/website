"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { GlassPanel, SectionHeader } from "@/components/ui";

const faqs = [
  { q: "چطور یک خدمت را در توسن ثبت سفارش کنم؟", a: "خدمت موردنظر را از بخش خدمات انتخاب کنید، فرم را تکمیل و در صورت نیاز مدارک را بارگذاری کنید؛ سپس سفارش را ثبت نمایید." },
  { q: "آیا برای ثبت سفارش باید حساب کاربری داشته باشم؟", a: "برای ثبت و پیگیری سفارش‌های آنلاین، ورود به حساب کاربری لازم است." },
  { q: "بعد از ثبت سفارش چه اتفاقی می‌افتد؟", a: "سفارش وارد صف بررسی می‌شود و کارشناسان در صورت نیاز با شما ارتباط می‌گیرند." },
  { q: "چطور وضعیت سفارش را پیگیری کنم؟", a: "از بخش پیگیری سفارش یا پنل کاربری، سفارش‌ها و آخرین وضعیت آن‌ها را ببینید." },
  { q: "اگر هنگام تکمیل فرم یا ارسال مدارک مشکل داشته باشم چه کنم؟", a: "از پشتیبانی آنلاین یا مسیرهای ارتباطی پایین صفحه کمک بگیرید." },
  { q: "آیا اطلاعات و مدارک من نزد توسن محفوظ می‌ماند؟", a: "اطلاعات برای ارائه و پیگیری خدمت استفاده می‌شود و دسترسی مدیریتی به داده‌های حساس محدود است." },
];

export default function FaqSection() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="relative scroll-mt-28 py-10 md:py-12" dir="rtl">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <SectionHeader title="سوالات متداول" description="پاسخ کوتاه به پرسش‌های رایج ثبت و پیگیری خدمات توسن." align="center" />
        <div className="mt-6 space-y-2">
          {faqs.map((item, index) => {
            const isOpen = open === index;
            return (
              <GlassPanel key={item.q} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/85">
                <button type="button" onClick={() => setOpen(isOpen ? -1 : index)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-right">
                  <span className="flex items-center gap-2.5 text-sm font-black text-[var(--text)]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]"><HelpCircle size={16} /></span>{item.q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-[var(--primary)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 text-sm leading-7 text-[var(--text-muted)]">{item.a}</div>}
              </GlassPanel>
            );
          })}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) }) }} />
      </div>
    </section>
  );
}
