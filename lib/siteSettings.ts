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
    maintenance?: {
      enabled?: boolean;
      title?: string;
      message?: string;
      eta?: string;
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
  config: { assets: {}, maintenance: { enabled: false } },
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

  const dataConfig = data.config && typeof data.config === "object" && !Array.isArray(data.config)
    ? data.config as Record<string, unknown>
    : {};
  const dataAssets = dataConfig.assets && typeof dataConfig.assets === "object" && !Array.isArray(dataConfig.assets)
    ? dataConfig.assets as Record<string, unknown>
    : {};
  const dataMaintenance = dataConfig.maintenance && typeof dataConfig.maintenance === "object" && !Array.isArray(dataConfig.maintenance)
    ? dataConfig.maintenance as Record<string, unknown>
    : {};

  return {
    ...defaultSettings,
    ...data,
    config: {
      assets: {
        ...(defaultSettings.config?.assets || {}),
        ...dataAssets,
      },
      maintenance: {
        ...(defaultSettings.config?.maintenance || {}),
        ...dataMaintenance,
      },
    },
  } as SiteSettings;
}
