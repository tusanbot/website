"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Lightbulb, ShieldCheck, TriangleAlert } from "lucide-react";

const sections = [
  ["summary", "خلاصه حرفه‌ای"],
  ["experience", "سوابق کاری"],
  ["education", "تحصیلات"],
  ["skills", "مهارت‌ها"],
  ["projects", "پروژه‌ها"],
  ["languages", "زبان‌ها"],
  ["certifications", "دوره‌ها و گواهینامه‌ها"],
] as const;

type Resume = Record<string, any>;

export default function ResumeAtsPage() {
  const [data, setData] = useState<Resume | null>(null);
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tusan-resume-builder");
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  const result = useMemo(() => {
    if (!data) return { score: 0, checks: [], keywordHits: [], missingKeywords: [] as string[] };
    const has = (v: unknown) => typeof v === "string" ? v.trim().length > 0 : Array.isArray(v) ? v.some(Boolean) : Boolean(v);
    const checks = sections.map(([id, label]) => {
      let ok = false;
      if (["experience", "education", "skills", "projects"].includes(id)) ok = Array.isArray(data[id]) && data[id].some((x: any) => Object.values(x || {}).some(v => typeof v === "string" && v.trim()));
      else ok = has(data[id]);
      return { id, label, ok };
    });
    const identity = [data.name, data.role, data.email, data.phone, data.city].filter(has).length;
    const links = has(data.website) ? 1 : 0;
    const photoPenalty = has(data.photo) ? 0 : 0;
    const base = checks.filter(x => x.ok).length / checks.length * 70;
    const identityScore = identity / 5 * 25;
    const linkScore = links * 5;
    const score = Math.min(100, Math.round(base + identityScore + linkScore + photoPenalty));
    const allText = JSON.stringify(data).toLowerCase();
    const requested = keywords.split(/[،,\n]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
    const keywordHits = requested.filter(k => allText.includes(k));
    const missingKeywords = requested.filter(k => !allText.includes(k));
    return { score, checks, keywordHits, missingKeywords };
  }, [data, keywords]);

  const suggestions = [
    ...(data && !data.summary?.trim() ? ["یک خلاصه حرفه‌ای ۳ تا ۵ خطی متناسب با شغل هدف اضافه کنید."] : []),
    ...(data && (!data.experiences?.some((x: any) => x.title || x.company)) ? ["حداقل یک سابقه کاری با عنوان شغلی و نام سازمان وارد کنید."] : []),
    ...(data && (!data.skills?.some((x: any) => x.name)) ? ["مهارت‌های کلیدی آگهی شغلی را به بخش مهارت‌ها اضافه کنید."] : []),
    ...(data && !data.email?.trim() ? ["ایمیل حرفه‌ای را در اطلاعات تماس وارد کنید."] : []),
    ...(data && !data.phone?.trim() ? ["شماره تماس را در اطلاعات تماس وارد کنید."] : []),
  ];

  if (!data) return <main dir="rtl" className="min-h-screen page-background p-6"><div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center"><h1 className="text-2xl font-black">تحلیل ATS رزومه</h1><p className="mt-3 text-sm text-[var(--text-muted)]">ابتدا رزومه خود را در رزومه‌ساز تکمیل و ذخیره کنید.</p><a href="/tools/resume-builder" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white">بازگشت به رزومه‌ساز <ArrowRight size={17}/></a></div></main>;

  return <main dir="rtl" className="min-h-screen page-background py-8 md:py-12">
    <div className="mx-auto max-w-5xl px-4 lg:px-6">
      <header className="mb-7"><a href="/tools/resume-builder" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]"><ArrowRight size={16}/> بازگشت به رزومه‌ساز</a><h1 className="text-3xl font-black">تحلیل ATS رزومه</h1><p className="mt-2 text-sm text-[var(--text-muted)]">بررسی ساختار رزومه برای خوانایی بهتر توسط سامانه‌های جذب و پیشنهادهای استخدامی.</p></header>
      <div className="grid gap-5 md:grid-cols-[260px_1fr]">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-sm"><ShieldCheck className="mx-auto text-[var(--primary)]" size={30}/><div className="mt-5 text-6xl font-black" style={{color:data.accent || "var(--primary)"}}>{result.score}</div><div className="mt-1 text-sm font-bold text-[var(--text-muted)]">امتیاز آمادگی ATS از ۱۰۰</div><p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">این امتیاز راهنمای ساختاری است و تضمین عبور از هیچ سامانه استخدامی نیست.</p></section>
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"><h2 className="font-black">بررسی بخش‌ها</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{result.checks.map(x=><div key={x.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3">{x.ok?<CheckCircle2 className="text-emerald-500" size={19}/>:<TriangleAlert className="text-amber-500" size={19}/>}<span className="text-sm font-bold">{x.label}</span></div>)}</div></section>
      </div>
      <section className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"><div className="flex items-center gap-2"><Lightbulb className="text-[var(--primary)]" size={20}/><h2 className="font-black">پیشنهادهای بهبود</h2></div>{suggestions.length?<ul className="mt-4 space-y-3">{suggestions.map((x,i)=><li key={i} className="rounded-xl bg-[var(--background)] p-3 text-sm leading-6">{x}</li>)}</ul>:<p className="mt-4 text-sm text-emerald-600">بخش‌های اصلی رزومه وضعیت خوبی دارند. حالا روی تطبیق با شغل هدف تمرکز کنید.</p>}</section>
      <section className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"><h2 className="font-black">بررسی کلمات کلیدی شغل هدف</h2><p className="mt-1 text-xs text-[var(--text-muted)]">کلمات کلیدی آگهی استخدام را وارد کنید؛ هر کلمه را با ویرگول یا خط جدید جدا کنید.</p><textarea value={keywords} onChange={e=>setKeywords(e.target.value)} rows={4} placeholder="مثلاً React, TypeScript, مدیریت پروژه" className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm leading-7 outline-none focus:border-[var(--primary)]"/>{keywords.trim()&&<div className="mt-4 grid gap-3 sm:grid-cols-2"><div><h3 className="text-sm font-black text-emerald-600">موجود در رزومه ({result.keywordHits.length})</h3><p className="mt-2 text-sm leading-7">{result.keywordHits.join("، ") || "موردی پیدا نشد"}</p></div><div><h3 className="text-sm font-black text-amber-600">پیشنهاد برای افزودن ({result.missingKeywords.length})</h3><p className="mt-2 text-sm leading-7">{result.missingKeywords.join("، ") || "همه کلمات پیدا شدند"}</p></div></div>}</section>
    </div>
  </main>;
}
