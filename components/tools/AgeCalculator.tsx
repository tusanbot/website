"use client";

import { useMemo, useState } from "react";

function diffAge(birth: Date, now: Date) {
  if (birth > now) return null;
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) { months--; const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0); days += previousMonth.getDate(); }
  if (months < 0) { years--; months += 12; }
  return { years, months, days };
}

export default function AgeCalculator() {
  const [birth, setBirth] = useState("");
  const result = useMemo(() => birth ? diffAge(new Date(`${birth}T00:00:00`), new Date()) : null, [birth]);
  return <section className="mx-auto max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7"><label className="block text-sm font-black">تاریخ تولد <span className="text-xs font-semibold text-[var(--text-muted)]">(Age Calculator)</span><input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className="mt-3 w-full rounded-2xl border bg-transparent px-4 py-4 text-lg"/></label>{result ? <div className="mt-7 rounded-2xl bg-[var(--primary)]/10 p-6 text-center"><div className="text-sm font-bold text-[var(--text-muted)]">سن فعلی شما</div><div className="mt-3 text-4xl font-black text-[var(--primary)]">{result.years} سال، {result.months} ماه و {result.days} روز</div><div className="mt-3 text-xs text-[var(--text-muted)]">محاسبه بر اساس تاریخ امروز دستگاه شما انجام می‌شود.</div></div> : <div className="mt-7 rounded-2xl bg-[var(--surface-secondary)] p-5 text-center text-sm text-[var(--text-muted)]">تاریخ تولد را انتخاب کنید تا سن دقیق نمایش داده شود.</div>}<button type="button" onClick={() => setBirth("")} className="mt-4 rounded-xl border px-4 py-2.5 text-sm font-bold">پاک کردن</button><div className="mt-6 text-xs leading-6 text-[var(--text-muted)]">این ابزار برای محاسبه روزمره سن است و جایگزین محاسبات رسمی سامانه‌های دولتی یا مدارک هویتی نیست.</div></section>;
}
