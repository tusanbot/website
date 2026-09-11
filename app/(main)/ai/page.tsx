"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Image, FileText, GraduationCap, Music2, Video, WandSparkles, ArrowLeft } from "lucide-react";
import { TusanButton } from "@/components/ui";

type Message = { role: "user" | "assistant"; content: string };

const tools = [
  { title: "چت هوش مصنوعی", description: "گفت‌وگوی متنی با مدل انتخابی شما", icon: Bot, active: true },
  { title: "حل سوال و امتحان", description: "تحلیل سوالات درسی و دانشگاهی", icon: GraduationCap, active: false },
  { title: "تحلیل PDF و فایل", description: "خلاصه، استخراج و پرسش از فایل", icon: FileText, active: false },
  { title: "ساخت تصویر", description: "تولید و ویرایش تصویر با AI", icon: Image, active: false },
  { title: "ساخت ویدیو", description: "ایده، سناریو و تولید ویدیو", icon: Video, active: false },
  { title: "ساخت موسیقی", description: "موسیقی با سبک‌های مختلف", icon: Music2, active: false },
  { title: "پرامپت‌ساز", description: "ساخت پرامپت حرفه‌ای برای مدل‌ها", icon: WandSparkles, active: false },
];

export default function AiHubPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "درخواست ناموفق بود.");
      setMessages([...next, { role: "assistant", content: data.text }]);
    } catch (error) {
      setMessages([...next, { role: "assistant", content: error instanceof Error ? error.message : "خطایی هنگام دریافت پاسخ رخ داد." }]);
    } finally { setLoading(false); }
  }

  return <section className="mx-auto max-w-6xl space-y-6" dir="rtl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="flex items-center gap-2 text-[var(--primary)]"><Bot size={23} /><span className="text-sm font-bold">Tosan AI</span></div><h1 className="mt-2 text-3xl font-black">مرکز هوش مصنوعی توسن</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">ابزارهای هوش مصنوعی در یک محیط واحد؛ با API شخصی خودتان.</p></div>
      <Link href="/profile/ai"><TusanButton variant="secondary">تنظیم API شخصی</TusanButton></Link>
    </div>

    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-2">
        {tools.map(({ title, description, icon: Icon, active }) => <div key={title} className={`rounded-2xl border p-3 ${active ? "border-[var(--primary)]/30 bg-[var(--primary)]/8" : "border-[var(--border)] bg-[var(--surface)] opacity-70"}`}><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Icon size={19} /></span><div><div className="text-sm font-black">{title}</div><div className="mt-0.5 text-[11px] leading-5 text-[var(--text-muted)]">{description}</div></div></div></div>)}
      </aside>

      <div className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="border-b border-[var(--border)] px-5 py-4"><div className="font-black">چت هوش مصنوعی</div><div className="mt-1 text-xs text-[var(--text-muted)]">کلید API شما از سمت سرور برای Provider استفاده می‌شود.</div></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {!messages.length && <div className="flex min-h-[440px] items-center justify-center text-center"><div className="max-w-md"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"><Bot size={32} /></div><h2 className="mt-4 text-xl font-black">چه کاری می‌توانم برایتان انجام دهم؟</h2><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">سؤال درسی، تحلیل متن، ایده‌پردازی، برنامه‌نویسی، ترجمه یا هر درخواست متنی دیگری را بنویسید.</p></div></div>}
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}><div className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === "user" ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--surface-secondary)]"}`}>{message.content}</div></div>)}
          {loading && <div className="flex justify-end"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-muted)]">در حال دریافت پاسخ...</div></div>}
        </div>
        <form onSubmit={sendMessage} className="border-t border-[var(--border)] p-3 sm:p-4"><div className="flex items-end gap-2"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows={2} placeholder="پیام خود را بنویسید..." className="min-h-12 flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" /><button type="submit" disabled={loading || !input.trim()} className="flex h-12 shrink-0 items-center justify-center gap-1 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">ارسال<ArrowLeft size={17} /></button></div><div className="mt-2 text-[10px] text-[var(--text-muted)]">Enter برای ارسال · Shift+Enter برای خط جدید</div></form>
      </div>
    </div>
  </section>;
}
