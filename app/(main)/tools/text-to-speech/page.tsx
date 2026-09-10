'use client';

import { useEffect, useRef, useState } from 'react';

const voices = [
  { id: 'Puck', label: 'پوک — پرانرژی', description: 'شاد، پرتحرک و مناسب ریلز و محتوای شبکه‌های اجتماعی', group: 'تولید محتوا' },
  { id: 'Fenrir', label: 'فنریر — هیجانی', description: 'هیجانی و قدرتمند برای معرفی، تبلیغات و شروع‌های جذاب', group: 'تولید محتوا' },
  { id: 'Zephyr', label: 'زفیر — روشن و پرنشاط', description: 'روشن، سرزنده و مناسب محتوای جوان‌پسند', group: 'تولید محتوا' },
  { id: 'Laomedeia', label: 'لائومدیا — سرزنده', description: 'آپ‌بیت و پرانرژی برای ویدیوهای کوتاه و تبلیغاتی', group: 'تولید محتوا' },
  { id: 'Sadachbia', label: 'سداشبیا — زنده و پویا', description: 'لحن زنده و پرتحرک برای محتوای سرگرمی', group: 'تولید محتوا' },
  { id: 'Leda', label: 'لدا — جوان و صمیمی', description: 'جوان، دوستانه و مناسب محتوای سبک و روزمره', group: 'تولید محتوا' },
  { id: 'Achird', label: 'آچیرْد — دوستانه', description: 'خودمانی و نزدیک برای معرفی محصول و آموزش', group: 'تولید محتوا' },
  { id: 'Zubenelgenubi', label: 'زوبن‌الجَنوبی — خودمانی', description: 'طبیعی و محاوره‌ای برای ریلز و شبکه‌های اجتماعی', group: 'تولید محتوا' },
  { id: 'Kore', label: 'کوره — محکم و مطمئن', description: 'بااعتمادبه‌نفس و قاطع برای معرفی و ارائه', group: 'حرفه‌ای' },
  { id: 'Charon', label: 'کارون — اطلاع‌رسان', description: 'شفاف و حرفه‌ای برای آموزش، خبر و توضیحات', group: 'حرفه‌ای' },
  { id: 'Alnilam', label: 'النِیلام — قدرتمند', description: 'محکم و جدی برای تبلیغات و معرفی رسمی', group: 'حرفه‌ای' },
  { id: 'Gacrux', label: 'گاکروکس — پخته و عمیق', description: 'پخته و باوقار برای پادکست و روایت', group: 'حرفه‌ای' },
  { id: 'Aoede', label: 'آئوده — روان و لطیف', description: 'نرم، روان و مناسب روایت و محتوای آرام', group: 'روایت' },
  { id: 'Callirrhoe', label: 'کالیروئه — راحت و طبیعی', description: 'راحت و طبیعی برای گفتار روزمره', group: 'روایت' },
  { id: 'Sulafat', label: 'سولافت — گرم', description: 'گرم و دلنشین برای داستان و پادکست', group: 'روایت' },
  { id: 'Achernar', label: 'آکرنار — نرم', description: 'ملایم و آرام برای روایت و محتوای احساسی', group: 'روایت' },
] as const;

const styles = [
  { id: 'energetic', label: 'مجری پرانرژی', prompt: 'با انرژی بالا، ریتم تند و جذاب، شاد و مناسب اجرای محتوای شبکه‌های اجتماعی' },
  { id: 'reels', label: 'ریلز و ویدئوی کوتاه', prompt: 'سریع، گیرا، با تأکید روی کلمات مهم و شروع بسیار جذاب، مناسب ویدئوی کوتاه' },
  { id: 'advertising', label: 'تبلیغاتی', prompt: 'متقاعدکننده، پرانرژی و حرفه‌ای، با تأکید طبیعی روی مزایا و دعوت به اقدام' },
  { id: 'friendly', label: 'خودمانی و صمیمی', prompt: 'طبیعی، گرم، دوستانه و محاوره‌ای؛ مثل صحبت مستقیم با مخاطب' },
  { id: 'educational', label: 'آموزشی', prompt: 'شفاف، منظم و قابل‌فهم، با مکث‌های طبیعی و تأکید روی نکات مهم' },
  { id: 'news', label: 'خبری و رسمی', prompt: 'جدی، دقیق و حرفه‌ای با بیان واضح و کنترل‌شده' },
  { id: 'podcast', label: 'پادکست', prompt: 'طبیعی، داستان‌گو، گرم و شنیدنی با ریتم متعادل' },
  { id: 'story', label: 'روایت داستانی', prompt: 'احساسی، داستان‌گو و پویا، با تغییر طبیعی در تأکید و ریتم' },
] as const;

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

type VoiceId = (typeof voices)[number]['id'];

export default function TextToSpeechPage() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<VoiceId>('Puck');
  const [style, setStyle] = useState<(typeof styles)[number]['id']>('energetic');
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed, audioUrl]);

  async function generate() {
    if (!text.trim()) return;
    setLoading(true); setError('');
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(''); }
    try {
      const res = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, style, speed }),
      });
      const data = await res.json();
      if (res.status === 401) { window.location.href = `/tools/ai-profile?returnTo=${encodeURIComponent('/tools/text-to-speech')}`; return; }
      if (!res.ok) throw new Error(data.error || 'تبدیل متن به صوت انجام نشد.');
      const bytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0));
      setAudioUrl(URL.createObjectURL(new Blob([bytes], { type: data.mimeType || 'audio/wav' })));
    } catch (e) { setError(e instanceof Error ? e.message : 'خطای ناشناخته‌ای رخ داد.'); }
    finally { setLoading(false); }
  }

  const selectedVoice = voices.find(item => item.id === voice);

  return <main dir="rtl" className="mx-auto max-w-6xl px-4 py-6">
    <div className="mb-6">
      <h1 className="text-2xl font-bold">تبدیل متن به صوت با هوش مصنوعی</h1>
      <p className="mt-2 text-slate-600">صداهای فارسی مناسب ریلز، تبلیغات، آموزش، پادکست و تولید محتوای حرفه‌ای را انتخاب کنید.</p>
    </div>
    <section className="grid gap-5 lg:grid-cols-[310px_1fr]">
      <aside className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div>
          <label className="mb-2 block font-semibold">شخصیت صدا</label>
          <select value={voice} onChange={e => setVoice(e.target.value as VoiceId)} className="w-full rounded-xl border bg-white px-3 py-2">
            {['تولید محتوا', 'حرفه‌ای', 'روایت'].map(group => <optgroup key={group} label={group}>{voices.filter(item => item.group === group).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>)}
          </select>
          {selectedVoice && <p className="mt-2 text-xs leading-6 text-slate-500">{selectedVoice.description}</p>}
        </div>
        <div>
          <label className="mb-2 block font-semibold">سبک اجرا</label>
          <select value={style} onChange={e => setStyle(e.target.value as (typeof styles)[number]['id'])} className="w-full rounded-xl border bg-white px-3 py-2">
            {styles.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block font-semibold">سرعت پخش</label>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full rounded-xl border bg-white px-3 py-2">
            {speeds.map(v => <option key={v} value={v}>{v}×</option>)}
          </select>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">
          برای محتوای اینستاگرام، «پوک»، «فنریر»، «زفیر» و «لائومدیا» را امتحان کنید. سبک «مجری پرانرژی» یا «ریلز و ویدئوی کوتاه» هم برای شروع‌های جذاب مناسب است.
        </div>
        <p className="text-xs leading-6 text-slate-500">حداکثر طول متن: ۸٬۰۰۰ کاراکتر</p>
      </aside>
      <div className="space-y-4">
        <textarea value={text} onChange={e => setText(e.target.value)} maxLength={8000} placeholder="متن موردنظر برای خواندن را اینجا وارد کنید..." className="min-h-[330px] w-full rounded-2xl border p-4 leading-8 outline-none focus:ring-2" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500">{text.length.toLocaleString('fa-IR')} / ۸٬۰۰۰</span>
          <div className="flex gap-2">
            <button onClick={() => { setText(''); setError(''); if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(''); } }} className="rounded-xl border px-5 py-2">پاک کردن</button>
            <button disabled={loading || !text.trim()} onClick={generate} className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{loading ? 'در حال ساخت صوت...' : 'تبدیل به صوت'}</button>
          </div>
        </div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
        {audioUrl && <div className="rounded-2xl border bg-slate-50 p-5"><h2 className="mb-3 font-bold">فایل صوتی آماده است</h2><audio ref={audioRef} src={audioUrl} controls className="w-full" /><div className="mt-4"><a href={audioUrl} download="tusan-ai-voice.wav" className="inline-flex rounded-xl bg-slate-900 px-5 py-2 font-semibold text-white">دریافت فایل صوتی</a></div></div>}
      </div>
    </section>
  </main>;
}
