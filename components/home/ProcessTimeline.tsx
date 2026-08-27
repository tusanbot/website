"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/ui";

const steps = [
  { icon: "🛍️", title: "انتخاب خدمت", description: "کاربر خدمت موردنظر را انتخاب می‌کند.", scene: "انتخاب خدمت" },
  { icon: "📝", title: "تکمیل فرم", description: "فرم را تکمیل و مدارک لازم را ارسال می‌کند.", scene: "تکمیل فرم" },
  { icon: "💳", title: "پرداخت", description: "هزینه خدمت به‌صورت آنلاین پرداخت می‌شود.", scene: "پرداخت" },
  { icon: "🔍", title: "بررسی و تأیید", description: "سفارش توسط کارشناسان توسن بررسی و تأیید می‌شود.", scene: "بررسی مدیر" },
  { icon: "✅", title: "تکمیل و تحویل", description: "خدمت انجام شده و نتیجه نهایی تحویل می‌شود.", scene: "تکمیل سفارش" },
];

export default function ProcessTimeline() {
  return (
    <section id="order-process" className="relative scroll-mt-28 overflow-hidden py-10 md:py-12" dir="rtl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader title="روند انجام سفارش" description="یک مسیر واقعی و ساده از انتخاب خدمت تا تکمیل سفارش." align="center" />
        <div className="mt-8 hidden md:block">
          <div className="relative rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/70 p-6 shadow-sm">
            <div className="absolute right-[10%] left-[10%] top-[78px] h-1 rounded-full bg-[var(--border)]" />
            <motion.div initial={{ width: 0 }} whileInView={{ width: "80%" }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 2, ease: "easeInOut" }} className="absolute right-[10%] top-[78px] h-1 origin-right rounded-full bg-[var(--primary)]" />
            <div className="grid grid-cols-5 gap-3">
              {steps.map((step, index) => (
                <motion.div key={step.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: index * 0.16, duration: 0.45 }} className="relative text-center">
                  <motion.div initial={{ scale: 0.7 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.16 + 0.1, type: "spring" }} className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-2xl shadow-md">{step.icon}</motion.div>
                  <div className="mt-4 text-xs font-bold text-[var(--primary)]">مرحله {(index + 1).toLocaleString("fa-IR")}</div>
                  <h3 className="mt-1 font-black text-[var(--text)]">{step.title}</h3>
                  <p className="mx-auto mt-2 max-w-[190px] text-xs leading-6 text-[var(--text-muted)]">{step.description}</p>
                  <motion.div initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.16 + 0.25 }} className="mx-auto mt-3 inline-flex rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-2.5 py-1 text-[10px] text-[var(--primary)]">{step.scene}</motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 md:hidden">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/70 p-4">
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
              {steps.map((step, index) => (
                <motion.div key={step.title} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.35 }} className="min-w-[78%] snap-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">{step.icon}</div>
                  <div className="mt-3 text-xs font-bold text-[var(--primary)]">مرحله {(index + 1).toLocaleString("fa-IR")}</div>
                  <h3 className="mt-1 font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{step.description}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-2 text-center text-[10px] text-[var(--text-muted)]">برای دیدن مرحله بعد، افقی بکشید ←</div>
          </div>
        </div>
      </div>
    </section>
  );
}
