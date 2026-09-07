"use client";

import { useEffect, useMemo, useState } from "react";

type CalendarMode = "jalali" | "gregorian";
type JDate = { jy: number; jm: number; jd: number };
type GDate = { gy: number; gm: number; gd: number };
type AgeResult = {
  age: { years: number; months: number; days: number; totalDays: number };
  birthdayJ: JDate;
  birthdayG: GDate;
  birthdayDays: number;
  birthdayHours: number;
  birthdayMinutes: number;
  birthdaySeconds: number;
  zodiac: { fa: string; en: string; symbol: string };
  weekday: string;
  season: string;
};
type InvalidResult = { invalid: "future" };

const toAscii = (value: string) => value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const formatFa = (value: number) => String(Math.max(0, value)).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const formatJalali = (j: JDate) => `${formatFa(j.jy)}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`;
const pad2 = (value: number) => String(value).padStart(2, "0");

function jalaliToGregorian(jy: number, jm: number, jd: number): GDate {
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric",
  });
  const target = [jy, jm, jd] as const;
  const compare = (g: GDate) => {
    const parts = formatter.formatToParts(new Date(Date.UTC(g.gy, g.gm - 1, g.gd)));
    const values = Object.fromEntries(parts.filter((p) => ["year", "month", "day"].includes(p.type)).map((p) => [p.type, Number(p.value)]));
    const current = [values.year, values.month, values.day];
    for (let i = 0; i < 3; i++) if (current[i] !== target[i]) return current[i] < target[i] ? -1 : 1;
    return 0;
  };
  let low = Date.UTC(jy + 620, 0, 1);
  let high = Date.UTC(jy + 622, 11, 31);
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 86400000) * 86400000;
    const date = new Date(mid);
    const g: GDate = { gy: date.getUTCFullYear(), gm: date.getUTCMonth() + 1, gd: date.getUTCDate() };
    const cmp = compare(g);
    if (cmp === 0) return g;
    if (cmp < 0) low = mid + 86400000; else high = mid - 86400000;
  }
  throw new Error("Invalid Jalali date");
}

function gregorianToJalali(gy: number, gm: number, gd: number): JDate {
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric",
  });
  const parts = formatter.formatToParts(new Date(Date.UTC(gy, gm - 1, gd)));
  const values = Object.fromEntries(parts.filter((p) => ["year", "month", "day"].includes(p.type)).map((p) => [p.type, Number(p.value)]));
  return { jy: values.year, jm: values.month, jd: values.day };
}

function parseJalali(value: string): JDate | null {
  const m = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const jy = Number(m[1]), jm = Number(m[2]), jd = Number(m[3]);
  if (jy < 1 || jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : jm <= 11 ? 30 : 30)) return null;
  try {
    const g = jalaliToGregorian(jy, jm, jd);
    const roundTrip = gregorianToJalali(g.gy, g.gm, g.gd);
    return roundTrip.jy === jy && roundTrip.jm === jm && roundTrip.jd === jd ? { jy, jm, jd } : null;
  } catch { return null; }
}

function parseGregorian(value: string): GDate | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const gy = Number(m[1]), gm = Number(m[2]), gd = Number(m[3]);
  const d = new Date(Date.UTC(gy, gm - 1, gd));
  return d.getUTCFullYear() === gy && d.getUTCMonth() === gm - 1 && d.getUTCDate() === gd ? { gy, gm, gd } : null;
}

function dateTimeUtc(g: GDate, hour = 0, minute = 0, second = 0) { return Date.UTC(g.gy, g.gm - 1, g.gd, hour, minute, second); }
function daysBetween(a: GDate, b: GDate) { return Math.round((dateTimeUtc(b) - dateTimeUtc(a)) / 86400000); }

function zodiacFor(g: GDate) {
  const md = g.gm * 100 + g.gd;
  if (md >= 321 && md <= 419) return { fa: "حَمَل", en: "Aries", symbol: "♈" };
  if (md >= 420 && md <= 520) return { fa: "ثَوْر", en: "Taurus", symbol: "♉" };
  if (md >= 521 && md <= 620) return { fa: "جَوْزَا", en: "Gemini", symbol: "♊" };
  if (md >= 621 && md <= 722) return { fa: "سَرَطَان", en: "Cancer", symbol: "♋" };
  if (md >= 723 && md <= 822) return { fa: "اَسَد", en: "Leo", symbol: "♌" };
  if (md >= 823 && md <= 922) return { fa: "سُنبُله", en: "Virgo", symbol: "♍" };
  if (md >= 923 && md <= 1022) return { fa: "میزان", en: "Libra", symbol: "♎" };
  if (md >= 1023 && md <= 1121) return { fa: "عقرب", en: "Scorpio", symbol: "♏" };
  if (md >= 1122 && md <= 1221) return { fa: "قوس", en: "Sagittarius", symbol: "♐" };
  if (md >= 1222 || md <= 119) return { fa: "جدی", en: "Capricorn", symbol: "♑" };
  if (md >= 120 && md <= 218) return { fa: "دلو", en: "Aquarius", symbol: "♒" };
  return { fa: "حوت", en: "Pisces", symbol: "♓" };
}
function weekdayFor(g: GDate) { return new Intl.DateTimeFormat("fa-IR", { weekday: "long", timeZone: "UTC" }).format(new Date(dateTimeUtc(g))); }
function seasonFor(j: JDate) { if (j.jm <= 3) return "بهار"; if (j.jm <= 6) return "تابستان"; if (j.jm <= 9) return "پاییز"; return "زمستان"; }

export default function AgeCalculator() {
  const [now, setNow] = useState(() => new Date());
  const [calendar, setCalendar] = useState<CalendarMode>("jalali");
  const [birth, setBirth] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const todayG: GDate = { gy: now.getFullYear(), gm: now.getMonth() + 1, gd: now.getDate() };
  const todayJ = useMemo(() => gregorianToJalali(todayG.gy, todayG.gm, todayG.gd), [todayG.gy, todayG.gm, todayG.gd]);
  const currentSecond = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const result = useMemo<AgeResult | InvalidResult | null>(() => {
    let g: GDate | null = null;
    if (calendar === "jalali") {
      const parsedJ = parseJalali(birth);
      if (parsedJ) g = jalaliToGregorian(parsedJ.jy, parsedJ.jm, parsedJ.jd);
    } else {
      const parsedG = parseGregorian(birth);
      if (parsedG) g = parsedG;
    }
    if (!g) return null;
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
    let birthdayDays = daysBetween(todayG, nextG);
    // «تولد بعدی» همیشه باید تولد آینده باشد؛ اگر امروز روز تولد است، سال بعد را نشان می‌دهیم.
    if (birthdayDays <= 0) {
      nextBirthdayJ = { jy: todayJ.jy + 1, jm: birthJ.jm, jd: birthJ.jd };
      nextG = jalaliToGregorian(nextBirthdayJ.jy, nextBirthdayJ.jm, nextBirthdayJ.jd);
      birthdayDays = daysBetween(todayG, nextG);
    }

    const nextBirthdayMs = dateTimeUtc(nextG) - dateTimeUtc(todayG) - currentSecond * 1000;
    const birthdayTotalSeconds = Math.floor(Math.max(0, nextBirthdayMs) / 1000);
    const birthdayDayPart = Math.floor(birthdayTotalSeconds / 86400);
    const birthdayHourPart = Math.floor((birthdayTotalSeconds % 86400) / 3600);
    const birthdayMinutePart = Math.floor((birthdayTotalSeconds % 3600) / 60);
    const birthdaySecondPart = birthdayTotalSeconds % 60;

    return {
      age: { years, months, days, totalDays },
      birthdayJ: nextBirthdayJ,
      birthdayG: nextG,
      birthdayDays: birthdayDayPart,
      birthdayHours: birthdayHourPart,
      birthdayMinutes: birthdayMinutePart,
      birthdaySeconds: birthdaySecondPart,
      zodiac: zodiacFor(g),
      weekday: weekdayFor(g),
      season: seasonFor(birthJ),
    };
  }, [birth, calendar, todayG.gy, todayG.gm, todayG.gd, todayJ.jy, currentSecond]);

  const setCalendarMode = (mode: CalendarMode) => {
    if (birth) {
      if (mode === "jalali") {
        const parsedG = parseGregorian(birth);
        if (parsedG) { const j = gregorianToJalali(parsedG.gy, parsedG.gm, parsedG.gd); setBirth(`${j.jy}/${pad2(j.jm)}/${pad2(j.jd)}`); }
      } else {
        const parsedJ = parseJalali(birth);
        if (parsedJ) { const g = jalaliToGregorian(parsedJ.jy, parsedJ.jm, parsedJ.jd); setBirth(`${g.gy}-${pad2(g.gm)}-${pad2(g.gd)}`); }
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
      <div className="rounded-2xl bg-[var(--primary)]/10 p-6 text-center"><div className="text-sm font-bold text-[var(--text-muted)]">سن دقیق شما</div><div className="mt-3 text-3xl font-black text-[var(--primary)] md:text-4xl">{formatFa(result.age.years)} سال، {formatFa(result.age.months)} ماه و {formatFa(result.age.days)} روز</div><div className="mt-3 text-xs text-[var(--text-muted)]">امروز: {formatJalali(todayJ)} • {now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] p-4 text-center"><div className="text-xs text-[var(--text-muted)]">مجموع روزهای سپری‌شده</div><div className="mt-2 text-xl font-black">{formatFa(result.age.totalDays)} روز</div></div>
        <div className="rounded-2xl border border-[var(--border)] p-4 text-center"><div className="text-xs text-[var(--text-muted)]">تولد بعدی</div><div className="mt-2 text-xl font-black">{formatJalali(result.birthdayJ)}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{formatFa(result.birthdayDays)} روز و {formatFa(result.birthdayHours)} ساعت و {formatFa(result.birthdayMinutes)} دقیقه و {formatFa(result.birthdaySeconds)} ثانیه دیگر</div></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] p-4 text-center"><div className="text-xs text-[var(--text-muted)]">برج تولد</div><div className="mt-2 text-xl font-black">{result.zodiac.symbol} {result.zodiac.fa}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{result.zodiac.en}</div></div>
        <div className="rounded-2xl border border-[var(--border)] p-4 text-center"><div className="text-xs text-[var(--text-muted)]">روز تولد</div><div className="mt-2 text-lg font-black">{result.weekday}</div></div>
        <div className="rounded-2xl border border-[var(--border)] p-4 text-center"><div className="text-xs text-[var(--text-muted)]">فصل تولد</div><div className="mt-2 text-lg font-black">{result.season}</div></div>
      </div>
    </div>}
    <button type="button" onClick={() => setBirth("")} className="mt-5 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold">پاک کردن</button>
    <div className="mt-6 text-xs leading-6 text-[var(--text-muted)]">این ابزار برای محاسبه روزمره سن است و جایگزین محاسبات رسمی سامانه‌های دولتی یا مدارک هویتی نیست. تاریخ تولد فقط در مرورگر شما پردازش می‌شود.</div>
  </section>;
}
