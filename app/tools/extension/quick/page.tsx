"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, ExternalLink, Search, FolderTree, ArrowUpRight } from "lucide-react";

type Site = { title: string; url: string };
type Category = { name: string; sites: Site[] };

export default function QuickBookmarksPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/extension-src/bookmarks/sites.json")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load bookmarks");
        return response.json();
      })
      .then((data: Category[]) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa");
    if (!normalized) return categories;
    return categories
      .map((category) => ({
        ...category,
        sites: category.sites.filter((site) =>
          (site.title + " " + site.url + " " + category.name).toLocaleLowerCase("fa").includes(normalized)
        ),
      }))
      .filter((category) => category.sites.length > 0);
  }, [categories, query]);

  return (
    <main dir="rtl" className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--text)] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl bg-gradient-to-br from-[#063e37] via-[#087d69] to-[#0b9b83] p-6 text-white shadow-lg sm:p-9">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/15"><Bookmark size={25}/></div>
            <div><p className="text-sm font-bold text-white/75">کافی‌نت توسن</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">دسترسی سریع به نشانک‌ها</h1></div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85">این صفحه مثل یک فهرست سریع در مرورگر عمل می‌کند. خدمات را جست‌وجو کنید و با کلیک روی هر مورد، سایت مربوطه را باز کنید. نیازی به نصب افزونه نیست.</p>
          <label className="mt-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-gray-800 shadow-sm">
            <Search size={19} className="shrink-0 text-gray-500"/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی سایت یا دسته‌بندی..." className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500" />
          </label>
        </header>

        {loading && <p className="py-12 text-center text-sm text-[var(--text-secondary)]">در حال بارگذاری فهرست خدمات...</p>}
        {error && <div role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">بارگذاری فهرست با خطا مواجه شد. لطفاً صفحه را تازه‌سازی کنید.</div>}
        {!loading && !error && filtered.length === 0 && <p className="py-12 text-center text-sm text-[var(--text-secondary)]">موردی با این عبارت پیدا نشد.</p>}

        <div className="mt-7 space-y-5">
          {filtered.map((category) => (
            <section key={category.name} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 sm:px-5">
                <FolderTree size={19} className="text-[var(--primary)]"/>
                <h2 className="flex-1 font-black">{category.name}</h2>
                <span className="rounded-full bg-[var(--primary-light)] px-2.5 py-1 text-xs font-bold text-[var(--primary-dark)]">{category.sites.length} لینک</span>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
                {category.sites.map((site) => (
                  <a key={site.title + site.url} href={site.url} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] p-3 transition hover:border-[var(--primary)] hover:bg-[var(--surface-muted)]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]"><ExternalLink size={16}/></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{site.title}</span><span dir="ltr" className="mt-1 block truncate text-[10px] text-[var(--text-muted)]">{site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span></span>
                    <ArrowUpRight size={15} className="shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--primary)]"/>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
        <footer className="mt-10 border-t border-[var(--border)] pt-5 text-center text-xs leading-6 text-[var(--text-muted)]">
          <a href="/tools/extension" className="font-bold text-[var(--primary)]">راهنمای نشانک‌های توسن</a>
          <span className="mx-2">·</span>
          <a href="/tools" className="font-bold text-[var(--primary)]">ابزارهای آنلاین توسن</a>
        </footer>
      </div>
    </main>
  );
}
