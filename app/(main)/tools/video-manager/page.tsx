import type { Metadata } from "next";
import VideoManager from "@/components/tools/VideoManager";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/video-manager");

export default function VideoManagerPage() {
  return <main dir="rtl" className="min-h-screen page-background py-12 md:py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><header className="mx-auto max-w-3xl text-center"><div className="text-sm font-black text-[var(--primary)]">Video Manager</div><h1 className="mt-2 text-3xl font-black md:text-4xl">مدیریت ویدیو آنلاین</h1><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">پیش‌نمایش ویدیو، مشاهده مشخصات فایل و استخراج تصویر شاخص؛ بدون آپلود فایل روی سرور.</p></header><div className="mt-10"><VideoManager /></div><div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-dashed border-[var(--border)] p-4 text-center text-xs leading-6 text-[var(--text-muted)]">نسخه فعلی سبک و مرورگری است. برش واقعی، تغییر کدک و تبدیل حجم ویدیو به موتور پردازش سنگین مانند FFmpeg/WASM نیاز دارد و در مرحله بعد می‌توان آن را جداگانه اضافه کرد.</div></div></main>;
}
