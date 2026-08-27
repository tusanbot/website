"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, MessageCircle, Search, Trash2, X } from "lucide-react";

type Comment = {
  id: string;
  post_id: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  author_name: string | null;
  blog_posts: { id: string; title: string; slug: string } | null;
};

type Props = { initialPendingCount?: number };

const statusLabels = { all: "همه", pending: "در انتظار", approved: "تأیید شده", rejected: "رد شده" } as const;

export default function CommentsAdmin({ initialPendingCount = 0 }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [status, setStatus] = useState<keyof typeof statusLabels>("pending");
  const [search, setSearch] = useState("");
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ status });
    if (search.trim()) params.set("search", search.trim());
    const response = await fetch(`/api/admin/blog/comments?${params.toString()}`, { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setError(json.error || "خطا در دریافت نظرات");
    else { setComments(json.comments || []); setPendingCount(json.pendingCount || 0); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [status]);

  const filteredComments = useMemo(() => comments, [comments]);

  async function changeStatus(id: string, nextStatus: Comment["status"]) {
    setBusyId(id); setError("");
    const response = await fetch("/api/admin/blog/comments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: nextStatus }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setError(json.error || "عملیات انجام نشد");
    else setComments(current => current.map(item => item.id === id ? { ...item, status: nextStatus } : item).filter(item => status === "all" || item.status === status));
    setBusyId(null);
    if (nextStatus !== "pending") setPendingCount(value => Math.max(0, value - 1));
  }

  async function remove(id: string) {
    if (!window.confirm("این نظر برای همیشه حذف شود؟")) return;
    setBusyId(id); setError("");
    const response = await fetch(`/api/admin/blog/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setError(json.error || "حذف نظر انجام نشد");
    else setComments(current => current.filter(item => item.id !== id));
    setBusyId(null);
  }

  return <main dir="rtl" className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
    <header className="mb-7 rounded-[28px] border border-[var(--border)] bg-gradient-to-l from-[var(--primary-light)] via-white to-white p-6 shadow-[var(--shadow-sm)] md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div><Link href="/admin/blog" className="text-sm font-bold text-[var(--primary-dark)] hover:underline">← مدیریت وبلاگ</Link><h1 className="mt-2 text-3xl font-black text-[var(--text)]">مدیریت نظرات وبلاگ</h1><p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">نظرات کاربران را بررسی، تأیید، رد یا حذف کنید.</p></div>
        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm"><div className="text-xs font-bold text-[var(--text-muted)]">در انتظار بررسی</div><div className="mt-1 text-3xl font-black text-[var(--primary-dark)]">{pendingCount}</div></div>
      </div>
    </header>

    {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

    <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">{(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map(item => <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${status === item ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)]"}`}>{statusLabels[item]}{item === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}</button>)}</div>
        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2"><Search size={18} className="text-[var(--text-muted)]"/><input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void load(); }} placeholder="جستجو در نام یا متن نظر..." className="min-w-0 flex-1 bg-transparent text-sm outline-none"/><button type="button" onClick={() => void load()} className="rounded-lg bg-[var(--primary-light)] px-3 py-1.5 text-xs font-extrabold text-[var(--primary-dark)]">جستجو</button></div>
      </div>
    </section>

    <section className="space-y-4">{loading ? <div className="rounded-2xl border bg-white p-10 text-center text-sm text-[var(--text-muted)]">در حال بارگذاری نظرات...</div> : filteredComments.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center"><MessageCircle className="mx-auto text-[var(--text-muted)]" size={34}/><p className="mt-3 font-bold text-[var(--text-secondary)]">نظری در این بخش وجود ندارد.</p></div> : filteredComments.map(item => <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-sm)] md:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-black text-[var(--text)]">{item.author_name || "کاربر"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${item.status === "pending" ? "bg-amber-50 text-amber-700" : item.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{statusLabels[item.status]}</span><time className="text-xs text-[var(--text-muted)]">{new Date(item.created_at).toLocaleString("fa-IR")}</time></div><Link href={`/blog/${encodeURIComponent(item.blog_posts?.slug || "")}`} target="_blank" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[var(--primary-dark)] hover:underline">{item.blog_posts?.title || "مقاله حذف شده"}<ExternalLink size={14}/></Link><p className="mt-4 whitespace-pre-wrap rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-8 text-[var(--text-secondary)]">{item.content}</p></div><div className="flex shrink-0 flex-wrap gap-2 md:w-44 md:flex-col">{item.status !== "approved" && <button disabled={busyId === item.id} onClick={() => void changeStatus(item.id, "approved")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={17}/> تأیید</button>}{item.status !== "rejected" && <button disabled={busyId === item.id} onClick={() => void changeStatus(item.id, "rejected")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 disabled:opacity-50"><X size={17}/> رد</button>}<button disabled={busyId === item.id} onClick={() => void remove(item.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><Trash2 size={17}/> حذف</button></div></div></article>)}</section>
  </main>;
}
