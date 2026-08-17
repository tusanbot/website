"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";




type AnnouncementType =
    | "registration"
    | "announcement"
    | "notice"
    | "regulation";

type DocumentItem = {
    title: string;
    description?: string;
};

type Announcement = {
    id: string;
    title: string;
    type: AnnouncementType;
    summary: string | null;
    content: string | null;
    start_at: string;
    end_at: string;
    documents: DocumentItem[];
    is_active: boolean;
    is_extendable: boolean;
    extended_end_at: string | null;
    button_label: string | null;
    service_id: string | null;
    priority: number;
    services?: {
        title: string;
        icon: string | null;
    } | null;
};

type Props = {
    limit?: number;
};

function getEffectiveEndDate(
    announcement: Announcement
) {
    return announcement.extended_end_at
        ? new Date(announcement.extended_end_at)
        : new Date(announcement.end_at);
}

function getAnnouncementTypeLabel(
    type: AnnouncementType
) {
    switch (type) {
        case "registration":
            return "ثبت‌نام فعال";

        case "announcement":
            return "اطلاعیه";

        case "notice":
            return "اطلاع‌رسانی";

        case "regulation":
            return "بخشنامه";

        default:
            return "اطلاعیه";
    }
}



function formatDate(date: Date) {
    return date.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function formatRemainingTime(endDate: Date) {
    const now = Date.now();
    const diff = endDate.getTime() - now;

    if (diff <= 0) {
        return {
            expired: true,
            text: "مهلت به پایان رسیده",
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        };
    }

    const totalSeconds = Math.floor(diff / 1000);

    const days = Math.floor(totalSeconds / 86400);

    const hours = Math.floor(
        (totalSeconds % 86400) / 3600
    );

    const minutes = Math.floor(
        (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    let text = "";

    if (days > 0) {
        text = `${days.toLocaleString("fa-IR")} روز`;

        if (hours > 0) {
            text += ` و ${hours.toLocaleString("fa-IR")} ساعت`;
        }

        text += " باقی‌مانده";
    } else if (hours > 0) {
        text = `${hours.toLocaleString("fa-IR")} ساعت`;

        if (minutes > 0) {
            text += ` و ${minutes.toLocaleString("fa-IR")} دقیقه`;
        }

        text += " باقی‌مانده";
    } else if (minutes > 0) {
        text = `${minutes.toLocaleString("fa-IR")} دقیقه`;

        if (seconds > 0) {
            text += ` و ${seconds.toLocaleString("fa-IR")} ثانیه`;
        }

        text += " باقی‌مانده";
    } else {
        text = `${seconds.toLocaleString("fa-IR")} ثانیه باقی‌مانده`;
    }

    return {
        expired: false,
        text,
        days,
        hours,
        minutes,
        seconds,
    };
}

function getRemainingColor(
    percentage: number
) {
    if (percentage <= 15) {
        return {
            bar: "bg-red-500",
            badge: "bg-red-50 text-red-700 border-red-200",
        };
    }

    if (percentage <= 35) {
        return {
            bar: "bg-orange-500",
            badge: "bg-orange-50 text-orange-700 border-orange-200",
        };
    }

    if (percentage <= 60) {
        return {
            bar: "bg-yellow-500",
            badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
        };
    }

    return {
        bar: "bg-[#09967C]",
        badge: "bg-[#09967C]/10 text-[#087d69] border-[#09967C]/20",
    };
}

function getTypeIcon(
    type: AnnouncementType
) {
    switch (type) {
        case "registration":
            return "📝";

        case "announcement":
            return "📢";

        case "notice":
            return "🔔";

        case "regulation":
            return "📄";

        default:
            return "📢";
    }
}



export default function ServiceAnnouncementsSlider({
    limit = 10,
}: Props) {



    const [announcements, setAnnouncements] =
        useState<Announcement[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [currentIndex, setCurrentIndex] =
        useState(0);

    const [selectedAnnouncement, setSelectedAnnouncement] =
        useState<Announcement | null>(null);

    const [, setNow] =
        useState(Date.now());

    const [paused, setPaused] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [touchStart, setTouchStart] = useState(0);



    useEffect(() => {
        loadAnnouncements();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 60000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        if (announcements.length <= 1 || paused) return;

        const timer = setInterval(() => {
            setIsTransitioning(true);

            setTimeout(() => {
                setCurrentIndex((i) => (i + 1) % announcements.length);
                setIsTransitioning(false);
            }, 250);
        }, 5000);

        return () => clearInterval(timer);
    }, [currentIndex, announcements.length, paused]);



    async function loadAnnouncements() {
        setLoading(true);

        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from("services_announcements")
            .select(`
            *,
            services(
                title,
                icon
            )
        `)
            .eq("is_active", true)
            .lte("start_at", now)
            .order("priority", { ascending: false })
            .order("start_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Supabase error:", JSON.stringify(error, null, 2));
            setAnnouncements([]);
            setLoading(false);
            return;
        }

        const validAnnouncements = (data || [])
            .map((item: any) => ({
                ...item,
                documents: Array.isArray(item.documents) ? item.documents : [],
            }))
            .filter(
                (item: Announcement) =>
                    getEffectiveEndDate(item).getTime() > Date.now()
            );

        setAnnouncements(validAnnouncements);
        setCurrentIndex(0);
        setLoading(false);
    }



    const currentAnnouncement =
        announcements[currentIndex];

    const progressData = useMemo(() => {
        if (!currentAnnouncement) {
            return null;
        }

        const startDate = new Date(
            currentAnnouncement.start_at
        );

        const endDate =
            getEffectiveEndDate(
                currentAnnouncement
            );

        const now = Date.now();

        const total =
            endDate.getTime() -
            startDate.getTime();

        const elapsed =
            now -
            startDate.getTime();

        const remainingPercentage =
            total > 0
                ? Math.max(
                    0,
                    Math.min(
                        100,
                        ((total - elapsed) /
                            total) *
                        100
                    )
                )
                : 0;

        return {
            startDate,
            endDate,
            remainingPercentage,
            remaining:
                formatRemainingTime(
                    endDate
                ),
        };
    }, [
        currentAnnouncement,
    ]);

    if (loading) {
        return (
            <section
                dir="rtl"
                className="
    relative
    overflow-hidden
    tusan-surface
    border border-[var(--border)]
    shadow-[var(--shadow-md)]
    transition-all
    duration-300
    hover:shadow-[var(--shadow-lg)]
"
                onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
                onTouchEnd={(e) => {
                    const diff = touchStart - e.changedTouches[0].clientX;
                    if (Math.abs(diff) > 50) {
                        setCurrentIndex((i) =>
                            diff > 0
                                ? (i + 1) % announcements.length
                                : i === 0
                                    ? announcements.length - 1
                                    : i - 1
                        );
                    }
                }}
            >

                {/* هاله سبز بالا سمت راست */}
                <motion.div
                    className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[#09967C]/10 blur-3xl"
                    animate={{ y: [0, -10, 0], x: [0, 4, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* هاله سبز پایین سمت چپ */}
                <motion.div
                    className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl"
                    animate={{ y: [0, 12, 0], x: [0, -6, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* نوار برند توسن */}
                <div className="relative z-10 h-1 w-full bg-gradient-to-r from-[#09967C] via-emerald-400 to-teal-500" />

                {/* هاله سبز بالا سمت راست */}
                <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[#09967C]/10 blur-3xl" />

                {/* هاله سبز پایین سمت چپ */}
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />
                <div className="h-1 w-full bg-gradient-to-r from-[#09967C] via-emerald-400 to-teal-500" />
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-5 w-40 bg-gray-200 rounded-lg" />
                        <div className="h-8 w-2/3 bg-gray-200 rounded-lg" />
                        <div className="h-4 w-full bg-gray-200 rounded-lg" />
                        <div className="h-3 w-full bg-gray-200 rounded-full" />
                    </div>
                </div>
            </section>
        );
    }



    if (
        announcements.length === 0 ||
        !currentAnnouncement ||
        !progressData
    ) {
        return null;
    }

    const colors =
        getRemainingColor(
            progressData.remainingPercentage
        );

    const typeLabel =
        getAnnouncementTypeLabel(
            currentAnnouncement.type
        );

    const typeIcon =
        getTypeIcon(
            currentAnnouncement.type
        );

    return (
        <>
            <section
                dir="rtl"
                className="relative overflow-hidden tusan-surface"
                onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
                onTouchEnd={(e) => {
                    const diff = touchStart - e.changedTouches[0].clientX;
                    if (Math.abs(diff) > 50) {
                        setCurrentIndex((i) =>
                            diff > 0
                                ? (i + 1) % announcements.length
                                : i === 0
                                    ? announcements.length - 1
                                    : i - 1
                        );
                    }
                }}
            >

                <div className="mt-5">

                    {/* Top row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                        <div className="flex items-center gap-2">

                            <span className="w-10 h-10 rounded-xl bg-[#09967C]/10 flex items-center justify-center text-xl">
                                {typeIcon}
                            </span>

                            <div>
                                <div className="text-xs text-gray-400">
                                    اطلاعیه‌های فعال
                                </div>

                                <div className="font-black tusan-title">
                                    {typeLabel}
                                </div>
                            </div>

                        </div>

                        {currentAnnouncement.services && (
                            <div className="inline-flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-gray-600">
                                <span>
                                    {
                                        currentAnnouncement
                                            .services.icon || "📄"
                                    }
                                </span>

                                <span>
                                    {
                                        currentAnnouncement
                                            .services.title
                                    }
                                </span>
                            </div>
                        )}

                    </div>
                </div>
                {/* Content */}
                <div
                    key={currentAnnouncement.id}
                    className={`relative p-5 sm:p-7 transition-all duration-300 ${isTransitioning
                        ? "opacity-0 translate-y-2"
                        : "opacity-100 translate-y-0"
                        }`}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >

                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">

                        <div className="flex-1 min-w-0">

                            {/* نوع اطلاعیه */}
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#09967C]/15 bg-[#09967C]/10 px-3 py-1.5 text-xs font-bold text-[#087d69] mb-3">
                                <span>
                                    {typeIcon}
                                </span>

                                <span>
                                    {typeLabel}
                                </span>
                            </div>

                            {/* عنوان */}
                            <h2 className="text-xl sm:text-2xl font-black tusan-title leading-9">
                                {currentAnnouncement.title}
                            </h2>

                            {/* خلاصه اطلاعیه */}
                            {currentAnnouncement.summary && (
                                <p className="text-[var(--muted)] leading-7 mt-2 max-w-3xl">
                                    {currentAnnouncement.summary}
                                </p>
                            )}

                        </div>

                        {/* Remaining */}
                        <div
                            className={`
    shrink-0
    inline-flex
    items-center
    gap-2
    rounded-2xl
    px-4
    py-3
    border
    backdrop-blur-md
    shadow-sm
    transition-all
    duration-300
    ${colors.badge}
`}
                        >
                            <span>
                                ⏳
                            </span>

                            <span className="text-sm font-bold">
                                {progressData.remaining
                                    .text}
                            </span>
                            <span className="text-xs">
                                باقی‌مانده
                            </span>
                        </div>

                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]/70 backdrop-blur-md px-4 py-3 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5">
                            <div className="text-xs text-[var(--muted)] mb-1">
                                شروع ثبت‌نام
                            </div>

                            <div className="font-bold text-[var(--text)]">
                                {formatDate(
                                    progressData.startDate
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]/70 backdrop-blur-md px-4 py-3 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5">
                            <div className="text-xs text-[var(--muted)] mb-1">
                                پایان مهلت
                            </div>

                            <div className="font-bold text-[var(--text)]">
                                {formatDate(
                                    progressData.endDate
                                )}

                                {currentAnnouncement.extended_end_at && (
                                    <span className="mr-2 text-xs text-[#09967C]">
                                        تمدید شده
                                    </span>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Progress */}
                    <div className="mt-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-[var(--muted)]">
                                زمان باقی‌مانده
                            </span>

                            <span className="text-sm font-black text-[var(--text)]">
                                {progressData.remaining.text}
                            </span>
                        </div>

                        <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full rounded-full ${colors.bar}`}
                                initial={false}
                                animate={{ width: `${progressData.remainingPercentage}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                        </div>
                    </div>

                    {/* Documents summary */}
                    {currentAnnouncement.documents
                        .length > 0 && (
                            <div className="mt-5">

                                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">

                                    <span className="font-bold text-[var(--text)]">
                                        📎 مدارک:
                                    </span>

                                    {currentAnnouncement.documents
                                        .slice(0, 3)
                                        .map(
                                            (
                                                document,
                                                index
                                            ) => (
                                                <span
                                                    key={`${currentAnnouncement.id}-doc-${index}`}
                                                    className="bg-[var(--border)] text-[var(--text)] rounded-lg px-2.5 py-1 transition-colors"
                                                >
                                                    {
                                                        document.title
                                                    }
                                                </span>
                                            )
                                        )}

                                    {currentAnnouncement
                                        .documents
                                        .length > 3 && (
                                            <span className="text-gray-400">
                                                +
                                                {(
                                                    currentAnnouncement
                                                        .documents
                                                        .length -
                                                    3
                                                ).toLocaleString(
                                                    "fa-IR"
                                                )}{" "}
                                                مورد
                                            </span>
                                        )}

                                </div>

                            </div>
                        )}

                    {/* Footer actions */}
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-5 border-t border-[var(--border)]">

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">

                            {currentAnnouncement.service_id ? (

                                <motion.div
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="inline-flex"
                                >
                                    <Link
                                        href={`/orders/new/${currentAnnouncement.service_id}`}
                                        className="
            inline-flex items-center justify-center gap-2
            bg-[var(--primary)]
            text-white
            px-5 py-3
            rounded-xl
            font-bold
            shadow-[0_8px_20px_rgba(9,150,124,0.18)]
            hover:bg-[var(--primary-dark)]
            hover:-translate-y-0.5
            hover:shadow-[0_12px_26px_rgba(9,150,124,0.24)]
            transition-all duration-200
        "
                                    >
                                        <span>
                                            {currentAnnouncement.button_label || "ثبت‌نام"}
                                        </span>

                                        <span className="text-base">
                                            ←
                                        </span>
                                    </Link>
                                </motion.div>
                            ) : (
                                <span
                                    className="
                    inline-flex items-center justify-center
                    bg-[var(--border)]
                    text-[var(--muted)]
                    px-5 py-3
                    rounded-xl
                    text-sm
                    font-medium
                "
                                >
                                    خدمت مرتبط ندارد
                                </span>
                            )}

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedAnnouncement(
                                        currentAnnouncement
                                    )
                                }
                                className="
                inline-flex items-center justify-center gap-2
                border border-[var(--border)]
                bg-[var(--surface)]
                text-[var(--text)]
                px-5 py-3
                rounded-xl
                font-bold
                shadow-sm
                hover:bg-[var(--surface-strong)]
                hover:border-[var(--primary)]/20
                hover:-translate-y-0.5
                active:scale-[0.98]
                transition-all duration-200
            "
                            >
                                <span>
                                    📄
                                </span>

                                <span>
                                    اطلاعات بیشتر و مدارک
                                </span>
                            </button>

                        </div>

                    </div>

                    {/* Slider controls */}
                    {announcements.length >
                        1 && (
                            <div className="flex items-center gap-2">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setCurrentIndex(
                                            (
                                                current
                                            ) =>
                                                current <=
                                                    0
                                                    ? announcements.length -
                                                    1
                                                    : current -
                                                    1
                                        )
                                    }
                                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                                    aria-label="اسلاید قبلی"
                                >
                                    →
                                </button>

                                <div className="flex items-center gap-1.5">
                                    {announcements.map(
                                        (
                                            item,
                                            index
                                        ) => (
                                            <button
                                                key={
                                                    item.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setCurrentIndex(
                                                        index
                                                    )
                                                }
                                                className={`h-2 rounded-full transition-all ${index ===
                                                    currentIndex
                                                    ? "w-7 bg-[#09967C]"
                                                    : "w-2 bg-gray-300"
                                                    }`}
                                                aria-label={`اسلاید ${index + 1}`}
                                            />
                                        )
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setCurrentIndex(
                                            (
                                                current
                                            ) =>
                                                current >=
                                                    announcements.length -
                                                    1
                                                    ? 0
                                                    : current +
                                                    1
                                        )
                                    }
                                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                                    aria-label="اسلاید بعدی"
                                >
                                    ←
                                </button>

                            </div>
                        )}

                </div>

            </section >

            {/* Details modal */}
            {
                selectedAnnouncement && (
                    <div
                        dir="rtl"
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5"
                        onMouseDown={(event) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                setSelectedAnnouncement(
                                    null
                                );
                            }
                        }}
                    >
                        <div className="bg-[var(--surface)] w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden">

                            {/* Modal header */}
                            <div className="p-5 sm:p-6 border-b border-[var(--border)] flex items-start justify-between gap-4">

                                <div>
                                    <div className="text-sm text-[#09967C] font-bold mb-1">
                                        {
                                            getAnnouncementTypeLabel(
                                                selectedAnnouncement.type
                                            )
                                        }
                                    </div>

                                    <h3 className="text-xl font-black tusan-title">
                                        {
                                            selectedAnnouncement.title
                                        }
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedAnnouncement(
                                            null
                                        )
                                    }
                                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
                                    aria-label="بستن"
                                >
                                    ×
                                </button>

                            </div>

                            {/* Modal body */}
                            <div className="p-5 sm:p-6 overflow-y-auto max-h-[65vh]">

                                {selectedAnnouncement.content && (
                                    <div className="text-gray-600 leading-8 whitespace-pre-line">
                                        {
                                            selectedAnnouncement.content
                                        }
                                    </div>
                                )}

                                <div className="mt-6">

                                    <h4 className="font-black tusan-title mb-3">
                                        📎 مدارک موردنیاز
                                    </h4>

                                    {selectedAnnouncement
                                        .documents.length ===
                                        0 ? (
                                        <div className="bg-[var(--surface)] rounded-xl p-4 text-sm text-gray-500">
                                            مدرک خاصی اعلام نشده است.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">

                                            {selectedAnnouncement.documents.map(
                                                (
                                                    document,
                                                    index
                                                ) => (
                                                    <div
                                                        key={`${selectedAnnouncement.id}-modal-doc-${index}`}
                                                        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
                                                    >
                                                        <div className="font-bold text-[var(--text)]">
                                                            {index +
                                                                1}
                                                            .{" "}
                                                            {
                                                                document.title
                                                            }
                                                        </div>

                                                        {document.description && (
                                                            <div className="text-sm text-gray-500 mt-1 leading-6">
                                                                {
                                                                    document.description
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}

                                        </div>
                                    )}

                                </div>

                                <div className="grid sm:grid-cols-2 gap-3 mt-6">

                                    <div className="bg-[var(--surface)] rounded-xl p-4">
                                        <div className="text-xs text-gray-400">
                                            شروع
                                        </div>

                                        <div className="font-bold text-gray-700 mt-1">
                                            {formatDate(
                                                new Date(
                                                    selectedAnnouncement.start_at
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-[var(--surface)] rounded-xl p-4">
                                        <div className="text-xs text-gray-400">
                                            پایان
                                        </div>

                                        <div className="font-bold text-gray-700 mt-1">
                                            {formatDate(
                                                getEffectiveEndDate(
                                                    selectedAnnouncement
                                                )
                                            )}
                                        </div>
                                    </div>

                                </div>

                            </div>

                            {/* Modal footer */}
                            <div className="p-5 sm:p-6 border-t border-[var(--border)]">

                                {selectedAnnouncement.service_id ? (
                                    <Link
                                        href={`/orders/new/${selectedAnnouncement.service_id}`}
                                        onClick={() =>
                                            setSelectedAnnouncement(
                                                null
                                            )
                                        }
                                        className="flex items-center justify-center gap-2 w-full bg-[#09967C] text-white py-3.5 rounded-xl font-bold hover:bg-[#087d69] transition"
                                    >
                                        <span>
                                            {
                                                selectedAnnouncement.button_label ||
                                                "ثبت‌نام"
                                            }
                                        </span>

                                        <span>
                                            ←
                                        </span>
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedAnnouncement(
                                                null
                                            )
                                        }
                                        className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold"
                                    >
                                        بستن
                                    </button>
                                )}

                            </div>

                        </div>
                    </div>
                )
            }
        </>
    );
}