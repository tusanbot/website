import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import NewsReviewActions from "./NewsReviewActions";

export const metadata = { title: "مدیریت اخبار و اطلاعیه‌ها | توسن" };

export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/news");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "manager") redirect("/");
  const params = await searchParams;
  const status = ["review", "draft", "published", "archived"].includes(params.status || "") ? params.status! : "review";
  const { data: items, error } = await supabase.from("news_announcements")
    .select("id,title,slug,excerpt,category,source_name,source_url,created_at,published_at,status")
    .eq("status", status).order("created_at", { ascending: false }).limit(100);
  const labels: Record<string,string> = { review: "در انتظار بررسی", draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی‌شده" };
  return <main dir="rtl" className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="text-sm font-black text-[var(--primary)]">مدیریت محتوا</p><h1 className="mt-2 text-2xl font-black">اخبار و اطلاعیه‌ها</h1>
      <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">موارد جمع‌آوری‌شده ابتدا در صف بررسی قرار می‌گیرند و تا زمان انتشار دستی در سایت عمومی نمایش داده نمی‌شوند.</p>
      <div className="mt-4 flex flex-wrap gap-2">{Object.entries(labels).map(([key,label])=><a key={key} href={"/admin/news?status=" + key} className={"rounded-xl border px-4 py-2 text-sm font-bold " + (status===key ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--background)]")}>{label}</a>)}</div>
    </header>
    {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">خطا در خواندن اخبار: {error.message}. ابتدا مهاجرت دیتابیس را اجرا کنید.</p> :
    !items?.length ? <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--text-muted)]">در این وضعیت موردی وجود ندارد.</div> :
    <div className="space-y-3">{items.map(item=><article key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div className="min-w-0 flex-1"><h2 className="text-lg font-black leading-8">{item.title}</h2>{item.excerpt&&<p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{item.excerpt}</p>}<div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]"><span>منبع: {item.source_name || "ثبت دستی"}</span><span>•</span><span>وضعیت: {labels[item.status] || item.status}</span></div>{item.source_url&&<a className="mt-2 inline-block text-xs font-bold text-[var(--primary)] underline" href={item.source_url} target="_blank" rel="noreferrer">بازکردن منبع</a>}</div><NewsReviewActions id={item.id} status={item.status}/></div>
    </article>)}</div>}
  </main>;
}
