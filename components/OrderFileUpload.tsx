"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
    orderId: string;
};

export default function OrderFileUpload({
    orderId,
}: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [fileTitle, setFileTitle] = useState("");

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);

    const fileInputRef =
        useRef<HTMLInputElement | null>(null);

    async function uploadFile() {
        setError("");
        setMessage("");

        if (!fileTitle.trim()) {
            setError(
                "لطفاً عنوان مدرک را وارد کنید."
            );
            return;
        }

        if (!file) {
            setError(
                "لطفاً فایل موردنظر را انتخاب کنید."
            );
            return;
        }

        if (!orderId) {
            setError(
                "شناسه سفارش معتبر نیست."
            );
            return;
        }

        setUploading(true);

        try {
            // دریافت کاربر فعلی
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "برای ارسال فایل باید وارد حساب کاربری خود شوید."
                );
            }

            // ساخت نام یکتا برای فایل
            const fileExt =
                file.name.includes(".")
                    ? file.name.split(".").pop()
                    : "";

            const uniqueFileName =
                `${crypto.randomUUID()}${fileExt
                    ? `.${fileExt}`
                    : ""
                }`;

            const filePath =
                `${orderId}/${uniqueFileName}`;

            // ==========================================
            // Upload to Storage
            // ==========================================

            const {
                error: uploadError,
            } = await supabase.storage
                .from("order-files")
                .upload(
                    filePath,
                    file
                );

            if (uploadError) {
                throw new Error(
                    uploadError.message
                );
            }

            // ==========================================
            // Save file information in database
            // ==========================================

            const {
                error: insertError,
            } = await supabase
                .from("order_files")
                .insert({
                    order_id: orderId,
                    file_title:
                        fileTitle.trim(),
                    file_name:
                        file.name,
                    file_path:
                        filePath,
                    file_type:
                        file.type || "",
                    file_size:
                        file.size,
                    uploaded_by:
                        user.id,
                });

            if (insertError) {
                // اگر DB شکست خورد،
                // فایل Storage را حذف می‌کنیم.
                await supabase.storage
                    .from("order-files")
                    .remove([
                        filePath,
                    ]);

                throw new Error(
                    insertError.message
                );
            }

            // پاک کردن فرم
            setFile(null);
            setFileTitle("");

            if (
                fileInputRef.current
            ) {
                fileInputRef.current.value =
                    "";
            }

            setMessage(
                "مدرک با موفقیت ارسال شد."
            );
        } catch (err: any) {
            console.error(
                "Upload file error:",
                err
            );

            setError(
                err?.message ||
                "خطایی هنگام ارسال فایل رخ داد."
            );
        } finally {
            setUploading(false);
        }
    }

    return (
        <div
            dir="rtl"
            className="bg-white rounded-2xl shadow p-6 mt-5"
        >
            <h2 className="text-xl font-bold mb-2">
                ارسال مدارک
            </h2>

            <p className="text-sm text-gray-500 mb-5">
                برای هر فایل، عنوان مدرک را مشخص کنید
                تا مدیر بتواند نوع مدرک را تشخیص دهد.
            </p>

            {/* عنوان مدرک */}
            <div className="mb-4">
                <label className="block font-bold text-sm mb-2">
                    عنوان مدرک
                </label>

                <input
                    type="text"
                    value={fileTitle}
                    onChange={(e) => {
                        setFileTitle(
                            e.target.value
                        );
                        setError("");
                    }}
                    disabled={uploading}
                    placeholder="مثلاً عکس کارت ملی"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#09967C]"
                />

                <p className="text-xs text-gray-400 mt-2">
                    مثال: عکس کارت ملی، صفحه اول شناسنامه،
                    مدرک تحصیلی و...
                </p>
            </div>

            {/* انتخاب فایل */}
            <div className="mb-4">
                <label className="block font-bold text-sm mb-2">
                    فایل
                </label>

                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                        setFile(
                            e.target.files?.[0] ||
                            null
                        );

                        setError("");
                        setMessage("");
                    }}
                    disabled={uploading}
                    className="block w-full border border-gray-200 rounded-xl p-3 bg-gray-50"
                />
            </div>

            {/* فایل انتخاب شده */}
            {file && (
                <div className="bg-gray-50 border rounded-xl p-4 mb-4">
                    <div className="font-bold">
                        فایل انتخاب‌شده
                    </div>

                    <div className="text-gray-600 text-sm mt-1 break-all">
                        {file.name}
                    </div>

                    <div className="text-gray-400 text-xs mt-1">
                        حجم:{" "}
                        {(
                            file.size /
                            1024
                        ).toFixed(1)}{" "}
                        KB
                    </div>
                </div>
            )}

            {/* خطا */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
                    {error}
                </div>
            )}

            {/* موفقیت */}
            {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-4 text-sm">
                    {message}
                </div>
            )}

            <button
                type="button"
                onClick={uploadFile}
                disabled={
                    uploading ||
                    !file ||
                    !fileTitle.trim()
                }
                className="bg-[#09967C] text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 transition"
            >
                {uploading
                    ? "در حال ارسال..."
                    : "ارسال مدرک"}
            </button>
        </div>
    );
}