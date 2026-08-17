"use client";

import { useEffect, useState } from "react";
import {
    defaultTheme,
    ThemeConfig,
} from "@/lib/theme/themeConfig";
import {
    loadThemeFromDatabase,
    saveThemeToDatabase,
} from "@/lib/theme/themeService";
import { applyTheme } from "@/lib/theme/themeUtils";
import { SectionHeader } from "@/components/ui";
import ThemeSettingsPanel from "@/components/theme/ThemeSettingsPanel";

export default function ThemeSettingsPage() {
    const [theme, setTheme] =
        useState<ThemeConfig>(defaultTheme);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    useEffect(() => {
        async function load() {
            setLoading(true);

            try {
                const config =
                    await loadThemeFromDatabase();

                setTheme(config);
                applyTheme(config);
            } catch {
                setTheme(defaultTheme);
                applyTheme(defaultTheme);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    async function handleSave() {
        setSaving(true);
        setMessage("");
        setError("");

        const ok =
            await saveThemeToDatabase(theme);

        if (ok) {
            setMessage(
                "تنظیمات عمومی سایت ذخیره شد."
            );
        } else {
            setError(
                "خطا در ذخیره تنظیمات."
            );
        }

        setSaving(false);
    }

    async function handleReset() {
        setSaving(true);

        await saveThemeToDatabase(
            defaultTheme
        );

        setTheme(defaultTheme);

        applyTheme(defaultTheme);

        setMessage(
            "تنظیمات به حالت پیش‌فرض بازگردانده شد."
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
                    title="تنظیمات ظاهری سایت"
                    description="این تنظیمات ظاهر پیش‌فرض کل سایت را برای تمام کاربران مشخص می‌کند."
                />

                {(message || error) && (
                    <div
                        className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error
                                ? "border-red-500/20 bg-red-500/10 text-red-600"
                                : "border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]"
                            }`}
                    >
                        {error || message}
                    </div>
                )}

                <ThemeSettingsPanel
                    theme={theme}
                    setTheme={setTheme}
                    onSave={handleSave}
                    onReset={handleReset}
                    saving={saving}
                    title="تنظیمات ظاهری عمومی"
                    description="تمام کاربران سایت به صورت پیش‌فرض این ظاهر را مشاهده می‌کنند."
                    resetLabel="بازگردانی پیش‌فرض"
                />

            </div>
        </div>
    );
}