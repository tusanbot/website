"use client";

import { useEffect, useMemo, useState } from "react";

export type FieldType =
    | "text"
    | "textarea"
    | "number"
    | "phone"
    | "email"
    | "date"
    | "select"
    | "multiselect"
    | "boolean"
    | "checkbox"
    | "password"
    | "national_code";

export type FormOption = {
    label: string;
    value: string;
};

export type ConditionOperator =
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "is_true"
    | "is_false";

export type FieldCondition = {
    field: string;
    operator: ConditionOperator;
    value?: string | boolean;
};

export type FormField = {
    id: string;
    type: FieldType;
    label: string;
    name: string;
    placeholder?: string;
    description?: string;
    required: boolean;
    options?: FormOption[];

    /*
     * اگر شرط‌ها تعریف شده باشند،
     * این فیلد فقط زمانی نمایش داده می‌شود
     * که تمام شرط‌ها برقرار باشند.
     */
    conditions?: FieldCondition[];

    defaultValue?: string | number | boolean | string[];
};

type Props = {
    value: FormField[];
    onChange: (fields: FormField[]) => void;
};

const fieldTypes: {
    value: FieldType;
    label: string;
}[] = [
        { value: "text", label: "متن کوتاه" },
        { value: "textarea", label: "متن بلند" },
        { value: "number", label: "عدد" },
        { value: "phone", label: "شماره موبایل" },
        { value: "national_code", label: "کد ملی" },
        { value: "email", label: "ایمیل" },
        { value: "password", label: "رمز عبور" },
        { value: "date", label: "تاریخ" },
        { value: "select", label: "انتخابی" },
        { value: "multiselect", label: "چندانتخابی" },
        { value: "boolean", label: "بله / خیر" },
        { value: "checkbox", label: "تیک تأیید" },
    ];

const operatorLabels: {
    value: ConditionOperator;
    label: string;
}[] = [
        {
            value: "equals",
            label: "برابر باشد با",
        },
        {
            value: "not_equals",
            label: "برابر نباشد با",
        },
        {
            value: "contains",
            label: "شامل باشد",
        },
        {
            value: "not_contains",
            label: "شامل نباشد",
        },
        {
            value: "is_true",
            label: "فعال / بله باشد",
        },
        {
            value: "is_false",
            label: "غیرفعال / خیر باشد",
        },
    ];

function createId() {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}

function createField(): FormField {
    return {
        id: createId(),
        type: "text",
        label: "فیلد جدید",
        name: `field_${Date.now()}`,
        placeholder: "",
        description: "",
        required: false,
    };
}

function getDefaultOptions(): FormOption[] {
    return [
        {
            label: "گزینه اول",
            value: "option_1",
        },
    ];
}

export default function ServiceFormBuilder({
    value,
    onChange,
}: Props) {
    const [fields, setFields] = useState<FormField[]>(
        value || []
    );

    useEffect(() => {
        setFields(value || []);
    }, [value]);

    function updateFields(nextFields: FormField[]) {
        setFields(nextFields);
        onChange(nextFields);
    }

    function addField() {
        updateFields([
            ...fields,
            createField(),
        ]);
    }

    function removeField(id: string) {
        const confirmed = confirm(
            "آیا از حذف این فیلد مطمئن هستید؟"
        );

        if (!confirmed) return;

        const removedField = fields.find(
            (field) => field.id === id
        );

        const removedName =
            removedField?.name;

        const nextFields = fields
            .filter(
                (field) =>
                    field.id !== id
            )
            .map((field) => ({
                ...field,
                conditions:
                    field.conditions?.filter(
                        (condition) =>
                            condition.field !==
                            removedName
                    ),
            }));

        updateFields(nextFields);
    }

    function updateField(
        id: string,
        changes: Partial<FormField>
    ) {
        updateFields(
            fields.map((field) =>
                field.id === id
                    ? {
                        ...field,
                        ...changes,
                    }
                    : field
            )
        );
    }

    function moveField(
        index: number,
        direction: "up" | "down"
    ) {
        const newIndex =
            direction === "up"
                ? index - 1
                : index + 1;

        if (
            newIndex < 0 ||
            newIndex >= fields.length
        ) {
            return;
        }

        const next = [...fields];

        [
            next[index],
            next[newIndex],
        ] = [
                next[newIndex],
                next[index],
            ];

        updateFields(next);
    }

    function addOption(fieldId: string) {
        const field = fields.find(
            (item) =>
                item.id === fieldId
        );

        if (!field) return;

        const options =
            field.options || [];

        updateField(fieldId, {
            options: [
                ...options,
                {
                    label: `گزینه ${options.length + 1}`,
                    value: `option_${options.length + 1}`,
                },
            ],
        });
    }

    function updateOption(
        fieldId: string,
        optionIndex: number,
        changes: Partial<FormOption>
    ) {
        const field = fields.find(
            (item) =>
                item.id === fieldId
        );

        if (!field) return;

        const options = [
            ...(field.options || []),
        ];

        options[optionIndex] = {
            ...options[optionIndex],
            ...changes,
        };

        updateField(fieldId, {
            options,
        });
    }

    function removeOption(
        fieldId: string,
        optionIndex: number
    ) {
        const field = fields.find(
            (item) =>
                item.id === fieldId
        );

        if (!field) return;

        const options = [
            ...(field.options || []),
        ];

        options.splice(
            optionIndex,
            1
        );

        updateField(fieldId, {
            options,
        });
    }

    function addCondition(
        fieldId: string
    ) {
        const currentField =
            fields.find(
                (field) =>
                    field.id === fieldId
            );

        if (!currentField) return;

        /*
         * فقط فیلدهای قبل از فیلد فعلی
         * می‌توانند به عنوان والد انتخاب شوند.
         *
         * این کار جلوی وابستگی‌های حلقه‌ای
         * را تا حد زیادی می‌گیرد.
         */
        const currentIndex =
            fields.findIndex(
                (field) =>
                    field.id === fieldId
            );

        const availableFields =
            fields.slice(0, currentIndex);

        if (
            availableFields.length === 0
        ) {
            alert(
                "ابتدا یک فیلد بالاتر از این فیلد ایجاد کنید تا بتوانید شرط تعریف کنید."
            );
            return;
        }

        const firstParent =
            availableFields[
            availableFields.length - 1
            ];

        const firstOption =
            firstParent.options?.[0]
                ?.value;

        const condition: FieldCondition =
        {
            field:
                firstParent.name,
            operator:
                firstParent.type ===
                    "boolean" ||
                    firstParent.type ===
                    "checkbox"
                    ? "is_true"
                    : "equals",
            value:
                firstParent.type ===
                    "boolean" ||
                    firstParent.type ===
                    "checkbox"
                    ? true
                    : firstOption || "",
        };

        updateField(fieldId, {
            conditions: [
                ...(currentField.conditions ||
                    []),
                condition,
            ],
        });
    }

    function updateCondition(
        fieldId: string,
        conditionIndex: number,
        changes: Partial<FieldCondition>
    ) {
        const field = fields.find(
            (item) =>
                item.id === fieldId
        );

        if (!field) return;

        const conditions = [
            ...(field.conditions || []),
        ];

        conditions[conditionIndex] = {
            ...conditions[
            conditionIndex
            ],
            ...changes,
        };

        updateField(fieldId, {
            conditions,
        });
    }

    function removeCondition(
        fieldId: string,
        conditionIndex: number
    ) {
        const field = fields.find(
            (item) =>
                item.id === fieldId
        );

        if (!field) return;

        const conditions = [
            ...(field.conditions || []),
        ];

        conditions.splice(
            conditionIndex,
            1
        );

        updateField(fieldId, {
            conditions:
                conditions.length > 0
                    ? conditions
                    : undefined,
        });
    }

    function getConditionField(
        name: string
    ) {
        return fields.find(
            (field) =>
                field.name === name
        );
    }

    function getConditionValueOptions(
        condition: FieldCondition
    ) {
        const parent =
            getConditionField(
                condition.field
            );

        return parent?.options || [];
    }

    const fieldNameSet = useMemo(
        () =>
            new Set(
                fields.map(
                    (field) =>
                        field.name
                )
            ),
        [fields]
    );

    return (
        <div
            dir="rtl"
            className="space-y-4"
        >
            {/* Header */}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold">
                        فرم اطلاعات مشتری
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                        فیلدهای موردنیاز مشتری را برای این خدمت تعریف کنید.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={addField}
                    className="bg-[#09967C] text-white px-4 py-2 rounded-xl"
                >
                    + افزودن فیلد
                </button>
            </div>

            {/* Empty */}

            {fields.length === 0 && (
                <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
                    هنوز هیچ فیلدی برای این فرم ایجاد نشده است.

                    <div className="mt-3">
                        روی «افزودن فیلد» کلیک کنید.
                    </div>
                </div>
            )}

            {/* Fields */}

            {fields.map(
                (field, index) => {
                    const availableParents =
                        fields.filter(
                            (candidate, candidateIndex) =>
                                candidateIndex <
                                index &&
                                candidate.name !==
                                field.name
                        );

                    return (
                        <div
                            key={field.id}
                            className="border border-gray-200 rounded-2xl p-5 bg-gray-50"
                        >
                            {/* Field header */}

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="bg-white border rounded-lg px-3 py-1 text-sm">
                                        فیلد{" "}
                                        {index + 1}
                                    </span>

                                    <button
                                        type="button"
                                        disabled={
                                            index ===
                                            0
                                        }
                                        onClick={() =>
                                            moveField(
                                                index,
                                                "up"
                                            )
                                        }
                                        className="bg-white border rounded-lg px-3 py-1 disabled:opacity-30"
                                        title="یک پله بالا"
                                    >
                                        ↑
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            index ===
                                            fields.length -
                                            1
                                        }
                                        onClick={() =>
                                            moveField(
                                                index,
                                                "down"
                                            )
                                        }
                                        className="bg-white border rounded-lg px-3 py-1 disabled:opacity-30"
                                        title="یک پله پایین"
                                    >
                                        ↓
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        removeField(
                                            field.id
                                        )
                                    }
                                    className="text-red-600 text-sm"
                                >
                                    حذف فیلد
                                </button>
                            </div>

                            {/* Basic info */}

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">
                                        نوع فیلد
                                    </label>

                                    <select
                                        value={
                                            field.type
                                        }
                                        onChange={(
                                            e
                                        ) => {
                                            const type =
                                                e
                                                    .target
                                                    .value as FieldType;

                                            const needsOptions =
                                                type ===
                                                "select" ||
                                                type ===
                                                "multiselect";

                                            updateField(
                                                field.id,
                                                {
                                                    type,
                                                    options:
                                                        needsOptions
                                                            ? field.options?.length
                                                                ? field.options
                                                                : getDefaultOptions()
                                                            : undefined,
                                                }
                                            );
                                        }}
                                        className="w-full border rounded-xl px-4 py-3 bg-white"
                                    >
                                        {fieldTypes.map(
                                            (
                                                type
                                            ) => (
                                                <option
                                                    key={
                                                        type.value
                                                    }
                                                    value={
                                                        type.value
                                                    }
                                                >
                                                    {
                                                        type.label
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2">
                                        عنوان فیلد
                                    </label>

                                    <input
                                        value={
                                            field.label
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            updateField(
                                                field.id,
                                                {
                                                    label:
                                                        e
                                                            .target
                                                            .value,
                                                }
                                            )
                                        }
                                        className="w-full border rounded-xl px-4 py-3 bg-white"
                                        placeholder="مثلاً نام و نام خانوادگی"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2">
                                        نام فنی
                                    </label>

                                    <input
                                        value={
                                            field.name
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            updateField(
                                                field.id,
                                                {
                                                    name:
                                                        e
                                                            .target
                                                            .value
                                                            .trim()
                                                            .replace(
                                                                /\s+/g,
                                                                "_"
                                                            ),
                                                }
                                            )
                                        }
                                        className="w-full border rounded-xl px-4 py-3 bg-white"
                                        placeholder="مثلاً full_name"
                                        dir="ltr"
                                    />

                                    {!fieldNameSet.has(
                                        field.name
                                    ) && (
                                            <p className="text-xs text-red-500 mt-1">
                                                نام فنی نامعتبر است.
                                            </p>
                                        )}
                                </div>

                                {![
                                    "boolean",
                                    "checkbox",
                                ].includes(
                                    field.type
                                ) && (
                                        <div>
                                            <label className="block text-sm font-bold mb-2">
                                                متن راهنما / Placeholder
                                            </label>

                                            <input
                                                value={
                                                    field.placeholder ||
                                                    ""
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    updateField(
                                                        field.id,
                                                        {
                                                            placeholder:
                                                                e
                                                                    .target
                                                                    .value,
                                                        }
                                                    )
                                                }
                                                className="w-full border rounded-xl px-4 py-3 bg-white"
                                                placeholder="مثلاً نام خود را وارد کنید"
                                            />
                                        </div>
                                    )}
                            </div>

                            {/* Description */}

                            <div className="mt-4">
                                <label className="block text-sm font-bold mb-2">
                                    توضیحات فیلد
                                </label>

                                <input
                                    value={
                                        field.description ||
                                        ""
                                    }
                                    onChange={(e) =>
                                        updateField(
                                            field.id,
                                            {
                                                description:
                                                    e.target
                                                        .value,
                                            }
                                        )
                                    }
                                    className="w-full border rounded-xl px-4 py-3 bg-white"
                                    placeholder="توضیح اضافی برای مشتری"
                                />
                            </div>

                            {/* Required */}

                            <label className="flex items-center gap-2 mt-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={
                                        field.required
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        updateField(
                                            field.id,
                                            {
                                                required:
                                                    e.target
                                                        .checked,
                                            }
                                        )
                                    }
                                    className="w-4 h-4 accent-[#09967C]"
                                />

                                <span className="text-sm">
                                    این فیلد اجباری است
                                </span>
                            </label>

                            {/* Options */}

                            {(field.type ===
                                "select" ||
                                field.type ===
                                "multiselect") && (
                                    <div className="mt-5 border-t pt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-bold">
                                                گزینه‌ها
                                            </h4>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addOption(
                                                        field.id
                                                    )
                                                }
                                                className="text-[#09967C] text-sm font-bold"
                                            >
                                                + افزودن گزینه
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {(
                                                field.options ||
                                                []
                                            ).map(
                                                (
                                                    option,
                                                    optionIndex
                                                ) => (
                                                    <div
                                                        key={`${field.id}-${optionIndex}`}
                                                        className="flex flex-col md:flex-row gap-2"
                                                    >
                                                        <input
                                                            value={
                                                                option.label
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                updateOption(
                                                                    field.id,
                                                                    optionIndex,
                                                                    {
                                                                        label:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    }
                                                                )
                                                            }
                                                            className="flex-1 border rounded-lg px-3 py-2 bg-white"
                                                            placeholder="عنوان گزینه"
                                                        />

                                                        <input
                                                            value={
                                                                option.value
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                updateOption(
                                                                    field.id,
                                                                    optionIndex,
                                                                    {
                                                                        value:
                                                                            e
                                                                                .target
                                                                                .value
                                                                                .trim()
                                                                                .replace(
                                                                                    /\s+/g,
                                                                                    "_"
                                                                                ),
                                                                    }
                                                                )
                                                            }
                                                            className="flex-1 border rounded-lg px-3 py-2 bg-white"
                                                            placeholder="مقدار فنی"
                                                            dir="ltr"
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeOption(
                                                                    field.id,
                                                                    optionIndex
                                                                )
                                                            }
                                                            className="text-red-500 px-2"
                                                        >
                                                            حذف
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                            {/* Conditions */}

                            {availableParents.length >
                                0 && (
                                    <div className="mt-5 border-t pt-5">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                                            <div>
                                                <h4 className="font-bold text-[#09967C]">
                                                    نمایش شرطی
                                                </h4>

                                                <p className="text-xs text-gray-500 mt-1">
                                                    این فیلد فقط در صورت برقرار بودن همه شرط‌ها نمایش داده می‌شود.
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addCondition(
                                                        field.id
                                                    )
                                                }
                                                className="text-[#09967C] text-sm font-bold border border-[#09967C]/30 rounded-lg px-3 py-2"
                                            >
                                                + افزودن شرط
                                            </button>
                                        </div>

                                        {(
                                            field.conditions ||
                                            []
                                        ).map(
                                            (
                                                condition,
                                                conditionIndex
                                            ) => {
                                                const parent =
                                                    getConditionField(
                                                        condition.field
                                                    );

                                                const isBoolean =
                                                    parent?.type ===
                                                    "boolean" ||
                                                    parent?.type ===
                                                    "checkbox";

                                                const valueOptions =
                                                    getConditionValueOptions(
                                                        condition
                                                    );

                                                return (
                                                    <div
                                                        key={`${field.id}-condition-${conditionIndex}`}
                                                        className="bg-white border border-[#09967C]/20 rounded-xl p-4 mb-3"
                                                    >
                                                        <div className="grid md:grid-cols-3 gap-3">
                                                            {/* Parent field */}

                                                            <div>
                                                                <label className="block text-xs font-bold mb-2">
                                                                    فیلد مرجع
                                                                </label>

                                                                <select
                                                                    value={
                                                                        condition.field
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const selected =
                                                                            getConditionField(
                                                                                e
                                                                                    .target
                                                                                    .value
                                                                            );

                                                                        const selectedBoolean =
                                                                            selected?.type ===
                                                                            "boolean" ||
                                                                            selected?.type ===
                                                                            "checkbox";

                                                                        updateCondition(
                                                                            field.id,
                                                                            conditionIndex,
                                                                            {
                                                                                field:
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                operator:
                                                                                    selectedBoolean
                                                                                        ? "is_true"
                                                                                        : "equals",
                                                                                value:
                                                                                    selectedBoolean
                                                                                        ? true
                                                                                        : selected
                                                                                            ?.options?.[0]
                                                                                            ?.value ||
                                                                                        "",
                                                                            }
                                                                        );
                                                                    }}
                                                                    className="w-full border rounded-lg px-3 py-2 bg-white"
                                                                >
                                                                    {availableParents.map(
                                                                        (
                                                                            parentField
                                                                        ) => (
                                                                            <option
                                                                                key={
                                                                                    parentField.id
                                                                                }
                                                                                value={
                                                                                    parentField.name
                                                                                }
                                                                            >
                                                                                {
                                                                                    parentField.label
                                                                                }
                                                                            </option>
                                                                        )
                                                                    )}
                                                                </select>
                                                            </div>

                                                            {/* Operator */}

                                                            <div>
                                                                <label className="block text-xs font-bold mb-2">
                                                                    شرط
                                                                </label>

                                                                <select
                                                                    value={
                                                                        condition.operator
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        updateCondition(
                                                                            field.id,
                                                                            conditionIndex,
                                                                            {
                                                                                operator:
                                                                                    e
                                                                                        .target
                                                                                        .value as ConditionOperator,
                                                                            }
                                                                        )
                                                                    }
                                                                    className="w-full border rounded-lg px-3 py-2 bg-white"
                                                                >
                                                                    {operatorLabels
                                                                        .filter(
                                                                            (
                                                                                operator
                                                                            ) =>
                                                                                isBoolean
                                                                                    ? [
                                                                                        "is_true",
                                                                                        "is_false",
                                                                                    ].includes(
                                                                                        operator.value
                                                                                    )
                                                                                    : ![
                                                                                        "is_true",
                                                                                        "is_false",
                                                                                    ].includes(
                                                                                        operator.value
                                                                                    )
                                                                        )
                                                                        .map(
                                                                            (
                                                                                operator
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        operator.value
                                                                                    }
                                                                                    value={
                                                                                        operator.value
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        operator.label
                                                                                    }
                                                                                </option>
                                                                            )
                                                                        )}
                                                                </select>
                                                            </div>

                                                            {/* Value */}

                                                            {![
                                                                "is_true",
                                                                "is_false",
                                                            ].includes(
                                                                condition.operator
                                                            ) && (
                                                                    <div>
                                                                        <label className="block text-xs font-bold mb-2">
                                                                            مقدار
                                                                        </label>

                                                                        {valueOptions.length >
                                                                            0 ? (
                                                                            <select
                                                                                value={String(
                                                                                    condition.value ??
                                                                                    ""
                                                                                )}
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
                                                                                    updateCondition(
                                                                                        field.id,
                                                                                        conditionIndex,
                                                                                        {
                                                                                            value:
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                        }
                                                                                    )
                                                                                }
                                                                                className="w-full border rounded-lg px-3 py-2 bg-white"
                                                                            >
                                                                                <option value="">
                                                                                    انتخاب کنید...
                                                                                </option>

                                                                                {valueOptions.map(
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
                                                                        ) : (
                                                                            <input
                                                                                value={String(
                                                                                    condition.value ??
                                                                                    ""
                                                                                )}
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
                                                                                    updateCondition(
                                                                                        field.id,
                                                                                        conditionIndex,
                                                                                        {
                                                                                            value:
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                        }
                                                                                    )
                                                                                }
                                                                                className="w-full border rounded-lg px-3 py-2 bg-white"
                                                                                placeholder="مقدار موردنظر"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeCondition(
                                                                    field.id,
                                                                    conditionIndex
                                                                )
                                                            }
                                                            className="text-red-500 text-xs mt-3"
                                                        >
                                                            حذف این شرط
                                                        </button>
                                                    </div>
                                                );
                                            }
                                        )}

                                        {(field.conditions?.length ||
                                            0) === 0 && (
                                                <div className="text-xs text-gray-400 bg-white rounded-lg p-3">
                                                    این فیلد بدون شرط نمایش داده می‌شود.
                                                </div>
                                            )}
                                    </div>
                                )}
                        </div>
                    );
                }
            )}
        </div>
    );
}