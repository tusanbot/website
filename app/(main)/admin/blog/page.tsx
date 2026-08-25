"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";


type Service = { id: string; title: string; slug: string | null };
type Category = { id: string; name: string; slug: string };
type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: "draft" | "published";
  published_at: string | null;
  primary_keyword: string | null;
  seo_keywords: string[] | null;
  blog_categories?: { name: string } | null;
  blog_post_services?: Array<{ service_id: string; services?: Service | null }>;
};

type FormState = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category_id: string;
  meta_title: string;
  meta_description: string;
  status: "draft" | "published";
  primary_keyword: string;
  seo_keywords: string;
  serviceIds: string[];
};

const emptyForm: FormState = {
  title: "", slug: "", excerpt: "", content: "", featured_image: "", category_id: "",
  meta_title: "", meta_description: "", status: "draft", primary_keyword: "", seo_keywords: "", serviceIds: [],
};

function toForm(post: Post): FormState {
  return {
    id: post.id,
    title: post.title || "",
    slug: post.slug || "",
    excerpt: post.excerpt || "",
    content: post.content || "",
    featured_image: post.featured_image || "",
    category_id: post.category_id || "",
    meta_title: post.meta_title || "",
    meta_description: post.meta_description || "",
    status: post.status || "draft",
    primary_keyword: post.primary_keyword || "",
    seo_keywords: (post.seo_keywords || []).join(", "),
    serviceIds: (post.blog_post_services || []).map((item) => item.service_id),
  };
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isEditing = Boolean(form.id);
  const publishedCount = useMemo(() => posts.filter((post) => post.status === "published").length, [posts]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/blog", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "دریافت مقالات انجام نشد.");
      setPosts(data.posts || []);
      setCategories(data.categories || []);
      setServices(data.services || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generateWithAi() {
    if (!form.title.trim() && !form.primary_keyword.trim() && !form.content.trim()) {
      setError("برای تولید مقاله با AI ابتدا موضوع یا کلمه کلیدی اصلی را وارد کنید.");
      return;
    }
    setAiLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "blog",
          instruction: `موضوع/هدف مقاله: ${form.title}\nکلمه کلیدی اصلی: ${form.primary_keyword}\nدستور مدیر: ${form.excerpt}`,
          current: {
            title: form.title,
            slug: form.slug,
            excerpt: form.excerpt,
            content: form.content,
            meta_title: form.meta_title,
            meta_description: form.meta_description,
            seo_keywords: form.seo_keywords.split(",").map((item) => item.trim()).filter(Boolean),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تولید محتوا انجام نشد.");
      const ai = data.data || {};
      setForm((current) => ({
        ...current,
        title: String(ai.title || current.title),
        slug: String(ai.slug || current.slug),
        excerpt: String(ai.excerpt || current.excerpt),
        content: String(ai.content || current.content),
        meta_title: String(ai.meta_title || current.meta_title),
        meta_description: String(ai.meta_description || current.meta_description),
        seo_keywords: Array.isArray(ai.seo_keywords) ? ai.seo_keywords.map(String).join(", ") : current.seo_keywords,
        primary_keyword: current.primary_keyword || (Array.isArray(ai.seo_keywords) ? String(ai.seo_keywords[0] || "") : ""),
      }));
      setNotice("پیش‌نویس با Gemini تولید شد؛ قبل از انتشار آن را بررسی و ویرایش کنید.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تولید محتوا انجام نشد.");
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      setError("عنوان، Slug و محتوای مقاله الزامی هستند.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...(form.id ? { id: form.id } : {}),
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        featured_image: form.featured_image.trim() || null,
        category_id: form.category_id || null,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
        status: form.status,
        primary_keyword: form.primary_keyword.trim() || null,
        seo_keywords: form.seo_keywords.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
        serviceIds: form.serviceIds,
      };
      const response = await fetch("/api/admin/blog", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ذخیره مقاله انجام نشد.");
      setNotice(form.id ? "مقاله بروزرسانی شد." : "مقاله ایجاد شد.");
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره مقاله انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("این مقاله حذف شود؟")) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/blog?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "حذف انجام نشد.");
      if (form.id === id) setForm(emptyForm);
      setNotice("مقاله حذف شد.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حذف انجام نشد.");
    }
  }

  function toggleService(id: string) {
    setForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(id) ? current.serviceIds.filter((item) => item !== id) : [...current.serviceIds, id],
    }));
  }

  return (
    <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6 text-[var(--text)]">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">مدیریت وبلاگ</h1>
            <p className="mt-2 text-[var(--text-muted)]">ایجاد، ویرایش، انتشار و بهینه‌سازی مقالات با اتصال مستقیم به Gemini.</p>
          </div>
          <Link href="/blog" className="rounded-xl border border-[var(--border)] px-4 py-2 font-bold hover:bg-[var(--surface)]">مشاهده وبلاگ</Link>
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{notice}</div>}

        <section className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="text-sm text-[var(--text-muted)]">کل مقالات</div><div className="text-3xl font-black mt-2">{posts.length.toLocaleString("fa-IR")}</div></div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="text-sm text-[var(--text-muted)]">منتشرشده</div><div className="text-3xl font-black mt-2">{publishedCount.toLocaleString("fa-IR")}</div></div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="text-sm text-[var(--text-muted)]">پیش‌نویس</div><div className="text-3xl font-black mt-2">{(posts.length - publishedCount).toLocaleString("fa-IR")}</div></div>
        </section>

        <section className="grid xl:grid-cols-[1.05fr_1.95fr] gap-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 h-fit">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-black">مقالات</h2>
              <button type="button" onClick={() => { setForm(emptyForm); setError(""); setNotice(""); }} className="rounded-xl bg-[var(--primary)] text-white px-4 py-2 font-bold">مقاله جدید</button>
            </div>
            {loading ? <p className="text-[var(--text-muted)]">در حال دریافت...</p> : posts.length === 0 ? <p className="text-[var(--text-muted)] py-8 text-center">هنوز مقاله‌ای ثبت نشده است.</p> : <div className="space-y-3 max-h-[720px] overflow-auto">{posts.map((post) => <div key={post.id} className={`rounded-xl border p-4 ${form.id === post.id ? "border-[var(--primary)]" : "border-[var(--border)]"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold leading-7">{post.title}</h3><div className="text-xs text-[var(--text-muted)] mt-1">/{post.slug}</div></div><span className={`text-xs rounded-full px-2 py-1 ${post.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{post.status === "published" ? "منتشرشده" : "پیش‌نویس"}</span></div><div className="flex gap-2 mt-3"><button type="button" onClick={() => setForm(toForm(post))} className="rounded-lg border px-3 py-1.5 text-sm font-bold">ویرایش</button><button type="button" onClick={() => void remove(post.id)} className="rounded-lg bg-red-50 text-red-700 px-3 py-1.5 text-sm font-bold">حذف</button>{post.status === "published" && <Link href={`/blog/${encodeURIComponent(post.slug)}`} target="_blank" className="rounded-lg bg-emerald-50 text-emerald-700 px-3 py-1.5 text-sm font-bold">مشاهده</Link>}</div></div>)}</div>}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5"><div><h2 className="text-xl font-black">{isEditing ? "ویرایش مقاله" : "ایجاد مقاله"}</h2><p className="text-sm text-[var(--text-muted)] mt-1">AI فقط پیش‌نویس می‌سازد؛ انتشار نهایی با مدیر است.</p></div><button type="button" onClick={() => void generateWithAi()} disabled={aiLoading} className="rounded-xl bg-violet-600 text-white px-4 py-2 font-bold disabled:opacity-50">{aiLoading ? "در حال تولید..." : "✨ تولید با Gemini"}</button></div>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="md:col-span-2"><span className="block text-sm font-bold mb-2">عنوان *</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <label><span className="block text-sm font-bold mb-2">Slug *</span><input dir="ltr" value={form.slug} onChange={(e) => setField("slug", e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <label><span className="block text-sm font-bold mb-2">کلمه کلیدی اصلی</span><input value={form.primary_keyword} onChange={(e) => setField("primary_keyword", e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="block text-sm font-bold mb-2">خلاصه / دستور موضوعی</span><textarea value={form.excerpt} onChange={(e) => setField("excerpt", e.target.value)} rows={3} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" placeholder="مثلاً راهنمای ثبت نام تعویض پلاک در سال ۱۴۰۵" /></label>
              <label><span className="block text-sm font-bold mb-2">دسته‌بندی</span><select value={form.category_id} onChange={(e) => setField("category_id", e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><option value="">بدون دسته‌بندی</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><span className="block text-sm font-bold mb-2">وضعیت</span><select value={form.status} onChange={(e) => setField("status", e.target.value as FormState["status"])} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><option value="draft">پیش‌نویس</option><option value="published">انتشار</option></select></label>
              <label className="md:col-span-2"><span className="block text-sm font-bold mb-2">تصویر شاخص</span><input dir="ltr" value={form.featured_image} onChange={(e) => setField("featured_image", e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" placeholder="https://..." /></label>
              <label><span className="block text-sm font-bold mb-2">Meta Title</span><input maxLength={60} value={form.meta_title} onChange={(e) => setField("meta_title", e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <label><span className="block text-sm font-bold mb-2">Meta Description</span><input maxLength={160} value={form.meta_description} onChange={(e) => setField("meta_description", e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <label className="md:col-span-2"><span className="block text-sm font-bold mb-2">کلیدواژه‌های مرتبط</span><input value={form.seo_keywords} onChange={(e) => setField("seo_keywords", e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" placeholder="با ویرگول جدا کنید" /></label>
              <label className="md:col-span-2"><span className="block text-sm font-bold mb-2">محتوا *</span><textarea value={form.content} onChange={(e) => setField("content", e.target.value)} rows={18} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 font-mono text-sm" placeholder="HTML ساده مقاله را وارد کنید..." /></label>
            </div>

            <div className="mt-5 rounded-xl border border-[var(--border)] p-4"><div className="font-bold mb-3">اتصال مقاله به خدمات</div><div className="grid sm:grid-cols-2 gap-2 max-h-52 overflow-auto">{services.map((service) => <label key={service.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2"><input type="checkbox" checked={form.serviceIds.includes(service.id)} onChange={() => toggleService(service.id)} /><span className="text-sm">{service.title}</span></label>)}</div></div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3"><button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[var(--primary)] text-white px-5 py-3 font-black disabled:opacity-50">{saving ? "در حال ذخیره..." : isEditing ? "ذخیره تغییرات" : "ایجاد مقاله"}</button><button type="button" onClick={() => setForm(emptyForm)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-bold">پاک کردن فرم</button></div>
          </div>
        </section>
      </div>
    </main>
  );
}
