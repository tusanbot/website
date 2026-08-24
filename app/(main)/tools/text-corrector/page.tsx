'use client';

import { useState } from 'react';

const modes = [
  ['grammar', 'اصلاح نگارشی'],
  ['punctuation', 'علائم نگارشی'],
  ['spacing', 'فاصله و نیم‌فاصله'],
  ['smooth', 'روان‌سازی'],
  ['formal', 'رسمی‌سازی'],
  ['colloquial', 'محاوره‌ای‌سازی'],
  ['summarize', 'خلاصه‌سازی'],
] as const;

export default function TextCorrectorPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState<(typeof modes)[number][0]>('grammar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    if (!text.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai/text-corrector', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, mode }) });
      const data = await res.json();
      if (res.status === 401) { window.location.href = `/tools/ai-profile?returnTo=${encodeURIComponent('/tools/text-corrector')}`; return; }
      if (!res.ok) throw new Error(data.error || 'پردازش متن انجام نشد.');
      setResult(data.text || '');
    } catch (e) { setError(e instanceof Error ? e.message : 'خطای ناشناخته‌ای رخ داد.'); }
    finally { setLoading(false); }
  }

  function print() { window.print(); }

  return <main dir="rtl" className="mx-auto max-w-6xl px-4 py-6">
    <div className="no-print mb-6"><h1 className="text-2xl font-bold">اصلاح نگارش متن با هوش مصنوعی</h1><p className="mt-2 text-slate-600">متن را وارد کنید و نوع اصلاح موردنظر را انتخاب کنید.</p></div>
    <section className="no-print grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="mb-3 font-bold">نوع پردازش</h2><div className="space-y-2">{modes.map(([id,label]) => <button key={id} onClick={() => setMode(id)} className={`w-full rounded-xl px-3 py-2 text-right ${mode === id ? 'bg-emerald-600 text-white' : 'bg-slate-50 hover:bg-slate-100'}`}>{label}</button>)}</div></aside>
      <div className="space-y-4"><textarea value={text} onChange={e => setText(e.target.value)} placeholder="متن خود را اینجا وارد کنید..." className="min-h-[300px] w-full rounded-2xl border p-4 outline-none focus:ring-2" />
        <div className="flex flex-wrap gap-2"><button disabled={loading || !text.trim()} onClick={run} className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{loading ? 'در حال پردازش...' : 'اصلاح متن'}</button><button onClick={() => {setText('');setResult('');setError('')}} className="rounded-xl border px-5 py-2">پاک کردن</button></div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      </div>
    </section>
    {result && <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm print-area"><div className="mb-3 flex items-center justify-between no-print"><h2 className="font-bold">متن اصلاح‌شده</h2><div className="flex gap-2"><button onClick={() => navigator.clipboard.writeText(result)} className="rounded-lg border px-3 py-2">کپی</button><button onClick={() => setText(result)} className="rounded-lg border px-3 py-2">جایگزینی</button><button onClick={print} className="rounded-lg bg-slate-900 px-3 py-2 text-white">پرینت</button></div></div><textarea value={result} onChange={e => setResult(e.target.value)} className="min-h-[420px] w-full resize-y rounded-xl border p-4 leading-8 outline-none" /><footer className="mt-8 hidden text-center text-sm text-slate-500 print:block">کافی‌نت توسن | tusancn.ir</footer></section>}
    <style jsx global>{`@media print { body * { visibility:hidden!important } .print-area,.print-area * { visibility:visible!important } .print-area { position:absolute!important; inset:0!important; width:100%!important; border:0!important; box-shadow:none!important } .no-print { display:none!important } .print-area textarea { border:0!important; resize:none!important; min-height:0!important; height:auto!important; overflow:visible!important } @page { size:A4; margin:18mm } }`}</style>
  </main>;
}
