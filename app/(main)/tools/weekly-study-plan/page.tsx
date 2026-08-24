"use client";

import { DragEvent, useMemo, useState } from "react";

type Day = { id: string; label: string };
type Lesson = { id: string; name: string; teacher: string; color: string };
type Cell = { lessonId: string | null; break?: boolean };

const DAYS: Day[] = [
  { id: "sat", label: "شنبه" },
  { id: "sun", label: "یکشنبه" },
  { id: "mon", label: "دوشنبه" },
  { id: "tue", label: "سه‌شنبه" },
  { id: "wed", label: "چهارشنبه" },
  { id: "thu", label: "پنجشنبه" },
];

const COLORS = ["#e0f2fe", "#dcfce7", "#fef3c7", "#fce7f3", "#ede9fe", "#ffedd5"];

function makeCells(periods: number) {
  return DAYS.reduce<Record<string, Cell[]>>((acc, day) => {
    acc[day.id] = Array.from({ length: periods }, () => ({ lessonId: null }));
    return acc;
  }, {});
}

export default function WeeklyStudyPlanPage() {
  const [title, setTitle] = useState("برنامه درس هفتگی");
  const [student, setStudent] = useState("");
  const [school, setSchool] = useState("");
  const [periods, setPeriods] = useState(6);
  const [lessons, setLessons] = useState<Lesson[]>([
    { id: "math", name: "ریاضی", teacher: "", color: COLORS[0] },
    { id: "science", name: "علوم", teacher: "", color: COLORS[1] },
    { id: "persian", name: "فارسی", teacher: "", color: COLORS[2] },
    { id: "social", name: "مطالعات اجتماعی", teacher: "", color: COLORS[3] },
  ]);
  const [cells, setCells] = useState<Record<string, Cell[]>>(() => makeCells(6));
  const [breaks, setBreaks] = useState<boolean[]>(Array(6).fill(false));
  const [theme, setTheme] = useState<"color" | "mono" | "soft">("color");
  const [dragLesson, setDragLesson] = useState<string | null>(null);

  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  function changePeriods(value: number) {
    const next = Math.max(3, Math.min(10, value));
    setPeriods(next);
    setBreaks((prev) => Array.from({ length: next }, (_, i) => prev[i] ?? false));
    setCells((prev) => DAYS.reduce<Record<string, Cell[]>>((acc, day) => {
      acc[day.id] = Array.from({ length: next }, (_, i) => prev[day.id]?.[i] ?? { lessonId: null });
      return acc;
    }, {}));
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

  return (
    <main dir="rtl" className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--text)] md:px-8">
      <style jsx global>{`@media print{body{background:#fff!important}.no-print{display:none!important}.weekly-print{box-shadow:none!important;border:1px solid #222!important}.weekly-brand{display:block!important}}.weekly-brand{display:none}`}</style>
      <div className="no-print mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black">ساخت برنامه درس هفتگی</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">برنامه هفتگی مدرسه را بساز، درس‌ها را جابه‌جا کن و برای چاپ آماده کن.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[330px_1fr]">
          <aside className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-black">اطلاعات برنامه</h2>
            <div className="mt-4 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان" className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 outline-none" />
              <input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="نام دانش‌آموز" className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 outline-none" />
              <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="نام مدرسه" className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 outline-none" />
              <label className="block text-sm font-bold">تعداد زنگ
                <input type="number" min={3} max={10} value={periods} onChange={(e) => changePeriods(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent p-3" />
              </label>
              <div>
                <div className="mb-2 text-sm font-bold">قالب</div>
                <div className="grid grid-cols-3 gap-2">
                  {[['color','رنگی'],['soft','ملایم'],['mono','سیاه‌وسفید']].map(([value,label]) => <button key={value} onClick={() => setTheme(value as typeof theme)} className={`rounded-xl border p-2 text-xs font-bold ${theme===value?'border-[var(--primary)] bg-[var(--primary)] text-white':'border-[var(--border)]'}`}>{label}</button>)}
                </div>
              </div>
            </div>
            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <div className="flex items-center justify-between"><h2 className="font-black">درس‌ها</h2><button onClick={addLesson} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white">+ افزودن درس</button></div>
              <div className="mt-3 space-y-2">
                {lessons.map((lesson) => <div key={lesson.id} draggable onDragStart={() => setDragLesson(lesson.id)} className="rounded-xl border border-[var(--border)] p-2">
                  <input value={lesson.name} onChange={(e) => updateLesson(lesson.id,{name:e.target.value})} className="w-full bg-transparent px-1 py-1 text-sm font-bold outline-none" />
                  <input value={lesson.teacher} onChange={(e) => updateLesson(lesson.id,{teacher:e.target.value})} placeholder="نام معلم" className="w-full bg-transparent px-1 py-1 text-xs text-[var(--text-muted)] outline-none" />
                  <div className="mt-1 flex items-center gap-2"><input type="color" value={lesson.color} onChange={(e) => updateLesson(lesson.id,{color:e.target.value})} /><button onClick={() => removeLesson(lesson.id)} className="text-xs text-red-600">حذف</button></div>
                </div>)}
              </div>
            </div>
            <div className="mt-5 space-y-2"><button onClick={print} className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-black text-white">چاپ / ذخیره PDF</button><p className="text-xs leading-5 text-[var(--text-muted)]">برای PDF، در پنجره چاپ گزینه Print to PDF را انتخاب کنید.</p></div>
          </aside>
          <section className="weekly-print overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm md:p-7">
            <header className="mb-5 text-center">
              <h2 className="text-2xl font-black">{title}</h2>
              {(student || school) && <p className="mt-1 text-sm text-[var(--text-muted)]">{student}{student && school ? " • " : ""}{school}</p>}
            </header>
            <div className="min-w-[760px] overflow-hidden rounded-2xl border border-slate-700">
              <div className="grid grid-cols-[90px_repeat(6,minmax(110px,1fr))] bg-slate-800 text-white">
                <div className="p-3 text-center text-sm font-black">زنگ</div>{DAYS.map(day => <div key={day.id} className="border-r border-white/20 p-3 text-center text-sm font-black">{day.label}</div>)}
              </div>
              {Array.from({length:periods}, (_, index) => <div key={index} className="grid grid-cols-[90px_repeat(6,minmax(110px,1fr))] border-t border-slate-300">
                <div className={`flex flex-col items-center justify-center p-2 text-xs font-black ${theme==='mono'?'bg-white':'bg-slate-100'}`}><span>{index+1}</span><span className="text-[10px] font-normal">{breaks[index]?'استراحت':''}</span></div>
                {DAYS.map(day => { const cell=cells[day.id][index]; const lesson=cell.lessonId?lessonMap.get(cell.lessonId):null; return <div key={day.id} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>drop(day.id,index,e)} onDoubleClick={()=>putLesson(day.id,index,null)} className={`min-h-20 border-r border-slate-300 p-2 text-center ${theme==='mono'?'bg-white':theme==='soft'?'bg-slate-50':''}`} style={lesson && theme!=='mono'?{backgroundColor:lesson.color}:{}}>
                  {lesson ? <div className="flex h-full min-h-16 flex-col justify-center"><strong className="text-sm">{lesson.name}</strong>{lesson.teacher&&<span className="mt-1 text-[10px] text-slate-600">{lesson.teacher}</span>}</div> : <span className="text-xs text-slate-400">خالی</span>}
                </div>})}
              </div>)}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] text-slate-500">{breaks.map((_,i)=><button className="no-print rounded-full border px-2 py-1" key={i} onClick={()=>setBreaks(prev=>prev.map((v,j)=>j===i?!v:v))}>{i+1}: {breaks[i]?'زنگ تفریح':'عادی'}</button>)}</div>
            <footer className="weekly-brand mt-6 border-t border-slate-300 pt-3 text-center text-xs font-bold text-slate-600">کافی‌نت توسن | tusancn.ir</footer>
          </section>
        </div>
      </div>
    </main>
  );
}
