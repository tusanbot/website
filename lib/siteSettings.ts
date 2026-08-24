import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type SiteSettings = {
  site_name: string;
  site_description: string;
  theme: "light" | "dark";
  primary_color: string;
  primary_dark: string;
  radius: string;
  font_family: string;
  config?: {
    assets?: {
      logoUrl?: string;
      iconUrl?: string;
      faviconUrl?: string;
    };
  };
};

const defaultSettings: SiteSettings = {
  site_name: "توسن",
  site_description: "سامانه خدمات آنلاین کافی‌نت توسن",
  theme: "light",
  primary_color: "#09967c",
  primary_dark: "#087d69",
  radius: "28px",
  font_family: "Vazirmatn",
  config: { assets: {} },
};

export async function getSiteSettings(): Promise<SiteSettings> {
  // Site settings are publicly readable in Supabase. Use the anonymous server
  // client here so public pages do not depend on a service-role JWT.
  const { data, error } = await createSupabaseServerClient()
    .from("site_settings")
    .select("site_name, site_description, theme, primary_color, primary_dark, radius, font_family, config")
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Site settings error:", error);
    return defaultSettings;
  }

  return {
    ...defaultSettings,
    ...data,
    config: {
      assets: {
        ...(defaultSettings.config?.assets || {}),
        ...(data.config?.assets || {}),
      },
    },
  } as SiteSettings;
}
