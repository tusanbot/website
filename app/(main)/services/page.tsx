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

export default async function ServicesPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("services")
    .select("id,title,slug,category,description,price,icon,is_active,parent_service_id")
    .eq("is_active", true)
    .is("parent_service_id", null)
    .order("created_at", { ascending: false });

  const services: Service[] = (data || []).map((item: any) => ({ ...item, price: Number(item.price || 0) }));

  return <main dir="rtl" className="min-h-screen page-background text-[var(--text)]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <section className="rounded-[32px] p-7 sm:p-10 text-white shadow-lg" style={{ background: "radial-gradient(circle at top right, var(--hero-start) 0%, var(--hero-mid) 38%, var(--hero-end) 100%)" }}>
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm">🛠️ خدمات آنلاین توسن</div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-black">خدمت موردنیاز خود را انتخاب کنید</h1>
          <p className="mt-4 text-white/80 leading-8">خدمات بر اساس حوزه دسته‌بندی شده‌اند و خدمات زیرمجموعه پس از ورود به خدمت مادر قابل انتخاب هستند.</p>
        </div>
      </section>
      <ServicesCatalog services={services} />
    </div>
  </main>;
}
