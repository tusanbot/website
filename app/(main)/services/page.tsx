import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import ServicesCatalog from "@/components/services/ServicesCatalog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "خدمات کافی نت توسن",
  description: "فهرست خدمات آنلاین کافی نت توسن؛ خدمات اینترنتی، اداری و کامپیوتری را مشاهده و ثبت سفارش کنید.",
  alternates: { canonical: "https://www.tusancn.ir/services" },
};

type Service = { id: string; title: string; slug: string | null; category: string | null; description: string | null; price: number; icon: string | null; is_active: boolean; parent_service_id: string | null };
type SearchParams = { q?: string; category?: string };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select("id,title,slug,category,description,price,icon,is_active,parent_service_id")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) console.error("services catalog load failed", error);
  const services: Service[] = (data || []).map((item: any) => ({ ...item, price: Number(item.price || 0) }));

  return <main dir="rtl" className="min-h-screen page-background text-[var(--text)]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      <section className="rounded-[28px] p-6 sm:p-8 text-white shadow-lg" style={{ background: "radial-gradient(circle at top right, var(--hero-start) 0%, var(--hero-mid) 38%, var(--hero-end) 100%)" }}>
        <div className="max-w-3xl"><div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm">🛠️ خدمات آنلاین توسن</div><h1 className="mt-4 text-2xl sm:text-3xl font-black">خدمت موردنیاز خود را انتخاب کنید</h1><p className="mt-3 text-white/80 leading-7">دسته‌بندی و خدمت مادر در یک ساختار واحد نمایش داده می‌شوند و خدمات زیرمجموعه داخل همان خدمت قرار می‌گیرند.</p></div>
      </section>
      <ServicesCatalog services={services} initialCategory={params.category || "all"} initialSearch={params.q || ""} />
    </div>
  </main>;
}
