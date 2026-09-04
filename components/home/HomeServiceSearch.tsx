"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

type ServiceResult = {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  description: string | null;
  price: number;
  icon: string | null;
};

export default function HomeServiceSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ServiceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setItems([]);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/services/search?q=${encodeURIComponent(value)}`, { cache: "no-store" });
        const payload = await response.json();
        if (id === requestId.current) setItems(payload?.ok && Array.isArray(payload.items) ? payload.items : []);
      } catch {
        if (id === requestId.current) setItems([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative z-30 mx-auto mt-6 w-full max-w-2xl text-right" dir="rtl">
      <label htmlFor="home-service-search" className="sr-only">جستجوی خدمت</label>
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--primary)]/20 bg-[var(--surface)]/90 px-3 py-2 shadow-lg backdrop-blur-xl">
        <Search size={20} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
        <input
          id="home-service-search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="خدمت موردنیازتان را جستجو کنید..."
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm font-bold text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
        />
        {query && <button type="button" onClick={() => { setQuery(""); setOpen(false); }} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-secondary)]" aria-label="پاک کردن جستجو"><X size={18} /></button>}
        {loading && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--primary)]/20 border-t-[var(--primary)]" aria-label="در حال جستجو" />}
      </div>

      {open && query.trim() && (
        <>
          <button type="button" aria-label="بستن نتایج جستجو" className="fixed inset-0 -z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 text-right shadow-2xl">
            {loading ? <div className="p-4 text-center text-sm text-[var(--text-muted)]">در حال جستجو...</div> : items.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--text-muted)]">خدمتی با این عبارت پیدا نشد.</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.slug ? `/services/${encodeURIComponent(item.slug)}` : `/services?q=${encodeURIComponent(item.title)}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-[var(--primary)]/5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-lg">{item.icon || "📄"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-[var(--text)]">{item.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{item.category || "خدمات آنلاین توسن"}</span>
                    </span>
                    {item.price > 0 && <span className="shrink-0 text-xs font-black text-[var(--primary)]">{item.price.toLocaleString("fa-IR")} تومان</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
