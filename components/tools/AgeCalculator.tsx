"use client";

import { useMemo, useState } from "react";

type CalendarMode = "jalali" | "gregorian";
type JDate = { jy: number; jm: number; jd: number };
type GDate = { gy: number; gm: number; gd: number };
type AgeResult = {
  age: { years: number; months: number; days: number; totalDays: number };
  birthdayJ: JDate;
  birthdayDays: number;
};
type InvalidResult = { invalid: "future" };

const toAscii = (value: string) => value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const formatFa = (value: number) => String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

function div(a: number, b: number) { return Math.floor(a / b); }
function jalaliToGregorian(jy: number, jm: number, jd: number): GDate {
  let jy2 = jy + 1595;
  let days = -355668 + 365 * jy2 + div(jy2 + 3, 4) - div(jy2 + 99, 100) + div(jy2 + 399, 400) + jd;
  days += jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186;
  let gy = 400 * div(days, 146097); days %= 146097;
  if (days > 36524) { gy += 100 * div(--days, 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * div(days, 1461); days %= 1461;
  if (days > 365) { gy += div(days - 1, 365); days = (days - 1) % 365; }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (gm <= 12 && gd > monthDays[gm]) { gd -= monthDays[gm]; gm++; }
  return { gy, gm, gd };
}
function gregorianToJalali(gy: number, gm: number, gd: number): JDate {
  const gdm = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gy2 = gy - 1600, gm2 = gm - 1, gd2 = gd - 1;
  let days = 365 * gy2 + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400);
  for (let i = 0; i < gm2; i++) days += gdm[i + 1];
  if (gm2 > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) days++;
  days += gd2;
  let jy = -1595 + 33 * div(days, 12053); days %= 12053;
  jy += 4 * div(days, 1461); days %= 1461;
  if (days > 365) { jy += div(days - 1, 365); days = (days - 1) % 365; }
  const jd = days + 1;
  const jm = jd <= 186 ? div(jd - 1, 31) + 1 : div(jd - 187, 30) + 7;
  const day = jd <= 186 ? ((jd - 1) % 31) + 1 : ((jd - 187) % 30) + 1;
  return { jy, jm, jd: day };
}
function parseJalali(value: string): JDate | null {
  const m = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const jy = Number(m[1]), jm = Number(m[2]), jd = Number(m[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : jm <= 11 ? 30 : 30)) return null;
  const g = jalaliToGregorian(jy, jm, jd);
  const roundTrip = gregorianToJalali(g.gy, g.gm, g.gd);
  return roundTrip.jy === jy && roundTrip.jm === jm && roundTrip.jd === jd ? { jy, jm, jd } : null;
}
function parseGregorian(value: string): GDate | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const gy = Number(m[1]), gm = Number(m[2]), gd = Number(m[3]);
  const d = new Date(Date.UTC(gy, gm - 1, gd));
  return d.getUTCFullYear() === gy && d.getUTCMonth() === gm - 1 && d.getUTCDate() === gd ? { gy, gm, gd } : null;
}
function daysBetween(a: GDate, b: GDate) {
  return Math.round((Date.UTC(b.gy, b.gm - 1, b.gd) - Date.UTC(a.gy, a.gm - 1, a.gd)) / 86400000);
}
function formatJalali(j: JDate) { return `${formatFa(j.jy)}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`; }

export default function AgeCalculator() {
  const today = useMemo(() => new Date(), []);
  const todayG: GDate = { gy: today.getFullYear(), gm: today.getMonth() + 1, gd: today.getDate() };
  const todayJ = useMemo(() => gregorianToJalali(todayG.gy, todayG.gm, todayG.gd), [todayG.gy, todayG.gm, todayG.gd]);
  const [calendar, setCalendar] = useState<CalendarMode>("jalali");
  const [birth, setBirth] = useState("");

  const result = useMemo<AgeResult | InvalidResult | null>(() => {
    const parsed = calendar === "jalali" ? parseJalali(birth) : parseGregorian(birth);
    if (!parsed) return null;
    const g = calendar === "jalali" ? jalaliToGregorian(parsed.jy, parsed.jm, parsed.jd) : parsed;
    const totalDays = daysBetween(g, todayG);
    if (totalDays < 0) return { invalid: "future" };

    let years = todayG.gy - g.gy;
    let months = todayG.gm - g.gm;
    let days = todayG.gd - g.gd;
    if (days < 0) { months--; const prev = new Date(Date.UTC(todayG.gy, todayG.gm - 1, 0)); days += prev.getUTCDate(); }
    if (months < 0) { years--; months += 12; }

    const birthJ = gregorianToJalali(g.gy, g.gm, g.gd);
    let nextBirthdayJ: JDate = { jy: todayJ.jy, jm: birthJ.jm, jd: birthJ.jd };
    let nextG = jalaliToGregorian(nextBirthdayJ.jy, nextBirthdayJ.jm, nextBirthdayJ.jd);
    if (daysBetween(todayG, nextG) < 0) {
      nextBirthdayJ = { jy: todayJ.jy + 1, jm: birthJ.jm, jd: birthJ.jd };
      nextG = jalaliToGregorian(nextBirthdayJ.jy, nextBirthdayJ.jm, nextBirthdayJ.jd);
    }
    return { age: { years, months, days, totalDays }, birthdayJ: nextBirthdayJ, birthdayDays: daysBetween(todayG, nextG) };
  }, [birth, calendar, todayG.gy, todayG.gm, todayG.gd, todayJ.jy, todayJ.jm, todayJ.jd]);

  const setCalendarMode = (mode: CalendarMode) => {
    if (birth) {
      if (mode === "jalali") {
        const parsedG = parseGregorian(birth);
        if (parsedG) { const j = gregorianToJalali(parsedG.gy, parsedG.gm, parsedG.gd); setBirth(`${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`); }
      } else {
        const parsedJ = parseJalali(birth);
        if (parsedJ) { const g = jalaliToGregorian(parsedJ.jy, parsedJ.jm, parsedJ.jd); setBirth(`${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`); }
      }
    }
    setCalendar(mode);
  };

  return <section className="mx-auto max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
    <div className="flex rounded-2xl border border-[var(--border)] p-1" role="tablist" aria-label="نوع تقویم">
      {([['jalali', 'شمسی / Jalali'], ['gregorian', 'میلادی / Gregorian']] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={calendar === key} onClick={() => setCalendarMode(key)} className={`flex-1 rounded-xl px-3 py-3 text-sm font-black transition ${calendar === key ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)]'}`}>{label}</button>)}
    </div>
    <label className="mt-6 block text-sm font-black">تاریخ تولد <span className="text-xs font-semibold text-[var(--text-muted)]">({calendar === "jalali" ? "YYYY/MM/DD" : "YYYY-MM-DD"})</span>
      {calendar === "jalali" ? <input dir="ltr" inputMode="numeric" placeholder="1378/05/20" value={birth} onChange={(e) => setBirth(toAscii(e.target.value).replace(/[^0-9/]/g, ""))} className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-4 text-center text-lg tracking-wider outline-none focus:ring-2 focus:ring-[var(--primary)]" /> : <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-[var(--primary)]" />}
    </label>
    {birth && result && !('age' in result) && result.invalid === "future" && <div className="mt-6 rounded-2xl bg-red-500/10 p-5 text-center text-sm font-bold text-red-600">تاریخ تولد نمی‌تواند در آینده باشد.</div>}
    {birth && !result && <div className="mt-6 rounded-2xl bg-[var(--surface-secondary)] p-5 text-center text-sm text-[var(--text-muted)]">فرمت یا تاریخ واردشده معتبر نیست؛ مثال: {calendar === "jalali" ? "1378/05/20" : "2000-08-10"}</div>}
    {result && "age" in result && <div className="mt-7 space-y-4">
      <div className="rounded-2xl bg-[var(--primary)]/10 p-6 text-center"><div className="text-sm font-bold text-[var(--text-muted)]">سن دقیق شما</div><div className="mt-3 text-3xl font-black text-[var(--primary)] md:text-4xl">{formatFa(result.age.years)} سال، {formatFa(result.age.months)} ماه و {formatFa(result.age.days)} روز</div><div className="mt-3 text-xs text-[var(--text-muted)]">امروز: {formatJalali(todayJ)}</div></div>
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[var(--border)] p-4 text-center"><div className="text-xs text-[var(--text-muted)]">مجموع روزهای سپری‌شده</div><div className="mt-2 text-xl font-black">{formatFa(result.age.totalDays)} روز</div></div><div className="rounded-2xl border border-[var(--border)] p-4 text-center"><div className="text-xs text-[var(--text-muted)]">تولد بعدی</div><div className="mt-2 text-xl font-black">{formatJalali(result.birthdayJ)}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{formatFa(result.birthdayDays)} روز دیگر</div></div></div>
    </div>}
    <button type="button" onClick={() => setBirth("")} className="mt-5 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold">پاک کردن</button>
    <div className="mt-6 text-xs leading-6 text-[var(--text-muted)]">این ابزار برای محاسبه روزمره سن است و جایگزین محاسبات رسمی سامانه‌های دولتی یا مدارک هویتی نیست. تاریخ تولد فقط در مرورگر شما پردازش می‌شود.</div>
  </section>;
}
