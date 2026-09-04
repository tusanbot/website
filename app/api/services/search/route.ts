import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (!query) return NextResponse.json({ ok: true, items: [] }, { headers: { "Cache-Control": "no-store" } });

  const pattern = `%${query.replace(/[%_]/g, "\\$&")}%`;
  const { data, error } = await supabase
    .from("services")
    .select("id,title,slug,category,description,price,icon")
    .eq("is_active", true)
    .ilike("title", pattern)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[services/search]", error);
    return NextResponse.json({ ok: false, error: "جستجوی خدمات انجام نشد." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({
    ok: true,
    items: (data || []).map((service) => ({ ...service, price: Number(service.price || 0) })),
  }, { headers: { "Cache-Control": "no-store" } });
}
