"use client";

import type { Metadata } from "next";
import { useMemo, useState } from "react";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/average-calculator");

type Row = { id: number; name: string; grade: string; units: string };

export default function AverageCalculatorPage() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "ریاضی", grade: "18", units: "3" },
    { id: 2, name: "علوم", grade: "17", units: "2" },
    { id: 3, name: "ادبیات", grade: "19", units: "3" },
  ]);
  const average = useMemo(() => { const valid = rows.map((r) => ({ grade: Number(r.grade), units: Number(r.units) })).filter((r) => Number.isFinite(r.grade) && Number.isFinite(r.units) && r.units > 0); const units = valid.reduce((s, r) => s + r.units, 0); return units ? valid.reduce((s, r) => s + r.grade * r.units, 0) / units : 0; }, [rows]);
  const update = (id: number, patch: Partial<Row>) => setRows((items) => items.map((r) => r.id === id ? { ...r, ...patch } : r));
  const add = () => setRows((items) => [...items, { id: Date.now(), name: "درس جدید", grade: "", units: "3" }]);
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-5xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">GPA & Average Calculator</div><h1 className="mt-2 text-3xl font-black md:text-4xl">محاسبه معدل آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">نمره و تعداد واحد هر درس را وارد کنید تا معدل وزنی شما محاسبه شود. این ابزار برای معدل ترمی و میانگین نمرات بر اساس واحد طراحی شده است.</p></header><section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7"><div className="grid grid-cols-[minmax(0,1fr)_100px_100px_42px] gap-2 text-xs font-black text-[var(--text-muted)]"><span>نام درس</span><span>نمره</span><span>واحد</span><span/></div><div className="mt-3 space-y-2">{rows.map((row) => <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_100px_100px_42px] gap-2"><input value={row.name} onChange={(e) => update(row.id, { name: e.target.value })} className="min-w-0 rounded-xl border bg-transparent px-3 py-3 text-sm"/><input inputMode="decimal" value={row.grade} onChange={(e) => update(row.id, { grade: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-3 text-sm"/><input inputMode="decimal" value={row.units} onChange={(e) => update(row.id, { units: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-3 text-sm"/><button type="button" onClick={() => setRows((items) => items.filter((r) => r.id !== row.id))} className="rounded-xl border text-lg text-red-500" aria-label="حذف درس">×</button></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={add} className="rounded-xl border px-4 py-2.5 text-sm font-bold">+ افزودن درس</button><button type="button" onClick={() => setRows([])} className="rounded-xl border px-4 py-2.5 text-sm font-bold">پاک کردن</button></div><div className="mt-7 rounded-2xl bg-[var(--primary)]/10 p-6 text-center"><div className="text-sm font-bold text-[var(--text-muted)]">معدل محاسبه‌شده · GPA / Average</div><div className="mt-2 text-5xl font-black text-[var(--primary)]">{average.toFixed(2)}</div><div className="mt-2 text-xs text-[var(--text-muted)]">محاسبه به‌صورت میانگین وزنی بر اساس تعداد واحد انجام می‌شود.</div></div></section><section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="text-lg font-black">نحوه محاسبه معدل</h2><p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">برای هر درس، نمره در تعداد واحد ضرب می‌شود؛ مجموع حاصل‌ضرب‌ها بر مجموع واحدها تقسیم می‌شود. برای معدل کل چند ترم نیز می‌توانید نمرات و واحدهای همه درس‌ها را در یک جدول وارد کنید.</p></section></div></main>;
}
