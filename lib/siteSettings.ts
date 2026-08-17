import { supabase } from "@/lib/supabase";

export type SiteSettings = {
    site_name: string;
    site_description: string;
    theme: "light" | "dark";
    primary_color: string;
    primary_dark: string;
    radius: string;
    font_family: string;
};

const defaultSettings: SiteSettings = {
    site_name: "توسن",
    site_description: "سامانه خدمات آنلاین کافی‌نت توسن",
    theme: "light",
    primary_color: "#09967c",
    primary_dark: "#087d69",
    radius: "28px",
    font_family: "Vazirmatn",
};

export async function getSiteSettings(): Promise<SiteSettings> {
    const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();

    if (error || !data) {
        console.error("Site settings error:", error);
        return defaultSettings;
    }

    return data as SiteSettings;
}