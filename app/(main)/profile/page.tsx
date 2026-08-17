"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TusanIcon from "@/components/ui/TusanIcon";

import {
    GlassPanel,
    TusanCard,
    TusanButton,
    TusanInput,
    SectionHeader,
} from "@/components/ui";

type ProfileForm = {
    full_name: string;
    phone: string;
    national_code: string;
    birth_date: string;
    address: string;
};

export default function ProfilePage() {
    const router = useRouter();

    const [userId, setUserId] = useState("");
    const [email, setEmail] = useState("");

    const [form, setForm] = useState<ProfileForm>({
        full_name: "",
        phone: "",
        national_code: "",
        birth_date: "",
        address: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<
        "success" | "error" | ""
    >("");

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        setLoading(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            setUserId(user.id);
            setEmail(user.email || "");

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error(
                    "خطا در دریافت پروفایل:",
                    error
                );

                setMessage(
                    "دریافت اطلاعات پروفایل با خطا مواجه شد."
                );
                setMessageType("error");

                return;
            }

            if (data) {
                setForm({
                    full_name: data.full_name || "",
                    phone: data.phone || "",
                    national_code:
                        data.national_code || "",
                    birth_date:
                        data.birth_date || "",
                    address: data.address || "",
                });
            }
        } catch (error) {
            console.error(error);

            setMessage(
                "خطایی در دریافت اطلاعات رخ داد."
            );
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    function changeField(
        event: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement
        >
    ) {
        setForm((previous) => ({
            ...previous,
            [event.target.name]: event.target.value,
        }));

        setMessage("");
        setMessageType("");
    }

    async function saveProfile(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!userId) {
            return;
        }

        setSaving(true);
        setMessage("");
        setMessageType("");

        try {
            if (!form.full_name.trim()) {
                setMessage(
                    "لطفاً نام و نام خانوادگی را وارد کنید."
                );
                setMessageType("error");
                return;
            }

            if (!form.phone.trim()) {
                setMessage(
                    "لطفاً شماره موبایل را وارد کنید."
                );
                setMessageType("error");
                return;
            }

            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: form.full_name.trim(),
                    phone: form.phone.trim(),
                    national_code:
                        form.national_code.trim(),
                    birth_date:
                        form.birth_date || null,
                    address: form.address.trim(),
                })
                .eq("id", userId);

            if (error) {
                console.error(
                    "خطا در ذخیره پروفایل:",
                    error
                );

                setMessage(
                    "ذخیره اطلاعات با خطا مواجه شد."
                );
                setMessageType("error");

                return;
            }

            setMessage(
                "اطلاعات پروفایل با موفقیت ذخیره شد."
            );
            setMessageType("success");
        } catch (error) {
            console.error(error);

            setMessage(
                "خطایی هنگام ذخیره اطلاعات رخ داد."
            );
            setMessageType("error");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div
                dir="rtl"
                className="min-h-screen bg-gray-100 flex items-center justify-center p-6"
            >
                <div className="bg-white rounded-2xl shadow p-8 text-center">
                    <div className="text-4xl mb-4">👤</div>

                    <p className="text-gray-600">
                        در حال دریافت اطلاعات پروفایل...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-gray-100 p-4 sm:p-6"
        >
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <GlassPanel className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                        <SectionHeader
                            title="پروفایل من"
                            description="اطلاعات شخصی خود را مدیریت و بروزرسانی کنید."
                        />

                        <Link href="/dashboard">
                            <TusanButton variant="secondary">
                                بازگشت به داشبورد
                            </TusanButton>
                        </Link>
                    </div>
                </GlassPanel>

                {/* Profile Form */}
                <TusanCard className="p-6 sm:p-8">

                    <div className="flex items-center gap-4 mb-7">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-3xl">
                            👤
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-gray-800">
                                اطلاعات حساب
                            </h2>

                            <p className="text-sm text-gray-500 mt-1">
                                اطلاعات زیر برای ثبت و پیگیری سفارش‌ها استفاده می‌شود.
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={saveProfile}
                        className="space-y-5"
                    >

                        {/* Name */}
                        <div>
                            <label
                                htmlFor="full_name"
                                className="block text-sm font-bold text-gray-700 mb-2"
                            >
                                نام و نام خانوادگی
                            </label>

                            <TusanInput
                                id="full_name"
                                name="full_name"
                                value={form.full_name}
                                onChange={changeField}
                                placeholder="مثلاً مهدی رضایی"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#09967C] focus:ring-2 focus:ring-[#09967C]/10 transition"
                            />
                        </div>

                        {/* Phone + Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            <div>
                                <label
                                    htmlFor="phone"
                                    className="block text-sm font-bold text-gray-700 mb-2"
                                >
                                    شماره موبایل
                                </label>

                                <TusanInput
                                    id="phone"
                                    name="phone"
                                    value={form.phone}
                                    onChange={changeField}
                                    placeholder="09xxxxxxxxx"
                                    dir="ltr"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-left outline-none focus:border-[#09967C] focus:ring-2 focus:ring-[#09967C]/10 transition"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-bold text-gray-700 mb-2"
                                >
                                    ایمیل
                                </label>

                                <TusanInput
                                    id="email"
                                    value={email}
                                    readOnly
                                    dir="ltr"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-left bg-gray-50 text-gray-500 cursor-not-allowed"
                                />

                                <p className="text-xs text-gray-400 mt-2">
                                    ایمیل از حساب کاربری دریافت می‌شود و از این بخش قابل تغییر نیست.
                                </p>
                            </div>
                        </div>

                        {/* National Code + Birth Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            <div>
                                <label
                                    htmlFor="national_code"
                                    className="block text-sm font-bold text-gray-700 mb-2"
                                >
                                    کد ملی
                                </label>

                                <TusanInput
                                    id="national_code"
                                    name="national_code"
                                    value={
                                        form.national_code
                                    }
                                    onChange={changeField}
                                    placeholder="کد ملی"
                                    inputMode="numeric"
                                    dir="ltr"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-left outline-none focus:border-[#09967C] focus:ring-2 focus:ring-[#09967C]/10 transition"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="birth_date"
                                    className="block text-sm font-bold text-gray-700 mb-2"
                                >
                                    تاریخ تولد
                                </label>

                                <TusanInput
                                    id="birth_date"
                                    name="birth_date"
                                    type="date"
                                    value={
                                        form.birth_date
                                    }
                                    onChange={changeField}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#09967C] focus:ring-2 focus:ring-[#09967C]/10 transition"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label
                                htmlFor="address"
                                className="block text-sm font-bold text-gray-700 mb-2"
                            >
                                آدرس
                            </label>

                            <textarea
                                id="address"
                                name="address"
                                value={form.address}
                                onChange={changeField}
                                placeholder="آدرس محل سکونت"
                                rows={4}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition"
                            />
                        </div>

                        {/* Message */}
                        {message && (
                            <div
                                className={`rounded-xl px-4 py-3 text-sm font-medium ${messageType ===
                                    "success"
                                    ? "bg-green-50 border border-green-200 text-green-700"
                                    : "bg-red-50 border border-red-200 text-red-700"
                                    }`}
                            >
                                {message}
                            </div>
                        )}

                        {/* Save */}
                        <TusanButton



                            type="submit"
                            fullWidth
                            disabled={saving}
                        >
                            {saving
                                ? "در حال ذخیره..."
                                : "ذخیره تغییرات"}
                        </TusanButton>
                    </form>
                </TusanCard>
            </div>

            {/* Navigation */}
            <GlassPanel className="p-3">
                <div className="grid grid-cols-4 gap-2">

                    <Link
                        href="/dashboard"
                        className="text-center py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition"
                    >
                        🏠

                        <span className="block text-xs mt-1">
                            داشبورد
                        </span>
                    </Link>

                    <Link
                        href="/orders"
                        className="text-center py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition"
                    >
                        <TusanIcon name="clipboard" size={24} className="text-[var(--primary)]" />

                        <span className="block text-xs mt-1">
                            سفارش‌ها
                        </span>
                    </Link>

                    <Link
                        href="/messages"
                        className="text-center py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition"
                    >
                        💬

                        <span className="block text-xs mt-1">
                            پیام‌ها
                        </span>
                    </Link>

                    <div className="text-center py-3 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
                        👤

                        <span className="block text-xs mt-1">
                            پروفایل
                        </span>
                    </div>

                </div>
            </GlassPanel>

        </div >

    );
}