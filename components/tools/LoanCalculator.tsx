"use client";
import { useMemo, useState } from "react";

const fa = (n: number) => Math.round(n).toLocaleString("fa-IR");
const digits = (value: string) => value
  .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const numeric = (value: string) => digits(value).replace(/[^0-9]/g, "");
const formatInput = (value: string) => {
  const raw = numeric(value);
  return raw ? Number(raw).toLocaleString("en-US") : "";
};

export default function LoanCalculator() {
  const [principal, setPrincipal] = useState("100,000,000");
  const [rate, setRate] = useState("18");
  const [months, setMonths] = useState("36");

  const p = Number(numeric(principal));
  const r = Number(numeric(rate)) / 100 / 12;
  const n = Number(numeric(months));

  const data = useMemo(() => {
    if (p <= 0 || r < 0 || n <= 0) return null;
    const payment = r === 0 ? p / n : p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const total = payment * n;
    return { payment, total, interest: total - p };
  }, [p, r, n]);

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-bold">
          مبلغ وام (تومان)
          <input
            value={principal}
            onChange={(e) => setPrincipal(formatInput(e.target.value))}
            inputMode="numeric"
            dir="ltr"
            placeholder="100,000,000"
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-left"
          />
          <span className="mt-1 block text-xs font-normal text-[var(--text-muted)]">مثال: ۱۰۰٬۰۰۰٬۰۰۰ تومان</span>
        </label>
        <label className="text-sm font-bold">
          نرخ سود سالانه (%)
          <input
            value={rate}
            onChange={(e) => setRate(formatInput(e.target.value))}
            inputMode="numeric"
            dir="ltr"
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-left"
          />
        </label>
        <label className="text-sm font-bold">
          مدت بازپرداخت (ماه)
          <input
            value={months}
            onChange={(e) => setMonths(formatInput(e.target.value))}
            inputMode="numeric"
            dir="ltr"
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-left"
          />
        </label>
      </div>

      {data && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--primary)]/10 p-5 text-center">
              <div className="text-xs text-[var(--text-muted)]">قسط ماهانه</div>
              <div className="mt-2 text-2xl font-black text-[var(--primary)]">{fa(data.payment)} تومان</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] p-5 text-center">
              <div className="text-xs text-[var(--text-muted)]">سود کل</div>
              <div className="mt-2 text-xl font-black">{fa(data.interest)} تومان</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] p-5 text-center">
              <div className="text-xs text-[var(--text-muted)]">مجموع بازپرداخت</div>
              <div className="mt-2 text-xl font-black">{fa(data.total)} تومان</div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="p-3 text-right">قسط</th>
                  <th className="p-3 text-right">قسط ماهانه</th>
                  <th className="p-3 text-right">مانده تقریبی</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.min(n, 60) }, (_, i) => {
                  const k = i + 1;
                  const balance = r === 0
                    ? Math.max(0, p - data.payment * k)
                    : Math.max(0, p * Math.pow(1 + r, k) - data.payment * (Math.pow(1 + r, k) - 1) / r);
                  return (
                    <tr key={k} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3">{fa(k)}</td>
                      <td className="p-3">{fa(data.payment)}</td>
                      <td className="p-3">{fa(balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-5 text-xs leading-6 text-[var(--text-muted)]">این محاسبه بر اساس مدل استاندارد اقساط مساوی با مانده نزولی است؛ شرایط واقعی بانک، کارمزد و جریمه می‌تواند متفاوت باشد.</p>
    </section>
  );
}
