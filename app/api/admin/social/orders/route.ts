import { NextRequest, NextResponse } from "next/server";
import { isNextResponse, requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (isNextResponse(adminUser)) return adminUser;

  try {
    const admin = supabaseAdmin();

    const { data: orders, error: ordersError } = await admin
      .from("social_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("[admin/social/orders] orders query failed", ordersError);
      return NextResponse.json(
        { error: "دریافت سفارش‌های شبکه‌های اجتماعی ناموفق بود." },
        { status: 500 }
      );
    }

    const serviceIds = [...new Set((orders || []).map((order: any) => order.service_id).filter(Boolean))];
    const { data: services, error: servicesError } = serviceIds.length
      ? await admin
          .from("social_services")
          .select("id,name,provider_service_id,platform_id")
          .in("id", serviceIds)
      : { data: [], error: null };

    if (servicesError) {
      console.error("[admin/social/orders] services query failed", servicesError);
      return NextResponse.json(
        { error: "دریافت اطلاعات سرویس‌های سفارش ناموفق بود." },
        { status: 500 }
      );
    }

    const serviceMap = new Map((services || []).map((service: any) => [service.id, service]));
    const platformIds = [...new Set((services || []).map((service: any) => service.platform_id).filter(Boolean))];
    const { data: platforms, error: platformsError } = platformIds.length
      ? await admin
          .from("social_platforms")
          .select("id,name,slug")
          .in("id", platformIds)
      : { data: [], error: null };

    if (platformsError) {
      console.error("[admin/social/orders] platforms query failed", platformsError);
      return NextResponse.json(
        { error: "دریافت اطلاعات پلتفرم سفارش ناموفق بود." },
        { status: 500 }
      );
    }

    const platformMap = new Map((platforms || []).map((platform: any) => [platform.id, platform]));
    const result = (orders || []).map((order: any) => {
      const service = serviceMap.get(order.service_id) as any;
      const platform = service ? platformMap.get(service.platform_id) : null;
      return {
        ...order,
        social_services: service
          ? { name: service.name, provider_service_id: service.provider_service_id }
          : null,
        social_platforms: platform || null,
      };
    });

    return NextResponse.json({ orders: result });
  } catch (error) {
    console.error("[admin/social/orders] unexpected error", error);
    return NextResponse.json(
      { error: "دریافت سفارش‌ها ناموفق بود." },
      { status: 500 }
    );
  }
}
