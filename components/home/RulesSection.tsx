"use client";

import { useState } from "react";
import { ChevronDown, FileText, ShieldCheck, Scale, UserCheck } from "lucide-react";
import { SectionHeader } from "@/components/ui";

const rules = [
  { icon: FileText, title: "اطلاعات صحیح", text: "مسئولیت صحت اطلاعات و مدارک ارسالی با صاحب سفارش است." },
  { icon: ShieldCheck, title: "امنیت اطلاعات", text: "اطلاعات سفارش فقط برای ارائه و پیگیری خدمت استفاده می‌شود." },
  { icon: UserCheck, title: "احراز هویت", text: "در خدمات نیازمند احراز هویت، اطلاعات باید متعلق به درخواست‌کننده باشد." },
  { icon: Scale, title: "شرایط هر خدمت", text: "هزینه، زمان، مدارک و شرایط هر خدمت را پیش از سفارش بررسی کنید." },
];

export default function RulesSection() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section id="rules" className="relative scroll-mt-28 py-8 md:py-10" dir="rtl">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls="tusan-rules-list" className="group mx-auto flex w-full max-w-2xl flex-col items-center rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 px-5 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40">
          <span className="flex items-center gap-2 text-lg font-black text-[var(--text)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><FileText size={18} /></span>قوانین و مقررات</span>
          <span className="mt-1 text-xs text-[var(--text-muted)]">برای مشاهده قوانین و شرایط سفارش روی این بخش بزنید</span>
          <span className="mt-2 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--primary)]/25 text-[var(--primary)] transition-transform duration-300 group-hover:scale-110"><ChevronDown size={16} className={expanded ? "rotate-180" : "animate-bounce"} /></span>
        </button>

        <div id="tusan-rules-list" className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-out ${expanded ? "mt-5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {rules.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4">
                  <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Icon size={19} /></div><h3 className="font-black text-[var(--text)]">{title}</h3></div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary)]/5 px-4 py-3 text-center text-sm leading-6 text-[var(--text-muted)]">ثبت سفارش به منزله مطالعه و پذیرش قوانین اختصاصی همان خدمت و شرایط اعلام‌شده در فرآیند سفارش است.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
