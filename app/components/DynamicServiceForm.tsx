"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

type FieldOption = {
    label: string;
    value: string;
};

type ConditionOperator =
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "is_true"
    | "is_false";

type FieldCondition = {
    field: string;
    operator: ConditionOperator;
    value?: string | boolean;
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
    options?: FieldOption[] | string[] | string;
    defaultValue?:
    | string
    | number
    | boolean
    | string[];

    conditions?: FieldCondition[];
};

type DynamicServiceFormProps = {
    fields: ServiceField[];

    onSubmit: (
        formData: Record<string, any>
    ) => void | Promise<void>;

    submitting?: boolean;
};

export default function DynamicServiceForm({
    fields,
    onSubmit,
    submitting = false,
}: DynamicServiceFormProps) {
    const [formData, setFormData] =
        useState<Record<string, any>>(
            () => createInitialFormData(fields)
        );

    const [errors, setErrors] =
        useState<Record<string, string>>({});

    /*
     * --------------------------------------------------
     * Field helpers
     * --------------------------------------------------
     */

    function getFieldKey(
        field: ServiceField
    ): string {
        return (
            field.name ||
            field.key ||
            field.id ||
            ""
        );
    }

    function getFieldLabel(
        field: ServiceField
    ): string {
        return (
            field.label ||
            field.name ||
            field.key ||
            "فیلد"
        );
    }

    function getFieldType(
        field: ServiceField
    ): string {
        return (
            field.type || "text"
        ).toLowerCase();
    }

    function isBooleanField(
        field: ServiceField
    ): boolean {
        const type =
            getFieldType(field);

        return (
            type === "boolean" ||
            type === "checkbox"
        );
    }

    /*
     * --------------------------------------------------
     * Normalize options
     * --------------------------------------------------
     */

    function normalizeOptions(
        options?:
            | FieldOption[]
            | string[]
            | string
    ): FieldOption[] {
        if (!options) {
            return [];
        }

        if (
            typeof options ===
            "string"
        ) {
            try {
                const parsed =
                    JSON.parse(options);

                if (
                    Array.isArray(parsed)
                ) {
                    return parsed.map(
                        (option) => {
                            if (
                                typeof option ===
                                "string"
                            ) {
                                return {
                                    label: option,
                                    value: option,
                                };
                            }

                            return {
                                label: String(
                                    option?.label ??
                                    ""
                                ),
                                value: String(
                                    option?.value ??
                                    ""
                                ),
                            };
                        }
                    );
                }
            } catch {
                return [];
            }

            return [];
        }

        return options.map(
            (option) => {
                if (
                    typeof option ===
                    "string"
                ) {
                    return {
                        label: option,
                        value: option,
                    };
                }

                return {
                    label: String(
                        option.label ??
                        ""
                    ),
                    value: String(
                        option.value ??
                        ""
                    ),
                };
            }
        );
    }

    /*
     * --------------------------------------------------
     * Initial form data
     * --------------------------------------------------
     */

    useEffect(() => {
        setFormData(
            (previous) => {
                const next = {
                    ...previous,
                };

                fields.forEach(
                    (field) => {
                        const key =
                            getFieldKey(
                                field
                            );

                        if (!key) {
                            return;
                        }

                        if (
                            next[key] !==
                            undefined
                        ) {
                            return;
                        }

                        if (
                            field.defaultValue !==
                            undefined
                        ) {
                            next[key] =
                                field.defaultValue;
                            return;
                        }

                        if (
                            isBooleanField(
                                field
                            )
                        ) {
                            next[key] =
                                false;
                            return;
                        }

                        if (
                            getFieldType(
                                field
                            ) ===
                            "multiselect"
                        ) {
                            next[key] = [];
                            return;
                        }

                        next[key] = "";
                    }
                );

                return next;
            }
        );
    }, [fields]);

    /*
     * --------------------------------------------------
     * Find parent field
     * --------------------------------------------------
     */

    function getFieldByName(
        name: string
    ): ServiceField | undefined {
        return fields.find(
            (field) =>
                getFieldKey(field) ===
                name
        );
    }

    /*
     * --------------------------------------------------
     * Normalize value for conditions
     * --------------------------------------------------
     */

    function valueToArray(
        value: any
    ): string[] {
        if (
            value === undefined ||
            value === null
        ) {
            return [];
        }

        if (
            Array.isArray(value)
        ) {
            return value.map(
                (item) =>
                    String(item)
            );
        }

        if (
            typeof value ===
            "boolean"
        ) {
            return [
                value
                    ? "true"
                    : "false",
            ];
        }

        return [
            String(value),
        ];
    }

    /*
     * --------------------------------------------------
     * Condition matching
     * --------------------------------------------------
     */

    function conditionMatches(
        condition: FieldCondition
    ): boolean {
        const actualValue =
            formData[
            condition.field
            ];

        const actualValues =
            valueToArray(
                actualValue
            );

        const expectedValue =
            String(
                condition.value ??
                ""
            );

        switch (
        condition.operator
        ) {
            case "equals":
                return actualValues.some(
                    (value) =>
                        value ===
                        expectedValue
                );

            case "not_equals":
                return !actualValues.some(
                    (value) =>
                        value ===
                        expectedValue
                );

            case "contains":
                return actualValues.some(
                    (value) =>
                        value
                            .toLowerCase()
                            .includes(
                                expectedValue
                                    .toLowerCase()
                            )
                );

            case "not_contains":
                return !actualValues.some(
                    (value) =>
                        value
                            .toLowerCase()
                            .includes(
                                expectedValue
                                    .toLowerCase()
                            )
                );

            case "is_true":
                return (
                    actualValue ===
                    true ||
                    actualValue ===
                    "true" ||
                    actualValue === 1
                );

            case "is_false":
                return !(
                    actualValue ===
                    true ||
                    actualValue ===
                    "true" ||
                    actualValue === 1
                );

            default:
                return false;
        }
    }

    /*
     * --------------------------------------------------
     * Field visibility
     * --------------------------------------------------
     *
     * بدون شرط => همیشه نمایش داده شود
     *
     * چند شرط => همه باید برقرار باشند
     */

    function isFieldVisible(
        field: ServiceField
    ): boolean {
        const conditions =
            field.conditions;

        if (
            !Array.isArray(
                conditions
            ) ||
            conditions.length === 0
        ) {
            return true;
        }

        return conditions.every(
            (condition) => {
                const parent =
                    getFieldByName(
                        condition.field
                    );

                if (!parent) {
                    return false;
                }

                return conditionMatches(
                    condition
                );
            }
        );
    }

    /*
     * --------------------------------------------------
     * Visible fields
     * --------------------------------------------------
     */

    const visibleFields =
        useMemo(() => {
            return fields.filter(
                (field) =>
                    isFieldVisible(
                        field
                    )
            );
        }, [
            fields,
            formData,
        ]);

    /*
     * --------------------------------------------------
     * Clear hidden fields
     * --------------------------------------------------
     */

    useEffect(() => {
        setFormData(
            (previous) => {
                let changed = false;

                const next = {
                    ...previous,
                };

                fields.forEach(
                    (field) => {
                        const key =
                            getFieldKey(
                                field
                            );

                        if (!key) {
                            return;
                        }

                        /*
                         * اگر فیلد قابل مشاهده است
                         * کاری نکن.
                         */
                        if (
                            isFieldVisible(
                                field
                            )
                        ) {
                            return;
                        }

                        /*
                         * اگر فیلد مخفی است،
                         * مقدار قبلی آن را پاک کن.
                         */
                        const currentValue =
                            next[key];

                        const hasValue =
                            !isEmptyValue(
                                currentValue
                            );

                        if (!hasValue) {
                            return;
                        }

                        next[key] =
                            isBooleanField(
                                field
                            )
                                ? false
                                : getFieldType(
                                    field
                                ) ===
                                    "multiselect"
                                    ? []
                                    : "";

                        changed = true;
                    }
                );

                return changed
                    ? next
                    : previous;
            }
        );

        /*
         * خطای فیلدهای مخفی نیز حذف شود.
         */
        setErrors(
            (previous) => {
                const next = {
                    ...previous,
                };

                let changed = false;

                fields.forEach(
                    (field) => {
                        const key =
                            getFieldKey(
                                field
                            );

                        if (!key) {
                            return;
                        }

                        if (
                            !isFieldVisible(
                                field
                            ) &&
                            next[key]
                        ) {
                            delete next[
                                key
                            ];

                            changed = true;
                        }
                    }
                );

                return changed
                    ? next
                    : previous;
            }
        );
    }, [
        fields,
        formData,
    ]);

    /*
     * --------------------------------------------------
     * Update field
     * --------------------------------------------------
     */

    function updateField(
        key: string,
        value: any
    ) {
        setFormData(
            (previous) => ({
                ...previous,
                [key]: value,
            })
        );

        if (errors[key]) {
            setErrors(
                (previous) => {
                    const next = {
                        ...previous,
                    };

                    delete next[key];

                    return next;
                }
            );
        }
    }

    /*
     * --------------------------------------------------
     * Validation
     * --------------------------------------------------
     */

    function validate() {
        const nextErrors: Record<
            string,
            string
        > = {};

        visibleFields.forEach(
            (field) => {
                const key =
                    getFieldKey(
                        field
                    );

                if (!key) {
                    return;
                }

                const value =
                    formData[key];

                const label =
                    getFieldLabel(
                        field
                    );

                /*
                 * Required
                 */
                if (field.required) {
                    const empty =
                        isEmptyValue(
                            value
                        );

                    if (empty) {
                        nextErrors[key] =
                            `لطفاً ${label} را وارد کنید.`;

                        return;
                    }

                    if (
                        isBooleanField(
                            field
                        ) &&
                        value !== true
                    ) {
                        nextErrors[key] =
                            `لطفاً ${label} را تأیید کنید.`;

                        return;
                    }
                }

                /*
                 * String validation
                 */
                if (
                    typeof value !==
                    "string" ||
                    value.trim() === ""
                ) {
                    return;
                }

                const type =
                    getFieldType(
                        field
                    );

                /*
                 * Phone
                 */
                if (
                    type === "phone" ||
                    type === "tel"
                ) {
                    const normalized =
                        normalizeDigits(
                            value
                        ).replace(
                            /[^\d+]/g,
                            ""
                        );

                    const phoneRegex =
                        /^(?:\+98|0098|98|0)?9\d{9}$/;

                    if (
                        !phoneRegex.test(
                            normalized
                        )
                    ) {
                        nextErrors[
                            key
                        ] =
                            "شماره موبایل واردشده معتبر نیست.";
                    }
                }

                /*
                 * National code
                 */
                if (
                    type ===
                    "national_code" ||
                    type ===
                    "nationalCode"
                ) {
                    const code =
                        normalizeDigits(
                            value
                        ).replace(
                            /\D/g,
                            ""
                        );

                    if (
                        !isValidNationalCode(
                            code
                        )
                    ) {
                        nextErrors[
                            key
                        ] =
                            "کد ملی واردشده معتبر نیست.";
                    }
                }

                /*
                 * Email
                 */
                if (
                    type === "email"
                ) {
                    const emailRegex =
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                    if (
                        !emailRegex.test(
                            value
                        )
                    ) {
                        nextErrors[
                            key
                        ] =
                            "ایمیل واردشده معتبر نیست.";
                    }
                }
            }
        );

        setErrors(
            nextErrors
        );

        return {
            valid:
                Object.keys(
                    nextErrors
                ).length === 0,

            errors:
                nextErrors,
        };
    }

    /*
     * --------------------------------------------------
     * Submit
     * --------------------------------------------------
     */

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (submitting) {
            return;
        }

        const result =
            validate();

        if (!result.valid) {
            const firstError =
                Object.keys(
                    result.errors
                )[0];

            if (firstError) {
                document
                    .getElementById(
                        `service-field-${firstError}`
                    )
                    ?.scrollIntoView({
                        behavior:
                            "smooth",
                        block:
                            "center",
                    });
            }

            return;
        }

        /*
         * فقط فیلدهای قابل مشاهده
         * ارسال می‌شوند.
         */
        const cleanedFormData: Record<
            string,
            any
        > = {};

        visibleFields.forEach(
            (field) => {
                const key =
                    getFieldKey(
                        field
                    );

                if (!key) {
                    return;
                }

                cleanedFormData[key] =
                    formData[key];
            }
        );

        await onSubmit(
            cleanedFormData
        );
    }

    /*
     * --------------------------------------------------
     * Render field
     * --------------------------------------------------
     */

    function renderField(
        field: ServiceField
    ) {
        const key =
            getFieldKey(field);

        if (!key) {
            return null;
        }

        const label =
            getFieldLabel(
                field
            );

        const type =
            getFieldType(field);

        const value =
            formData[key] ??
            (type ===
                "multiselect"
                ? []
                : "");

        const error =
            errors[key];

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

        const fieldId =
            `service-field-${key}`;

        /*
         * Textarea
         */
        if (
            type === "textarea" ||
            type === "longtext"
        ) {
            return (
                <textarea
                    id={fieldId}
                    name={key}
                    value={value}
                    onChange={(
                        event
                    ) =>
                        updateField(
                            key,
                            event.target
                                .value
                        )
                    }
                    placeholder={
                        field.placeholder
                    }
                    rows={5}
                    disabled={
                        submitting
                    }
                    className={`${commonClass} resize-y`}
                />
            );
        }

        /*
         * Select
         */
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
                    value={
                        value ?? ""
                    }
                    onChange={(
                        event
                    ) =>
                        updateField(
                            key,
                            event.target
                                .value
                        )
                    }
                    disabled={
                        submitting
                    }
                    className={
                        commonClass
                    }
                >
                    <option value="">
                        انتخاب کنید...
                    </option>

                    {options.map(
                        (
                            option
                        ) => (
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

        /*
         * Multiselect
         */
        if (
            type ===
            "multiselect"
        ) {
            const options =
                normalizeOptions(
                    field.options
                );

            const selectedValues =
                Array.isArray(
                    value
                )
                    ? value
                    : [];

            function toggleOption(
                optionValue: string
            ) {
                if (
                    selectedValues.includes(
                        optionValue
                    )
                ) {
                    updateField(
                        key,
                        selectedValues.filter(
                            (
                                item
                            ) =>
                                item !==
                                optionValue
                        )
                    );
                } else {
                    updateField(
                        key,
                        [
                            ...selectedValues,
                            optionValue,
                        ]
                    );
                }
            }

            return (
                <div className="space-y-2">
                    {options.map(
                        (
                            option
                        ) => (
                            <label
                                key={
                                    option.value
                                }
                                className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(
                                        option.value
                                    )}
                                    onChange={() =>
                                        toggleOption(
                                            option.value
                                        )
                                    }
                                    disabled={
                                        submitting
                                    }
                                    className="w-4 h-4 accent-[#09967C]"
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

        /*
         * Radio
         */
        if (
            type === "radio" ||
            type ===
            "radio_group"
        ) {
            const options =
                normalizeOptions(
                    field.options
                );

            return (
                <div className="space-y-3">
                    {options.map(
                        (
                            option
                        ) => (
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

        /*
         * Boolean
         */
        if (
            type ===
            "boolean" ||
            type === "checkbox"
        ) {
            return (
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        id={fieldId}
                        type="checkbox"
                        checked={Boolean(
                            value
                        )}
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

        /*
         * Date
         */
        if (
            type === "date"
        ) {
            return (
                <input
                    id={fieldId}
                    type="date"
                    name={key}
                    value={value}
                    onChange={(
                        event
                    ) =>
                        updateField(
                            key,
                            event.target
                                .value
                        )
                    }
                    disabled={
                        submitting
                    }
                    className={
                        commonClass
                    }
                />
            );
        }

        /*
         * Number
         */
        if (
            type === "number"
        ) {
            return (
                <input
                    id={fieldId}
                    type="number"
                    name={key}
                    value={value}
                    onChange={(
                        event
                    ) =>
                        updateField(
                            key,
                            event.target
                                .value
                        )
                    }
                    placeholder={
                        field.placeholder
                    }
                    disabled={
                        submitting
                    }
                    className={
                        commonClass
                    }
                />
            );
        }

        /*
         * Email
         */
        if (
            type === "email"
        ) {
            return (
                <input
                    id={fieldId}
                    type="email"
                    name={key}
                    value={value}
                    onChange={(
                        event
                    ) =>
                        updateField(
                            key,
                            event.target
                                .value
                        )
                    }
                    placeholder={
                        field.placeholder
                    }
                    disabled={
                        submitting
                    }
                    className={
                        commonClass
                    }
                />
            );
        }

        /*
         * Password
         */
        if (
            type ===
            "password"
        ) {
            return (
                <input
                    id={fieldId}
                    type="password"
                    name={key}
                    value={value}
                    onChange={(
                        event
                    ) =>
                        updateField(
                            key,
                            event.target
                                .value
                        )
                    }
                    placeholder={
                        field.placeholder
                    }
                    disabled={
                        submitting
                    }
                    className={
                        commonClass
                    }
                    dir="ltr"
                />
            );
        }

        /*
         * Phone
         */
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
                    onChange={(
                        event
                    ) =>
                        updateField(
                            key,
                            event.target
                                .value
                        )
                    }
                    placeholder={
                        field.placeholder ||
                        "مثلاً 09123456789"
                    }
                    disabled={
                        submitting
                    }
                    className={
                        commonClass
                    }
                />
            );
        }

        /*
         * National code
         */
        if (
            type ===
            "national_code" ||
            type ===
            "nationalcode"
        ) {
            return (
                <input
                    id={fieldId}
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    name={key}
                    value={value}
                    onChange={(
                        event
                    ) =>
                        updateField(
                            key,
                            event.target
                                .value
                        )
                    }
                    placeholder={
                        field.placeholder ||
                        "کد ملی ۱۰ رقمی"
                    }
                    disabled={
                        submitting
                    }
                    className={
                        commonClass
                    }
                />
            );
        }

        /*
         * Default text
         */
        return (
            <input
                id={fieldId}
                type="text"
                name={key}
                value={value}
                onChange={(
                    event
                ) =>
                    updateField(
                        key,
                        event.target
                            .value
                    )
                }
                placeholder={
                    field.placeholder
                }
                disabled={
                    submitting
                }
                className={
                    commonClass
                }
            />
        );
    }

    /*
     * --------------------------------------------------
     * Render
     * --------------------------------------------------
     */

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
        >
            {fields.map(
                (
                    field,
                    index
                ) => {
                    /*
                     * مهم:
                     * قبل از هر چیز visibility
                     * بررسی می‌شود.
                     */
                    const visible =
                        isFieldVisible(
                            field
                        );

                    if (!visible) {
                        return null;
                    }

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

                    const type =
                        getFieldType(
                            field
                        );

                    return (
                        <div
                            key={`${key}-${index}`}
                            id={`service-field-${key}`}
                        >
                            {type !==
                                "checkbox" &&
                                type !==
                                "boolean" && (
                                    <label
                                        htmlFor={`service-field-${key}`}
                                        className="block mb-2 font-bold text-gray-700"
                                    >
                                        {label}

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
                    disabled={
                        submitting
                    }
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

/*
 * ------------------------------------------------------
 * Static helpers
 * ------------------------------------------------------
 */

function createInitialFormData(
    fields: ServiceField[]
) {
    const initial: Record<
        string,
        any
    > = {};

    fields.forEach(
        (field) => {
            const key =
                getFieldKeyStatic(
                    field
                );

            if (!key) {
                return;
            }

            if (
                field.defaultValue !==
                undefined
            ) {
                initial[key] =
                    field.defaultValue;
            } else if (
                isBooleanFieldStatic(
                    field
                )
            ) {
                initial[key] =
                    false;
            } else if (
                (
                    field.type ||
                    ""
                ).toLowerCase() ===
                "multiselect"
            ) {
                initial[key] = [];
            } else {
                initial[key] = "";
            }
        }
    );

    return initial;
}

function getFieldKeyStatic(
    field: ServiceField
): string {
    return (
        field.name ||
        field.key ||
        field.id ||
        ""
    );
}

function isBooleanFieldStatic(
    field: ServiceField
): boolean {
    const type =
        (
            field.type ||
            ""
        ).toLowerCase();

    return (
        type === "boolean" ||
        type === "checkbox"
    );
}

function isEmptyValue(
    value: any
): boolean {
    return (
        value === undefined ||
        value === null ||
        value === "" ||
        (
            Array.isArray(
                value
            ) &&
            value.length === 0
        )
    );
}

function normalizeDigits(
    value: string
): string {
    return value
        .replace(
            /[۰-۹]/g,
            (digit) =>
                String(
                    "۰۱۲۳۴۵۶۷۸۹".indexOf(
                        digit
                    )
                )
        )
        .replace(
            /[٠-٩]/g,
            (digit) =>
                String(
                    "٠١٢٣٤٥٦٧٨٩".indexOf(
                        digit
                    )
                )
        );
}

function isValidNationalCode(
    code: string
): boolean {
    if (
        code.length !== 10
    ) {
        return false;
    }

    if (
        /^(\d)\1{9}$/.test(
            code
        )
    ) {
        return false;
    }

    const check =
        Number(code[9]);

    let sum = 0;

    for (
        let i = 0;
        i < 9;
        i++
    ) {
        sum +=
            Number(code[i]) *
            (10 - i);
    }

    const remainder =
        sum % 11;

    if (
        remainder < 2
    ) {
        return (
            check ===
            remainder
        );
    }

    return (
        check ===
        11 - remainder
    );
}