"use client";

import { useEffect, useState } from "react";
import type { FormField } from "@/components/ServiceFormBuilder";

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

type Props = {
    fields: FormField[];
    onSubmit: (formData: Record<string, any>) => void;
    submitting?: boolean;
};

export default function DynamicServiceForm({
    fields,
    onSubmit,
    submitting = false,
}: Props) {
    const [formData, setFormData] =
        useState<Record<string, any>>({});

    const [errors, setErrors] =
        useState<Record<string, string>>({});

    useEffect(() => {
        const initialData: Record<string, any> = {};

        fields.forEach((field) => {
            if (field.type === "boolean") {
                initialData[field.name] = false;
            } else if (field.type === "multiselect") {
                initialData[field.name] = [];
            } else {
                initialData[field.name] = "";
            }
        });

        setFormData(initialData);
        setErrors({});
    }, [fields]);

    function updateValue(
        name: string,
        value: any
    ) {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
    }

    function validateForm() {
        const nextErrors: Record<string, string> = {};

        fields.forEach((field) => {
            if (!field.required) {
                return;
            }

            const value = formData[field.name];

            if (field.type === "boolean") {
                if (!value) {
                    nextErrors[field.name] =
                        "این گزینه باید تأیید شود.";
                }

                return;
            }

            if (field.type === "multiselect") {
                if (
                    !Array.isArray(value) ||
                    value.length === 0
                ) {
                    nextErrors[field.name] =
                        "حداقل یک گزینه را انتخاب کنید.";
                }

                return;
            }

            if (
                value === undefined ||
                value === null ||
                String(value).trim() === ""
            ) {
                nextErrors[field.name] =
                    "تکمیل این فیلد الزامی است.";
            }
        });

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    }

    function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        const cleanedData: Record<string, any> = {};

        fields.forEach((field) => {
            const value = formData[field.name];

            if (field.type === "multiselect") {
                cleanedData[field.name] =
                    Array.isArray(value)
                        ? value
                        : [];
            } else if (field.type === "number") {
                cleanedData[field.name] =
                    value === ""
                        ? null
                        : Number(value);
            } else {
                cleanedData[field.name] = value;
            }
        });

        onSubmit(cleanedData);
    }

    function renderField(field: FormField) {
        const value =
            formData[field.name];

        const error =
            errors[field.name];

        const baseInputClass =
            "w-full border rounded-xl px-4 py-3 bg-white outline-none transition focus:ring-2 focus:ring-[#09967C]";

        return (
            <div
                key={field.id}
                className="space-y-2"
            >
                <label className="block font-bold text-gray-800">
                    {field.label}

                    {field.required && (
                        <span className="text-red-500 mr-1">
                            *
                        </span>
                    )}
                </label>

                {field.description && (
                    <p className="text-sm text-gray-500 leading-6">
                        {field.description}
                    </p>
                )}

                {field.type === "text" && (
                    <input
                        type="text"
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(
                                field.name,
                                e.target.value
                            )
                        }
                        placeholder={
                            field.placeholder || ""
                        }
                        disabled={submitting}
                        className={baseInputClass}
                    />
                )}

                {field.type === "textarea" && (
                    <textarea
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(
                                field.name,
                                e.target.value
                            )
                        }
                        placeholder={
                            field.placeholder || ""
                        }
                        rows={5}
                        disabled={submitting}
                        className={`${baseInputClass} resize-none`}
                    />
                )}

                {field.type === "number" && (
                    <input
                        type="number"
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(
                                field.name,
                                e.target.value
                            )
                        }
                        placeholder={
                            field.placeholder || ""
                        }
                        disabled={submitting}
                        className={baseInputClass}
                    />
                )}

                {field.type === "phone" && (
                    <input
                        type="tel"
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(
                                field.name,
                                e.target.value
                            )
                        }
                        placeholder={
                            field.placeholder ||
                            "مثلاً 09123456789"
                        }
                        dir="ltr"
                        disabled={submitting}
                        className={`${baseInputClass} text-right`}
                    />
                )}

                {field.type === "email" && (
                    <input
                        type="email"
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(
                                field.name,
                                e.target.value
                            )
                        }
                        placeholder={
                            field.placeholder ||
                            "example@email.com"
                        }
                        dir="ltr"
                        disabled={submitting}
                        className={`${baseInputClass} text-left`}
                    />
                )}

                {/* تقویم شمسی */}
                {field.type === "date" && (
                    <DatePicker
                        value={value || ""}
                        onChange={(date) => {
                            updateValue(
                                field.name,
                                date
                                    ? date.format(
                                        "YYYY/MM/DD"
                                    )
                                    : ""
                            );
                        }}
                        calendar={persian}
                        locale={persian_fa}
                        calendarPosition="bottom-right"
                        format="YYYY/MM/DD"
                        placeholder={
                            field.placeholder ||
                            "تاریخ را انتخاب کنید"
                        }
                        disabled={submitting}
                        inputClass={`${baseInputClass} cursor-pointer`}
                        containerClassName="w-full"
                    />
                )}

                {field.type === "select" && (
                    <select
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(
                                field.name,
                                e.target.value
                            )
                        }
                        disabled={submitting}
                        className={baseInputClass}
                    >
                        <option value="">
                            {field.placeholder ||
                                "انتخاب کنید"}
                        </option>

                        {(field.options || []).map(
                            (option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            )
                        )}
                    </select>
                )}

                {field.type === "multiselect" && (
                    <div className="space-y-2 border rounded-xl p-4 bg-white">
                        {(field.options || []).length ===
                            0 ? (
                            <p className="text-sm text-gray-500">
                                گزینه‌ای برای انتخاب وجود ندارد.
                            </p>
                        ) : (
                            (field.options || []).map(
                                (option) => {
                                    const selected =
                                        Array.isArray(
                                            value
                                        ) &&
                                        value.includes(
                                            option.value
                                        );

                                    return (
                                        <label
                                            key={
                                                option.value
                                            }
                                            className="flex items-center gap-3 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selected
                                                }
                                                disabled={
                                                    submitting
                                                }
                                                onChange={(
                                                    e
                                                ) => {
                                                    const current =
                                                        Array.isArray(
                                                            value
                                                        )
                                                            ? value
                                                            : [];

                                                    const next =
                                                        e.target
                                                            .checked
                                                            ? [
                                                                ...current,
                                                                option.value,
                                                            ]
                                                            : current.filter(
                                                                (
                                                                    item: string
                                                                ) =>
                                                                    item !==
                                                                    option.value
                                                            );

                                                    updateValue(
                                                        field.name,
                                                        next
                                                    );
                                                }}
                                                className="w-4 h-4 accent-[#09967C]"
                                            />

                                            <span>
                                                {
                                                    option.label
                                                }
                                            </span>
                                        </label>
                                    );
                                }
                            )
                        )}
                    </div>
                )}

                {field.type === "boolean" && (
                    <label className="flex items-center gap-3 border rounded-xl p-4 bg-white cursor-pointer">
                        <input
                            type="checkbox"
                            checked={Boolean(value)}
                            disabled={submitting}
                            onChange={(e) =>
                                updateValue(
                                    field.name,
                                    e.target.checked
                                )
                            }
                            className="w-5 h-5 accent-[#09967C]"
                        />

                        <span>
                            {field.placeholder ||
                                field.label}
                        </span>
                    </label>
                )}

                {error && (
                    <p className="text-sm text-red-600">
                        {error}
                    </p>
                )}
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            {fields.map((field) =>
                renderField(field)
            )}

            <div className="pt-3 border-t">
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#09967C] text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                    {submitting
                        ? "در حال ثبت سفارش..."
                        : "ثبت سفارش"}
                </button>
            </div>
        </form>
    );
}