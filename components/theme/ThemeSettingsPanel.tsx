"use client";

import { ThemeConfig } from "@/lib/theme/themeConfig";
import { applyTheme } from "@/lib/theme/themeUtils";
import { GlassPanel, PrimaryButton } from "@/components/ui";

type ThemeSettingsPanelProps = {
    theme: ThemeConfig;
    setTheme: (theme: ThemeConfig) => void;
    onSave: () => Promise<void> | void;
    onReset: () => Promise<void> | void;
    saving?: boolean;
    title?: string;
    description?: string;
    resetLabel?: string;
};

export default function ThemeSettingsPanel({
    theme,
    setTheme,
    onSave,
    onReset,
    saving = false,
    title = "تنظیمات ظاهری",
    description = "",
    resetLabel = "بازگردانی پیش‌فرض",
}: ThemeSettingsPanelProps) {
    function updateTheme(
        updater: (prev: ThemeConfig) => ThemeConfig
    ) {
        const next = updater(theme);
        setTheme(next);
        applyTheme(next);
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <GlassPanel className="p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-xl">
                        🎨
                    </div>

                    <div>
                        <h2 className="text-xl font-black">
                            {title}
                        </h2>

                        {description && (
                            <p className="text-sm text-[var(--text-muted)] mt-2 leading-7">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            </GlassPanel>

            {/* Brand Colors */}
            <GlassPanel className="p-6">
                <h3 className="font-black text-lg mb-5">
                    🎨 رنگ‌های برند
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <ColorField
                        label="رنگ اصلی"
                        value={theme.colors.primary}
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                colors: {
                                    ...prev.colors,
                                    primary: value,
                                },
                            }))
                        }
                    />

                    <ColorField
                        label="رنگ اصلی تیره"
                        value={theme.colors.primaryDark}
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                colors: {
                                    ...prev.colors,
                                    primaryDark: value,
                                },
                            }))
                        }
                    />

                    <ColorField
                        label="رنگ اصلی روشن"
                        value={theme.colors.primaryLight}
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                colors: {
                                    ...prev.colors,
                                    primaryLight: value,
                                },
                            }))
                        }
                    />

                </div>
            </GlassPanel>

            {/* Radius */}
            <GlassPanel className="p-6">
                <h3 className="font-black text-lg mb-5">
                    ◼️ گردی عناصر
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    <RangeField
                        label="Radius بزرگ"
                        value={theme.radius.xl}
                        min={12}
                        max={48}
                        suffix="px"
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                radius: {
                                    ...prev.radius,
                                    xl: value,
                                },
                            }))
                        }
                    />

                    <RangeField
                        label="Radius متوسط"
                        value={theme.radius.lg}
                        min={8}
                        max={36}
                        suffix="px"
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                radius: {
                                    ...prev.radius,
                                    lg: value,
                                },
                            }))
                        }
                    />

                    <RangeField
                        label="Radius کوچک"
                        value={theme.radius.md}
                        min={4}
                        max={28}
                        suffix="px"
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                radius: {
                                    ...prev.radius,
                                    md: value,
                                },
                            }))
                        }
                    />

                </div>
            </GlassPanel>

            {/* Blur */}
            <GlassPanel className="p-6">
                <h3 className="font-black text-lg mb-5">
                    🪟 Blur
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <RangeField
                        label="Blur پنل‌ها"
                        value={theme.blur.panel}
                        min={0}
                        max={40}
                        suffix="px"
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                blur: {
                                    ...prev.blur,
                                    panel: value,
                                },
                            }))
                        }
                    />

                    <RangeField
                        label="Blur کارت‌ها"
                        value={theme.blur.card}
                        min={0}
                        max={40}
                        suffix="px"
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                blur: {
                                    ...prev.blur,
                                    card: value,
                                },
                            }))
                        }
                    />

                </div>
            </GlassPanel>

            {/* Motion */}
            <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-5">

                    <h3 className="font-black text-lg">
                        ✨ Motion
                    </h3>

                    <button
                        type="button"
                        onClick={() =>
                            updateTheme((prev) => ({
                                ...prev,
                                motion: {
                                    ...prev.motion,
                                    enabled:
                                        !prev.motion.enabled,
                                },
                            }))
                        }
                        className={`relative w-16 h-9 rounded-full transition-colors ${theme.motion.enabled
                                ? "bg-[var(--primary)]"
                                : "bg-gray-300"
                            }`}
                    >
                        <span
                            className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow-md transition-all ${theme.motion.enabled
                                    ? "right-1"
                                    : "right-8"
                                }`}
                        />
                    </button>

                </div>

                <div
                    className={`grid grid-cols-1 md:grid-cols-3 gap-5 ${!theme.motion.enabled
                            ? "opacity-50 pointer-events-none"
                            : ""
                        }`}
                >

                    <RangeField
                        label="Hover Scale"
                        value={theme.motion.hoverScale}
                        min={1}
                        max={1.1}
                        step={0.01}
                        suffix=""
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                motion: {
                                    ...prev.motion,
                                    hoverScale: value,
                                },
                            }))
                        }
                    />

                    <RangeField
                        label="Hover Lift"
                        value={Math.abs(
                            theme.motion.hoverLift
                        )}
                        min={0}
                        max={12}
                        suffix="px"
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                motion: {
                                    ...prev.motion,
                                    hoverLift: -value,
                                },
                            }))
                        }
                    />

                    <RangeField
                        label="مدت Motion"
                        value={theme.motion.duration}
                        min={100}
                        max={600}
                        suffix="ms"
                        onChange={(value) =>
                            updateTheme((prev) => ({
                                ...prev,
                                motion: {
                                    ...prev.motion,
                                    duration: value,
                                },
                            }))
                        }
                    />

                </div>
            </GlassPanel>

            {/* Live Preview */}
            <GlassPanel className="p-6">
                <h3 className="font-black text-lg mb-5">
                    👁️ پیش‌نمایش زنده
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <div
                        className="border border-[var(--border)] bg-[var(--surface)] p-6 transition-all"
                        style={{
                            borderRadius:
                                `${theme.radius.xl}px`,
                            backdropFilter:
                                `blur(${theme.blur.card}px)`,
                            boxShadow:
                                theme.shadow.md,
                        }}
                    >
                        <div className="text-sm text-[var(--text-muted)]">
                            کارت نمونه
                        </div>

                        <div className="text-2xl font-black mt-2">
                            توسن سایبر
                        </div>

                        <p className="text-sm text-[var(--text-muted)] mt-2 leading-7">
                            این کارت تنظیمات Radius، Blur و Shadow فعلی را نمایش می‌دهد.
                        </p>

                        <button
                            className="mt-5 px-5 py-3 text-white font-bold transition-all"
                            style={{
                                background:
                                    theme.colors.primary,
                                borderRadius:
                                    `${theme.radius.lg}px`,
                                boxShadow:
                                    theme.shadow.sm,
                            }}
                        >
                            دکمه نمونه
                        </button>
                    </div>

                    <div
                        className="flex items-center justify-center min-h-[220px] border border-[var(--border)] bg-[var(--surface-muted)]"
                        style={{
                            borderRadius:
                                `${theme.radius.xl}px`,
                        }}
                    >
                        <div
                            className={`px-8 py-5 font-black text-white cursor-pointer ${theme.motion.enabled
                                    ? "transition-all"
                                    : ""
                                }`}
                            style={{
                                background:
                                    theme.colors.primary,
                                borderRadius:
                                    `${theme.radius.lg}px`,
                                boxShadow:
                                    theme.shadow.md,
                                transitionDuration:
                                    `${theme.motion.duration}ms`,
                            }}
                            onMouseEnter={(e) => {
                                if (
                                    !theme.motion.enabled
                                ) {
                                    return;
                                }

                                e.currentTarget.style.transform =
                                    `translateY(${theme.motion.hoverLift}px) scale(${theme.motion.hoverScale})`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                    "translateY(0) scale(1)";
                            }}
                        >
                            روی من Hover کنید
                        </div>
                    </div>

                </div>
            </GlassPanel>

            {/* Actions */}
            <GlassPanel className="p-6">
                <div className="flex flex-col sm:flex-row gap-3">

                    <PrimaryButton
                        onClick={onSave}
                        disabled={saving}
                    >
                        {saving
                            ? "در حال ذخیره..."
                            : "💾 ذخیره تنظیمات"}
                    </PrimaryButton>

                    <button
                        type="button"
                        onClick={onReset}
                        disabled={saving}
                        className="px-5 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface)] transition"
                    >
                        {resetLabel}
                    </button>

                </div>
            </GlassPanel>

        </div>
    );
}

/* ===========================
   Helper Components
=========================== */

function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="flex items-center justify-between gap-3">
                <span className="font-bold">
                    {label}
                </span>

                <input
                    type="color"
                    value={value}
                    onChange={(e) =>
                        onChange(e.target.value)
                    }
                    className="w-14 h-12 rounded-xl border border-[var(--border)] bg-transparent cursor-pointer"
                />
            </div>

            <input
                type="text"
                value={value}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-mono"
            />
        </div>
    );
}

function RangeField({
    label,
    value,
    min,
    max,
    step = 1,
    suffix,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix: string;
    onChange: (value: number) => void;
}) {
    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">

            <div className="flex items-center justify-between gap-3 mb-4">

                <label className="font-bold">
                    {label}
                </label>

                <span className="text-sm font-black text-[var(--primary)]">
                    {value}
                    {suffix}
                </span>

            </div>

            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) =>
                    onChange(
                        Number(e.target.value)
                    )
                }
                className="w-full accent-[var(--primary)]"
            />

        </div>
    );
}