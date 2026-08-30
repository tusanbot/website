"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
    orderId: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/json",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export default function OrderFileUpload({ orderId }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [fileTitle, setFileTitle] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    function validateFile(selectedFile: File) {
        if (selectedFile.size <= 0) return "فایل انتخاب‌شده خالی است.";
        if (selectedFile.size > MAX_FILE_SIZE) {
            return "حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.";
        }
        if (!ALLOWED_MIME_TYPES.has(selectedFile.type)) {
            return "نوع فایل مجاز نیست. فقط PDF، تصاویر JPG/PNG/WebP و فایل‌های JSON مجاز هستند.";
        }
        return "";
    }

    async function uploadFile() {
        setError("");
        setMessage("");
        const normalizedTitle = fileTitle.trim();

        if (!normalizedTitle) {
            setError("لطفاً عنوان مدرک را وارد کنید.");
            return;
        }
        if (normalizedTitle.length > 200) {
            setError("عنوان مدرک نمی‌تواند بیشتر از ۲۰۰ کاراکتر باشد.");
            return;
        }
        if (!file) {
            setError("لطفاً فایل موردنظر را انتخاب کنید.");
            return;
        }

        const fileValidationError = validateFile(file);
        if (fileValidationError) {
            setError(fileValidationError);
            return;
        }
        if (!orderId) {
            setError("شناسه سفارش معتبر نیست.");
            return;
        }

        setUploading(true);

        try {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError || !session?.access_token) {
                throw new Error("برای ارسال فایل باید وارد حساب کاربری خود شوید.");
            }

            const body = new FormData();
            body.append("orderId", orderId);
            body.append("fileTitle", normalizedTitle);
            body.append("file", file, file.name);

            const response = await fetch("/api/orders/upload-file", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                body,
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result?.error || "خطایی هنگام ارسال فایل رخ داد.");
            }

            setFile(null);
            setFileTitle("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            setMessage("مدرک با موفقیت ارسال شد.");
        } catch (err: unknown) {
            console.error("Upload file error:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "خطایی هنگام ارسال فایل رخ داد."
            );
        } finally {
            setUploading(false);
        }
    }

    return (
        <div dir="rtl" className="bg-white rounded-2xl shadow p-6 mt-5">
            <h2 className="text-xl font-bold mb-2">ارسال مدارک</h2>
            <p className="text-sm text-gray-500 mb-5">
                برای هر فایل، عنوان مدرک را مشخص کنید تا مدیر بتواند نوع مدرک را تشخیص دهد.
            </p>

            <div className="mb-4">
                <label className="block font-bold text-sm mb-2">عنوان مدرک</label>
                <input
                    type="text"
                    value={fileTitle}
                    maxLength={200}
                    onChange={(e) => {
                        setFileTitle(e.target.value);
                        setError("");
                    }}
                    disabled={uploading}
                    placeholder="مثلاً عکس کارت ملی"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#09967C]"
                />
                <p className="text-xs text-gray-400 mt-2">
                    مثال: عکس کارت ملی، صفحه اول شناسنامه، مدرک تحصیلی و...
                </p>
            </div>

            <div className="mb-4">
                <label className="block font-bold text-sm mb-2">فایل</label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,application/json,image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                        const selectedFile = e.target.files?.[0] || null;
                        setFile(selectedFile);
                        setError("");
                        setMessage("");
                        if (selectedFile) {
                            const validationError = validateFile(selectedFile);
                            if (validationError) setError(validationError);
                        }
                    }}
                    disabled={uploading}
                    className="block w-full border border-gray-200 rounded-xl p-3 bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-2">
                    حداکثر حجم: ۱۰ مگابایت — PDF، JPG، PNG، WebP و JSON
                </p>
            </div>

            {file && (
                <div className="bg-gray-50 border rounded-xl p-4 mb-4">
                    <div className="font-bold">فایل انتخاب‌شده</div>
                    <div className="text-gray-600 text-sm mt-1 break-all">{file.name}</div>
                    <div className="text-gray-400 text-xs mt-1">
                        حجم: {(file.size / 1024).toFixed(1)} KB
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
                    {error}
                </div>
            )}
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
                    !fileTitle.trim() ||
                    Boolean(file && validateFile(file))
                }
                className="bg-[#09967C] text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 transition"
            >
                {uploading ? "در حال ارسال..." : "ارسال مدرک"}
            </button>
        </div>
    );
}
