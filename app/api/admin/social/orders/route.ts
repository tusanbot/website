import { NextRequest, NextResponse } from "next/server";
import { isNextResponse, requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (isNextResponse(adminUser)) return adminUser;

  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("social_orders")
      .select(
        "*, social_services(name,provider_service_id,platform_id, social_platforms(name,slug))"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/social/orders] query failed", error);
      return NextResponse.json(
        { error: "دریافت سفارش‌های شبکه‌های اجتماعی ناموفق بود." },
        { status: 500 }
      );
    }

    const orders = (data || []).map((order: any) => ({
      ...order,
      social_platforms: order.social_services?.social_platforms || null,
      social_services: order.social_services
        ? {
            name: order.social_services.name,
            provider_service_id: order.social_services.provider_service_id,
          }
        : null,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[admin/social/orders] unexpected error", error);
    return NextResponse.json(
      { error: "دریافت سفارش‌ها ناموفق بود." },
      { status: 500 }
    );
  }
}
