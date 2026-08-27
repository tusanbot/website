"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { GlassPanel, SectionHeader } from "@/components/ui";

const faqs = [
    { q: "چطور یک خدمت را در توسن ثبت سفارش کنم؟", a: "خدمت موردنظر را از بخش خدمات انتخاب کنید، فرم مربوط به آن را تکمیل و در صورت نیاز مدارک را بارگذاری کنید؛ سپس سفارش را ثبت کنید." },
    { q: "آیا برای ثبت سفارش باید حساب کاربری داشته باشم؟", a: "برای ثبت و پیگیری سفارش‌های آنلاین، ورود به حساب کاربری لازم است تا اطلاعات و وضعیت سفارش شما به‌صورت امن قابل پیگیری باشد." },
    { q: "بعد از ثبت سفارش چه اتفاقی می‌افتد؟", a: "سفارش شما وارد صف بررسی توسن می‌شود. کارشناسان اطلاعات و مدارک را بررسی می‌کنند و در صورت نیاز از طریق پیام یا پشتیبانی با شما ارتباط می‌گیرند." },
    { q: "چطور وضعیت سفارش خودم را پیگیری کنم؟", a: "از بخش پیگیری سفارش یا پنل کاربری می‌توانید سفارش‌ها و آخرین وضعیت آن‌ها را مشاهده کنید." },
    { q: "اگر هنگام تکمیل فرم یا ارسال مدارک مشکل داشته باشم چه کار کنم؟", a: "از پشتیبانی آنلاین استفاده کنید تا اپراتور توسن راهنمایی‌تان کند. همچنین می‌توانید از مسیرهای ارتباطی درج‌شده در پایین صفحه با ما تماس بگیرید." },
    { q: "آیا اطلاعات و مدارک من نزد توسن محفوظ می‌ماند؟", a: "اطلاعات سفارش برای انجام خدمت و پیگیری آن استفاده می‌شود و دسترسی به بخش‌های مدیریتی و داده‌های حساس با کنترل‌های دسترسی سامانه محدود شده است." },
];

export default function FaqSection() {
    const [open, setOpen] = useState(0);

    return (
        <section id="faq" className="relative scroll-mt-28 py-20 sm:py-24" dir="rtl">
            <div className="mx-auto max-w-5xl px-6 lg:px-8">
                <SectionHeader title="سوالات متداول" description="پاسخ پرسش‌هایی که بیشتر درباره ثبت و پیگیری خدمات توسن مطرح می‌شود." align="center" />
                <div className="mt-10 space-y-3">
                    {faqs.map((item, index) => {
                        const isOpen = open === index;
                        return (
                            <GlassPanel key={item.q} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90">
                                <button type="button" onClick={() => setOpen(isOpen ? -1 : index)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-right">
                                    <span className="flex items-center gap-3 font-black text-[var(--text)]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><HelpCircle size={18} /></span>{item.q}</span>
                                    <ChevronDown size={20} className={`shrink-0 text-[var(--primary)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                </button>
                                {isOpen && <div className="border-t border-[var(--border)] px-5 pb-5 pt-4 leading-8 text-[var(--text-muted)]">{item.a}</div>}
                            </GlassPanel>
                        );
                    })}
                </div>
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) }) }} />
            </div>
        </section>
    );
}
