"use client";

import { useEffect, useMemo, useState } from "react";
import type {
    ConditionOperator,
    FieldCondition,
    FormField,
} from "@/components/ServiceFormBuilder";

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

type Props = {
    fields: FormField[];
    onSubmit: (formData: Record<string, any>) => void;
    submitting?: boolean;
};

function getInitialValue(field: FormField) {
    if (field.defaultValue !== undefined) {
        return field.defaultValue;
    }

    if (
        field.type === "boolean" ||
        field.type === "checkbox"
    ) {
        return false;
    }

    if (field.type === "multiselect") {
        return [];
    }

    return "";
}

function normalizeConditionValue(value: any) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}

function evaluateCondition(
    condition: FieldCondition,
    formData: Record<string, any>
) {
    const actualValue = formData[condition.field];
    const expectedValue = condition.value;

    switch (condition.operator as ConditionOperator) {
        case "equals": {
            if (Array.isArray(actualValue)) {
                return actualValue.some(
                    (item) =>
                        normalizeConditionValue(item) ===
                        normalizeConditionValue(expectedValue)
                );
            }

            return (
                normalizeConditionValue(actualValue) ===
                normalizeConditionValue(expectedValue)
            );
        }

        case "not_equals": {
            if (Array.isArray(actualValue)) {
                return !actualValue.some(
                    (item) =>
                        normalizeConditionValue(item) ===
                        normalizeConditionValue(expectedValue)
                );
            }

            return (
                normalizeConditionValue(actualValue) !==
                normalizeConditionValue(expectedValue)
            );
        }

        case "contains": {
            if (Array.isArray(actualValue)) {
                return actualValue.some(
                    (item) =>
                        normalizeConditionValue(item) ===
                        normalizeConditionValue(expectedValue)
                );
            }

            return normalizeConditionValue(actualValue)
                .toLowerCase()
                .includes(
                    normalizeConditionValue(expectedValue).toLowerCase()
                );
        }

        case "not_contains": {
            if (Array.isArray(actualValue)) {
                return !actualValue.some(
                    (item) =>
                        normalizeConditionValue(item) ===
                        normalizeConditionValue(expectedValue)
                );
            }

            return !normalizeConditionValue(actualValue)
                .toLowerCase()
                .includes(
                    normalizeConditionValue(expectedValue).toLowerCase()
                );
        }

        case "is_true":
            return actualValue === true;

        case "is_false":
            return actualValue === false;

        default:
            return false;
    }
}

function areFieldConditionsMet(
    field: FormField,
    formData: Record<string, any>
) {
    if (!field.conditions || field.conditions.length === 0) {
        return true;
    }

    return field.conditions.every((condition) => {
        // اگر فیلد والد حذف شده یا دیگر وجود ندارد،
        // فیلد شرطی نباید نمایش داده شود.
        if (!(condition.field in formData)) {
            return false;
        }

        return evaluateCondition(condition, formData);
    });
}

function getVisibleFields(
    fields: FormField[],
    formData: Record<string, any>
) {
    const visible: FormField[] = [];

    /*
     * شرط‌ها در Builder فقط می‌توانند به فیلدهای قبل‌تر
     * وابسته باشند. بنابراین بررسی به ترتیب فیلدها انجام
     * می‌شود و از وابستگی‌های حلقه‌ای جلوگیری می‌کند.
     */
    for (const field of fields) {
        if (areFieldConditionsMet(field, formData)) {
            visible.push(field);
        }
    }

    return visible;
}

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
            initialData[field.name] = getInitialValue(field);
        });

        setFormData(initialData);
        setErrors({});
    }, [fields]);

    const visibleFields = useMemo(
        () => getVisibleFields(fields, formData),
        [fields, formData]
    );

    const visibleFieldNames = useMemo(
        () => new Set(visibleFields.map((field) => field.name)),
        [visibleFields]
    );

    function updateValue(name: string, value: any) {
        setFormData((prev) => {
            const nextData = {
                ...prev,
                [name]: value,
            };

            /*
             * وقتی مقدار یک فیلد والد تغییر می‌کند، ممکن است
             * چند فیلد دیگر مخفی شوند. مقدار فیلدهای مخفی را
             * پاک می‌کنیم تا داده قدیمی و نامرتبط به سفارش
             * ارسال نشود.
             */
            const visibleAfterChange = getVisibleFields(
                fields,
                nextData
            );
            const nextVisibleNames = new Set(
                visibleAfterChange.map((field) => field.name)
            );

            for (const field of fields) {
                if (
                    !nextVisibleNames.has(field.name) &&
                    field.name !== name
                ) {
                    nextData[field.name] = getInitialValue(field);
                }
            }

            return nextData;
        });

        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
    }

    function validateForm() {
        const nextErrors: Record<string, string> = {};

        /* فقط فیلدهایی که در حال حاضر قابل مشاهده‌اند
         * باید Validation شوند. */
        visibleFields.forEach((field) => {
            if (!field.required) {
                return;
            }

            const value = formData[field.name];

            if (
                field.type === "boolean" ||
                field.type === "checkbox"
            ) {
                if (value !== true) {
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

        /*
         * فقط فیلدهای قابل مشاهده به سفارش ارسال می‌شوند.
         * این کار از ذخیره اطلاعات فیلدهای شرطی مخفی جلوگیری
         * می‌کند.
         */
        visibleFields.forEach((field) => {
            const value = formData[field.name];

            if (field.type === "multiselect") {
                cleanedData[field.name] =
                    Array.isArray(value) ? value : [];
            } else if (field.type === "number") {
                cleanedData[field.name] =
                    value === "" ? null : Number(value);
            } else {
                cleanedData[field.name] = value;
            }
        });

        onSubmit(cleanedData);
    }

    function renderField(field: FormField) {
        const value = formData[field.name];
        const error = errors[field.name];

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
                            updateValue(field.name, e.target.value)
                        }
                        placeholder={field.placeholder || ""}
                        disabled={submitting}
                        className={baseInputClass}
                    />
                )}

                {field.type === "textarea" && (
                    <textarea
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(field.name, e.target.value)
                        }
                        placeholder={field.placeholder || ""}
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
                            updateValue(field.name, e.target.value)
                        }
                        placeholder={field.placeholder || ""}
                        disabled={submitting}
                        className={baseInputClass}
                    />
                )}

                {field.type === "phone" && (
                    <input
                        type="tel"
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(field.name, e.target.value)
                        }
                        placeholder={
                            field.placeholder || "مثلاً 09123456789"
                        }
                        dir="ltr"
                        disabled={submitting}
                        className={`${baseInputClass} text-right`}
                    />
                )}

                {field.type === "national_code" && (
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(
                                field.name,
                                e.target.value.replace(/\D/g, "")
                            )
                        }
                        placeholder={
                            field.placeholder || "مثلاً 0012345678"
                        }
                        dir="ltr"
                        disabled={submitting}
                        className={`${baseInputClass} text-right`}
                    />
                )}

                {field.type === "password" && (
                    <input
                        type="password"
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(field.name, e.target.value)
                        }
                        placeholder={field.placeholder || ""}
                        disabled={submitting}
                        className={baseInputClass}
                    />
                )}

                {field.type === "email" && (
                    <input
                        type="email"
                        value={value ?? ""}
                        onChange={(e) =>
                            updateValue(field.name, e.target.value)
                        }
                        placeholder={
                            field.placeholder || "example@email.com"
                        }
                        dir="ltr"
                        disabled={submitting}
                        className={`${baseInputClass} text-left`}
                    />
                )}

                {field.type === "date" && (
                    <DatePicker
                        value={value || ""}
                        onChange={(date) => {
                            updateValue(
                                field.name,
                                date
                                    ? date.format("YYYY/MM/DD")
                                    : ""
                            );
                        }}
                        calendar={persian}
                        locale={persian_fa}
                        calendarPosition="bottom-right"
                        format="YYYY/MM/DD"
                        placeholder={
                            field.placeholder || "تاریخ را انتخاب کنید"
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
                            updateValue(field.name, e.target.value)
                        }
                        disabled={submitting}
                        className={baseInputClass}
                    >
                        <option value="">
                            {field.placeholder || "انتخاب کنید"}
                        </option>

                        {(field.options || []).map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                )}

                {field.type === "multiselect" && (
                    <div className="space-y-2 border rounded-xl p-4 bg-white">
                        {(field.options || []).length === 0 ? (
                            <p className="text-sm text-gray-500">
                                گزینه‌ای برای انتخاب وجود ندارد.
                            </p>
                        ) : (
                            (field.options || []).map((option) => {
                                const selected =
                                    Array.isArray(value) &&
                                    value.includes(option.value);

                                return (
                                    <label
                                        key={option.value}
                                        className="flex items-center gap-3 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            disabled={submitting}
                                            onChange={(e) => {
                                                const current =
                                                    Array.isArray(value)
                                                        ? value
                                                        : [];

                                                const next = e.target.checked
                                                    ? current.includes(option.value)
                                                        ? current
                                                        : [...current, option.value]
                                                    : current.filter(
                                                        (item: string) =>
                                                            item !== option.value
                                                    );

                                                updateValue(field.name, next);
                                            }}
                                            className="w-4 h-4 accent-[#09967C]"
                                        />

                                        <span>{option.label}</span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                )}

                {(field.type === "boolean" ||
                    field.type === "checkbox") && (
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
                            {field.placeholder || field.label}
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
            dir="rtl"
        >
            {fields.map((field) =>
                visibleFieldNames.has(field.name)
                    ? renderField(field)
                    : null
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
