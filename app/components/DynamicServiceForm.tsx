"use client";

import { useState } from "react";

type FieldOption = {
    label: string;
    value: string;
};

type ServiceField = {
    id?: string;
    name?: string;
    key?: string;
    label?: string;
    type?: string;
    placeholder?: string;
    description?: string;
    required?: boolean;
    options?: FieldOption[] | string[];
    defaultValue?: string | number | boolean;
};

type DynamicServiceFormProps = {
    fields: ServiceField[];
    onSubmit: (formData: Record<string, any>) => void | Promise<void>;
    submitting?: boolean;
};

export default function DynamicServiceForm({
    fields,
    onSubmit,
    submitting = false,
}: DynamicServiceFormProps) {
    const [formData, setFormData] = useState<Record<string, any>>(
        () => {
            const initial: Record<string, any> = {};

            fields.forEach((field) => {
                const key = getFieldKey(field);

                if (!key) return;

                if (field.defaultValue !== undefined) {
                    initial[key] = field.defaultValue;
                } else if (
                    field.type === "checkbox"
                ) {
                    initial[key] = false;
                } else {
                    initial[key] = "";
                }
            });

            return initial;
        }
    );

    const [errors, setErrors] = useState<
        Record<string, string>
    >({});

    function getFieldKey(field: ServiceField) {
        return field.name || field.key || field.id || "";
    }

    function getFieldLabel(field: ServiceField) {
        return field.label || field.name || field.key || "فیلد";
    }

    function normalizeOptions(
        options?: FieldOption[] | string[]
    ): FieldOption[] {
        if (!Array.isArray(options)) {
            return [];
        }

        return options.map((option) => {
            if (typeof option === "string") {
                return {
                    label: option,
                    value: option,
                };
            }

            return {
                label: option.label,
                value: option.value,
            };
        });
    }

    function updateField(
        key: string,
        value: any
    ) {
        setFormData((previous) => ({
            ...previous,
            [key]: value,
        }));

        if (errors[key]) {
            setErrors((previous) => {
                const next = { ...previous };
                delete next[key];
                return next;
            });
        }
    }

    function validate() {
        const nextErrors: Record<string, string> = {};

        fields.forEach((field) => {
            const key = getFieldKey(field);

            if (!key) return;

            const value = formData[key];
            const label = getFieldLabel(field);

            if (field.required) {
                const empty =
                    value === undefined ||
                    value === null ||
                    value === "" ||
                    (Array.isArray(value) &&
                        value.length === 0);

                if (empty) {
                    nextErrors[key] =
                        `لطفاً ${label} را وارد کنید.`;
                    return;
                }

                if (
                    field.type === "checkbox" &&
                    value !== true
                ) {
                    nextErrors[key] =
                        `لطفاً ${label} را تأیید کنید.`;
                    return;
                }
            }

            if (
                typeof value === "string" &&
                value.trim() !== ""
            ) {
                if (
                    field.type === "phone" ||
                    field.type === "tel"
                ) {
                    const normalized = value
                        .replace(/[۰-۹]/g, (digit) =>
                            String(
                                "۰۱۲۳۴۵۶۷۸۹".indexOf(
                                    digit
                                )
                            )
                        )
                        .replace(/[^\d+]/g, "");

                    const phoneRegex =
                        /^(?:\+98|0098|98|0)?9\d{9}$/;

                    if (!phoneRegex.test(normalized)) {
                        nextErrors[key] =
                            "شماره موبایل واردشده معتبر نیست.";
                    }
                }

                if (
                    field.type === "national_code" ||
                    field.type === "nationalCode"
                ) {
                    const code = value
                        .replace(/[۰-۹]/g, (digit) =>
                            String(
                                "۰۱۲۳۴۵۶۷۸۹".indexOf(
                                    digit
                                )
                            )
                        )
                        .replace(/\D/g, "");

                    if (
                        code.length !== 10 ||
                        /^(\d)\1{9}$/.test(code)
                    ) {
                        nextErrors[key] =
                            "کد ملی واردشده معتبر نیست.";
                    }
                }

                if (field.type === "email") {
                    const emailRegex =
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                    if (!emailRegex.test(value)) {
                        nextErrors[key] =
                            "ایمیل واردشده معتبر نیست.";
                    }
                }
            }
        });

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    }

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (submitting) return;

        const valid = validate();

        if (!valid) {
            const firstError = Object.keys(errors)[0];

            if (firstError) {
                document
                    .getElementById(
                        `service-field-${firstError}`
                    )
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
            }

            return;
        }

        await onSubmit(formData);
    }

    function renderField(field: ServiceField) {
        const key = getFieldKey(field);

        if (!key) return null;

        const label = getFieldLabel(field);
        const type = (
            field.type || "text"
        ).toLowerCase();

        const value =
            formData[key] ?? "";

        const error = errors[key];

        const commonClass = `
            w-full
            border
            rounded-xl
            px-4
            py-3
            outline-none
            transition
            bg-white
            ${error
                ? "border-red-400 focus:ring-2 focus:ring-red-100"
                : "border-gray-200 focus:border-[#09967C] focus:ring-2 focus:ring-[#09967C]/10"
            }
        `;

        const fieldId = `service-field-${key}`;

        if (
            type === "textarea" ||
            type === "longtext"
        ) {
            return (
                <textarea
                    id={fieldId}
                    name={key}
                    value={value}
                    onChange={(event) =>
                        updateField(
                            key,
                            event.target.value
                        )
                    }
                    placeholder={
                        field.placeholder
                    }
                    rows={5}
                    disabled={submitting}
                    className={`${commonClass} resize-y`}
                />
            );
        }

        if (
            type === "select" ||
            type === "dropdown"
        ) {
            const options =
                normalizeOptions(
                    field.options
                );

            return (
                <select
                    id={fieldId}
                    name={key}
                    value={value}
                    onChange={(event) =>
                        updateField(
                            key,
                            event.target.value
                        )
                    }
                    disabled={submitting}
                    className={commonClass}
                >
                    <option value="">
                        انتخاب کنید...
                    </option>

                    {options.map(
                        (option) => (
                            <option
                                key={
                                    option.value
                                }
                                value={
                                    option.value
                                }
                            >
                                {
                                    option.label
                                }
                            </option>
                        )
                    )}
                </select>
            );
        }

        if (
            type === "radio" ||
            type === "radio_group"
        ) {
            const options =
                normalizeOptions(
                    field.options
                );

            return (
                <div className="space-y-3">
                    {options.map(
                        (option) => (
                            <label
                                key={
                                    option.value
                                }
                                className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition"
                            >
                                <input
                                    type="radio"
                                    name={key}
                                    value={
                                        option.value
                                    }
                                    checked={
                                        value ===
                                        option.value
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            key,
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    disabled={
                                        submitting
                                    }
                                    className="accent-[#09967C]"
                                />

                                <span>
                                    {
                                        option.label
                                    }
                                </span>
                            </label>
                        )
                    )}
                </div>
            );
        }

        if (
            type === "checkbox"
        ) {
            return (
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        id={fieldId}
                        type="checkbox"
                        checked={
                            Boolean(value)
                        }
                        onChange={(
                            event
                        ) =>
                            updateField(
                                key,
                                event.target
                                    .checked
                            )
                        }
                        disabled={
                            submitting
                        }
                        className="mt-1 w-5 h-5 accent-[#09967C]"
                    />

                    <span className="text-gray-700">
                        {field.placeholder ||
                            label}
                    </span>
                </label>
            );
        }

        if (
            type === "date"
        ) {
            return (
                <input
                    id={fieldId}
                    type="date"
                    name={key}
                    value={value}
                    onChange={(event) =>
                        updateField(
                            key,
                            event.target.value
                        )
                    }
                    disabled={submitting}
                    className={commonClass}
                />
            );
        }

        if (
            type === "number"
        ) {
            return (
                <input
                    id={fieldId}
                    type="number"
                    name={key}
                    value={value}
                    onChange={(event) =>
                        updateField(
                            key,
                            event.target.value
                        )
                    }
                    placeholder={
                        field.placeholder
                    }
                    disabled={submitting}
                    className={commonClass}
                />
            );
        }

        if (
            type === "email"
        ) {
            return (
                <input
                    id={fieldId}
                    type="email"
                    name={key}
                    value={value}
                    onChange={(event) =>
                        updateField(
                            key,
                            event.target.value
                        )
                    }
                    placeholder={
                        field.placeholder
                    }
                    disabled={submitting}
                    className={commonClass}
                />
            );
        }

        if (
            type === "phone" ||
            type === "tel"
        ) {
            return (
                <input
                    id={fieldId}
                    type="tel"
                    inputMode="tel"
                    name={key}
                    value={value}
                    onChange={(event) =>
                        updateField(
                            key,
                            event.target.value
                        )
                    }
                    placeholder={
                        field.placeholder ||
                        "مثلاً 09123456789"
                    }
                    disabled={submitting}
                    className={commonClass}
                />
            );
        }

        if (
            type === "national_code" ||
            type === "nationalCode"
        ) {
            return (
                <input
                    id={fieldId}
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    name={key}
                    value={value}
                    onChange={(event) =>
                        updateField(
                            key,
                            event.target.value
                        )
                    }
                    placeholder={
                        field.placeholder ||
                        "کد ملی ۱۰ رقمی"
                    }
                    disabled={submitting}
                    className={commonClass}
                />
            );
        }

        return (
            <input
                id={fieldId}
                type="text"
                name={key}
                value={value}
                onChange={(event) =>
                    updateField(
                        key,
                        event.target.value
                    )
                }
                placeholder={
                    field.placeholder
                }
                disabled={submitting}
                className={commonClass}
            />
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
        >
            {fields.map(
                (field, index) => {
                    const key =
                        getFieldKey(
                            field
                        );

                    if (!key) {
                        return null;
                    }

                    const label =
                        getFieldLabel(
                            field
                        );

                    const error =
                        errors[key];

                    const type = (
                        field.type ||
                        "text"
                    ).toLowerCase();

                    return (
                        <div
                            key={`${key}-${index}`}
                            id={`service-field-${key}`}
                        >
                            {type !==
                                "checkbox" && (
                                    <label
                                        htmlFor={`service-field-${key}`}
                                        className="block mb-2 font-bold text-gray-700"
                                    >
                                        {
                                            label
                                        }

                                        {field.required && (
                                            <span className="text-red-500 mr-1">
                                                *
                                            </span>
                                        )}
                                    </label>
                                )}

                            {field.description && (
                                <p className="text-sm text-gray-500 mb-2">
                                    {
                                        field.description
                                    }
                                </p>
                            )}

                            {renderField(
                                field
                            )}

                            {error && (
                                <p className="text-sm text-red-600 mt-2">
                                    {error}
                                </p>
                            )}
                        </div>
                    );
                }
            )}

            <div className="pt-4 border-t">
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#09967C] text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting
                        ? "در حال ثبت سفارش..."
                        : "ثبت سفارش"}
                </button>
            </div>
        </form>
    );
}