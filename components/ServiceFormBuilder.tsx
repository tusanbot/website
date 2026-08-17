"use client";

import { useEffect, useState } from "react";

type FieldType =
    | "text"
    | "textarea"
    | "number"
    | "phone"
    | "email"
    | "date"
    | "select"
    | "multiselect"
    | "boolean";

type FormOption = {
    label: string;
    value: string;
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
};

type Props = {
    value: FormField[];
    onChange: (fields: FormField[]) => void;
};

const fieldTypes: { value: FieldType; label: string }[] = [
    { value: "text", label: "متن کوتاه" },
    { value: "textarea", label: "متن بلند" },
    { value: "number", label: "عدد" },
    { value: "phone", label: "شماره موبایل" },
    { value: "email", label: "ایمیل" },
    { value: "date", label: "تاریخ" },
    { value: "select", label: "انتخابی" },
    { value: "multiselect", label: "چندانتخابی" },
    { value: "boolean", label: "بله / خیر" },
];

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

export default function ServiceFormBuilder({
    value,
    onChange,
}: Props) {
    const [fields, setFields] = useState<FormField[]>(value || []);

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

        updateFields(
            fields.filter((field) => field.id !== id)
        );
    }

    function updateField(
        id: string,
        changes: Partial<FormField>
    ) {
        updateFields(
            fields.map((field) =>
                field.id === id
                    ? { ...field, ...changes }
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
            (item) => item.id === fieldId
        );

        if (!field) return;

        const options = field.options || [];

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
            (item) => item.id === fieldId
        );

        if (!field) return;

        const options = [...(field.options || [])];

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
            (item) => item.id === fieldId
        );

        if (!field) return;

        const options = [...(field.options || [])];

        options.splice(optionIndex, 1);

        updateField(fieldId, {
            options,
        });
    }

    return (
        <div
            dir="rtl"
            className="space-y-4"
        >
            <div className="flex items-center justify-between">

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

            {fields.length === 0 && (
                <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
                    هنوز هیچ فیلدی برای این فرم ایجاد نشده است.
                    <div className="mt-3">
                        روی «افزودن فیلد» کلیک کنید.
                    </div>
                </div>
            )}

            {fields.map((field, index) => (
                <div
                    key={field.id}
                    className="border border-gray-200 rounded-2xl p-5 bg-gray-50"
                >
                    <div className="flex items-center justify-between mb-4">

                        <div className="flex items-center gap-2">
                            <span className="bg-white border rounded-lg px-3 py-1 text-sm">
                                فیلد {index + 1}
                            </span>

                            <button
                                type="button"
                                disabled={index === 0}
                                onClick={() =>
                                    moveField(index, "up")
                                }
                                className="bg-white border rounded-lg px-3 py-1 disabled:opacity-30"
                                title="یک پله بالا"
                            >
                                ↑
                            </button>

                            <button
                                type="button"
                                disabled={index === fields.length - 1}
                                onClick={() =>
                                    moveField(index, "down")
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
                                removeField(field.id)
                            }
                            className="text-red-600 text-sm"
                        >
                            حذف فیلد
                        </button>

                    </div>

                    <div className="grid md:grid-cols-2 gap-4">

                        <div>
                            <label className="block text-sm font-bold mb-2">
                                نوع فیلد
                            </label>

                            <select
                                value={field.type}
                                onChange={(e) => {
                                    const type =
                                        e.target.value as FieldType;

                                    updateField(field.id, {
                                        type,
                                        options:
                                            type === "select" ||
                                                type === "multiselect"
                                                ? field.options || [
                                                    {
                                                        label: "گزینه اول",
                                                        value: "option_1",
                                                    },
                                                ]
                                                : undefined,
                                    });
                                }}
                                className="w-full border rounded-xl px-4 py-3 bg-white"
                            >
                                {fieldTypes.map((type) => (
                                    <option
                                        key={type.value}
                                        value={type.value}
                                    >
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">
                                عنوان فیلد
                            </label>

                            <input
                                value={field.label}
                                onChange={(e) =>
                                    updateField(field.id, {
                                        label: e.target.value,
                                    })
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
                                value={field.name}
                                onChange={(e) =>
                                    updateField(field.id, {
                                        name: e.target.value
                                            .trim()
                                            .replace(/\s+/g, "_"),
                                    })
                                }
                                className="w-full border rounded-xl px-4 py-3 bg-white"
                                placeholder="مثلاً full_name"
                                dir="ltr"
                            />
                        </div>

                        {field.type !== "boolean" && (
                            <div>
                                <label className="block text-sm font-bold mb-2">
                                    متن راهنما / Placeholder
                                </label>

                                <input
                                    value={field.placeholder || ""}
                                    onChange={(e) =>
                                        updateField(field.id, {
                                            placeholder:
                                                e.target.value,
                                        })
                                    }
                                    className="w-full border rounded-xl px-4 py-3 bg-white"
                                    placeholder="مثلاً نام خود را وارد کنید"
                                />
                            </div>
                        )}

                    </div>

                    <div className="mt-4">

                        <label className="block text-sm font-bold mb-2">
                            توضیحات فیلد
                        </label>

                        <input
                            value={field.description || ""}
                            onChange={(e) =>
                                updateField(field.id, {
                                    description:
                                        e.target.value,
                                })
                            }
                            className="w-full border rounded-xl px-4 py-3 bg-white"
                            placeholder="توضیح اضافی برای مشتری"
                        />

                    </div>

                    <label className="flex items-center gap-2 mt-4 cursor-pointer">

                        <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                                updateField(field.id, {
                                    required:
                                        e.target.checked,
                                })
                            }
                            className="w-4 h-4 accent-[#09967C]"
                        />

                        <span className="text-sm">
                            این فیلد اجباری است
                        </span>

                    </label>

                    {(field.type === "select" ||
                        field.type === "multiselect") && (
                            <div className="mt-5 border-t pt-4">

                                <div className="flex justify-between items-center mb-3">

                                    <h4 className="font-bold">
                                        گزینه‌ها
                                    </h4>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            addOption(field.id)
                                        }
                                        className="text-[#09967C] text-sm font-bold"
                                    >
                                        + افزودن گزینه
                                    </button>

                                </div>

                                <div className="space-y-2">

                                    {(field.options || []).map(
                                        (option, optionIndex) => (
                                            <div
                                                key={`${field.id}-${optionIndex}`}
                                                className="flex gap-2"
                                            >
                                                <input
                                                    value={
                                                        option.label
                                                    }
                                                    onChange={(e) =>
                                                        updateOption(
                                                            field.id,
                                                            optionIndex,
                                                            {
                                                                label:
                                                                    e.target
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
                                                    onChange={(e) =>
                                                        updateOption(
                                                            field.id,
                                                            optionIndex,
                                                            {
                                                                value:
                                                                    e.target
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

                </div>
            ))}
        </div>
    );
}