import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("site_settings")
    .select("config")
    .limit(1)
    .single();

  if (error || !data) return new NextResponse(null, { status: 404 });

  const config = data.config && typeof data.config === "object"
    ? data.config as Record<string, unknown>
    : {};
  const assets = config.assets && typeof config.assets === "object"
    ? config.assets as Record<string, unknown>
    : {};
  const logoUrl = typeof assets.logoUrl === "string" ? assets.logoUrl.trim() : "";

  if (!logoUrl || !/^https?:\/\//i.test(logoUrl)) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(logoUrl, { status: 307, headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
}
