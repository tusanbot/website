"use client";

import { useEffect, useState } from "react";

type Settings = {
    compactMode: boolean;
    showUnreadBadge: boolean;
    confirmDelete: boolean;
    autoRefreshMessages: boolean;
};

const DEFAULT_SETTINGS: Settings = {
    compactMode: false,
    showUnreadBadge: true,
    confirmDelete: true,
    autoRefreshMessages: true,
};

const STORAGE_KEY =
    "tusan-admin-settings";

export default function AdminSettings() {
    const [settings, setSettings] =
        useState<Settings>(
            DEFAULT_SETTINGS
        );

    const [saved, setSaved] =
        useState(false);

    useEffect(() => {
        try {
            const stored =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (stored) {
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...JSON.parse(
                        stored
                    ),
                });
            }
        } catch (error) {
            console.error(
                "خطا در دریافت تنظیمات:",
                error
            );
        }
    }, []);

    function updateSetting<
        K extends keyof Settings
    >(
        key: K,
        value: Settings[K]
    ) {
        setSettings(
            (current) => ({
                ...current,
                [key]: value,
            })
        );

        setSaved(false);
    }

    function saveSettings() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    settings
                )
            );

            setSaved(true);

            setTimeout(() => {
                setSaved(false);
            }, 3000);
        } catch (error) {
            console.error(
                "خطا در ذخیره تنظیمات:",
                error
            );
        }
    }

    function resetSettings() {
        setSettings(
            DEFAULT_SETTINGS
        );

        try {
            localStorage.removeItem(
                STORAGE_KEY
            );
        } catch (error) {
            console.error(
                error
            );
        }

        setSaved(true);

        setTimeout(() => {
            setSaved(false);
        }, 3000);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-xl font-bold text-gray-800">
                    تنظیمات پنل مدیریت
                </h2>

                <p className="text-gray-500 mt-1">
                    تنظیمات مربوط به نحوه نمایش و رفتار پنل مدیریت
                </p>
            </div>

            {/* General */}
            <section className="bg-white rounded-2xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-800">
                    تنظیمات عمومی
                </h3>

                <div className="mt-5 space-y-4">
                    <SettingRow
                        title="حالت فشرده"
                        description="فاصله بین کارت‌ها و عناصر پنل کاهش پیدا می‌کند."
                        checked={
                            settings.compactMode
                        }
                        onChange={(
                            value
                        ) =>
                            updateSetting(
                                "compactMode",
                                value
                            )
                        }
                    />

                    <SettingRow
                        title="نمایش نشان پیام‌های جدید"
                        description="تعداد پیام‌های خوانده‌نشده در نوار مدیریت نمایش داده شود."
                        checked={
                            settings.showUnreadBadge
                        }
                        onChange={(
                            value
                        ) =>
                            updateSetting(
                                "showUnreadBadge",
                                value
                            )
                        }
                    />

                    <SettingRow
                        title="تأیید قبل از حذف"
                        description="قبل از حذف اطلاعات، پنجره تأیید نمایش داده شود."
                        checked={
                            settings.confirmDelete
                        }
                        onChange={(
                            value
                        ) =>
                            updateSetting(
                                "confirmDelete",
                                value
                            )
                        }
                    />

                    <SettingRow
                        title="بروزرسانی خودکار پیام‌ها"
                        description="لیست پیام‌های مدیر در صورت دریافت پیام جدید بروزرسانی شود."
                        checked={
                            settings.autoRefreshMessages
                        }
                        onChange={(
                            value
                        ) =>
                            updateSetting(
                                "autoRefreshMessages",
                                value
                            )
                        }
                    />
                </div>
            </section>

            {/* System information */}
            <section className="bg-white rounded-2xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-800">
                    اطلاعات سیستم
                </h3>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                    <InfoCard
                        title="نام سامانه"
                        value="کافی‌نت توسن"
                    />

                    <InfoCard
                        title="پنل"
                        value="مدیریت"
                    />

                    <InfoCard
                        title="رابط کاربری"
                        value="RTL / فارسی"
                    />
                </div>
            </section>

            {/* Actions */}
            <section className="bg-white rounded-2xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-800">
                    عملیات تنظیمات
                </h3>

                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <button
                        type="button"
                        onClick={
                            saveSettings
                        }
                        className="bg-[#09967C] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
                    >
                        ذخیره تنظیمات
                    </button>

                    <button
                        type="button"
                        onClick={
                            resetSettings
                        }
                        className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                    >
                        بازگردانی تنظیمات
                    </button>
                </div>

                {saved && (
                    <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
                        تنظیمات با موفقیت ذخیره شد.
                    </div>
                )}
            </section>

            {/* Future settings */}
            <section className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex gap-3">
                    <div className="text-2xl">
                        ℹ️
                    </div>

                    <div>
                        <h3 className="font-bold text-blue-800">
                            تنظیمات پیشرفته
                        </h3>

                        <p className="text-blue-700 text-sm mt-1 leading-6">
                            تنظیمات اطلاعات کافی‌نت، ساعات کاری،
                            روش‌های پرداخت، پیام‌های پیش‌فرض،
                            وضعیت ثبت سفارش و سایر تنظیمات
                            کسب‌وکار را در مرحله بعد می‌توانیم
                            به دیتابیس متصل کنیم.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

function SettingRow({
    title,
    description,
    checked,
    onChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (
        value: boolean
    ) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border rounded-xl p-4">
            <div>
                <div className="font-bold text-gray-800">
                    {title}
                </div>

                <div className="text-sm text-gray-500 mt-1">
                    {description}
                </div>
            </div>

            <button
                type="button"
                onClick={() =>
                    onChange(
                        !checked
                    )
                }
                className={`relative w-12 h-7 rounded-full transition shrink-0 ${checked
                        ? "bg-[#09967C]"
                        : "bg-gray-300"
                    }`}
                aria-pressed={
                    checked
                }
            >
                <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition ${checked
                            ? "right-1"
                            : "right-6"
                        }`}
                />
            </button>
        </div>
    );
}

function InfoCard({
    title,
    value,
}: {
    title: string;
    value: string;
}) {
    return (
        <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500">
                {title}
            </div>

            <div className="font-bold text-gray-800 mt-2">
                {value}
            </div>
        </div>
    );
}