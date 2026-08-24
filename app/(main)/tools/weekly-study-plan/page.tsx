"use client";

import { DragEvent, useMemo, useState } from "react";

type Day = { id: string; label: string };
type Lesson = { id: string; name: string; teacher: string; color: string; empty?: boolean };
type Cell = { lessonId: string | null; break?: boolean };
type Theme = "color" | "soft" | "mono";

const ALL_DAYS: Day[] = [
  { id: "sat", label: "شنبه" },
  { id: "sun", label: "یکشنبه" },
  { id: "mon", label: "دوشنبه" },
  { id: "tue", label: "سه‌شنبه" },
  { id: "wed", label: "چهارشنبه" },
  { id: "thu", label: "پنجشنبه" },
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
  const [student, setStudent] = useState("");
  const [school, setSchool] = useState("");
  const [periods, setPeriods] = useState(6);
  const [showThursday, setShowThursday] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([
    { id: "math", name: "ریاضی", teacher: "", color: COLORS[0] },
    { id: "science", name: "علوم", teacher: "", color: COLORS[1] },
    { id: "persian", name: "فارسی", teacher: "", color: COLORS[2] },
    { id: "social", name: "مطالعات اجتماعی", teacher: "", color: COLORS[3] },
  ]);
  const [cells, setCells] = useState<Record<string, Cell[]>>(() => makeCells(6, false));
  const [breaks, setBreaks] = useState<boolean[]>(Array(6).fill(false));
  const [theme, setTheme] = useState<Theme>("color");
  const [dragLesson, setDragLesson] = useState<string | null>(null);

  const visibleDays = useMemo(() => ALL_DAYS.filter((day) => day.id !== "thu" || showThursday), [showThursday]);
  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  function changePeriods(value: number) {
    const next = Math.max(3, Math.min(10, value));
    setPeriods(next);
    setBreaks((prev) => Array.from({ length: next }, (_, i) => prev[i] ?? false));
    setCells((prev) => {
      const nextCells: Record<string, Cell[]> = {};
      visibleDays.forEach((day) => {
        nextCells[day.id] = Array.from({ length: next }, (_, i) => prev[day.id]?.[i] ?? { lessonId: null });
      });
      return nextCells;
    });
  }

  function toggleThursday(enabled: boolean) {
    setShowThursday(enabled);
    setCells((prev) => {
      const next = { ...prev };
      if (enabled) next.thu = Array.from({ length: periods }, (_, i) => prev.thu?.[i] ?? { lessonId: null });
      else delete next.thu;
      return next;
    });
  }

  function addLesson() {
    const id = `lesson-${Date.now()}`;
    setLessons((prev) => [...prev, { id, name: "درس جدید", teacher: "", color: COLORS[prev.length % COLORS.length] }]);
  }

  function updateLesson(id: string, patch: Partial<Lesson>) {
    setLessons((prev) => prev.map((lesson) => lesson.id === id ? { ...lesson, ...patch } : lesson));
  }

  function removeLesson(id: string) {
    setLessons((prev) => prev.filter((lesson) => lesson.id !== id));
    setCells((prev) => Object.fromEntries(Object.entries(prev).map(([day, row]) => [day, row.map((cell) => cell.lessonId === id ? { lessonId: null } : cell)])));
  }

  function putLesson(dayId: string, index: number, lessonId: string | null) {
    setCells((prev) => ({ ...prev, [dayId]: prev[dayId].map((cell, i) => i === index ? { ...cell, lessonId } : cell) }));
  }

  function drop(dayId: string, index: number, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (dragLesson) putLesson(dayId, index, dragLesson);
    setDragLesson(null);
  }

  function print() { window.print(); }

  const themeClasses = {
    color: { table: "theme-color", header: "bg-[var(--primary)]", cell: "bg-white", number: "bg-slate-100" },
    soft: { table: "theme-soft", header: "bg-sky-100 text-sky-950", cell: "bg-sky-50/40", number: "bg-sky-100/70" },
    mono: { table: "theme-mono", header: "bg-black text-white", cell: "bg-white", number: "bg-white" },
  }[theme];

  return (
    <main dir="rtl" className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--text)] md:px-8">
      <style jsx global>{`
        .weekly-table { border-collapse: separate; border-spacing: 0; }
        .weekly-table th, .weekly-table td { border-left: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
        .weekly-table th:last-child, .weekly-table td:last-child { border-left: 0; }
        .theme-color th { letter-spacing: .02em; }
        .theme-color tbody tr:nth-child(even) td { background-image: linear-gradient(rgba(248,250,252,.35), rgba(248,250,252,.35)); }
        .theme-soft { border: 3px solid #bae6fd !important; box-shadow: 0 8px 30px rgba(14,116,144,.10); }
        .theme-soft th { border-bottom: 3px solid #7dd3fc !important; }
        .theme-soft td { border-color: #bae6fd !important; }
        .theme-mono { border: 2px solid #111 !important; }
        .theme-mono th, .theme-mono td { border-color: #111 !important; }
        .theme-mono tbody tr:nth-child(even) td { background: #f1f1f1 !important; }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .weekly-print, .weekly-print * { visibility: visible !important; }
          .weekly-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; overflow: visible !important; background: #fff !important; }
          .no-print { display: none !important; }
          .weekly-brand { display: block !important; }
          .weekly-table { width: 100% !important; min-width: 0 !important; }
          .weekly-table td { height: 22mm !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .weekly-brand { display: none; }
      `}</style>

      <div className="no-print mx-auto max-w-7xl mb-6">
        <h1 className="text-3xl font-black">ابزار ساخت برنامه هفتگی توسن</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">برنامه هفتگی مدرسه را بساز، درس‌ها را با کشیدن و رها کردن در جدول قرار بده و برای چاپ آماده کن.</p>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[330px_1fr]">
        <aside className="no-print rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-black">راهنمای استفاده</h2>
          <div className="mt-3 rounded-2xl bg-[var(--background)] p-3 text-xs leading-6 text-[var(--text-muted)]">
            <p>۱. از بخش «درس‌ها» یک درس اضافه یا نام درس‌های آماده را ویرایش کن.</p>
            <p>۲. روی کارت درس کلیک کن و آن را با ماوس بکش و روی زنگ موردنظر رها کن.</p>
            <p>۳. برای خالی گذاشتن یک زنگ، درس «خالی» را روی آن خانه قرار بده.</p>
            <p>۴. برای پاک کردن یک خانه، روی آن دوبار کلیک کن.</p>
          </div>

          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <h2 className="font-black">اطلاعات برنامه</h2>
            <div className="mt-4 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان برنامه" className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 outline-none" />
              <input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="نام دانش‌آموز" className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 outline-none" />
              <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="نام مدرسه" className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 outline-none" />
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] p-3 text-sm font-bold">
                <input type="checkbox" checked={showThursday} onChange={(e) => toggleThursday(e.target.checked)} />
                نمایش پنجشنبه
              </label>
              <label className="block text-sm font-bold">تعداد زنگ
                <input type="number" min={3} max={10} value={periods} onChange={(e) => changePeriods(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent p-3" />
              </label>
              <div>
                <div className="mb-2 text-sm font-bold">قالب برنامه</div>
                <div className="grid grid-cols-3 gap-2">
                  {([["color", "رنگی"], ["soft", "ملایم"], ["mono", "سیاه‌وسفید"]] as const).map(([value, label]) => <button key={value} onClick={() => setTheme(value)} className={`rounded-xl border p-2 text-xs font-bold ${theme === value ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}>{label}</button>)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <div className="flex items-center justify-between"><h2 className="font-black">درس‌ها</h2><button onClick={addLesson} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white">+ افزودن درس</button></div>
            <div className="mt-3 space-y-2">
              {lessons.map((lesson) => <div key={lesson.id} draggable onDragStart={() => setDragLesson(lesson.id)} className={`rounded-xl border p-2 ${lesson.empty ? "border-dashed bg-slate-50" : "border-[var(--border)]"}`}>
                <div className="flex items-center gap-2"><span className="cursor-grab text-sm">⠿</span><input value={lesson.name} onChange={(e) => updateLesson(lesson.id, { name: e.target.value })} disabled={lesson.empty} className="w-full bg-transparent px-1 py-1 text-sm font-bold outline-none" /></div>
                {!lesson.empty && <input value={lesson.teacher} onChange={(e) => updateLesson(lesson.id, { teacher: e.target.value })} placeholder="نام معلم" className="w-full bg-transparent px-1 py-1 text-xs text-[var(--text-muted)] outline-none" />}
                {!lesson.empty && <div className="mt-1 flex items-center gap-2"><input type="color" value={lesson.color} onChange={(e) => updateLesson(lesson.id, { color: e.target.value })} /><button onClick={() => removeLesson(lesson.id)} className="text-xs text-red-600">حذف</button></div>}
              </div>)}
              <div draggable onDragStart={() => setDragLesson("empty")} className="cursor-grab rounded-xl border border-dashed border-slate-400 bg-slate-50 p-3 text-center text-sm font-bold">▢ خالی — برای خالی گذاشتن یک زنگ</div>
            </div>
          </div>
          <div className="mt-5 space-y-2"><button onClick={print} className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-black text-white">چاپ / ذخیره PDF</button><p className="text-xs leading-5 text-[var(--text-muted)]">برای PDF، در پنجره چاپ گزینه Print to PDF را انتخاب کنید.</p></div>
        </aside>

        <section className="weekly-print overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm md:p-7">
          <header className="mb-5 text-center">
            <h2 className="text-2xl font-black">{title}</h2>
            <p className="mt-2 text-sm font-bold">نام دانش‌آموز: {student || "—"} <span className="mx-2">|</span> نام مدرسه: {school || "—"}</p>
          </header>
          <div className={`min-w-[760px] overflow-hidden rounded-2xl border border-slate-700 ${themeClasses.table}`}>
            <table className="weekly-table w-full table-fixed text-center">
              <thead>
                <tr className={themeClasses.header}>
                  <th className="w-[90px] p-3 text-sm font-black">زنگ</th>
                  {visibleDays.map(day => <th key={day.id} className="p-3 text-sm font-black">{day.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: periods }, (_, index) => <tr key={index}>
                  <td className={`p-2 text-xs font-black ${themeClasses.number}`}><span className="block text-sm">{index + 1}</span>{breaks[index] && <span className="mt-1 block text-[10px]">استراحت</span>}</td>
                  {visibleDays.map(day => { const cell = cells[day.id]?.[index] ?? { lessonId: null }; const lesson = cell.lessonId ? lessonMap.get(cell.lessonId) : null; const isEmpty = lesson?.empty || lesson?.id === "empty"; return <td key={day.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(day.id, index, e)} onDoubleClick={() => putLesson(day.id, index, null)} className={`min-h-20 p-2 ${themeClasses.cell}`} style={lesson && !isEmpty && theme !== "mono" ? { backgroundColor: lesson.color } : undefined}>{lesson && !isEmpty ? <div className="flex min-h-16 flex-col justify-center"><strong className="text-sm">{lesson.name}</strong>{lesson.teacher && <span className="mt-1 text-[10px] text-slate-600">{lesson.teacher}</span>}</div> : <span className="text-xs text-slate-400">خالی</span>}</td>; })}
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="no-print mt-4 flex flex-wrap justify-center gap-2 text-[10px] text-slate-500">{breaks.map((_, i) => <button className="rounded-full border px-2 py-1" key={i} onClick={() => setBreaks(prev => prev.map((v, j) => j === i ? !v : v))}>{i + 1}: {breaks[i] ? "زنگ تفریح" : "عادی"}</button>)}</div>
          <footer className="weekly-brand mt-6 border-t border-slate-300 pt-3 text-center text-xs font-bold text-slate-600">کافی‌نت توسن | tusancn.ir</footer>
        </section>
      </div>
    </main>
  );
}
