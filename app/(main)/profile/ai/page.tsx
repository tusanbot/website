"use client";

import { useEffect, useState } from "react";
import { Bot, KeyRound, ShieldCheck, Trash2, Volume2, MessageSquareText } from "lucide-react";
import { TusanButton, TusanCard } from "@/components/ui";

type ModelConfig = { text?: string; image?: string; video?: string; music?: string; tts?: string };
type Profile = {
  id: string;
  provider: string;
  model: string;
  model_config?: ModelConfig;
  created_at: string;
  last_used_at: string | null;
};

export default function AiProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [textApiKey, setTextApiKey] = useState("");
  const [ttsApiKey, setTtsApiKey] = useState("");
  const [imageApiKey, setImageApiKey] = useState("");
  const [videoApiKey, setVideoApiKey] = useState("");
  const [musicApiKey, setMusicApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/ai/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "بارگذاری پروفایل هوش مصنوعی انجام نشد.");
        if (active && data.profile) setProfile(data.profile);
      })
      .catch((e) => {
        if (!active) return;
        setError(true);
        setMessage(e instanceof Error ? e.message : "بارگذاری پروفایل هوش مصنوعی انجام نشد.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError(false);

    try {
      const apiKeys: Record<string, string> = {};
      if (textApiKey.trim()) apiKeys.text = textApiKey.trim();
      if (ttsApiKey.trim()) apiKeys.tts = ttsApiKey.trim();
      if (imageApiKey.trim()) apiKeys.image = imageApiKey.trim();
      if (videoApiKey.trim()) apiKeys.video = videoApiKey.trim();
      if (musicApiKey.trim()) apiKeys.music = musicApiKey.trim();

      const response = await fetch("/api/ai/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ apiKeys }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "ذخیره پروفایل هوش مصنوعی انجام نشد.");

      setProfile(data.profile);
      setTextApiKey("");
      setTtsApiKey("");
      setImageApiKey("");
      setVideoApiKey("");
      setMusicApiKey("");
      setMessage("تنظیمات هوش مصنوعی با موفقیت ذخیره شد.");
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "ذخیره پروفایل هوش مصنوعی انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("کلیدهای API ذخیره‌شده حذف شوند؟")) return;
    try {
      const response = await fetch("/api/ai/profile", { method: "DELETE", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "حذف تنظیمات ناموفق بود.");
      setProfile(null);
      setTextApiKey("");
      setTtsApiKey("");
      setMessage("تنظیمات هوش مصنوعی حذف شد.");
      setError(false);
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "حذف تنظیمات ناموفق بود.");
    }
  }

  const textModel = profile?.model_config?.text;
  const ttsModel = profile?.model_config?.tts;
  const imageModel = profile?.model_config?.image;
  const videoModel = profile?.model_config?.video;
  const musicModel = profile?.model_config?.music;

  return (
    <section className="mx-auto max-w-3xl space-y-5" dir="rtl">
      <div>
        <div className="flex items-center gap-2 text-[var(--primary)]"><Bot size={22} /><span className="text-sm font-bold">هوش مصنوعی</span></div>
        <h1 className="mt-2 text-2xl font-black">پروفایل هوش مصنوعی</h1>
        <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">کلیدهای شخصی Gemini را برای قابلیت‌هایی که استفاده می‌کنید ثبت کنید. هر قابلیت مستقل اعتبارسنجی می‌شود و برای متن به صوت نیازی به کلید متن و چت ندارید.</p>
      </div>

      <TusanCard className="p-5 sm:p-7">
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary)]/5 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--primary)]" size={22} />
          <div className="text-sm leading-7">
            <strong>امنیت کلید</strong>
            <p className="text-[var(--text-muted)]">کلیدها فقط در سمت سرور و به‌صورت رمزنگاری‌شده نگهداری می‌شوند و در رابط کاربری نمایش داده نمی‌شوند.</p>
          </div>
        </div>

        <form onSubmit={save} className="space-y-5">
          <div className="rounded-2xl border border-[var(--border)] p-4">
            <div className="mb-3 flex items-center gap-2"><MessageSquareText size={19} className="text-[var(--primary)]" /><h2 className="font-bold">متن و چت</h2></div>
            <p className="mb-3 text-sm leading-6 text-[var(--text-muted)]">برای چت و قابلیت‌های تولید و پردازش متن توسن.</p>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input type="password" value={textApiKey} onChange={(e) => setTextApiKey(e.target.value)} dir="ltr" autoComplete="new-password" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-4 text-left outline-none" placeholder={textModel ? "کلید متن و چت ثبت شده است؛ برای تغییر کلید جدید وارد کنید" : "کلید Gemini برای متن و چت"} />
            </div>
            {textModel && <p className="mt-2 text-xs text-emerald-700">مدل فعال: <span dir="ltr">{textModel}</span></p>}
          </div>

          <div className="rounded-2xl border border-[var(--border)] p-4">
            <div className="mb-3 flex items-center gap-2"><Volume2 size={19} className="text-[var(--primary)]" /><h2 className="font-bold">متن به صوت</h2></div>
            <p className="mb-3 text-sm leading-6 text-[var(--text-muted)]">کلید Gemini مخصوص تولید صوت. این کلید کاملاً مستقل از کلید متن و چت است.</p>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input type="password" value={ttsApiKey} onChange={(e) => setTtsApiKey(e.target.value)} dir="ltr" autoComplete="new-password" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-4 text-left outline-none" placeholder={ttsModel ? "کلید متن به صوت ثبت شده است؛ برای تغییر کلید جدید وارد کنید" : "کلید Gemini برای متن به صوت"} />
            </div>
            {ttsModel && <p className="mt-2 text-xs text-emerald-700">مدل فعال: <span dir="ltr">{ttsModel}</span></p>}
          </div>

          <div className="rounded-2xl border border-[var(--border)] p-4"><h2 className="font-bold mb-3">تولید تصویر</h2><p className="mb-3 text-sm leading-6 text-[var(--text-muted)]">کلید Gemini برای ابزارهای تولید و ویرایش تصویر.</p><input type="password" value={imageApiKey} onChange={(e) => setImageApiKey(e.target.value)} dir="ltr" autoComplete="new-password" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 px-4 text-left outline-none" placeholder={imageModel ? "کلید تصویر ثبت شده است؛ برای تغییر وارد کنید" : "کلید Gemini برای تصویر"} />{imageModel && <p className="mt-2 text-xs text-emerald-700">مدل فعال: <span dir="ltr">{imageModel}</span></p>}</div>

          <div className="rounded-2xl border border-[var(--border)] p-4"><h2 className="font-bold mb-3">تولید ویدیو</h2><p className="mb-3 text-sm leading-6 text-[var(--text-muted)]">کلید Gemini برای قابلیت‌های ویدیویی.</p><input type="password" value={videoApiKey} onChange={(e) => setVideoApiKey(e.target.value)} dir="ltr" autoComplete="new-password" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 px-4 text-left outline-none" placeholder={videoModel ? "کلید ویدیو ثبت شده است؛ برای تغییر وارد کنید" : "کلید Gemini برای ویدیو"} />{videoModel && <p className="mt-2 text-xs text-emerald-700">مدل فعال: <span dir="ltr">{videoModel}</span></p>}</div>

          <div className="rounded-2xl border border-[var(--border)] p-4"><h2 className="font-bold mb-3">تولید موسیقی</h2><p className="mb-3 text-sm leading-6 text-[var(--text-muted)]">کلید Gemini برای قابلیت‌های تولید موسیقی.</p><input type="password" value={musicApiKey} onChange={(e) => setMusicApiKey(e.target.value)} dir="ltr" autoComplete="new-password" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 px-4 text-left outline-none" placeholder={musicModel ? "کلید موسیقی ثبت شده است؛ برای تغییر وارد کنید" : "کلید Gemini برای موسیقی"} />{musicModel && <p className="mt-2 text-xs text-emerald-700">مدل فعال: <span dir="ltr">{musicModel}</span></p>}</div>

          <p className="text-xs leading-6 text-[var(--text-muted)]">حداقل یکی از دو کلید را وارد کنید. اگر قبلاً یک قابلیت را ثبت کرده‌اید، برای افزودن قابلیت دیگر لازم نیست کلید قبلی را دوباره وارد کنید.</p>

          {message && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</div>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <TusanButton type="submit" disabled={saving || loading}>{saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}</TusanButton>
            {profile && <button type="button" onClick={remove} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"><Trash2 size={17} />حذف کلیدها</button>}
          </div>
        </form>
      </TusanCard>
    </section>
  );
}
