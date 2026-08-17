"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyOrderRedirectPage() {
    const params = useParams();
    const router = useRouter();

    useEffect(() => {
        const id = params.id as string;
        if (id) {
            router.replace(`/services/${id}`);
        }
    }, [params, router]);

    return (
        <div dir="rtl" className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-gray-600">در حال انتقال به صفحه ثبت سفارش...</div>
        </div>
    );
}