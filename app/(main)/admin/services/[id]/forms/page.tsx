"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import FormHierarchyManager from "@/components/FormHierarchyManager";
import {
    GlassPanel,
    SectionHeader,
    TusanButton,
} from "@/components/ui";

export default function ServiceFormsPage() {
    const params = useParams();
    const router = useRouter();
    const serviceId = params.id as string;

    const [service, setService] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (serviceId) loadService();
    }, [serviceId]);

    async function loadService() {
        setLoading(true);
        setError("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profileError || profile?.role !== "admin") {
                router.push("/dashboard");
                return;
            }

            const { data, error: serviceError } = await supabase
                .from("services")
                .select("id,title,category")
                .eq("id", serviceId)
                .single();

            if (serviceError || !data) {
                throw new Error("خدمت موردنظر پیدا نشد.");
            }

            setService(data);
        } catch (err: any) {
            setError(err?.message || "خطایی هنگام دریافت خدمت رخ داد.");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div dir="rtl" className="min-h-screen page-background p-6">
                <GlassPanel className="p-8 text-center">در حال دریافت اطلاعات...</GlassPanel>
            </div>
        );
    }

    if (!service) {
        return (
            <div dir="rtl" className="min-h-screen page-background p-6">
                <GlassPanel className="p-8 text-center text-red-600">{error}</GlassPanel>
            </div>
        );
    }

    return (
        <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <SectionHeader
                        title={`مدیریت فرم‌های ${service.title}`}
                        description="فرم مادر و فرم‌های عادی/فرزند این خدمت را مدیریت کنید."
                    />

                    <div className="flex gap-2">
                        <Link href={`/admin/services/${service.id}`}>
                            <TusanButton variant="secondary">ویرایش خدمت</TusanButton>
                        </Link>
                        <Link href="/admin/services">
                            <TusanButton variant="secondary">بازگشت</TusanButton>
                        </Link>
                    </div>
                </div>

                <FormHierarchyManager serviceId={service.id} />
            </div>
        </div>
    );
}
