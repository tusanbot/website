import { supabase } from "@/lib/supabase";
import { defaultTheme, ThemeConfig } from "./themeConfig";

/**
 * دریافت تنظیمات ظاهری عمومی سایت از Supabase
 */
export async function loadThemeFromDatabase(): Promise<ThemeConfig> {
    const { data, error } = await supabase
        .from("site_settings")
        .select(`
            theme,
            primary_color,
            primary_dark,
            primary_light,
            radius_xl,
            radius_lg,
            radius_md,
            blur_panel,
            blur_card,
            shadow_sm,
            shadow_md,
            shadow_lg,
            motion_enabled,
            motion_hover_scale,
            motion_hover_lift,
            motion_duration
        `)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(
            "خطا در دریافت تنظیمات ظاهری:",
            error
        );

        return defaultTheme;
    }

    if (!data) {
        return defaultTheme;
    }

    return {
        colors: {
            primary:
                data.primary_color ||
                defaultTheme.colors.primary,

            primaryDark:
                data.primary_dark ||
                defaultTheme.colors.primaryDark,

            primaryLight:
                data.primary_light ||
                defaultTheme.colors.primaryLight,
        },

        radius: {
            xl:
                typeof data.radius_xl === "number"
                    ? data.radius_xl
                    : defaultTheme.radius.xl,

            lg:
                typeof data.radius_lg === "number"
                    ? data.radius_lg
                    : defaultTheme.radius.lg,

            md:
                typeof data.radius_md === "number"
                    ? data.radius_md
                    : defaultTheme.radius.md,
        },

        blur: {
            panel:
                typeof data.blur_panel === "number"
                    ? data.blur_panel
                    : defaultTheme.blur.panel,

            card:
                typeof data.blur_card === "number"
                    ? data.blur_card
                    : defaultTheme.blur.card,
        },

        shadow: {
            sm:
                data.shadow_sm ||
                defaultTheme.shadow.sm,

            md:
                data.shadow_md ||
                defaultTheme.shadow.md,

            lg:
                data.shadow_lg ||
                defaultTheme.shadow.lg,
        },

        motion: {
            enabled:
                typeof data.motion_enabled === "boolean"
                    ? data.motion_enabled
                    : defaultTheme.motion.enabled,

            hoverScale:
                typeof data.motion_hover_scale === "number"
                    ? data.motion_hover_scale
                    : defaultTheme.motion.hoverScale,

            hoverLift:
                typeof data.motion_hover_lift === "number"
                    ? data.motion_hover_lift
                    : defaultTheme.motion.hoverLift,

            duration:
                typeof data.motion_duration === "number"
                    ? data.motion_duration
                    : defaultTheme.motion.duration,
        },
    };
}

/**
 * ذخیره تنظیمات ظاهری عمومی سایت در Supabase
 */
export async function saveThemeToDatabase(
    theme: ThemeConfig
): Promise<boolean> {
    const { data: currentSettings, error: fetchError } =
        await supabase
            .from("site_settings")
            .select("id")
            .limit(1)
            .maybeSingle();

    if (fetchError) {
        console.error(
            "خطا در دریافت تنظیمات فعلی سایت:",
            fetchError
        );

        return false;
    }

    if (!currentSettings?.id) {
        console.error(
            "هیچ رکوردی در جدول site_settings پیدا نشد."
        );

        return false;
    }

    const { error } = await supabase
        .from("site_settings")
        .update({
            primary_color: theme.colors.primary,
            primary_dark: theme.colors.primaryDark,
            primary_light: theme.colors.primaryLight,

            radius_xl: theme.radius.xl,
            radius_lg: theme.radius.lg,
            radius_md: theme.radius.md,

            blur_panel: theme.blur.panel,
            blur_card: theme.blur.card,

            shadow_sm: theme.shadow.sm,
            shadow_md: theme.shadow.md,
            shadow_lg: theme.shadow.lg,

            motion_enabled: theme.motion.enabled,
            motion_hover_scale: theme.motion.hoverScale,
            motion_hover_lift: theme.motion.hoverLift,
            motion_duration: theme.motion.duration,

            updated_at: new Date().toISOString(),
        })
        .eq("id", currentSettings.id);

    if (error) {
        console.error(
            "خطا در ذخیره تنظیمات ظاهری:",
            error
        );

        return false;
    }

    return true;
}