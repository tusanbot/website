import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import SocialServicesInteractive from "@/components/home/SocialServicesInteractive";

type Service = { id: string; name: string; description: string | null; customer_unit_price: number | null };
type Platform = { id: string; name: string; is_active: boolean; sort_order: number };
export const revalidate = 300;

export default async function SocialServicesRail() {
  const supabase = createSupabaseServerClient();
  const [platformsResult, servicesResult] = await Promise.all([
    supabase.from("social_platforms").select("id,name,is_active,sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("social_services_public").select("id,name,description,customer_unit_price").order("sort_order"),
  ]);
  const services = (servicesResult.data || []) as Service[];
  const platforms = (platformsResult.data || []) as Platform[];
  if (!services.length) return null;

  return <section id="social-services" className="relative py-7 sm:py-9" dir="rtl">
    <div className="mx-auto max-w-[88rem] px-2 sm:px-4 lg:px-6">
      <div className="mb-4 text-center"><h2 className="text-2xl font-black">خدمات شبکه‌های اجتماعی</h2><p className="mt-1 text-sm text-[var(--text-muted)]">سرویس‌های محبوب را ببینید و برای ورود مستقیم به خدمات هر پلتفرم، از بخش زیر انتخاب کنید.</p></div>
      <SocialServicesInteractive services={services} />
      <div className="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/70 p-3 sm:p-4"><div className="mb-3 flex items-center justify-between gap-3 px-1"><h3 className="text-sm font-black text-[var(--text)] sm:text-base">پلتفرم‌ها</h3><Link href="/social" className="text-xs font-bold text-[var(--primary)] hover:underline">همه پلتفرم‌ها</Link></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{platforms.map(p => <Link key={p.id} href={`/social?platform=${encodeURIComponent(p.id)}`} className="flex min-h-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-center text-sm font-black text-[var(--text)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]">{p.name}</Link>)}</div></div>
    </div>
  </section>;
}
