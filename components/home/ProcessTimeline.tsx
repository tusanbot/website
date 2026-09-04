"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SectionHeader } from "@/components/ui";

const steps = [
  { icon: "📝", title: "انتخاب خدمت", description: "خدمت موردنظر را از فهرست انتخاب کنید." },
  { icon: "📋", title: "تکمیل فرم", description: "اطلاعات لازم را در فرم کوتاه وارد کنید." },
  { icon: "💳", title: "پرداخت", description: "هزینه سفارش را از طریق درگاه امن پرداخت کنید." },
  { icon: "⚙️", title: "انجام خدمت", description: "کارشناس مراحل انجام خدمت را پیگیری می‌کند." },
  { icon: "✅", title: "تحویل", description: "نتیجه آماده و در اختیار شما قرار می‌گیرد." },
];

const demoServices = ["ثبت‌نام خودرو", "استعلام بیمه", "خدمات تأمین اجتماعی"];
const indicatorColor = "bg-[var(--border)]";
const activeIndicatorColor = "bg-[var(--primary)]";

function Demo({ index }: { index: number }) {
  if (index === 0) {
    return <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5 sm:p-7">
      {demoServices.map((service, i) => (
        <motion.div key={service} animate={i === 1 ? { scale: [1, 1.025, 1] } : {}} transition={{ duration: 1.2, repeat: Infinity }} className={`rounded-2xl px-5 py-4 text-sm font-bold sm:text-base ${i === 1 ? "bg-[var(--primary)] text-white shadow-md" : "bg-[var(--surface)]"}`}>
          {service}{i === 1 && <span className="float-left">✓</span>}
        </motion.div>
      ))}
    </div>;
  }

  if (index === 1) {
    return <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5 sm:p-7">
      <div className="rounded-2xl bg-[var(--surface)] px-5 py-4 text-sm">اطلاعات سفارش: <b>فرم خدمت</b></div>
      <div className="rounded-2xl bg-[var(--surface)] px-5 py-4 text-sm">شماره تماس: 09•••••••••</div>
      <motion.div animate={{ width: ["20%", "100%"] }} transition={{ duration: 2, repeat: Infinity }} className="h-2.5 rounded-full bg-[var(--primary)]" />
    </div>;
  }

  if (index === 2) {
    return <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5 sm:p-7">
      <div className="rounded-2xl bg-[var(--surface)] px-5 py-4 text-sm">مبلغ سفارش: <b>هزینه خدمت</b></div>
      <div className="mt-4 flex gap-3">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }} className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-4 text-center text-xs sm:text-sm">انتخاب درگاه</motion.div>
        <motion.div animate={{ scale: [1, 0.97, 1] }} transition={{ duration: 1.1, repeat: Infinity }} className="flex-1 rounded-2xl bg-[var(--primary)] px-3 py-4 text-center text-xs font-black text-white sm:text-sm">پرداخت امن</motion.div>
      </div>
      <div className="mt-4 text-center text-xs text-[var(--text-muted)]">✓ پرداخت سفارش</div>
    </div>;
  }

  if (index === 3) {
    return <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)] p-6 sm:p-8">
      <div className="flex items-center gap-3 text-sm font-bold sm:text-base">⚙️ در حال انجام خدمت</div>
      <div className="mt-6 flex gap-2">{[0, 1, 2, 3].map(i => <motion.span key={i} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 0.9, delay: i * 0.14, repeat: Infinity }} className="h-2.5 flex-1 rounded-full bg-[var(--primary)]" />)}</div>
    </div>;
  }

  return <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)] p-8 text-center text-sm sm:text-base">
    <motion.div animate={{ scale: [0.8, 1.12, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-5xl">✅</motion.div>
    <div className="mt-4 font-bold">خدمت آماده تحویل است</div>
  </div>;
}

export default function ProcessTimeline() {
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setActive(index => (index + 1) % steps.length), 4200);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  const step = steps[active];
  const activeStepNumber = (active + 1).toLocaleString("fa-IR");

  return <section id="order-process" className="relative scroll-mt-28 py-8 sm:py-12" dir="rtl">
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <SectionHeader title="روند انجام سفارش" description="مراحل ثبت سفارش را یکی‌یکی دنبال کنید." align="center" />

      <div className="mt-6 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
        <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(230px,0.42fr)] md:gap-7">
          <div className="min-w-0">
            <div className="relative flex min-h-[300px] items-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 sm:min-h-[340px] sm:p-7">
              <div className="absolute right-5 top-5 rounded-full bg-[var(--surface)] px-3.5 py-1.5 text-xs font-black text-[var(--primary)] shadow-sm">مرحله {activeStepNumber} از ۵</div>
              <AnimatePresence mode="wait">
                <motion.div key={active} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -32, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 32, scale: 0.97 }} transition={{ duration: reduceMotion ? 0.15 : 0.55, ease: [0.22, 1, 0.36, 1] }} className="w-full pt-8">
                  <Demo index={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden w-px bg-[var(--border)] md:block" aria-hidden="true" />

          <div className="flex min-w-0 flex-col justify-center gap-6 md:py-5" aria-label="مراحل ثبت سفارش">
            <div className="flex items-center gap-2 md:flex-col md:items-stretch md:gap-3">
              {steps.map((item, index) => (
                <button key={item.title} type="button" onClick={() => setActive(index)} aria-label={`نمایش مرحله ${item.title}`} aria-current={index === active ? "step" : undefined} className="group flex flex-1 items-center justify-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 md:flex-none md:justify-start">
                  <span className={`block h-2 w-full rounded-full transition-all duration-300 md:h-2.5 ${index === active ? activeIndicatorColor : indicatorColor} ${index === active ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`} />
                </button>
              ))}
            </div>

            <div className="text-right">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">{step.icon}</div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-muted)]">مرحله {activeStepNumber}</div>
                  <h3 className="mt-0.5 text-lg font-black sm:text-xl">{step.title}</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-8 text-[var(--text-muted)] sm:text-base">{step.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
