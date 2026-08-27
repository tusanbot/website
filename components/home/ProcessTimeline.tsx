"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/ui";

const steps = [
  { icon: "📝", title: "انتخاب خدمت", description: "خدمت موردنظر را انتخاب و وارد فرم سفارش شوید." },
  { icon: "📤", title: "ثبت اطلاعات", description: "اطلاعات و مدارک موردنیاز را آنلاین ارسال کنید." },
  { icon: "🔍", title: "بررسی توسن", description: "کارشناسان اطلاعات را بررسی می‌کنند." },
  { icon: "⚙️", title: "انجام خدمت", description: "خدمت با دقت انجام و وضعیت آن قابل پیگیری است." },
  { icon: "✅", title: "تحویل نهایی", description: "نتیجه نهایی از طریق پنل یا روش توافق‌شده تحویل می‌شود." },
];

export default function ProcessTimeline() {
  return (
    <section id="order-process" className="relative scroll-mt-28 overflow-hidden py-10 md:py-12" dir="rtl">
      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <SectionHeader title="روند انجام سفارش" description="از انتخاب خدمت تا تحویل نهایی، مراحل به‌صورت آنلاین و قابل پیگیری انجام می‌شود." align="center" />
        <div className="relative mt-8">
          <div className="absolute right-5 top-5 h-[calc(100%-2.5rem)] w-px bg-[var(--border)] md:left-1/2 md:right-auto md:-translate-x-1/2" />
          <motion.div initial={{ height: 0 }} whileInView={{ height: "100%" }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 1.1, ease: "easeOut" }} className="absolute right-5 top-5 w-px bg-[var(--primary)] md:left-1/2 md:right-auto md:-translate-x-1/2" />
          <div className="space-y-4">
            {steps.map((step, index) => {
              const left = index % 2 === 0;
              return (
                <motion.div key={step.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.35, delay: index * 0.05 }} className="relative grid md:grid-cols-2 md:gap-10">
                  <div className="absolute right-[9px] top-5 md:left-1/2 md:right-auto md:-translate-x-1/2"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface)] ring-4 ring-[var(--background)]"><div className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" /></div></div>
                  <div className={`pr-12 md:pr-0 ${left ? "md:col-start-1" : "md:col-start-1 md:opacity-0"}`}>{left && <TimelineCard step={step} index={index} />}</div>
                  <div className={`pr-12 md:pr-0 ${left ? "md:col-start-2 md:opacity-0" : "md:col-start-2"}`}>{!left && <TimelineCard step={step} index={index} />}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineCard({ step, index }: { step: (typeof steps)[number]; index: number }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-xl">{step.icon}</div><div className="min-w-0"><div className="text-[11px] font-bold text-[var(--primary)]">مرحله {(index + 1).toLocaleString("fa-IR")}</div><h3 className="font-black text-[var(--text)]">{step.title}</h3></div></div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{step.description}</p>
    </motion.div>
  );
}
