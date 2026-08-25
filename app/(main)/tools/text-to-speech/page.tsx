'use client';

import { useEffect, useRef, useState } from 'react';

const voices = [
  ['Kore', 'Kore'],
  ['Puck', 'Puck'],
  ['Charon', 'Charon'],
  ['Fenrir', 'Fenrir'],
  ['Aoede', 'Aoede'],
] as const;
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function TextToSpeechPage() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<(typeof voices)[number][0]>('Kore');
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  async function generate() {
    if (!text.trim()) return;
    setLoading(true); setError('');
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(''); }
    try {
      const res = await fetch('/api/ai/text-to-speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice, speed }) });
      const data = await res.json();
      if (res.status === 401) { window.location.href = `/tools/ai-profile?returnTo=${encodeURIComponent('/tools/text-to-speech')}`; return; }
      if (!res.ok) throw new Error(data.error || 'تبدیل متن به صوت انجام نشد.');
      const bytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (e) { setError(e instanceof Error ? e.message : 'خطای ناشناخته‌ای رخ داد.'); }
    finally { setLoading(false); }
  }

  return <main dir="rtl" className="mx-auto max-w-5xl px-4 py-6">
    <div className="mb-6"><h1 className="text-2xl font-bold">تبدیل متن به صوت با هوش مصنوعی</h1><p className="mt-2 text-slate-600">متن فارسی یا انگلیسی را وارد کنید و فایل صوتی طبیعی دریافت کنید.</p></div>
    <section className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
        <div><label className="mb-2 block font-semibold">صدا</label><select value={voice} onChange={e => setVoice(e.target.value as typeof voice)} className="w-full rounded-xl border bg-white px-3 py-2">{voices.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></div>
        <div><label className="mb-2 block font-semibold">سرعت</label><select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full rounded-xl border bg-white px-3 py-2">{speeds.map(v => <option key={v} value={v}>{v}×</option>)}</select></div>
        <p className="text-xs leading-6 text-slate-500">حداکثر طول متن: ۸٬۰۰۰ کاراکتر</p>
      </aside>
      <div className="space-y-4">
        <textarea value={text} onChange={e => setText(e.target.value)} maxLength={8000} placeholder="متن موردنظر برای خواندن را اینجا وارد کنید..." className="min-h-[330px] w-full rounded-2xl border p-4 leading-8 outline-none focus:ring-2" />
        <div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-500">{text.length.toLocaleString('fa-IR')} / ۸٬۰۰۰</span><div className="flex gap-2"><button onClick={() => { setText(''); setError(''); if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(''); } }} className="rounded-xl border px-5 py-2">پاک کردن</button><button disabled={loading || !text.trim()} onClick={generate} className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{loading ? 'در حال ساخت صوت...' : 'تبدیل به صوت'}</button></div></div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
        {audioUrl && <div className="rounded-2xl border bg-slate-50 p-5"><h2 className="mb-3 font-bold">فایل صوتی آماده است</h2><audio ref={audioRef} src={audioUrl} controls className="w-full" /><a href={audioUrl} download="tusan-ai-voice.wav" className="mt-4 inline-block rounded-xl bg-slate-900 px-5 py-2 font-semibold text-white">دریافت فایل صوتی</a></div>}
      </div>
    </section>
  </main>;
}
