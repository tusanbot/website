"use client";

import { useEffect, useState } from "react";

const steps = [
  { title: "انتخاب خدمت", text: "خدمت موردنظر را انتخاب می‌کنید.", icon: "🛍️" },
  { title: "تکمیل اطلاعات", text: "فرم را با اطلاعات لازم تکمیل می‌کنید.", icon: "📝" },
  { title: "پرداخت آنلاین", text: "در صورت نیاز، هزینه را آنلاین پرداخت می‌کنید.", icon: "💳" },
  { title: "ثبت نهایی سفارش", text: "سفارش با موفقیت ثبت و برای انجام ارسال می‌شود.", icon: "✅" },
  { title: "تکمیل و تحویل", text: "سفارش انجام شده و نتیجه به شما تحویل می‌شود.", icon: "📦" },
];

export default function OrderProcessShowcase() {
  const [active, setActive] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setActive((value) => (value + 1) % steps.length), 4200); return () => window.clearInterval(timer); }, []);
  const step = steps[active];
  return <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-sm" aria-label="روند ثبت سفارش در پنج مرحله">
    <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6"><div className="text-xs font-bold text-[var(--primary)]">ساده و سریع</div><h2 className="mt-1 text-xl font-black">روند ثبت سفارش در ۵ مرحله ساده</h2></div>
    <div className="p-4 sm:p-6">
      <div className="relative min-h-[205px] overflow-hidden rounded-3xl bg-[var(--surface-muted)] p-5 sm:min-h-[220px] sm:p-7">
        <div className="absolute inset-x-5 top-5 flex justify-between sm:inset-x-8 sm:top-7" aria-hidden="true"><div className="absolute right-0 left-0 top-5 h-1 rounded-full bg-[var(--border)]"/><div className="absolute right-0 top-5 h-1 rounded-full bg-[var(--primary)] transition-all duration-700" style={{ width: `${active * 25}%` }}/>{steps.map((item, index) => <button key={item.title} type="button" onClick={() => setActive(index)} aria-label={`مرحله ${index + 1}: ${item.title}`} className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 text-base transition-all duration-500 ${index === active ? "scale-125 border-[var(--primary)] bg-[var(--surface)] shadow-lg" : index < active ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--surface)]"}`}>{index < active ? "✓" : index + 1}</button>)}</div>
        <div key={active} className="animate-[fadeIn_.55s_ease-out] pt-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl shadow-sm">{step.icon}</div>
          <h3 className="mt-4 text-lg font-black">{step.title}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">{step.text}</p>
          {active === 2 && <div className="mx-auto mt-3 flex max-w-xs items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold"><span>••••</span><span>••••</span><span>••••</span><span>••••</span><span>🔒</span></div>}
          {active === 3 && <div className="mx-auto mt-3 inline-flex rounded-full bg-[var(--primary)]/10 px-4 py-2 text-xs font-black text-[var(--primary)]">سفارش شما با موفقیت ثبت شد 🎉</div>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1.5">{steps.map((item, index) => <button key={item.title} type="button" onClick={() => setActive(index)} className={`rounded-xl px-1 py-2 text-[10px] font-bold transition sm:text-xs ${index === active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text)]"}`}>{item.title}</button>)}</div>
    </div>
  </section>;
}
