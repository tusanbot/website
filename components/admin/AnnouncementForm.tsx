"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DatePicker from "react-multi-date-picker";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import {
    GlassPanel,
    TusanButton,
    TusanInput,
    SectionHeader,
} from "@/components/ui";

type Announcement = {
    id?: string;
    title: string;
    type: "registration" | "announcement";
    summary: string;
    content: string;
    start_at: string;
    end_at: string;
    documents: string[];
    is_active: boolean;
    is_extendable: boolean;
    extended_end_at: string | null;
    button_label: string;
    service_id: string | null;
    priority: number;
};

type Props = {
    initialData?: Partial<Announcement>;
    onSubmit: (data: Announcement) => Promise<void>;
    submitting?: boolean;
};

export default function AnnouncementForm({
    initialData,
    onSubmit,
    submitting = false,
}: Props) {
    const [services, setServices] = useState<any[]>([]);

    const [form, setForm] = useState<Announcement>({
        title: "",
        type: "registration",
        summary: "",
        content: "",
        start_at: "",
        end_at: "",
        documents: [],
        is_active: true,
        is_extendable: true,
        extended_end_at: null,
        button_label: "ثبت‌نام",
        service_id: null,
        priority: 0,
        ...initialData,
    });

    useEffect(() => {
        loadServices();
    }, []);

    async function loadServices() {
        const { data } = await supabase
            .from("services")
            .select("id, title, icon")
            .eq("is_active", true)
            .order("title");

        setServices(data || []);
    }

    function update(key: keyof Announcement, value: any) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit({
            ...form,
            documents: form.documents.map((item) => item.trim()).filter(Boolean),
        });
    }

    function JalaliDateTimePicker({
        value,
        onChange,
    }: {
        value: string | null;
        onChange: (value: string | null) => void;
    }) {
        return (
            <DatePicker
                calendar={persian}
                locale={persian_fa}
                value={value ? new Date(value) : undefined}
                onChange={(date: any) => {
                    if (!date) {
                        onChange(null);
                        return;
                    }

                    const jsDate =
                        typeof date.toDate === "function"
                            ? date.toDate()
                            : new Date(date);

                    onChange(jsDate.toISOString());
                }}
                format="YYYY/MM/DD HH:mm"
                plugins={[<TimePicker key="time" position="bottom" />]}
                calendarPosition="bottom-right"
                inputClass="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]"
            />
        );
    }

    return (
        <GlassPanel className="p-6">
            <SectionHeader
                title={initialData?.id ? "ویرایش اطلاعیه" : "اطلاعیه جدید"}
                description="اطلاعات اطلاعیه یا ثبت‌نام فعال را تکمیل کنید."
            />
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">عنوان اطلاعیه</label>
                        <TusanInput
                            value={form.title}
                            onChange={(e) => update("title", e.target.value)}
                            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition"
                            placeholder="مثلاً ثبت‌نام کنکور ۱۴۰۶"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">نوع</label>
                        <select
                            value={form.type}
                            onChange={(e) =>
                                update("type", e.target.value as "registration" | "announcement")
                            }
                            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition"
                        >
                            <option value="registration">ثبت‌نام</option>
                            <option value="announcement">اطلاعیه</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">تاریخ شروع</label>
                        <JalaliDateTimePicker
                            value={form.start_at}
                            onChange={(value) => update("start_at", value || "")}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">تاریخ پایان</label>
                        <JalaliDateTimePicker
                            value={form.end_at}
                            onChange={(value) => update("end_at", value || "")}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-[var(--text)] mb-2">خلاصه اطلاعیه</label>
                    <textarea
                        value={form.summary}
                        onChange={(e) => update("summary", e.target.value)}
                        className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition"
                        rows={3}
                        placeholder="خلاصه کوتاه برای نمایش در اسلایدر"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-[var(--text)] mb-2">توضیحات کامل</label>
                    <textarea
                        value={form.content}
                        onChange={(e) => update("content", e.target.value)}
                        className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition"
                        rows={6}
                        placeholder="اطلاعات کامل، شرایط، توضیحات و..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-[var(--text)] mb-2">مدارک موردنیاز</label>
                    <textarea
                        value={(form.documents || []).join("\n")}
                        onChange={(e) =>
                            update(
                                "documents",
                                e.target.value.replace(/\r\n/g, "\n").split("\n")
                            )
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.stopPropagation();
                            }
                        }}
                        spellCheck={false}
                        dir="rtl"
                        className="w-full min-h-40 border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition resize-y leading-8 whitespace-pre-wrap"
                        rows={7}
                        placeholder={'هر مدرک را در یک خط وارد کنید\nبرای فاصله بین موارد، Enter بزنید'}
                    />
                    <p className="mt-2 text-xs text-[var(--muted)]">
                        فاصله، چند خطی نوشتن و خطوط خالی حفظ می‌شوند؛ فقط هنگام ذخیره، فاصله‌های ابتدا و انتهای هر مدرک حذف می‌شود.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">متن دکمه</label>
                        <TusanInput
                            value={form.button_label}
                            onChange={(e) => update("button_label", e.target.value)}
                            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition"
                            placeholder="ثبت‌نام"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">خدمت مرتبط</label>
                        <select
                            value={form.service_id || ""}
                            onChange={(e) => update("service_id", e.target.value || null)}
                            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition"
                        >
                            <option value="">بدون اتصال</option>
                            {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                    {service.icon} {service.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">اولویت نمایش</label>
                        <TusanInput
                            type="number"
                            value={form.priority}
                            onChange={(e) => update("priority", Number(e.target.value))}
                            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-2">
                            <TusanInput
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => update("is_active", e.target.checked)}
                                className="accent-[var(--primary)]"
                            />
                            <span>فعال باشد</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <TusanInput
                                type="checkbox"
                                checked={form.is_extendable}
                                onChange={(e) => update("is_extendable", e.target.checked)}
                                className="accent-[var(--primary)]"
                            />
                            <span>قابل تمدید باشد</span>
                        </label>
                    </div>
                </div>

                {form.is_extendable && (
                    <div>
                        <label className="block text-sm font-bold text-[var(--text)] mb-2">تاریخ تمدید (اختیاری)</label>
                        <JalaliDateTimePicker
                            value={form.extended_end_at}
                            onChange={(value) => update("extended_end_at", value)}
                        />
                    </div>
                )}

                <div className="pt-4 border-t">
                    <TusanButton
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting ? "در حال ذخیره..." : "ذخیره اطلاعیه"}
                    </TusanButton>
                </div>
            </form>
        </GlassPanel>
    );
}
