"use client";

import { useState } from "react";
import { Instagram, MessageCircle, Phone, Send, X } from "lucide-react";

const channels = [
  { label: "تماس تلفنی", href: "tel:09940838154", icon: Phone },
  { label: "تلگرام", href: "https://t.me/Tusan_admin", icon: Send },
  { label: "ایتا", href: "https://eitaa.com/tusan_c", icon: MessageCircle },
  { label: "روبیکا", href: "https://rubika.ir/tusan_c", icon: MessageCircle },
  { label: "اینستاگرام", href: "https://www.instagram.com/tusan_c/", icon: Instagram },
  { label: "پشتیبانی آنلاین", href: "/messages", icon: MessageCircle },
] as const;

export default function PriceInquiryDialog({ serviceTitle }: { serviceTitle: string }) {
  const [open, setOpen] = useState(false);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="font-black text-[var(--primary)] hover:underline" aria-label={`استعلام قیمت ${serviceTitle}`}>استعلام قیمت</button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="price-inquiry-title" onMouseDown={e => { if (e.currentTarget === e.target) setOpen(false); }}>
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl" dir="rtl">
        <div className="flex items-start justify-between gap-3"><div><h2 id="price-inquiry-title" className="text-lg font-black">استعلام قیمت</h2><p className="mt-1 text-sm text-[var(--text-muted)]">برای «{serviceTitle}» از یکی از راه‌های زیر با ما در ارتباط باشید.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-secondary)]" aria-label="بستن"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 grid grid-cols-2 gap-2">{channels.map(({ label, href, icon: Icon }) => <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-3 text-sm font-bold transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"><Icon className="h-5 w-5 shrink-0" />{label}</a>)}</div>
      </div>
    </div>}
  </>;
}
