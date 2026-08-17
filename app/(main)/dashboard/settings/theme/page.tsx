"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    defaultTheme,
    ThemeConfig,
} from "@/lib/theme/themeConfig";
import {
    loadUserTheme,
    saveUserTheme,
    clearUserTheme,
} from "@/lib/theme/userThemeService";
import { applyTheme } from "@/lib/theme/themeUtils";
import { SectionHeader } from "@/components/ui";
import ThemeSettingsPanel from "@/components/theme/ThemeSettingsPanel";

export default function UserThemeSettingsPage() {
    const [theme, setTheme] =
        useState<ThemeConfig>(defaultTheme);

    const [userId, setUserId] =
        useState<string | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [message, setMessage] =
        useState("");

    useEffect(() => {
        async function load() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            setUserId(user.id);

            const config =
                await loadUserTheme(user.id);

            if (config) {
                setTheme(config);
                applyTheme(config);
            }

            setLoading(false);
        }

        load();
    }, []);

    async function handleSave() {
        if (!userId) {
            return;
        }

        setSaving(true);

        await saveUserTheme(
            userId,
            theme
        );

        applyTheme(theme);

        setMessage(
            "تنظیمات شخصی شما ذخیره شد."
        );

        setSaving(false);
    }

    async function handleReset() {
        if (!userId) {
            return;
        }

        setSaving(true);

        await clearUserTheme(userId);

        setTheme(defaultTheme);

        applyTheme(defaultTheme);

        setMessage(
            "از تنظیمات عمومی سایت استفاده خواهد شد."
        );

        setSaving(false);
    }

    if (loading) {
        return (
            <div className="p-6">
                در حال بارگذاری...
            </div>
        );
    }

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-[var(--background)] text-[var(--text)] p-6"
        >
            <div className="max-w-6xl mx-auto space-y-6">

                <SectionHeader
                    title="تنظیمات ظاهری شخصی"
                    description="این تنظیمات روی کل سایت فقط برای حساب کاربری شما اعمال می‌شود."
                />

                {message && (
                    <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)] px-4 py-3 text-sm font-bold">
                        {message}
                    </div>
                )}

                <ThemeSettingsPanel
                    theme={theme}
                    setTheme={setTheme}
                    onSave={handleSave}
                    onReset={handleReset}
                    saving={saving}
                    title="ظاهر اختصاصی حساب کاربری"
                    description="در صورت حذف این تنظیمات، ظاهر عمومی سایت برای شما اعمال می‌شود."
                    resetLabel="استفاده از تنظیمات عمومی سایت"
                />

            </div>
        </div>
    );
}