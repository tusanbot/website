"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Idea = { title: string; problem: string; novelty: string; questions: string[]; objectives: string[]; method: string; keywords: string[] };

export default function ThesisIdeaPage() {
  const router = useRouter();
  const [form, setForm] = useState({ degree: "", field: "", major: "", interests: "", keywords: "", goal: "" });
  const [ideas, setIdeas] = useState<Idea[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  async function generate() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/ai/thesis-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json() as { ideas?: Idea[]; error?: string };
      if (res.status === 401 && data.error === "AI_PROFILE_REQUIRED") { router.push("/tools/ai-profile?returnTo=/tools/thesis-idea"); return; }
      if (!res.ok) throw new Error(data.error || "خطایی رخ داد.");
      setIdeas(data.ideas || []);
    } catch (e) { setError(e instanceof Error ? e.message : "تولید ایده انجام نشد."); } finally { setLoading(false); }
  }
  async function copy(idea: Idea) { await navigator.clipboard.writeText([idea.title, `بیان مسئله: ${idea.problem}`, `نوآوری پیشنهادی: ${idea.novelty}`, `سؤالات پژوهش: ${idea.questions.join("؛ ")}`, `اهداف: ${idea.objectives.join("؛ ")}`, `روش تحقیق: ${idea.method}`, `کلیدواژه‌ها: ${idea.keywords.join("، ")}`].join("\n\n")); }
  return <main dir="rtl" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <header className="mb-6"><div className="text-sm font-bold text-emerald-700">ابزار هوش مصنوعی</div><h1 className="mt-1 text-3xl font-black text-slate-900">ایده پایان‌نامه توسن</h1><p className="mt-2 text-slate-600">چند ایده پژوهشی متناسب با رشته و علاقه شما تولید می‌کنیم؛ نتیجه را قبل از استفاده حتماً با استاد راهنما و منابع علمی بررسی کنید.</p></header>
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="h-fit space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        {([["degree","مقطع تحصیلی","مثلاً کارشناسی ارشد"],["field","رشته","مثلاً مهندسی کامپیوتر"],["major","گرایش","مثلاً هوش مصنوعی"]] as const).map(([k,l,p]) => <label key={k} className="block text-sm font-bold">{l}<input value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={p} className="mt-1 w-full rounded-xl border p-3 font-normal outline-none focus:border-emerald-500" /></label>)}
        <label className="block text-sm font-bold">حوزه‌های مورد علاقه<textarea value={form.interests} onChange={e=>set("interests",e.target.value)} rows={4} placeholder="مثلاً پردازش زبان فارسی، آموزش، سلامت دیجیتال..." className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
        <label className="block text-sm font-bold">کلیدواژه‌ها<textarea value={form.keywords} onChange={e=>set("keywords",e.target.value)} rows={3} placeholder="چند کلمه کلیدی اختیاری" className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
        <label className="block text-sm font-bold">هدف یا محدودیت پژوهش<textarea value={form.goal} onChange={e=>set("goal",e.target.value)} rows={3} placeholder="مثلاً پروژه عملی و کم‌هزینه می‌خواهم." className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
        <button onClick={()=>void generate()} disabled={loading} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-60">{loading ? "در حال بررسی و تولید ایده..." : "تولید ایده‌های پایان‌نامه"}</button>
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </section>
      <section className="space-y-4">{ideas.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">اطلاعات رشته و علاقه خود را وارد کنید تا ایده‌های پیشنهادی اینجا نمایش داده شوند.</div> : ideas.map((idea,i)=><article key={`${idea.title}-${i}`} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><h2 className="text-xl font-black text-slate-900">{i+1}. {idea.title}</h2><button onClick={()=>void copy(idea)} className="shrink-0 rounded-lg border px-3 py-2 text-sm">کپی</button></div><div className="mt-4 grid gap-4 md:grid-cols-2"><Info title="بیان مسئله" text={idea.problem}/><Info title="نوآوری پیشنهادی" text={idea.novelty}/><Info title="روش تحقیق" text={idea.method}/><Info title="سؤالات پژوهش" text={idea.questions.join("\n")}/><Info title="اهداف" text={idea.objectives.join("\n")}/><Info title="کلیدواژه‌ها" text={idea.keywords.join("، ")}/></div></article>)}</section>
    </div>
  </main>;
}
function Info({ title, text }: { title: string; text: string }) { return <div className="rounded-xl bg-slate-50 p-4"><h3 className="mb-2 font-bold text-slate-800">{title}</h3><p className="whitespace-pre-line text-sm leading-7 text-slate-600">{text}</p></div>; }
