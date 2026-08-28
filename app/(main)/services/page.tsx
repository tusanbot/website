import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import ServicesCatalog from "@/components/services/ServicesCatalog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "خدمات کافی نت توسن",
  description: "فهرست خدمات آنلاین کافی نت توسن؛ خدمات اینترنتی، اداری و کامپیوتری را مشاهده و ثبت سفارش کنید.",
  alternates: { canonical: "https://www.tusancn.ir/services" },
};

type Service = { id: string; title: string; slug: string; category: string | null; description: string | null; price: number; icon: string | null; is_active: boolean; parent_service_id: string | null };
type SearchParams = { q?: string; category?: string };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("services").select("id,title,slug,category,description,price,icon,is_active,parent_service_id").eq("is_active", true).is("parent_service_id", null).order("created_at", { ascending: false });
  const services: Service[] = (data || []).map((item: any) => ({ ...item, price: Number(item.price || 0) }));

  return <main dir="rtl" className="min-h-screen page-background text-[var(--text)]">
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
      <section className="rounded-[28px] px-5 py-5 text-white shadow-lg sm:px-7 sm:py-6" style={{ background: "radial-gradient(circle at top right, var(--hero-start) 0%, var(--hero-mid) 38%, var(--hero-end) 100%)" }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-xs font-bold text-white/75">🛠️ خدمات آنلاین توسن</div><h1 className="mt-1 text-2xl font-black sm:text-3xl">خدمت موردنیاز خود را پیدا کنید</h1></div>
          <p className="max-w-xl text-sm leading-6 text-white/75">خدمات را جستجو کنید یا از دسته‌بندی‌ها انتخاب کنید.</p>
        </div>
      </section>
      <div className="mt-4"><ServicesCatalog services={services} initialCategory={params.category || "all"} initialSearch={params.q || ""} /></div>
    </div>
  </main>;
}
