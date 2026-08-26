import Link from 'next/link';
import { SERVICE_TAXONOMY } from '@/lib/serviceTaxonomy';

export const metadata = {
  title: 'دسته‌بندی خدمات | کافی‌نت توسن',
  description: 'دسته‌بندی خدمات کافی‌نت توسن برای دسترسی سریع‌تر به خدمات آنلاین و اداری.',
  alternates: { canonical: 'https://www.tusancn.ir/services/categories' },
};

export default function ServiceCategoriesPage() {
  return (
    <main dir="rtl" className="container mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">دسته‌بندی خدمات</h1>
        <p className="mt-3 text-muted-foreground">خدمات موردنظر خود را بر اساس حوزه پیدا کنید.</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICE_TAXONOMY.map((category) => (
          <Link key={category.slug} href={`/services?category=${category.slug}`} className="rounded-2xl border p-5 transition hover:-translate-y-0.5">
            <h2 className="font-semibold">{category.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
