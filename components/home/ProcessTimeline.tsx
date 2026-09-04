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
const lineColors = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-violet-500", "bg-rose-500"];

function Demo({ index }: { index: number }) {
  if (index === 0) {
    return <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
      {demoServices.map((service, i) => <motion.div key={service} animate={i === 1 ? { scale: [1, 1.03, 1] } : {}} transition={{ duration: 1, repeat: Infinity }} className={`rounded-xl px-3 py-2.5 text-xs font-bold ${i === 1 ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)]"}`}>{service}{i === 1 && <span className="float-left">✓</span>}</motion.div>)}
    </div>;
  }

  if (index === 1) {
    return <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
      <div className="rounded-xl bg-[var(--surface)] px-3 py-2.5 text-xs">نام مشتری: <b>کاربر توسن</b></div>
      <div className="rounded-xl bg-[var(--surface)] px-3 py-2.5 text-xs">شماره تماس: 09•••••••••</div>
      <motion.div animate={{ width: ["20%", "100%"] }} transition={{ duration: 2, repeat: Infinity }} className="h-2 rounded-full bg-[var(--primary)]" />
    </div>;
  }

  if (index === 2) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
      <div className="rounded-xl bg-[var(--surface)] px-3 py-2.5 text-xs">مبلغ سفارش: <b>هزینه خدمت</b></div>
      <div className="mt-2 flex gap-2"><motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2.5 text-center text-[10px]">انتخاب درگاه</motion.div><motion.div animate={{ scale: [1, 0.97, 1] }} transition={{ duration: 1.1, repeat: Infinity }} className="flex-1 rounded-xl bg-[var(--primary)] px-2 py-2.5 text-center text-[10px] font-black text-white">پرداخت امن</motion.div></div>
      <div className="mt-2 text-center text-[10px] text-[var(--text-muted)]">✓ پرداخت سفارش</div>
    </div>;
  }

  if (index === 3) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
      <div className="flex items-center gap-2 text-xs">⚙️ در حال انجام خدمت</div>
      <div className="mt-3 flex gap-1.5">{[0, 1, 2, 3].map(i => <motion.span key={i} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 0.9, delay: i * 0.14, repeat: Infinity }} className="h-2 flex-1 rounded-full bg-[var(--primary)]" />)}</div>
    </div>;
  }

  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5 text-center text-xs"><motion.div animate={{ scale: [0.8, 1.12, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>✅</motion.div>خدمت آماده تحویل است</div>;
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

  return <section id="order-process" className="relative scroll-mt-28 py-8 sm:py-12" dir="rtl">
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <SectionHeader title="روند انجام سفارش" description="مراحل ثبت سفارش را یکی‌یکی دنبال کنید." align="center" />

      <div className="mt-6 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
        <div className="grid items-center gap-5 md:grid-cols-[1fr_auto] md:gap-8">
          <div className="min-w-0 md:order-2">
            <div className="relative min-h-[205px] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 sm:min-h-[225px] sm:p-5">
              <div className="absolute right-4 top-4 rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] font-black text-[var(--primary)] shadow-sm">مرحله {String(active + 1).toLocaleString("fa-IR")} از ۵</div>
              <AnimatePresence mode="wait">
                <motion.div key={active} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.98 }} transition={{ duration: reduceMotion ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }} className="pt-8">
                  <Demo index={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center gap-2 md:order-1 md:flex-col md:gap-2.5" aria-label="مراحل ثبت سفارش">
            {steps.map((item, index) => <button key={item.title} type="button" onClick={() => setActive(index)} aria-label={`نمایش مرحله ${item.title}`} aria-current={index === active ? "step" : undefined} className="group flex items-center justify-center rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">
              <span className={`block h-1.5 w-8 rounded-full transition-all duration-300 sm:w-10 md:h-8 md:w-1.5 ${lineColors[index]} ${index === active ? "opacity-100 md:h-10" : "opacity-20 group-hover:opacity-50"}`} />
            </button>)}
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--border)] pt-5 text-right">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">{step.icon}</div><div><div className="text-xs font-bold text-[var(--text-muted)]">مرحله {String(active + 1).toLocaleString("fa-IR")}</div><h3 className="mt-0.5 text-lg font-black sm:text-xl">{step.title}</h3></div></div>
          <p className="mt-3 text-sm leading-8 text-[var(--text-muted)] sm:text-base">{step.description}</p>
        </div>
      </div>
    </div>
  </section>;
}
