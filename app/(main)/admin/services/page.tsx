"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton, SectionHeader, TusanTable, TusanBadge, TusanStatCard } from "@/components/ui";

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { loadServices(); }, []);
  async function loadServices() {
    const { data, error } = await supabase.from("services").select("*").order("created_at", { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    setServices(data || []); setLoading(false);
  }
  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from("services").update({ is_active: !current }).eq("id", id);
    if (error) { alert("خطا در بروزرسانی"); return; } loadServices();
  }
  async function deleteService(id: string) {
    if (!confirm("آیا از حذف این خدمت مطمئن هستید؟")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { alert("خطا در حذف خدمت"); return; } loadServices();
  }
  const visibleServices = services.filter(service => !service.parent_service_id);
  const childCount = services.filter(service => service.parent_service_id).length;
  if (loading) return <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]"><div className="max-w-6xl mx-auto"><GlassPanel className="p-10 text-center text-[var(--text-muted)]">در حال دریافت خدمات...</GlassPanel></div></div>;
  return <div dir="rtl" className="min-h-screen page-background text-[var(--text)] p-6 transition-colors duration-300"><div className="max-w-6xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"><SectionHeader title="مدیریت خدمات" description="خدمات مادر و خدمات معمولیِ مستقل در این فهرست نمایش داده می‌شوند." /><Link href="/admin/services/new-service"><TusanButton icon={<span>＋</span>}>خدمت جدید</TusanButton></Link></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"><TusanStatCard title="خدمات قابل نمایش" value={visibleServices.length.toLocaleString("fa-IR")} icon="🛠️" /><TusanStatCard title="فعال" value={visibleServices.filter(s => s.is_active).length.toLocaleString("fa-IR")} icon="✅" /><TusanStatCard title="زیرمجموعه" value={childCount.toLocaleString("fa-IR")} icon="↳" /><TusanStatCard title="دارای قیمت" value={visibleServices.filter(s => Number(s.price || 0) > 0).length.toLocaleString("fa-IR")} icon="💳" /></div>
    <TusanTable columns={[{key:"icon",title:"آیکون",width:"80px",align:"center"},{key:"title",title:"عنوان"},{key:"category",title:"دسته‌بندی"},{key:"price",title:"قیمت",align:"left"},{key:"status",title:"وضعیت",align:"center"},{key:"actions",title:"عملیات",align:"left"}]} rows={visibleServices.map(service => ({
      icon:<div className="flex items-center justify-center text-2xl">{service.icon || "🛠️"}</div>,
      title:<div><div className="font-bold text-[var(--text)]">{service.title}</div>{services.some(child => child.parent_service_id === service.id) && <div className="text-xs text-[var(--muted)] mt-1">دارای زیرمجموعه</div>}</div>,
      category:<span className="text-[var(--text-secondary)]">{service.category || "—"}</span>,
      price:Number(service.price || 0) > 0 ? `${Number(service.price).toLocaleString("fa-IR")} تومان` : "—",
      status:<TusanBadge variant={service.is_active ? "success" : "danger"}>{service.is_active ? "فعال" : "غیرفعال"}</TusanBadge>,
      actions:<div className="flex flex-wrap justify-end gap-2"><Link href={`/admin/services/${service.id}/forms`}><TusanButton size="sm" variant="outline">فرم‌ها</TusanButton></Link><Link href={`/admin/services/${service.id}`}><TusanButton size="sm" variant="outline">ویرایش</TusanButton></Link><TusanButton size="sm" variant="secondary" onClick={() => toggleActive(service.id, service.is_active)}>{service.is_active ? "غیرفعال" : "فعال"}</TusanButton><TusanButton size="sm" variant="danger" onClick={() => deleteService(service.id)}>حذف</TusanButton></div>
    }))} emptyTitle="هنوز هیچ خدمتی ثبت نشده است" emptyDescription="برای شروع، اولین خدمت را از طریق دکمه «خدمت جدید» ایجاد کنید." />
  </div></div>;
}
