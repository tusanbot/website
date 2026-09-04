import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  const { data: announcements, error } = await supabase
    .from("services_announcements")
    .select("id,title,summary,type,start_at,end_at,extended_end_at,button_label,service_id,priority,created_at")
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[home/announcements]", error);
    return NextResponse.json({ ok: false, error: "دریافت اطلاعیه‌ها انجام نشد." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const activeAnnouncements = (announcements || []).filter((item) => {
    const starts = item.start_at ? Date.parse(item.start_at) : null;
    const ends = item.extended_end_at ? Date.parse(item.extended_end_at) : (item.end_at ? Date.parse(item.end_at) : null);
    return (starts === null || Number.isNaN(starts) || starts <= now) && (ends === null || Number.isNaN(ends) || ends >= now);
  });

  const serviceIds = [...new Set(activeAnnouncements.map((item) => item.service_id).filter(Boolean))] as string[];
  let services: Array<{ id: string; title: string; slug: string | null; description: string | null; icon: string | null; price: number | null }> = [];
  if (serviceIds.length) {
    const result = await supabase.from("services").select("id,title,slug,description,icon,price").in("id", serviceIds).eq("is_active", true);
    if (!result.error) services = result.data || [];
  }
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  return NextResponse.json({ ok: true, items: activeAnnouncements.map((item) => ({ ...item, service: item.service_id ? serviceMap.get(item.service_id) || null : null })) }, { headers: { "Cache-Control": "no-store" } });
}
