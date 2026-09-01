"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = { orderId: string };
type OrderFile = {
    id: string; order_id: string; file_title: string | null; file_name: string;
    file_path: string; file_type: string | null; file_size: number | null;
    uploaded_by: string | null; created_at: string;
};

export default function OrderFiles({ orderId }: Props) {
    const [files, setFiles] = useState<OrderFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => { if (orderId) void loadFiles(); }, [orderId]);

    async function loadFiles() {
        setLoading(true); setError("");
        try {
            const { data, error: queryError } = await supabase
                .from("order_files")
                .select("id,order_id,file_title,file_name,file_path,file_type,file_size,uploaded_by,created_at")
                .eq("order_id", orderId)
                .order("created_at", { ascending: true });
            if (queryError) throw queryError;
            setFiles((data || []) as OrderFile[]);
        } catch (err) {
            console.error("خطا در دریافت فایل‌های سفارش:", err);
            setFiles([]); setError("دریافت فایل‌های سفارش ناموفق بود.");
        } finally { setLoading(false); }
    }

    async function downloadFile(file: OrderFile) {
        if (!file.file_path) { setError("مسیر فایل پیدا نشد."); return; }
        setDownloading(file.id); setError("");
        try {
            const { data, error } = await supabase.storage.from("order-files").createSignedUrl(file.file_path, 300);
            if (error || !data?.signedUrl) throw error || new Error("signed URL دریافت نشد.");
            window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        } catch (err) {
            console.error("خطا در دریافت لینک فایل:", err);
            setError("امکان مشاهده یا دانلود این فایل وجود ندارد. لطفاً دوباره تلاش کنید.");
        } finally { setDownloading(null); }
    }

    function formatFileSize(size: number | null) {
        if (size == null) return "حجم نامشخص";
        if (size < 1024) return `${size} بایت`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} کیلوبایت`;
        return `${(size / (1024 * 1024)).toFixed(1)} مگابایت`;
    }

    if (loading) return <div dir="rtl" className="bg-white rounded-2xl shadow p-6"><div className="text-gray-500">در حال دریافت فایل‌ها...</div></div>;

    return <div dir="rtl" className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-bold">فایل‌های سفارش</h2><p className="text-sm text-gray-500 mt-1">مدارک و فایل‌های ارسال‌شده برای این سفارش</p></div>{files.length > 0 && <span className="text-sm text-gray-500">{files.length.toLocaleString("fa-IR")} فایل</span>}</div>
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {files.length === 0 ? <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center"><div className="text-3xl mb-3">📁</div><p className="text-gray-500">هنوز فایلی برای این سفارش ثبت نشده است.</p></div> :
            <div className="space-y-4">{files.map(file => <div key={file.id} className="border border-gray-200 rounded-2xl p-4"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div className="flex-1 min-w-0"><div className="flex items-start gap-3"><div className="text-2xl">📄</div><div className="min-w-0"><h3 className="font-bold text-gray-800 break-words">{file.file_title || "بدون عنوان"}</h3><p className="text-sm text-gray-500 mt-1 break-all">{file.file_name}</p></div></div><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-3"><span>حجم: {formatFileSize(file.file_size)}</span>{file.file_type && <span>نوع: {file.file_type}</span>}<span>{new Date(file.created_at).toLocaleString("fa-IR")}</span></div></div><button type="button" onClick={() => void downloadFile(file)} disabled={downloading === file.id} className="bg-[#09967C] text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 whitespace-nowrap">{downloading === file.id ? "در حال دریافت..." : "مشاهده / دانلود"}</button></div></div>)}</div>}
    </div>;
}
