"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type OrderFile = {
    id: string;
    file_title: string | null;
    file_name: string | null;
    file_path: string | null;
    file_type: string | null;
    file_size: number | null;
    uploaded_by: string | null;
    created_at: string;
};

export default function AdminOrderFiles({
    orderId,
}: {
    orderId: string;
}) {
    const [files, setFiles] = useState<OrderFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        if (orderId) {
            loadFiles();
        }
    }, [orderId]);

    async function loadFiles() {
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from("order_files")
                .select(`
                    id,
                    file_title,
                    file_name,
                    file_path,
                    file_type,
                    file_size,
                    uploaded_by,
                    created_at
                `)
                .eq("order_id", orderId)
                .order("created_at", {
                    ascending: true,
                });

            if (error) {
                console.error(
                    "خطا در دریافت مدارک:",
                    error
                );

                setFiles([]);
                return;
            }

            setFiles((data || []) as OrderFile[]);
        } catch (error) {
            console.error(
                "خطای غیرمنتظره در دریافت مدارک:",
                error
            );

            setFiles([]);
        } finally {
            setLoading(false);
        }
    }

    async function downloadFile(file: OrderFile) {
        if (!file.file_path) {
            alert("مسیر فایل پیدا نشد.");
            return;
        }

        setDownloading(file.id);

        try {
            const { data, error } = await supabase.storage
                .from("order-files")
                .createSignedUrl(file.file_path, 60);

            if (error || !data?.signedUrl) {
                console.error(
                    "خطا در دریافت لینک فایل:",
                    error
                );

                alert("امکان دریافت فایل وجود ندارد.");
                return;
            }

            window.open(
                data.signedUrl,
                "_blank",
                "noopener,noreferrer"
            );
        } catch (error) {
            console.error(
                "خطا در دریافت فایل:",
                error
            );

            alert("خطایی هنگام دریافت فایل رخ داد.");
        } finally {
            setDownloading(null);
        }
    }

    function formatFileSize(size: number | null) {
        if (size === null || size === undefined) {
            return "حجم نامشخص";
        }

        if (size < 1024) {
            return `${size} بایت`;
        }

        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} کیلوبایت`;
        }

        return `${(size / (1024 * 1024)).toFixed(1)} مگابایت`;
    }

    if (loading) {
        return (
            <div
                dir="rtl"
                className="bg-white rounded-2xl shadow p-6"
            >
                <h2 className="text-xl font-bold mb-4">
                    مدارک ارسال شده
                </h2>

                <p className="text-gray-500">
                    در حال دریافت مدارک...
                </p>
            </div>
        );
    }

    return (
        <div
            dir="rtl"
            className="bg-white rounded-2xl shadow p-6"
        >
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-bold">
                        مدارک ارسال شده
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        فایل‌ها و مدارکی که برای این سفارش ارسال شده‌اند
                    </p>
                </div>

                {files.length > 0 && (
                    <span className="text-sm text-gray-500">
                        {files.length.toLocaleString("fa-IR")} فایل
                    </span>
                )}
            </div>

            {files.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <div className="text-3xl mb-3">
                        📁
                    </div>

                    <p className="text-gray-500">
                        هنوز مدرکی برای این سفارش ارسال نشده است.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="border border-gray-200 rounded-2xl p-4"
                        >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">
                                            📄
                                        </div>

                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-800 break-words">
                                                {file.file_title ||
                                                    "بدون عنوان"}
                                            </h3>

                                            <p className="text-sm text-gray-500 mt-1 break-all">
                                                {file.file_name ||
                                                    "نام فایل نامشخص"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-3">
                                        <span>
                                            حجم:{" "}
                                            {formatFileSize(
                                                file.file_size
                                            )}
                                        </span>

                                        {file.file_type && (
                                            <span>
                                                نوع:{" "}
                                                {file.file_type}
                                            </span>
                                        )}

                                        <span>
                                            تاریخ ارسال:{" "}
                                            {new Date(
                                                file.created_at
                                            ).toLocaleString(
                                                "fa-IR"
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        downloadFile(file)
                                    }
                                    disabled={
                                        downloading === file.id
                                    }
                                    className="bg-[#09967C] text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 whitespace-nowrap"
                                >
                                    {downloading === file.id
                                        ? "در حال دریافت..."
                                        : "مشاهده / دانلود"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}