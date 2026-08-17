"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DynamicServiceForm from "@/components/DynamicServiceForm";

import {
    GlassPanel,
    TusanButton,
    SectionHeader,
} from "@/components/ui";

export default function ServiceOrderPage() {
    const params = useParams();
    const router = useRouter();

    const serviceId = params.id as string;

    const [service, setService] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (serviceId) {
            loadService();
        }
    }, [serviceId]);

    async function loadService() {
        setLoading(true);
        setError("");

        try {
            const {
                data: serviceData,
                error: serviceError,
            } = await supabase
                .from("services")
                .select(`
                    id,
                    title,
                    category,
                    description,
                    price,
                    icon,
                    form_schema,
                    is_active
                `)
                .eq("id", serviceId)
                .eq("is_active", true)
                .single();

            if (serviceError || !serviceData) {
                throw new Error(
                    "خدمت موردنظر پیدا نشد یا غیرفعال است."
                );
            }

            /*
             * form_schema باید آرایه باشد.
             * در صورتی که Supabase مقدار JSON را به شکل
             * string برگرداند، آن را به آرایه تبدیل می‌کنیم.
             */
            let normalizedSchema: any[] = [];

            if (Array.isArray(serviceData.form_schema)) {
                normalizedSchema = serviceData.form_schema;
            } else if (
                typeof serviceData.form_schema === "string"
            ) {
                try {
                    const parsed = JSON.parse(
                        serviceData.form_schema
                    );

                    if (Array.isArray(parsed)) {
                        normalizedSchema = parsed;
                    }
                } catch {
                    normalizedSchema = [];
                }
            }

            const normalizedService = {
                ...serviceData,
                form_schema: normalizedSchema,
            };

            console.log(
                "========== SERVICE FORM =========="
            );

            console.log(
                "SERVICE ID:",
                normalizedService.id
            );

            console.log(
                "SERVICE TITLE:",
                normalizedService.title
            );

            console.log(
                "FORM SCHEMA:",
                normalizedSchema
            );

            console.log(
                "FORM SCHEMA LENGTH:",
                normalizedSchema.length
            );

            console.log(
                "=================================="
            );

            setService(normalizedService);
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "خطایی هنگام دریافت اطلاعات خدمت رخ داد."
            );
        } finally {
            setLoading(false);
        }
    }

    function generateTrackingCode() {
        const random =
            Math.floor(
                100000 +
                Math.random() * 900000
            );

        return `TUS-${Date.now()
            .toString()
            .slice(-6)}-${random}`;
    }

    async function submitOrder(
        formData: Record<string, any>
    ) {
        setSubmitting(true);
        setError("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            /*
             * اطلاعات فرم در لحظه ثبت سفارش ذخیره می‌شود.
             *
             * نکته مهم:
             * formData یک snapshot مستقل از فرم فعلی است.
             * بنابراین تغییرات بعدی form_schema روی سفارش
             * ثبت‌شده تأثیری ندارد.
             */
            const savedFormData = {
                ...formData,
            };

            const trackingCode =
                generateTrackingCode();

            const { data: order, error: orderError } =
                await supabase
                    .from("orders")
                    .insert({
                        user_id: user.id,
                        service_id: service.id,
                        tracking_code: trackingCode,
                        status: "registered",
                        form_data: savedFormData,
                        price: service.price || 0,
                    })
                    .select("id, tracking_code")
                    .single();

            if (orderError) {
                throw new Error(
                    orderError.message
                );
            }

            if (!order) {
                throw new Error(
                    "سفارش ثبت شد اما اطلاعات سفارش دریافت نشد."
                );
            }

            router.push(
                `/orders/${order.id}`
            );
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "خطایی هنگام ثبت سفارش رخ داد."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div
                dir="rtl"
                className="min-h-screen page-background p-6 text-[var(--text)] transition-colors duration-300"
            >
                <GlassPanel className="p-8 text-center">
                    <div className="text-[var(--text-muted)]">
                        در حال دریافت اطلاعات خدمت...
                    </div>
                </GlassPanel>
            </div>
        );
    }

    if (!service) {
        return (
            <div
                dir="rtl"
                className="min-h-screen bg-gray-100 p-6"
            >
                <GlassPanel className="p-8 text-center">
                    <div className="text-5xl mb-4">⚠️</div>

                    <h1 className="text-xl font-bold text-[var(--text)]">
                        خدمت پیدا نشد
                    </h1>

                    <p className="text-[var(--text-muted)] mt-2">
                        {error}
                    </p>

                    <div className="mt-6">
                        <Link href="/services">
                            <TusanButton>بازگشت به خدمات</TusanButton>
                        </Link>
                    </div>
                </GlassPanel>
            </div>
        );
    }

    const fields = Array.isArray(
        service.form_schema
    )
        ? service.form_schema
        : [];

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-gray-100 p-6"
        >
            <div className="max-w-3xl mx-auto">

                {/* Header */}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

                    <div>

                        <SectionHeader
                            title={`${service.icon || "📋"} ${service.title}`}
                            description={service.category || "ثبت سفارش خدمت"}
                        />

                    </div>

                    <Link href="/services">
                        <TusanButton variant="secondary">
                            ← بازگشت به خدمات
                        </TusanButton>
                    </Link>

                </div>

                {/* Description */}

                {service.description && (
                    <GlassPanel className="p-6">

                        <h2 className="font-bold mb-2">
                            درباره این خدمت
                        </h2>

                        <p className="text-[var(--text-secondary)] leading-7">
                            {service.description}
                        </p>

                    </GlassPanel>
                )}

                {/* Order Form */}

                <GlassPanel className="bg-white rounded-2xl shadow p-6">

                    <div className="mb-6">

                        <h2 className="text-xl font-bold">
                            اطلاعات سفارش
                        </h2>

                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            اطلاعات موردنیاز را وارد کنید.
                        </p>

                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5">
                            {error}
                        </div>
                    )}

                    {fields.length === 0 ? (
                        <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center">

                            <p className="text-[var(--text-muted)]">
                                این خدمت هنوز فرم اطلاعاتی ندارد.
                            </p>

                            <p className="text-sm text-gray-400 mt-2">
                                برای ثبت سفارش، ابتدا فرم این خدمت
                                باید توسط مدیر تنظیم شود.
                            </p>

                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() =>
                                    submitOrder({})
                                }
                                className="mt-5 bg-[#09967C] text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
                            >
                                {submitting
                                    ? "در حال ثبت سفارش..."
                                    : "ثبت سفارش"}
                            </button>

                        </div>
                    ) : (
                        <DynamicServiceForm
                            fields={fields}
                            onSubmit={submitOrder}
                            submitting={submitting}
                        />
                    )}

                </GlassPanel>

            </div>
        </div>
    );
}