import type { Metadata } from "next";
import mysql from "mysql2/promise";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "آزمایش مهاجرت وبلاگ به MySQL | کافی نت توسن",
  description: "صفحه داخلی برای بررسی مهاجرت آزمایشی وبلاگ به MySQL.",
  robots: { index: false, follow: false, noarchive: true },
};

type PilotPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | Date | null;
  category_name: string | null;
};

function formatDate(value: string | Date | null) {
  if (!value) return "بدون تاریخ انتشار";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "بدون تاریخ انتشار";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).format(date);
}

export default async function MysqlBlogPilotPage() {
  const configured = Boolean(
    process.env.MYSQL_HOST &&
      process.env.MYSQL_USER &&
      process.env.MYSQL_PASSWORD &&
      process.env.MYSQL_DATABASE,
  );

  if (!configured) {
    return (
      <main dir="rtl" className="mx-auto max-w-3xl px-5 py-12">
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
          <h1 className="text-xl font-black">آزمایش MySQL هنوز پیکربندی نشده است</h1>
          <p className="mt-3 leading-8">
            متغیرهای اتصال MySQL در محیط اجرای سایت تعریف نشده‌اند. صفحات عادی سایت همچنان از Supabase استفاده می‌کنند.
          </p>
        </section>
      </main>
    );
  }

  let posts: PilotPost[] = [];
  let counts = { categories: 0, posts: 0, relations: 0 };
  let failed = false;
  let connection: mysql.Connection | undefined;

  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      charset: "utf8mb4",
      timezone: "Z",
      connectTimeout: 5000,
    });

    const [[categoryCount]] = await connection.query(
      "SELECT COUNT(*) AS count FROM blog_categories",
    ) as any;
    const [[postCount]] = await connection.query(
      "SELECT COUNT(*) AS count FROM blog_posts",
    ) as any;
    const [[relationCount]] = await connection.query(
      "SELECT COUNT(*) AS count FROM blog_post_services",
    ) as any;

    counts = {
      categories: Number(categoryCount.count),
      posts: Number(postCount.count),
      relations: Number(relationCount.count),
    };

    const [rows] = await connection.query(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.published_at,
              c.name AS category_name
       FROM blog_posts p
       LEFT JOIN blog_categories c ON c.id = p.category_id
       WHERE p.status = 'published'
       ORDER BY p.published_at DESC, p.created_at DESC
       LIMIT 30`,
    );
    posts = rows as PilotPost[];
  } catch {
    failed = true;
  } finally {
    if (connection) await connection.end().catch(() => undefined);
  }

  return (
    <main dir="rtl" className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <header className="rounded-3xl bg-gradient-to-l from-emerald-800 to-teal-600 p-7 text-white md:p-10">
        <p className="text-sm font-bold text-emerald-100">محیط آزمایشی · بدون تغییر وبلاگ اصلی</p>
        <h1 className="mt-3 text-3xl font-black">آزمایش مهاجرت وبلاگ به MySQL</h1>
        <p className="mt-4 max-w-3xl leading-8 text-emerald-50">
          این صفحه داده‌ها را مستقیماً از دیتابیس MySQL می‌خواند. مسیر عادی وبلاگ و سایر بخش‌های سایت همچنان از Supabase استفاده می‌کنند.
        </p>
      </header>

      {failed ? (
        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="font-black">اتصال یا خواندن اطلاعات ناموفق بود</h2>
          <p className="mt-2 text-sm leading-7">
            اتصال MySQL و وجود شش جدول آزمایشی را بررسی کنید. جزئیات فنی خطا عمداً در صفحه عمومی نمایش داده نمی‌شود.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["دسته‌بندی‌ها", counts.categories],
              ["کل مقالات", counts.posts],
              ["ارتباط مقاله و خدمات", counts.relations],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-sm">
                <p className="text-sm text-[var(--text-secondary)]">{label}</p>
                <p className="mt-2 text-3xl font-black text-[var(--text)]">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[var(--text)]">مقالات منتشرشده در MySQL</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">حداکثر ۳۰ مقالهٔ آخر برای بررسی نمایش داده می‌شود.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900">فقط خواندن</span>
            </div>
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-secondary)]">
                هنوز مقالهٔ منتشرشده‌ای در دیتابیس مقصد پیدا نشد.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1">{post.category_name || "بدون دسته‌بندی"}</span>
                      <span>{formatDate(post.published_at)}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black leading-8 text-[var(--text)]">{post.title}</h3>
                    {post.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">{post.excerpt}</p>}
                    <p className="mt-3 break-all text-xs text-[var(--text-muted)]">slug: {post.slug}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
