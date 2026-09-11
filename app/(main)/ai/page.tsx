"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Sparkles, WandSparkles } from "lucide-react";
import { TusanButton } from "@/components/ui";
import { aiCategoryLabels, aiTools } from "@/lib/ai-tools";

type Message = { role: "user" | "assistant"; content: string };

export default function AiHubPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const groupedTools = useMemo(() => {
    return (Object.keys(aiCategoryLabels) as Array<keyof typeof aiCategoryLabels>).map((category) => ({
      category,
      title: aiCategoryLabels[category],
      tools: aiTools.filter((tool) => tool.category === category),
    })).filter((group) => group.tools.length);
  }, []);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "درخواست ناموفق بود.");
      setMessages([...next, { role: "assistant", content: data.text }]);
    } catch (error) {
      setMessages([...next, { role: "assistant", content: error instanceof Error ? error.message : "خطایی هنگام دریافت پاسخ رخ داد." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6" dir="rtl">
      <div className="rounded-3xl border border-[var(--primary)]/15 bg-[var(--primary)]/5 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[var(--primary)]"><Sparkles size={21} /><span className="text-sm font-black">Tosan AI</span></div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">مرکز هوش مصنوعی توسن</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">تولید تصویر، ویدیو و موسیقی، مدیریت اسناد، آموزش و حل سؤال و ساخت پرامپت؛ ابزارهای عمومی آنلاین در این بخش نمایش داده نمی‌شوند.</p>
          </div>
          <Link href="/tools/ai-profile"><TusanButton variant="secondary">تنظیم دسترسی هوش مصنوعی</TusanButton></Link>
        </div>
      </div>

      <div className="space-y-6">
        {groupedTools.map((group) => (
          <section key={group.category}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">{group.title}</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">ابزارهای تخصصی این بخش را مستقیم اجرا کنید.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.tools.map((tool) => (
                <Link key={tool.id} href={tool.href} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-lg">{tool.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><div className="font-black">{tool.title}</div><ArrowLeft size={15} className="shrink-0 text-[var(--text-muted)] transition group-hover:-translate-x-1 group-hover:text-[var(--primary)]" /></div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{tool.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div id="ai-chat" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4"><div className="flex items-center gap-2 font-black"><Bot size={19} className="text-[var(--primary)]" />چت عمومی هوش مصنوعی</div><div className="mt-1 text-xs text-[var(--text-muted)]">برای سؤال‌های عمومی متنی از چت Gemini استفاده کنید.</div></div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {!messages.length && <div className="flex min-h-[440px] items-center justify-center text-center"><div className="max-w-md"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"><WandSparkles size={30} /></div><h2 className="mt-4 text-xl font-black">چه کاری می‌توانم برایتان انجام دهم؟</h2><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">سؤال درسی، تحلیل متن، ایده‌پردازی، برنامه‌نویسی، ترجمه یا هر درخواست متنی دیگر را بنویسید.</p></div></div>}
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}><div className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === "user" ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--surface-secondary)]"}`}>{message.content}</div></div>)}
            {loading && <div className="flex justify-end"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-muted)]">در حال دریافت پاسخ...</div></div>}
          </div>
          <form onSubmit={sendMessage} className="border-t border-[var(--border)] p-3 sm:p-4"><div className="flex items-end gap-2"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows={2} placeholder="پیام خود را بنویسید..." className="min-h-12 flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" /><button type="submit" disabled={loading || !input.trim()} className="flex h-12 shrink-0 items-center justify-center gap-1 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">ارسال<ArrowLeft size={17} /></button></div><div className="mt-2 text-[10px] text-[var(--text-muted)]">Enter برای ارسال · Shift+Enter برای خط جدید</div></form>
        </div>
        <aside className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center gap-2 font-black"><Sparkles size={18} className="text-[var(--primary)]" />ساختار مرکز AI</div><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">ابزارهای عمومی PDF، OCR، رزومه و محاسبات در «ابزارهای آنلاین» می‌مانند. این صفحه فقط ابزارهای هوش مصنوعی و قابلیت‌های مولد را معرفی می‌کند.</p><div className="mt-4 space-y-2 text-xs text-[var(--text-muted)]"><div className="rounded-xl bg-[var(--surface-secondary)] p-3">{aiTools.length} ابزار AI در این مرکز</div><div className="rounded-xl bg-[var(--surface-secondary)] p-3">۵ دسته اصلی</div><div className="rounded-xl bg-[var(--surface-secondary)] p-3">پردازش با API شخصی کاربر</div></div></aside>
      </div>
    </section>
  );
}
