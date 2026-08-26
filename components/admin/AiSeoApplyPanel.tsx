"use client";

import { useState } from "react";

type Advice = {
  summary?: string;
  severity?: string;
  reason?: string;
  actions?: string[];
  titleSuggestion?: string;
  metaDescriptionSuggestion?: string;
  keywordSuggestions?: string[];
  headingSuggestions?: string[];
  internalLinkSuggestions?: string[];
  evidence?: string[];
};

export default function AiSeoApplyPanel({ target, onApply }: { target: string; onApply: (data: Record<string, unknown>) => void }) {
  const [targetInput, setTargetInput] = useState(target);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advice, setAdvice] = useState<Advice | null>(null);

  async function analyze() {
    const value = targetInput.trim();
    if (!value) return setError("آدرس صفحه را وارد کنید.");
    setLoading(true); setError(""); setAdvice(null);
    try {
      const response = await fetch("/api/admin/seo/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dimension: "page", target: value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تحلیل انجام نشد.");
      setAdvice(data.advice || null);
    } catch (e) { setError(e instanceof Error ? e.message : "تحلیل انجام نشد."); }
    finally { setLoading(false); }
  }

  function apply() {
    if (!advice) return;
    onApply({ meta_title: advice.titleSuggestion || "", meta_description: advice.metaDescriptionSuggestion || "", seo_keywords: advice.keywordSuggestions || [], seo_title: advice.titleSuggestion || "" });
  }

  return <section className="rounded-2xl border border-[#09967C]/25 bg-[#09967C]/5 p-4 space-y-3">
    <div><h3 className="font-black">بهینه‌سازی با داده Search Console</h3><p className="text-xs text-[var(--muted)] mt-1">پیشنهادها فقط به فرم ویرایش اعمال می‌شوند و تا زمان ذخیره، تغییری روی سایت ایجاد نمی‌کنند.</p></div>
    <div className="flex gap-2"><input value={targetInput} onChange={e=>setTargetInput(e.target.value)} placeholder="https://tusancn.ir/..." dir="ltr" className="min-w-0 flex-1 rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm"/><button type="button" onClick={analyze} disabled={loading} className="rounded-xl bg-[#09967C] text-white px-4 py-2 text-sm font-bold disabled:opacity-50">{loading?"در حال تحلیل...":"تحلیل SEO"}</button></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {advice && <div className="rounded-xl border bg-[var(--surface)] p-4 space-y-3"><div className="flex items-center justify-between gap-3"><strong>{advice.summary || "تحلیل آماده است"}</strong>{advice.severity && <span className="text-xs rounded-full border px-2 py-1">{advice.severity}</span>}</div>{advice.reason && <p className="text-sm">{advice.reason}</p>}{(advice.evidence||[]).length>0&&<div><div className="text-xs font-bold mb-1">شواهد</div><ul className="text-xs space-y-1 list-disc pr-5">{advice.evidence!.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}{advice.titleSuggestion&&<div className="text-sm"><b>Title پیشنهادی:</b> {advice.titleSuggestion}</div>}{advice.metaDescriptionSuggestion&&<div className="text-sm"><b>Meta Description:</b> {advice.metaDescriptionSuggestion}</div>}{(advice.keywordSuggestions||[]).length>0&&<div className="text-sm"><b>کلیدواژه‌ها:</b> {advice.keywordSuggestions!.join("، ")}</div>}<div className="flex gap-2"><button type="button" onClick={apply} className="rounded-xl bg-[#09967C] text-white px-4 py-2 text-sm font-bold">اعمال پیشنهاد در فرم</button><button type="button" onClick={()=>setAdvice(null)} className="rounded-xl border px-4 py-2 text-sm">لغو</button></div></div>}
  </section>;
}
