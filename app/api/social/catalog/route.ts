import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const [platformsResult, categoriesResult, servicesResult] = await Promise.all([
    supabase.from("social_platforms").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("social_categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("social_services_public").select("*").order("sort_order"),
  ]);

  const error = platformsResult.error || categoriesResult.error || servicesResult.error;
  if (error) {
    console.error("[social/catalog] failed to load catalog", error);
    return NextResponse.json(
      { ok: false, error: "دریافت کاتالوگ خدمات با خطا مواجه شد." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      platforms: platformsResult.data || [],
      categories: categoriesResult.data || [],
      services: servicesResult.data || [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
