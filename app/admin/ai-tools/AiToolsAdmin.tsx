"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tool = { id: string; name: string; slug: string; description: string | null; provider: string; model: string; active: boolean; rate_limit: number; system_prompt: string | null; created_at: string; updated_at: string; last_used_at: string | null };
type FormState = { name: string; slug: string; description: string; model: string; apiKey: string; rateLimit: string; systemPrompt: string; active: boolean };
const empty: FormState = { name: "", slug: "", description: "", model: "gemini-2.5-flash", apiKey: "", rateLimit: "30", systemPrompt: "", active: true };

export default function AiToolsAdmin() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` };
  }
  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/ai/tools", { headers: await authHeaders() });
    const data = await res.json();
    setTools(data.tools || []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function edit(tool: Tool) {
    setEditing(tool.id);
    setForm({ name: tool.name, slug: tool.slug, description: tool.description || "", model: tool.model, apiKey: "", rateLimit: String(tool.rate_limit), systemPrompt: tool.system_prompt || "", active: tool.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const headers = await authHeaders();
    const payload = { ...form, rateLimit: Number(form.rateLimit), ...(editing ? { id: editing } : {}) };
    if (editing && !form.apiKey) delete (payload as Partial<FormState>).apiKey;
    const res = await fetch("/api/admin/ai/tools", { method: editing ? "PATCH" : "POST", headers, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMessage(data.error || "ذخیره انجام نشد."); return; }
    setMessage(editing ? "ابزار ویرایش شد." : "ابزار ایجاد شد."); setEditing(null); setForm(empty); await load();
  }
  async function toggle(tool: Tool) {
    const res = await fetch("/api/admin/ai/tools", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ id: tool.id, active: !tool.active }) });
    if (res.ok) await load();
  }
  async function remove(tool: Tool) {
    if (!window.confirm(`حذف «${tool.name}» انجام شود؟`)) return;
    const res = await fetch(`/api/admin/ai/tools?id=${encodeURIComponent(tool.id)}`, { method: "DELETE", headers: await authHeaders() });
    if (res.ok) await load(); else { const data = await res.json(); setMessage(data.error || "حذف انجام نشد."); }
  }

  return <main dir="rtl" className="mx-auto min-h-screen max-w-6xl p-4 md:p-8">
    <div className="mb-6"><h1 className="text-2xl font-bold">مدیریت ابزارهای هوش مصنوعی</h1><p className="mt-2 text-sm text-muted-foreground">هر ابزار credential مستقل دارد؛ کلیدها هرگز به مرورگر برگردانده نمی‌شوند.</p></div>
    <form onSubmit={submit} className="mb-8 grid gap-4 rounded-2xl border bg-card p-5 shadow-sm md:grid-cols-2">
      <div className="md:col-span-2"><h2 className="font-semibold">{editing ? "ویرایش ابزار" : "افزودن ابزار جدید"}</h2></div>
      <input className="rounded-lg border p-3" placeholder="نام ابزار" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input className="rounded-lg border p-3" placeholder="slug" required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
      <input className="rounded-lg border p-3" placeholder="مدل Gemini" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
      <input className="rounded-lg border p-3" type="number" min="1" max="10000" placeholder="محدودیت درخواست" value={form.rateLimit} onChange={e => setForm({ ...form, rateLimit: e.target.value })} />
      <input className="rounded-lg border p-3 md:col-span-2" placeholder={editing ? "کلید جدید (اختیاری برای حفظ کلید فعلی)" : "کلید Gemini"} type="password" autoComplete="new-password" required={!editing} value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} />
      <textarea className="min-h-20 rounded-lg border p-3 md:col-span-2" placeholder="توضیح کوتاه" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      <textarea className="min-h-28 rounded-lg border p-3 md:col-span-2" placeholder="System Prompt اختصاصی این ابزار" value={form.systemPrompt} onChange={e => setForm({ ...form, systemPrompt: e.target.value })} />
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> فعال باشد</label>
      <div className="flex gap-2 md:col-span-2"><button disabled={saving} className="rounded-lg bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{saving ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "ایجاد ابزار"}</button>{editing && <button type="button" className="rounded-lg border px-5 py-3" onClick={() => { setEditing(null); setForm(empty); }}>انصراف</button>}</div>
      {message && <p className="md:col-span-2 text-sm">{message}</p>}
    </form>
    <section className="space-y-3">
      {loading ? <p>در حال دریافت ابزارها…</p> : tools.length === 0 ? <p className="rounded-xl border p-6 text-sm text-muted-foreground">هنوز ابزار مستقلی ساخته نشده است.</p> : tools.map(tool => <article key={tool.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div><div className="flex items-center gap-2"><h3 className="font-semibold">{tool.name}</h3><span className={`rounded-full px-2 py-1 text-xs ${tool.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{tool.active ? "فعال" : "غیرفعال"}</span></div><p className="mt-1 text-sm text-muted-foreground">{tool.slug} · {tool.provider} · {tool.model} · سقف {tool.rate_limit} درخواست</p>{tool.description && <p className="mt-2 text-sm">{tool.description}</p>}</div>
        <div className="flex shrink-0 gap-2"><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => void toggle(tool)}>{tool.active ? "غیرفعال‌سازی" : "فعال‌سازی"}</button><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => edit(tool)}>ویرایش</button><button className="rounded-lg border px-3 py-2 text-sm text-destructive" onClick={() => void remove(tool)}>حذف</button></div>
      </article>)}
    </section>
  </main>;
}
