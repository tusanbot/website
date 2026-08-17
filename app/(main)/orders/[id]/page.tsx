"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

import OrderStatus from "@/components/OrderStatus";
import OrderMessages from "@/components/OrderMessages";
import OrderFileUpload from "@/components/OrderFileUpload";
import OrderFiles from "@/components/orders/OrderFiles";

import {
    GlassPanel,
    TusanCard,
    TusanButton,
    SectionHeader,
    TusanBadge,
} from "@/components/ui";

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const STATUS_LABELS: Record<string, string> = {
        registered: "ثبت شده",
        checking: "در حال بررسی",
        need_documents: "نیازمند مدارک",
        processing: "در حال انجام",
        ready: "آماده تحویل",
        completed: "تکمیل شده",
        cancelled: "لغو شده",
    };

    const STATUS_STEPS = [
        "registered",
        "checking",
        "need_documents",
        "processing",
        "ready",
        "completed",
    ];

    const FIELD_LABELS: Record<string, string> = {
        full_name: "نام و نام خانوادگی",
        first_name: "نام",
        last_name: "نام خانوادگی",
        national_code: "کد ملی",
        phone: "شماره موبایل",
        mobile: "شماره موبایل",
        email: "ایمیل",
        birth_date: "تاریخ تولد",
        address: "آدرس",
        gender: "جنسیت",
        province: "استان",
        city: "شهر",
        school: "مدرسه",
        university: "دانشگاه",
        major: "رشته تحصیلی",
        field: "رشته",
        quota: "سهمیه",
    };

    useEffect(() => {
        if (id) loadOrder();
    }, [id]);

    async function loadOrder() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            router.push("/login");
            return;
        }

        const { data, error } = await supabase
            .from("orders")
            .select(`
        *,
        services(title, icon, description),
        order_history(id, old_status, new_status, description, created_at)
      `)
            .eq("id", id)
            .single();

        if (error || !data) {
            setLoading(false);
            return;
        }

        if (data.user_id !== user.id) {
            router.push("/orders");
            return;
        }

        setOrder(data);
        setLoading(false);
    }

    if (loading) {
        return (
            <div
                dir="rtl"
                className="min-h-screen page-background flex items-center justify-center text-[var(--text)]"
            >
                <GlassPanel className="p-10 text-center text-[var(--text-muted)]">
                    در حال دریافت اطلاعات سفارش...
                </GlassPanel>
            </div>
        );
    }

    if (!order) {
        return (
            <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]">
                <div className="max-w-2xl mx-auto">
                    <GlassPanel className="p-8 text-center">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h1 className="text-xl font-bold">
                            سفارش پیدا نشد
                        </h1>

                        <div className="mt-6">
                            <Link href="/orders">
                                <TusanButton>بازگشت به سفارش‌ها</TusanButton>
                            </Link>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        );
    }

    const history = [...(order.order_history || [])].sort(
        (a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const currentStep = STATUS_STEPS.indexOf(order.status);

    const displayFields =
        order.services?.form_schema || [];

    return (
        <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)] transition-colors duration-300">
            <div className="max-w-3xl mx-auto space-y-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <SectionHeader
                        title={`${order.services?.icon || "📋"} ${order.services?.title || "سفارش"}`}
                        description="جزئیات سفارش و روند انجام آن"
                    />

                    <Link href="/orders">
                        <TusanButton variant="secondary">
                            بازگشت به سفارش‌ها
                        </TusanButton>
                    </Link>
                </div>

                {/* خلاصه سفارش */}
                <GlassPanel className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold">
                                {order.services?.icon} {order.services?.title}
                            </h2>

                            {order.services?.description && (
                                <p className="text-gray-500 mt-2 leading-7">
                                    {order.services.description}
                                </p>
                            )}
                        </div>

                        <OrderStatus status={order.status} />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mt-6">
                        <TusanCard className="p-4">
                            <div className="text-sm text-gray-500">کد پیگیری</div>
                            <div className="font-bold mt-1">
                                {order.tracking_code}
                            </div>
                        </TusanCard>

                        <TusanCard className="p-4">
                            <div className="text-sm text-gray-500">تاریخ ثبت</div>
                            <div className="font-bold mt-1">
                                {new Date(order.created_at).toLocaleDateString("fa-IR")}
                            </div>
                        </TusanCard>

                        <TusanCard className="p-4">
                            <div className="text-sm text-gray-500">مبلغ سفارش</div>
                            <div className="font-bold mt-1">
                                {Number(order.price || 0).toLocaleString("fa-IR")} تومان
                            </div>
                        </TusanCard>
                    </div>

                    {/* Timeline */}
                    {order.status !== "cancelled" && (
                        <div className="mt-8">
                            <h3 className="font-bold mb-4">روند انجام سفارش</h3>

                            <div className="grid grid-cols-6 gap-2 text-center">
                                {STATUS_STEPS.map((step, index) => {
                                    const active = index <= currentStep;

                                    return (
                                        <div key={step} className="flex flex-col items-center">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${active
                                                    ? "bg-[#09967C] text-white"
                                                    : "bg-gray-200 text-gray-500"
                                                    }`}
                                            >
                                                {index + 1}
                                            </div>

                                            <div className="text-xs mt-2 text-gray-600 leading-5">
                                                {STATUS_LABELS[step]}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </GlassPanel>

                {/* اطلاعات فرم */}
                <GlassPanel className="p-6">
                    <h2 className="text-xl font-bold mb-4">
                        اطلاعات ثبت شده
                    </h2>

                    {Object.keys(order.form_data || {}).length === 0 ? (
                        <p className="text-gray-500">
                            اطلاعاتی برای این سفارش ثبت نشده است.
                        </p>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {displayFields.length > 0
                                ? displayFields.map((field: any) => {
                                    const value = order.form_data?.[field.name];

                                    return (
                                        <div
                                            key={field.name}
                                            className="border rounded-xl p-4"
                                        >
                                            <div className="text-sm text-gray-500 mb-1">
                                                {field.label}
                                            </div>

                                            <div className="font-bold break-words">
                                                {Array.isArray(value)
                                                    ? value.join("، ")
                                                    : value === true
                                                        ? "بله"
                                                        : value === false
                                                            ? "خیر"
                                                            : value || "---"}
                                            </div>
                                        </div>
                                    );
                                })
                                : Object.entries(order.form_data || {}).map(
                                    ([key, value]: any) => (
                                        <div
                                            key={key}
                                            className="border rounded-xl p-4"
                                        >
                                            <div className="text-sm text-gray-500 mb-1">
                                                {FIELD_LABELS[key] || key}
                                            </div>

                                            <div className="font-bold break-words">
                                                {Array.isArray(value)
                                                    ? value.join("، ")
                                                    : value === true
                                                        ? "بله"
                                                        : value === false
                                                            ? "خیر"
                                                            : String(value ?? "---")}
                                            </div>
                                        </div>
                                    )
                                )}
                        </div>
                    )}
                </GlassPanel>

                <OrderMessages orderId={order.id} />
                <OrderFiles orderId={order.id} />
                <OrderFileUpload orderId={order.id} />

                <GlassPanel className="p-6">
                    <h2 className="text-xl font-bold mb-5">تاریخچه سفارش</h2>

                    {history.length === 0 ? (
                        <p className="text-gray-500">هنوز تاریخچه‌ای ثبت نشده است.</p>
                    ) : (
                        <div className="space-y-5">
                            {history.map((item: any) => (
                                <div
                                    key={item.id}
                                    className="border-r-4 border-[#09967C] pr-4"
                                >
                                    <p className="font-bold">
                                        {item.old_status === item.new_status
                                            ? "ثبت سفارش"
                                            : `تغییر وضعیت از ${STATUS_LABELS[item.old_status] || item.old_status
                                            } به ${STATUS_LABELS[item.new_status] || item.new_status
                                            }`}
                                    </p>

                                    {item.description && (
                                        <p className="text-gray-600 text-sm mt-1">
                                            {item.description}
                                        </p>
                                    )}

                                    <p className="text-gray-400 text-sm mt-2">
                                        {new Date(item.created_at).toLocaleString("fa-IR")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassPanel>
            </div>
        </div>
    );
}