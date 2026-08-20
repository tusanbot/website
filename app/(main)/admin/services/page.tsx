"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton, SectionHeader, TusanTable, TusanBadge, TusanStatCard } from "@/components/ui";

type Service = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  price: number | null;
  icon: string | null;
  is_active: boolean | null;
  parent_service_id: string | null;
  created_at: string | null;
};

type ParentForm = { id: string; service_id: string | null; title: string };

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [parentForms, setParentForms] = useState<ParentForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadServices(); }, []);

  async function loadServices() {
    setLoading(true);
    const [{ data: serviceData, error: serviceError }, { data: formData, error: formError }] = await Promise.all([
      supabase.from("services").select("*").order("created_at", { ascending: false }),
      supabase.from("custom_forms").select("id,service_id,title").eq("form_type", "parent").is("parent_form_id", null),
    ]);
    if (serviceError || formError) {
      console.error(serviceError || formError);
      setLoading(false);
      return;
    }
    setServices((serviceData || []) as Service[]);
    setParentForms((formData || []) as ParentForm[]);
    setLoading(false);
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from("services").update({ is_active: !current }).eq("id", id);
    if (error) { alert("خطا در بروزرسانی"); return; }
    loadServices();
  }

  async function deleteService(id: string) {
    if (!confirm("آیا از حذف این خدمت مطمئن هستید؟")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { alert("خطا در حذف خدمت"); return; }
    loadServices();
  }

  const parentServiceIds = useMemo(() => new Set(parentForms.map(form => form.service_id).filter(Boolean)), [parentForms]);
  const parentServices = useMemo(() => services.filter(service => !service.parent_service_id && parentServiceIds.has(service.id)), [services, parentServiceIds]);
  const childServices = useMemo(() => services.filter(service => Boolean(service.parent_service_id)), [services]);
  const independentServices = useMemo(() => services.filter(service => !service.parent_service_id && !parentServiceIds.has(service.id)), [services, parentServiceIds]);
  const serviceById = useMemo(() => new Map(services.map(service => [service.id, service])), [services]);

  function serviceRows(items: Service[], showParent = false) {
    return items.map(service => ({
      icon: <div className="flex items-center justify-center text-2xl">{service.icon || "🛠️"}</div>,
      title: <div><div className="font-bold text-[var(--text)]">{service.title}</div>{showParent && service.parent_service_id && <div className="text-xs text-[var(--muted)] mt-1">مادر: {serviceById.get(service.parent_service_id)?.title || "—"}</div>}</div>,
      category: <span className="text-[var(--text-secondary)]">{service.category || "—"}</span>,
      price: Number(service.price || 0) > 0 ? `${Number(service.price).toLocaleString("fa-IR")} تومان` : "—",
      status: <TusanBadge variant={service.is_active ? "success" : "danger"}>{service.is_active ? "فعال" : "غیرفعال"}</TusanBadge>,
      actions: <div className="flex flex-wrap justify-end gap-2"><Link href={`/admin/services/${service.id}/forms`}><TusanButton size="sm" variant="outline">فرم‌ها</TusanButton></Link><Link href={`/admin/services/${service.id}`}><TusanButton size="sm" variant="outline">ویرایش</TusanButton></Link><TusanButton size="sm" variant="secondary" onClick={() => toggleActive(service.id, Boolean(service.is_active))}>{service.is_active ? "غیرفعال" : "فعال"}</TusanButton><TusanButton size="sm" variant="danger" onClick={() => deleteService(service.id)}>حذف</TusanButton></div>,
    }));
  }

  const columns = [
    { key: "icon", title: "آیکون", width: "80px", align: "center" as const },
    { key: "title", title: "عنوان" },
    { key: "category", title: "دسته‌بندی" },
    { key: "price", title: "قیمت", align: "left" as const },
    { key: "status", title: "وضعیت", align: "center" as const },
    { key: "actions", title: "عملیات", align: "left" as const },
  ];

  if (loading) return <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]"><div className="max-w-6xl mx-auto"><GlassPanel className="p-10 text-center text-[var(--text-muted)]">در حال دریافت خدمات...</GlassPanel></div></div>;

  return <div dir="rtl" className="min-h-screen page-background text-[var(--text)] p-6 transition-colors duration-300"><div className="max-w-6xl mx-auto space-y-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><SectionHeader title="مدیریت خدمات" description="خدمات مادر، خدمات فرزند و خدمات مستقل به‌صورت جداگانه نمایش داده می‌شوند." /><Link href="/admin/services/new-service"><TusanButton icon={<span>＋</span>}>خدمت جدید</TusanButton></Link></div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><TusanStatCard title="کل خدمات" value={services.length.toLocaleString("fa-IR")} icon="🛠️" /><TusanStatCard title="خدمات مادر" value={parentServices.length.toLocaleString("fa-IR")} icon="🗂️" /><TusanStatCard title="خدمات فرزند" value={childServices.length.toLocaleString("fa-IR")} icon="↳" /><TusanStatCard title="خدمات مستقل" value={independentServices.length.toLocaleString("fa-IR")} icon="📄" /></div>

    <section className="space-y-3">
      <div><h2 className="text-xl font-black">خدمات مادر</h2><p className="text-sm text-[var(--muted)] mt-1">خدمات ریشه‌ای که برای آن‌ها فرم مادر تعریف شده است.</p></div>
      <TusanTable columns={columns} rows={serviceRows(parentServices)} emptyTitle="خدمت مادری وجود ندارد" emptyDescription="برای ساخت یک ساختار مادر، ابتدا یک خدمت مادر ایجاد کنید." />
    </section>

    <section className="space-y-3">
      <div><h2 className="text-xl font-black">خدمات فرزند</h2><p className="text-sm text-[var(--muted)] mt-1">خدماتی که به یک خدمت مادر متصل شده‌اند.</p></div>
      <TusanTable columns={columns} rows={serviceRows(childServices, true)} emptyTitle="خدمت فرزندی وجود ندارد" emptyDescription="در ویرایش خدمت می‌توانید آن را به یک خدمت مادر متصل کنید." />
    </section>

    <section className="space-y-3">
      <div><h2 className="text-xl font-black">خدمات مستقل</h2><p className="text-sm text-[var(--muted)] mt-1">خدماتی که نه خدمت مادر هستند و نه زیرمجموعه خدمت دیگری.</p></div>
      <TusanTable columns={columns} rows={serviceRows(independentServices)} emptyTitle="خدمت مستقلی وجود ندارد" emptyDescription="همه خدمات فعلی در ساختار مادر/فرزند قرار گرفته‌اند." />
    </section>
  </div></div>;
}
