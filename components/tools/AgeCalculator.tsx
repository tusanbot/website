"use client";

import { useMemo, useState } from "react";

type JDate = { jy: number; jm: number; jd: number };
type GDate = { gy: number; gm: number; gd: number };
type AgeResult = {
  age: { years: number; months: number; days: number; totalDays: number };
  birthdayG: GDate;
  birthdayJ: JDate;
  birthdayDays: number;
};
type InvalidResult = { invalid: "future" };

function div(a: number, b: number) { return Math.floor(a / b); }

function jalaliToGregorian(jy: number, jm: number, jd: number): GDate {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2274, 2293, 2348, 2382, 2394, 2436, 2466, 2497, 2497, 3178];
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;
  for (let i = 1; i < breaks.length; i++) {
    const jmBreak = breaks[i];
    jump = jmBreak - jp;
    if (jy < jmBreak) break;
    leapJ += div(jump, 33) * 8 + div((jump % 33), 4);
    jp = jmBreak;
  }
  const n = jy - jp;
  leapJ += div(n, 33) * 8 + div((n % 33 + 3), 4);
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  const days = (jm <= 6 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) + jd - 1;
  let gDay = march + days;
  let gYear = gy;
  const monthLengths = [31, 28 + ((gYear % 4 === 0 && gYear % 100 !== 0) || gYear % 400 === 0 ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 3;
  while (gDay > monthLengths[gm - 1]) { gDay -= monthLengths[gm - 1]; gm++; if (gm > 12) { gYear++; gm = 1; } }
  return { gy: gYear, gm, gd: gDay };
}

function gregorianToJalali(gy: number, gm: number, gd: number): JDate {
  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const jDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  let gy2 = gy - 1600;
  const gm2 = gm - 1;
  const gd2 = gd - 1;
  let gDayNo = 365 * gy2 + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400);
  for (let i = 0; i < gm2; ++i) gDayNo += gDaysInMonth[i];
  if (gm2 > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) gDayNo++;
  gDayNo += gd2;
  let jDayNo = gDayNo - 79;
  const jNp = div(jDayNo, 12053);
  jDayNo %= 12053;
  let jy = 979 + 33 * jNp + 4 * div(jDayNo, 1461);
  jDayNo %= 1461;
  if (jDayNo >= 366) { jy += div(jDayNo - 1, 365); jDayNo = (jDayNo - 1) % 365; }
  let jm = 0;
  while (jm < 11 && jDayNo >= jDaysInMonth[jm]) { jDayNo -= jDaysInMonth[jm]; jm++; }
  return { jy, jm: jm + 1, jd: jDayNo + 1 };
}

function toUtcDate(g: GDate) { return new Date(Date.UTC(g.gy, g.gm - 1, g.gd)); }
function formatFa(value: number) { return value.toLocaleString("fa-IR"); }
function formatJalali(date: JDate) { return `${formatFa(date.jy)}/${String(date.jm).padStart(2, "0")}/${String(date.jd).padStart(2, "0")}`; }
function toAscii(value: string) { return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))); }

function parseJalali(value: string): JDate | null {
  const m = toAscii(value).trim().replace(/-/g, "/").match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
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
  if (d.getUTCFullYear() !== gy || d.getUTCMonth() !== gm - 1 || d.getUTCDate() !== gd) return null;
  return { gy, gm, gd };
}

function diffAge(birth: Date, now: Date) {
  if (birth > now) return null;
  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  let months = now.getUTCMonth() - birth.getUTCMonth();
  let days = now.getUTCDate() - birth.getUTCDate();
  if (days < 0) { months--; const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)); days += previousMonth.getUTCDate(); }
  if (months < 0) { years--; months += 12; }
  return { years, months, days, totalDays: Math.floor((now.getTime() - birth.getTime()) / 86400000) };
}

function nextBirthday(birth: Date, now: Date) {
  let year = now.getUTCFullYear();
  let candidate = new Date(Date.UTC(year, birth.getUTCMonth(), birth.getUTCDate()));
  if (candidate < now) { year++; candidate = new Date(Date.UTC(year, birth.getUTCMonth(), birth.getUTCDate())); }
  return { date: candidate, days: Math.ceil((candidate.getTime() - now.getTime()) / 86400000) };
}

export default function AgeCalculator() {
  const [calendar, setCalendar] = useState<"jalali" | "gregorian">("jalali");
  const [birth, setBirth] = useState("");
  const today = useMemo(() => new Date(), []);
  const todayJ = useMemo(() => gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate()), [today]);

  const result = useMemo<AgeResult | InvalidResult | null>(() => {
    let g: GDate | null = null;

    if (calendar === "jalali") {
      const parsedJ = parseJalali(birth);
      if (!parsedJ) return null;
      g = jalaliToGregorian(parsedJ.jy, parsedJ.jm, parsedJ.jd);
    } else {
      g = parseGregorian(birth);
      if (!g) return null;
    }

    const birthDate = toUtcDate(g);
    const now = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const age = diffAge(birthDate, now);
    if (!age) return { invalid: "future" };

    const birthday = nextBirthday(birthDate, now);
    const birthdayG: GDate = {
      gy: birthday.date.getUTCFullYear(),
      gm: birthday.date.getUTCMonth() + 1,
      gd: birthday.date.getUTCDate(),
    };

    return { age, birthdayG, birthdayJ: gregorianToJalali(birthdayG.gy, birthdayG.gm, birthdayG.gd), birthdayDays: birthday.days };
  }, [birth, calendar, today]);

  const setCalendarMode = (mode: "jalali" | "gregorian") => {
    if (mode === calendar) return;
    if (birth) {
      if (calendar === "jalali") {
        const parsedJ = parseJalali(birth);
        if (parsedJ) {
          const g = jalaliToGregorian(parsedJ.jy, parsedJ.jm, parsedJ.jd);
          if (mode === "gregorian") setBirth(`${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`);
        }
      } else {
        const parsedG = parseGregorian(birth);
        if (parsedG) {
          const j = gregorianToJalali(parsedG.gy, parsedG.gm, parsedG.gd);
          if (mode === "jalali") setBirth(`${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`);
        }
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

    {birth && result?.invalid === "future" && <div className="mt-6 rounded-2xl bg-red-500/10 p-5 text-center text-sm font-bold text-red-600">تاریخ تولد نمی‌تواند در آینده باشد.</div>}
    {birth && !result && <div className="mt-6 rounded-2xl bg-[var(--surface-secondary)] p-5 text-center text-sm text-[var(--text-muted)]">فرمت یا تاریخ واردشده معتبر نیست؛ مثال: {calendar === "jalali" ? "1378/05/20" : "2000-08-10"}</div>}
    {result && "age" in result && <div className="mt-7 space-y-4">
      <div className="rounded-2xl bg-[var(--primary)]/10 p-6 text-center"><div className="text-sm font-bold text-[var(--text-muted)]">سن دقیق شما</div><div className="mt-3 text-3xl font-black text-[var(--primary)] md:text-4xl">{formatFa(result.age.years)} سال، {formatFa(result.age.months)} ماه و {formatFa(result.age.days)} روز</div><div className="mt-3 text-xs text-[var(--text-muted)]">امروز: {formatJalali(todayJ)}</div></div>
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[var(--border)] p-4 text-center"><div className="text-xs text-[var(--text-muted)]">مجموع روزهای سپری‌شده</div><div className="mt-2 text-xl font-black">{formatFa(result.age.totalDays)} روز</div></div><div className="rounded-2xl border border-[var(--border)] p-4 text-center"><div className="text-xs text-[var(--text-muted)]">تولد بعدی</div><div className="mt-2 text-xl font-black">{formatJalali(result.birthdayJ)}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{formatFa(result.birthdayDays)} روز دیگر</div></div></div>
    </div>}

    <button type="button" onClick={() => setBirth("")} className="mt-5 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold">پاک کردن</button>
    <div className="mt-6 text-xs leading-6 text-[var(--text-muted)]">این ابزار برای محاسبه روزمره سن است و جایگزین محاسبات رسمی سامانه‌های دولتی یا مدارک هویتی نیست. تاریخ تولد فقط در مرورگر شما پردازش می‌شود.</div>
  </section>;
}
