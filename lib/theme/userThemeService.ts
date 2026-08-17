import { supabase } from "@/lib/supabase";
import { ThemeConfig } from "./themeConfig";

export async function loadUserTheme(userId: string): Promise<ThemeConfig | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select("theme_config")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("خطا در دریافت Theme کاربر:", error);
        return null;
    }

    return (data?.theme_config as ThemeConfig | null) ?? null;
}

export async function saveUserTheme(
    userId: string,
    theme: ThemeConfig
): Promise<boolean> {
    const { error } = await supabase
        .from("profiles")
        .update({
            theme_config: theme,
        })
        .eq("id", userId);

    if (error) {
        console.error("خطا در ذخیره Theme کاربر:", error);
        return false;
    }

    return true;
}

export async function clearUserTheme(
    userId: string
): Promise<boolean> {
    const { error } = await supabase
        .from("profiles")
        .update({
            theme_config: null,
        })
        .eq("id", userId);

    if (error) {
        console.error("خطا در حذف Theme کاربر:", error);
        return false;
    }

    return true;
}