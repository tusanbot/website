import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("site_settings")
    .select("site_name, site_description, config")
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: "تنظیمات سایت در دسترس نیست." }, { status: 500 });
  }

  const config = data.config && typeof data.config === "object" ? data.config as Record<string, unknown> : {};
  const business = config.business && typeof config.business === "object" ? config.business as Record<string, unknown> : {};
  const assets = config.assets && typeof config.assets === "object" ? config.assets as Record<string, unknown> : {};
  const social = config.social && typeof config.social === "object" ? config.social as Record<string, unknown> : {};
  const icons = social.icons && typeof social.icons === "object" ? social.icons as Record<string, unknown> : {};

  return NextResponse.json({
    success: true,
    settings: {
      site_name: data.site_name,
      site_description: data.site_description,
      business: { address: business.address || "", phone: business.phone || "", email: business.email || "", telegram: business.telegram || "", eitaa: business.eitaa || "", rubika: business.rubika || "" },
      assets: { logoUrl: assets.logoUrl || "", iconUrl: assets.iconUrl || "", faviconUrl: assets.faviconUrl || "" },
      social: { icons: { telegram: icons.telegram || "", eitaa: icons.eitaa || "", rubika: icons.rubika || "" } },
    },
  }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
