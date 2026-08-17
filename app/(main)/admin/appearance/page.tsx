"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
    GlassPanel,
    TusanButton,
    SectionHeader,
} from "@/components/ui";

export default function AppearancePage() {
    const [theme, setTheme] = useState("light");
    const [primaryColor, setPrimaryColor] = useState("#09967c");
    const [primaryDark, setPrimaryDark] = useState("#087d69");
    const [radius, setRadius] = useState("28px");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from("site_settings")
                .select("*")
                .limit(1)
                .single();

            if (data) {
                setTheme(data.theme);
                setPrimaryColor(data.primary_color);
                setPrimaryDark(data.primary_dark);
                setRadius(data.radius);
            }
        }

        load();

    }, []);

    async function save() {
        setSaving(true);

        const res = await fetch("/api/admin/site-settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                theme,
                primary_color: primaryColor,
                primary_dark: primaryDark,
                radius,
            }),
        });

        setSaving(false);

        if (res.ok) {
            alert("تنظیمات ذخیره شد. صفحه را رفرش کنید.");
        } else {
            alert("خطا در ذخیره تنظیمات");
        }

    }

    useEffect(() => {
        const root = document.documentElement;

        root.style.setProperty("--primary", primaryColor);
        root.style.setProperty("--primary-dark", primaryDark);
        root.style.setProperty("--radius-xl", radius);

        document.body.setAttribute("data-theme", theme);
    }, [theme, primaryColor, primaryDark, radius]);

    return (
        <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]">
            <div className="max-w-3xl mx-auto space-y-6">
                <SectionHeader
                    title="ظاهر سایت"
                    description="مدیریت تم، رنگ برند و تنظیمات ظاهری سایت"
                />

                <GlassPanel className="p-6 space-y-6">

                    <div>
                        <label className="block mb-2 font-bold">حالت نمایش</label>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 p-3"
                        >
                            <option value="light">روشن</option>
                            <option value="dark">تیره</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 font-bold">رنگ اصلی برند</label>
                        <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="h-12 w-24 rounded-lg border border-gray-200"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-bold">رنگ تیره برند</label>
                        <input
                            type="color"
                            value={primaryDark}
                            onChange={(e) => setPrimaryDark(e.target.value)}
                            className="h-12 w-24 rounded-lg border border-gray-200"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-bold">گردی گوشه‌ها</label>
                        <select
                            value={radius}
                            onChange={(e) => setRadius(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 p-3"
                        >
                            <option value="16px">کم</option>
                            <option value="20px">متوسط</option>
                            <option value="28px">زیاد</option>
                            <option value="36px">خیلی زیاد</option>
                        </select>
                    </div>

                    <TusanButton onClick={save} disabled={saving}>
                        {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
                    </TusanButton>

                    <GlassPanel className="p-6">
                        <h3 className="text-xl font-black text-gray-800">
                            پیش‌نمایش زنده
                        </h3>

                        <p className="mt-2 text-gray-600">
                            این بخش دقیقاً با تنظیمات انتخاب‌شده نمایش داده می‌شود.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button className="btn-primary px-5 py-3">
                                دکمه اصلی
                            </button>

                            <button className="rounded-[var(--radius-xl)] border border-gray-300 px-5 py-3 font-bold text-gray-700">
                                دکمه ثانویه
                            </button>
                        </div>

                        <div className="mt-6 rounded-[var(--radius-xl)] border border-gray-100 bg-gray-50 p-5">
                            <div className="text-sm text-gray-500">نمونه کارت خدمت</div>
                            <div className="mt-2 text-lg font-black text-gray-800">
                                ثبت‌نام کنکور
                            </div>
                            <div className="mt-1 text-gray-600">
                                نمونه نمایش کارت خدمات با رنگ و شعاع گوشه‌های انتخاب‌شده.
                            </div>
                        </div>

                    </GlassPanel>
                </GlassPanel>
            </div>
        </div>

    );
}