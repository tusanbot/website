"use client";

import { useEffect, useMemo, useState } from "react";

export type FieldType =
    | "text" | "textarea" | "number" | "phone" | "email" | "date"
    | "select" | "multiselect" | "boolean" | "checkbox" | "password" | "national_code";
export type FormOption = { label: string; value: string };
export type ConditionOperator = "equals" | "not_equals" | "contains" | "not_contains" | "is_true" | "is_false";
export type FieldCondition = { field: string; operator: ConditionOperator; value?: string | boolean };
export type FormField = { id: string; type: FieldType; label: string; name: string; placeholder?: string; description?: string; required: boolean; options?: FormOption[]; conditions?: FieldCondition[]; defaultValue?: string | number | boolean | string[] };
type Props = { value: FormField[]; onChange: (fields: FormField[]) => void };

const fieldTypes: { value: FieldType; label: string }[] = [
    { value: "text", label: "متن کوتاه" }, { value: "textarea", label: "متن بلند" }, { value: "number", label: "عدد" },
    { value: "phone", label: "شماره موبایل" }, { value: "national_code", label: "کد ملی" }, { value: "email", label: "ایمیل" },
    { value: "password", label: "رمز عبور" }, { value: "date", label: "تاریخ" }, { value: "select", label: "انتخابی" },
    { value: "multiselect", label: "چندانتخابی" }, { value: "boolean", label: "بله / خیر" }, { value: "checkbox", label: "تیک تأیید" },
];
const operators: { value: ConditionOperator; label: string }[] = [
    { value: "equals", label: "برابر باشد با" }, { value: "not_equals", label: "برابر نباشد با" }, { value: "contains", label: "شامل باشد" },
    { value: "not_contains", label: "شامل نباشد" }, { value: "is_true", label: "فعال / بله باشد" }, { value: "is_false", label: "غیرفعال / خیر باشد" },
];
function id() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function cleanName(value: string) { return value.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_"); }
function uniqueName(raw: string, fields: FormField[], currentId: string) { const base = cleanName(raw) || `field_${Date.now()}`; if (!fields.some(f => f.id !== currentId && f.name === base)) return base; let i = 2; while (fields.some(f => f.id !== currentId && f.name === `${base}_${i}`)) i++; return `${base}_${i}`; }
function uniqueOptionValue(raw: string, options: FormOption[], index: number) { const base = cleanName(raw) || `option_${index + 1}`; if (!options.some((o, i) => i !== index && o.value === base)) return base; let n = 2; while (options.some((o, i) => i !== index && o.value === `${base}_${n}`)) n++; return `${base}_${n}`; }
function defaultOptions(): FormOption[] { return [{ label: "گزینه اول", value: "option_1" }]; }
function newField(): FormField { return { id: id(), type: "text", label: "فیلد جدید", name: `field_${Date.now()}`, placeholder: "", description: "", required: false }; }

export default function ServiceFormBuilder({ value, onChange }: Props) {
    const [fields, setFields] = useState<FormField[]>(value || []);
    const [validationError, setValidationError] = useState("");
    const [openFields, setOpenFields] = useState<Set<string>>(new Set());
    useEffect(() => { const next = value || []; setFields(next); setOpenFields(current => new Set([...current].filter(fieldId => next.some(field => field.id === fieldId)))); }, [value]);
    function commit(next: FormField[]) {
        const names = new Set<string>();
        for (const field of next) {
            if (!field.name.trim()) { setValidationError(`نام فنی فیلد «${field.label || "بدون عنوان"}» الزامی است.`); return; }
            if (names.has(field.name)) { setValidationError(`نام فنی فیلد «${field.name}» تکراری است.`); return; }
            names.add(field.name);
            if ((field.type === "select" || field.type === "multiselect") && field.options) { const values = new Set<string>(); for (const option of field.options) { if (!option.value.trim()) { setValidationError(`مقدار فنی یکی از گزینه‌های «${field.label}» خالی است.`); return; } if (values.has(option.value)) { setValidationError(`مقدار فنی گزینه‌های «${field.label}» تکراری است.`); return; } values.add(option.value); } }
        }
        setValidationError(""); setFields(next); onChange(next);
    }
    function updateField(fieldId: string, changes: Partial<FormField>) { commit(fields.map(f => f.id === fieldId ? { ...f, ...changes } : f)); }
    function toggleField(fieldId: string) { setOpenFields(current => { const next = new Set(current); next.has(fieldId) ? next.delete(fieldId) : next.add(fieldId); return next; }); }
    function closeField(fieldId: string) { setOpenFields(current => { const next = new Set(current); next.delete(fieldId); return next; }); }
    function removeField(fieldId: string) { if (!confirm("آیا از حذف این فیلد مطمئن هستید؟")) return; const removed = fields.find(f => f.id === fieldId); commit(fields.filter(f => f.id !== fieldId).map(f => ({ ...f, conditions: f.conditions?.filter(c => c.field !== removed?.name) }))); closeField(fieldId); }
    function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= fields.length) return; const next = [...fields]; [next[index], next[target]] = [next[target], next[index]]; commit(next); }
    function addField() { const field = newField(); commit([...fields, field]); setOpenFields(current => new Set(current).add(field.id)); }
    function addOption(fieldId: string) { const field = fields.find(f => f.id === fieldId); if (!field) return; const options = [...(field.options || []), { label: `گزینه ${(field.options?.length || 0) + 1}`, value: uniqueOptionValue(`option_${(field.options?.length || 0) + 1}`, field.options || [], field.options?.length || 0) }]; updateField(fieldId, { options }); }
    function updateOption(fieldId: string, index: number, changes: Partial<FormOption>) { const field = fields.find(f => f.id === fieldId); if (!field) return; const options = [...(field.options || [])]; options[index] = { ...options[index], ...changes }; updateField(fieldId, { options }); }
    function removeOption(fieldId: string, index: number) { const field = fields.find(f => f.id === fieldId); if (!field) return; const options = [...(field.options || [])]; options.splice(index, 1); updateField(fieldId, { options }); }
    function addCondition(fieldId: string) { const index = fields.findIndex(f => f.id === fieldId); if (index <= 0) return; const parent = fields[index - 1]; const boolean = parent.type === "boolean" || parent.type === "checkbox"; const condition: FieldCondition = { field: parent.name, operator: boolean ? "is_true" : "equals", value: boolean ? true : parent.options?.[0]?.value || "" }; updateField(fieldId, { conditions: [...(fields[index].conditions || []), condition] }); }
    function updateCondition(fieldId: string, index: number, changes: Partial<FieldCondition>) { const field = fields.find(f => f.id === fieldId); if (!field) return; const conditions = [...(field.conditions || [])]; conditions[index] = { ...conditions[index], ...changes }; updateField(fieldId, { conditions }); }
    function removeCondition(fieldId: string, index: number) { const field = fields.find(f => f.id === fieldId); if (!field) return; const conditions = [...(field.conditions || [])]; conditions.splice(index, 1); updateField(fieldId, { conditions: conditions.length ? conditions : undefined }); }
    const names = useMemo(() => new Set(fields.map(f => f.name)), [fields]);

    return <div dir="rtl" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><h3 className="text-lg font-bold">فرم اطلاعات مشتری</h3><p className="text-sm text-gray-500 mt-1">فیلدهای موردنیاز مشتری را تعریف و مدیریت کنید.</p></div><button type="button" onClick={addField} className="bg-[#09967C] text-white px-4 py-2 rounded-xl">+ افزودن فیلد</button></div>
        {validationError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{validationError}</div>}
        {!fields.length && <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">هنوز هیچ فیلدی برای این فرم ایجاد نشده است.</div>}
        {fields.map((field, index) => {
            const parents = fields.slice(0, index).filter(f => f.name && f.name !== field.name); const isOpen = openFields.has(field.id);
            return <div key={field.id} className={`border rounded-2xl overflow-hidden transition-all ${isOpen ? "border-[#09967C]/30 bg-gray-50" : "border-gray-200 bg-white"}`}>
                <div className="flex flex-wrap items-center gap-2 p-4">
                    <button type="button" onClick={() => toggleField(field.id)} className="flex-1 min-w-[220px] text-right"><div className="flex items-center gap-3"><span className="bg-gray-100 border rounded-lg px-3 py-1 text-sm">فیلد {index + 1}</span><strong>{field.label || "بدون عنوان"}</strong><span className="text-xs text-gray-500">{fieldTypes.find(t => t.value === field.type)?.label || field.type}</span>{field.required && <span className="text-xs text-[#09967C]">اجباری</span>}</div></button>
                    <button type="button" disabled={!index} onClick={() => move(index, -1)} className="bg-white border rounded-lg px-3 py-1 disabled:opacity-30" title="انتقال به بالا">↑</button><button type="button" disabled={index === fields.length - 1} onClick={() => move(index, 1)} className="bg-white border rounded-lg px-3 py-1 disabled:opacity-30" title="انتقال به پایین">↓</button><button type="button" onClick={() => toggleField(field.id)} className="rounded-lg border border-[#09967C]/30 px-3 py-1 text-sm text-[#09967C]">{isOpen ? "بستن" : "ویرایش"}</button><button type="button" onClick={() => removeField(field.id)} className="rounded-lg px-3 py-1 text-sm text-red-600">حذف</button>
                </div>
                {isOpen && <div className="border-t border-gray-200 p-5 space-y-4 bg-gray-50">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold mb-2">نوع فیلد</label><select value={field.type} onChange={e => { const type = e.target.value as FieldType; updateField(field.id, { type, options: type === "select" || type === "multiselect" ? (field.options?.length ? field.options : defaultOptions()) : undefined }); }} className="w-full border rounded-xl px-4 py-3 bg-white">{fieldTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                        <div><label className="block text-sm font-bold mb-2">عنوان فیلد</label><input value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} className="w-full border rounded-xl px-4 py-3 bg-white" /></div>
                        <div><label className="block text-sm font-bold mb-2">نام فنی</label><input value={field.name} onChange={e => updateField(field.id, { name: uniqueName(e.target.value, fields, field.id) })} className="w-full border rounded-xl px-4 py-3 bg-white" dir="ltr" /><p className="text-xs text-gray-500 mt-1">نام فنی باید یکتا باشد.</p></div>
                        {!['boolean','checkbox'].includes(field.type) && <div><label className="block text-sm font-bold mb-2">متن راهنما / Placeholder</label><input value={field.placeholder || ""} onChange={e => updateField(field.id, { placeholder: e.target.value })} className="w-full border rounded-xl px-4 py-3 bg-white" /></div>}
                    </div>
                    <div><label className="block text-sm font-bold mb-2">توضیحات فیلد</label><input value={field.description || ""} onChange={e => updateField(field.id, { description: e.target.value })} className="w-full border rounded-xl px-4 py-3 bg-white" /></div>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="accent-[#09967C]" /><span className="text-sm">این فیلد اجباری است</span></label>
                    {(field.type === "select" || field.type === "multiselect") && <div className="border-t pt-4"><div className="flex justify-between items-center mb-3"><h4 className="font-bold">گزینه‌ها</h4><button type="button" onClick={() => addOption(field.id)} className="text-[#09967C] text-sm font-bold">+ افزودن گزینه</button></div><div className="space-y-2">{(field.options || []).map((option, oi) => <div key={`${field.id}-${oi}`} className="flex flex-col md:flex-row gap-2"><input value={option.label} onChange={e => updateOption(field.id, oi, { label: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 bg-white" placeholder="عنوان گزینه" /><input value={option.value} onChange={e => updateOption(field.id, oi, { value: uniqueOptionValue(e.target.value, field.options || [], oi) })} className="flex-1 border rounded-lg px-3 py-2 bg-white" placeholder="مقدار فنی" dir="ltr" /><button type="button" onClick={() => removeOption(field.id, oi)} className="text-red-500 px-2">حذف</button></div>)}</div></div>}
                    {parents.length > 0 && <div className="border-t pt-4"><div className="flex items-center justify-between mb-3"><div><h4 className="font-bold text-[#09967C]">نمایش شرطی</h4><p className="text-xs text-gray-500">تمام شرط‌های این فیلد باید برقرار باشند.</p></div><button type="button" onClick={() => addCondition(field.id)} className="text-[#09967C] text-sm font-bold border border-[#09967C]/30 rounded-lg px-3 py-2">+ افزودن شرط</button></div>{(field.conditions || []).map((condition, ci) => { const parent = fields.find(f => f.name === condition.field); const boolean = parent?.type === "boolean" || parent?.type === "checkbox"; const opts = parent?.options || []; return <div key={`${field.id}-condition-${ci}`} className="bg-white border border-[#09967C]/20 rounded-xl p-4 mb-3"><div className="grid md:grid-cols-3 gap-3"><div><label className="block text-xs font-bold mb-2">فیلد مرجع</label><select value={condition.field} onChange={e => { const p = fields.find(f => f.name === e.target.value); const b = p?.type === "boolean" || p?.type === "checkbox"; updateCondition(field.id, ci, { field: e.target.value, operator: b ? "is_true" : "equals", value: b ? true : p?.options?.[0]?.value || "" }); }} className="w-full border rounded-lg px-3 py-2 bg-white">{parents.map(p => <option key={p.id} value={p.name}>{p.label}</option>)}</select></div><div><label className="block text-xs font-bold mb-2">شرط</label><select value={condition.operator} onChange={e => updateCondition(field.id, ci, { operator: e.target.value as ConditionOperator })} className="w-full border rounded-lg px-3 py-2 bg-white">{operators.filter(o => boolean ? ['is_true','is_false'].includes(o.value) : !['is_true','is_false'].includes(o.value)).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>{!['is_true','is_false'].includes(condition.operator) && <div><label className="block text-xs font-bold mb-2">مقدار</label>{opts.length ? <select value={String(condition.value ?? "")} onChange={e => updateCondition(field.id, ci, { value: e.target.value })} className="w-full border rounded-lg px-3 py-2 bg-white"><option value="">انتخاب کنید...</option>{opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input value={String(condition.value ?? "")} onChange={e => updateCondition(field.id, ci, { value: e.target.value })} className="w-full border rounded-lg px-3 py-2 bg-white" placeholder="مقدار موردنظر" />}</div>}</div><button type="button" onClick={() => removeCondition(field.id, ci)} className="text-red-500 text-xs mt-3">حذف این شرط</button></div>})}{!(field.conditions?.length) && <div className="text-xs text-gray-400 bg-white rounded-lg p-3">این فیلد بدون شرط نمایش داده می‌شود.</div>}</div>}
                    <div className="flex justify-end"><button type="button" onClick={() => closeField(field.id)} className="rounded-xl bg-[#09967C] text-white px-4 py-2">ذخیره فیلد و بستن</button></div>
                </div>}
            </div>;
        })}
    </div>;
}
