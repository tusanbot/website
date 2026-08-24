"use client";

import { DragEvent, useMemo, useState } from "react";

type Day = { id: string; label: string };
type Lesson = { id: string; name: string; teacher: string; color: string; empty?: boolean };
type Cell = { lessonId: string | null; break?: boolean };
type Theme = "color" | "soft" | "mono";

const ALL_DAYS: Day[] = [
  { id: "sat", label: "شنبه" }, { id: "sun", label: "یکشنبه" }, { id: "mon", label: "دوشنبه" },
  { id: "tue", label: "سه‌شنبه" }, { id: "wed", label: "چهارشنبه" }, { id: "thu", label: "پنجشنبه" },
];
const COLORS = ["#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3", "#ede9fe", "#ffedd5"];
const EMPTY_LESSON: Lesson = { id: "empty", name: "خالی", teacher: "", color: "#f8fafc", empty: true };
function makeCells(periods: number, includeThursday: boolean) {
  return ALL_DAYS.reduce<Record<string, Cell[]>>((acc, day) => {
    if (day.id !== "thu" || includeThursday) acc[day.id] = Array.from({ length: periods }, () => ({ lessonId: null }));
    return acc;
  }, {});
}

export default function WeeklyStudyPlanPage() {
  const [title, setTitle] = useState("برنامه درس هفتگی");
  const [student, setStudent] = useState(""); const [school, setSchool] = useState("");
  const [periods, setPeriods] = useState(6); const [showThursday, setShowThursday] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([
    { id: "math", name: "ریاضی", teacher: "", color: COLORS[0] }, { id: "science", name: "علوم", teacher: "", color: COLORS[1] },
    { id: "persian", name: "فارسی", teacher: "", color: COLORS[2] }, { id: "social", name: "مطالعات اجتماعی", teacher: "", color: COLORS[3] }, EMPTY_LESSON,
  ]);
  const [cells, setCells] = useState<Record<string, Cell[]>>(() => makeCells(6, false));
  const [theme, setTheme] = useState<Theme>("color"); const [dragLesson, setDragLesson] = useState<string | null>(null);
  const visibleDays = useMemo(() => ALL_DAYS.filter((day) => day.id !== "thu" || showThursday), [showThursday]);
  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  function changePeriods(value: number) {
    const next = Math.max(3, Math.min(10, value)); setPeriods(next);
    setCells(prev => Object.fromEntries(visibleDays.map(day => [day.id, Array.from({ length: next }, (_, i) => prev[day.id]?.[i] ?? { lessonId: null })])));
  }
  function toggleThursday(enabled: boolean) { setShowThursday(enabled); setCells(prev => { const next = { ...prev }; if (enabled) next.thu = Array.from({ length: periods }, (_, i) => prev.thu?.[i] ?? { lessonId: null }); else delete next.thu; return next; }); }
  function addLesson() { const id = `lesson-${Date.now()}`; setLessons(prev => [...prev, { id, name: "درس جدید", teacher: "", color: COLORS[prev.length % COLORS.length] }]); }
  function updateLesson(id: string, patch: Partial<Lesson>) { setLessons(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l)); }
  function removeLesson(id: string) { setLessons(prev => prev.filter(l => l.id !== id)); setCells(prev => Object.fromEntries(Object.entries(prev).map(([d, row]) => [d, row.map(c => c.lessonId === id ? { lessonId: null } : c)]))); }
  function putLesson(dayId: string, index: number, lessonId: string | null) { setCells(prev => ({ ...prev, [dayId]: prev[dayId].map((c, i) => i === index ? { ...c, lessonId } : c) })); }
  function drop(dayId: string, index: number, event: DragEvent<HTMLTableCellElement>) { event.preventDefault(); if (dragLesson) putLesson(dayId, index, dragLesson); setDragLesson(null); }
  function print() { window.print(); }
  const themeClasses = {
    color: { table: "theme-color", header: "bg-[var(--primary)] text-white", cell: "bg-white", number: "bg-slate-100" },
    soft: { table: "theme-soft", header: "bg-sky-100 text-sky-950", cell: "bg-sky-50/40", number: "bg-sky-100/70" },
    mono: { table: "theme-mono", header: "bg-black text-white", cell: "bg-white", number: "bg-white" },
  }[theme];
  return <main dir="rtl" className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--text)] md:px-8">
    <style jsx global>{`
      .weekly-table{border-collapse:separate;border-spacing:0}.weekly-table th,.weekly-table td{border-left:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1}.weekly-table th:last-child,.weekly-table td:last-child{border-left:0}
      .theme-color tbody tr:nth-child(even) td{background-image:linear-gradient(rgba(248,250,252,.35),rgba(248,250,252,.35))}.theme-soft{border:3px solid #bae6fd!important;box-shadow:0 8px 30px rgba(14,116,144,.1)}.theme-soft th{border-bottom:3px solid #7dd3fc!important}.theme-soft td{border-color:#bae6fd!important}.theme-mono{border:2px solid #111!important}.theme-mono th,.theme-mono td{border-color:#111!important}.theme-mono tbody tr:nth-child(even) td{background:#f1f1f1!important}
      @media print{@page{size:A4 landscape;margin:10mm}body{background:#fff!important}body *{visibility:hidden!important}.weekly-print,.weekly-print *{visibility:visible!important}.weekly-print{position:absolute!important;inset:0 auto auto 0!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important;border:0!important;overflow:visible!important;background:#fff!important}.no-print{display:none!important}.weekly-brand{display:block!important}.weekly-table{width:100%!important;min-width:0!important}.weekly-table td{height:22mm!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}.weekly-brand{display:none}
    `}</style>
    <div className="no-print mx-auto mb-6 max-w-7xl"><h1 className="text-3xl font-black">ابزار ساخت برنامه هفتگی توسن</h1><p className="mt-2 text-sm text-[var(--text-muted)]">برنامه هفتگی مدرسه را بساز، درس‌ها را با کشیدن و رها کردن در جدول قرار بده و برای چاپ آماده کن.</p></div>
    <div className="mx-auto max-w-7xl">
      <div className="no-print mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-7"><b>راهنمای سریع:</b> یک درس را از پنل سمت راست بگیر و روی خانه زنگ موردنظر رها کن. برای خالی گذاشتن زنگ، «خالی» را بکش. برای پاک‌کردن خانه، روی آن دوبار کلیک کن.</div>
      <div className="grid gap-5 lg:grid-cols-[1fr_330px] lg:items-start">
        <section className="weekly-print overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm md:p-7">
          <header className="mb-5 text-center"><h2 className="text-2xl font-black">{title}</h2><p className="mt-2 text-sm font-bold">نام دانش‌آموز: {student || "—"}<span className="mx-2">|</span>نام مدرسه: {school || "—"}</p></header>
          <div className={`min-w-[760px] overflow-hidden rounded-2xl border border-slate-700 ${themeClasses.table}`}><table className="weekly-table w-full table-fixed text-center"><thead><tr className={themeClasses.header}><th className="w-[90px] p-3 text-sm font-black">زنگ</th>{visibleDays.map(day => <th key={day.id} className="p-3 text-sm font-black">{day.label}</th>)}</tr></thead><tbody>{Array.from({ length: periods }, (_, i) => <tr key={i}><td className={`p-3 font-black ${themeClasses.number}`}>زنگ {i + 1}</td>{visibleDays.map(day => { const cell = cells[day.id]?.[i]; const lesson = cell?.lessonId ? lessonMap.get(cell.lessonId) : null; return <td key={day.id} onDragOver={e => e.preventDefault()} onDrop={e => drop(day.id,i,e)} onDoubleClick={() => putLesson(day.id,i,null)} className={`h-24 p-2 ${themeClasses.cell}`} style={lesson && !lesson.empty ? { backgroundColor: lesson.color } : undefined}>{lesson ? <div className="text-sm font-black">{lesson.name}{lesson.teacher && <div className="mt-1 text-xs font-medium opacity-70">{lesson.teacher}</div>}</div> : <span className="text-xs text-slate-400">رها کنید</span>}</td>})}</tr>)}</tbody></table></div>
          <div className="weekly-brand mt-4 text-center text-xs font-bold">کافی‌نت توسن | tusancn.ir</div>
        </section>
        <aside className="no-print lg:sticky lg:top-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between"><h2 className="font-black">درس‌ها</h2><button onClick={addLesson} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white">+ افزودن درس</button></div>
          <div className="mt-3 space-y-2">{lessons.map(lesson => <div key={lesson.id} draggable onDragStart={() => setDragLesson(lesson.id)} className={`cursor-grab rounded-xl border p-2 ${lesson.empty ? "border-dashed bg-slate-50" : "border-[var(--border)]"}`}><div className="flex items-center gap-2"><span>⠿</span><input value={lesson.name} onChange={e=>updateLesson(lesson.id,{name:e.target.value})} disabled={lesson.empty} className="w-full bg-transparent px-1 py-1 text-sm font-bold outline-none" /></div>{!lesson.empty && <input value={lesson.teacher} onChange={e=>updateLesson(lesson.id,{teacher:e.target.value})} placeholder="نام معلم" className="w-full bg-transparent px-1 py-1 text-xs text-[var(--text-muted)] outline-none" />}{!lesson.empty && <div className="mt-1 flex items-center gap-2"><input type="color" value={lesson.color} onChange={e=>updateLesson(lesson.id,{color:e.target.value})}/><button onClick={()=>removeLesson(lesson.id)} className="text-xs text-red-600">حذف</button></div>}</div>)}</div>
          <div className="mt-5 border-t border-[var(--border)] pt-5"><h2 className="font-black">تنظیمات</h2><div className="mt-3 space-y-3"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="عنوان برنامه" className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3"/><input value={student} onChange={e=>setStudent(e.target.value)} placeholder="نام دانش‌آموز" className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3"/><input value={school} onChange={e=>setSchool(e.target.value)} placeholder="نام مدرسه" className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3"/><label className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3 text-sm font-bold"><input type="checkbox" checked={showThursday} onChange={e=>toggleThursday(e.target.checked)}/>نمایش پنجشنبه</label><label className="block text-sm font-bold">تعداد زنگ<input type="number" min={3} max={10} value={periods} onChange={e=>changePeriods(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent p-3"/></label><div><div className="mb-2 text-sm font-bold">قالب برنامه</div><div className="grid grid-cols-3 gap-2">{([["color","رنگی"],["soft","ملایم"],["mono","سیاه‌وسفید"]] as const).map(([v,l])=><button key={v} onClick={()=>setTheme(v)} className={`rounded-xl border p-2 text-xs font-bold ${theme===v?"border-[var(--primary)] bg-[var(--primary)] text-white":"border-[var(--border)]"}`}>{l}</button>)}</div></div></div></div>
          <button onClick={print} className="mt-5 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-black text-white">چاپ / ذخیره PDF</button><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">برای PDF، در پنجره چاپ گزینه Print to PDF را انتخاب کنید.</p>
        </aside>
      </div>
    </div>
  </main>;
}
