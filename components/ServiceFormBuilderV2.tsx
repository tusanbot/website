"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConditionOperator, FieldCondition, FieldValidationRules, FormField, FormOption, FieldType } from "@/types/forms";

export type { ConditionOperator, FieldCondition, FieldValidationRules, FormField, FormOption, FieldType } from "@/types/forms";

type Props = { value: FormField[]; onChange: (fields: FormField[]) => void; nested?: boolean };

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: "text", label: "متن کوتاه" }, { value: "textarea", label: "متن بلند" }, { value: "number", label: "عدد" },
  { value: "phone", label: "شماره موبایل" }, { value: "national_code", label: "کد ملی" }, { value: "email", label: "ایمیل" },
  { value: "password", label: "رمز عبور" }, { value: "date", label: "تاریخ" }, { value: "select", label: "انتخابی" },
  { value: "multiselect", label: "چندانتخابی" }, { value: "boolean", label: "بله / خیر" }, { value: "checkbox", label: "تیک تأیید" },
  { value: "repeatable", label: "گروه تکرارشونده" },
];
const operators: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "برابر باشد با" }, { value: "not_equals", label: "برابر نباشد با" }, { value: "contains", label: "شامل باشد" },
  { value: "not_contains", label: "شامل نباشد" }, { value: "is_true", label: "بله باشد" }, { value: "is_false", label: "خیر باشد" },
  { value: "gt", label: "بزرگ‌تر باشد" }, { value: "gte", label: "بزرگ‌تر یا مساوی باشد" }, { value: "lt", label: "کوچک‌تر باشد" }, { value: "lte", label: "کوچک‌تر یا مساوی باشد" },
];
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const cleanName = (v: string) => v.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
const uniqueName = (raw: string, fields: FormField[], currentId: string) => { const base = cleanName(raw) || `field_${Date.now()}`; if (!fields.some(f => f.id !== currentId && f.name === base)) return base; let i = 2; while (fields.some(f => f.id !== currentId && f.name === `${base}_${i}`)) i++; return `${base}_${i}`; };
const uniqueOptionValue = (raw: string, options: FormOption[], index: number) => { const base = cleanName(raw) || `option_${index + 1}`; if (!options.some((o, i) => i !== index && o.value === base)) return base; let i = 2; while (options.some((o, n) => n !== index && o.value === `${base}_${i}`)) i++; return `${base}_${i}`; };
const newField = (): FormField => ({ id: makeId(), type: "text", label: "فیلد جدید", name: `field_${Date.now()}`, required: false });
const newNestedField = (): FormField => ({ id: makeId(), type: "text", label: "فیلد جدید", name: `item_${Date.now()}`, required: false });

function validateFields(fields: FormField[], nested = false): string | null {
  const names = new Set<string>();
  for (const field of fields) {
    if (!field.name.trim()) return `نام فنی فیلد «${field.label || "بدون عنوان"}» الزامی است.`;
    if (names.has(field.name)) return `نام فنی «${field.name}» تکراری است.`;
    names.add(field.name);
    if ((field.type === "select" || field.type === "multiselect")) {
      const values = new Set<string>();
      for (const option of field.options || []) { if (!option.value.trim()) return `مقدار فنی گزینه‌های «${field.label}» خالی است.`; if (values.has(option.value)) return `مقدار فنی گزینه‌های «${field.label}» تکراری است.`; values.add(option.value); }
    }
    if (field.type === "repeatable") {
      if (!(field.fields || []).length) return `گروه «${field.label}» حداقل یک فیلد داخلی نیاز دارد.`;
      const nestedError = validateFields(field.fields || [], true); if (nestedError) return nestedError;
      if (field.minItems != null && field.maxItems != null && field.minItems > field.maxItems) return `حداقل تعداد گروه «${field.label}» نمی‌تواند بیشتر از حداکثر باشد.`;
    }
    if (field.validation?.minLength != null && field.validation?.maxLength != null && field.validation.minLength > field.validation.maxLength) return `حداقل طول فیلد «${field.label}» نمی‌تواند بیشتر از حداکثر باشد.`;
    if (field.validation?.min != null && field.validation?.max != null && field.validation.min > field.validation.max) return `حداقل مقدار فیلد «${field.label}» نمی‌تواند بیشتر از حداکثر باشد.`;
    if (field.conditions?.length) {
      const validParentIds = new Set(fields.filter(f => f.id !== field.id).map(f => f.id));
      for (const condition of field.conditions) {
        if (condition.fieldId && !validParentIds.has(condition.fieldId)) return `شرط نمایش فیلد «${field.label}» به فیلد نامعتبر وابسته است.`;
      }
      if (field.conditions.length > 1 && field.conditionLogic !== "AND" && field.conditionLogic !== "OR") return `منطق شرط‌های فیلد «${field.label}» مشخص نشده است.`;
    }
  }
  return null;
}

const getConditionOperators = (parent?: FormField) => {
  if (!parent) return operators;
  if (parent.type === "boolean" || parent.type === "checkbox") return operators.filter(o => o.value === "is_true" || o.value === "is_false");
  if (parent.type === "number") return operators.filter(o => ["equals", "not_equals", "gt", "gte", "lt", "lte"].includes(o.value));
  if (parent.type === "select" || parent.type === "multiselect") return operators.filter(o => ["equals", "not_equals", "contains", "not_contains"].includes(o.value));
  return operators.filter(o => ["equals", "not_equals", "contains", "not_contains"].includes(o.value));
};

function FieldEditor({ field, allFields, onChange, nested = false }: { field: FormField; allFields: FormField[]; onChange: (field: FormField) => void; nested?: boolean }) {
  const update = (changes: Partial<FormField>) => onChange({ ...field, ...changes });
  const isChoice = field.type === "select" || field.type === "multiselect";
  const addOption = () => update({ options: [...(field.options || []), { label: `گزینه ${(field.options?.length || 0) + 1}`, value: uniqueOptionValue(`option_${(field.options?.length || 0) + 1}`, field.options || [], field.options?.length || 0) }] });
  const updateOption = (i: number, changes: Partial<FormOption>) => { const options = [...(field.options || [])]; options[i] = { ...options[i], ...changes }; update({ options }); };
  const removeOption = (i: number) => update({ options: (field.options || []).filter((_, n) => n !== i) });
  const addCondition = () => { const parents = allFields.filter(f => f.id !== field.id && f.name); const parent = parents[parents.length - 1]; if (!parent) return; const bool = parent.type === "boolean" || parent.type === "checkbox"; const choice = parent.type === "select" || parent.type === "multiselect"; update({ conditions: [...(field.conditions || []), { field: parent.name, fieldId: parent.id, operator: bool ? "is_true" : "equals", value: bool ? true : parent.options?.[0]?.value || "" }], conditionLogic: (field.conditions?.length || 0) > 0 ? (field.conditionLogic || "AND") : undefined }); };
  const updateCondition = (i: number, changes: Partial<FieldCondition>) => { const conditions = [...(field.conditions || [])]; conditions[i] = { ...conditions[i], ...changes }; update({ conditions }); };
  const removeCondition = (i: number) => { const conditions = (field.conditions || []).filter((_, n) => n !== i); update({ conditions: conditions.length ? conditions : undefined, conditionLogic: conditions.length > 1 ? (field.conditionLogic || "AND") : undefined }); };
  const updateRule = (changes: Partial<FieldValidationRules>) => { const validation = { ...(field.validation || {}), ...changes }; Object.keys(validation).forEach(key => { const k = key as keyof FieldValidationRules; if (validation[k] === undefined || validation[k] === null || validation[k] === "") delete validation[k]; }); update({ validation: Object.keys(validation).length ? validation : undefined }); };
  return <div className="space-y-4">
    <div className="grid md:grid-cols-2 gap-4">
      <div><label className="block text-sm font-bold mb-2">نوع فیلد</label><select value={field.type} onChange={e => { const type = e.target.value as FieldType; update({ type, options: type === "select" || type === "multiselect" ? (field.options?.length ? field.options : [{ label: "گزینه اول", value: "option_1" }]) : undefined, fields: type === "repeatable" ? (field.fields?.length ? field.fields : [newNestedField()]) : undefined }); }} className="w-full border rounded-xl px-4 py-3 bg-white">{fieldTypes.filter(t => !nested || t.value !== "repeatable").map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
      <div><label className="block text-sm font-bold mb-2">عنوان فیلد</label><input value={field.label} onChange={e => update({ label: e.target.value })} className="w-full border rounded-xl px-4 py-3 bg-white" /></div>
      <div><label className="block text-sm font-bold mb-2">نام فنی</label><input value={field.name} onChange={e => update({ name: uniqueName(e.target.value, allFields, field.id) })} dir="ltr" className="w-full border rounded-xl px-4 py-3 bg-white" /></div>
      {!['boolean', 'checkbox'].includes(field.type) && <div><label className="block text-sm font-bold mb-2">Placeholder</label><input value={field.placeholder || ""} onChange={e => update({ placeholder: e.target.value })} className="w-full border rounded-xl px-4 py-3 bg-white" /></div>}
    </div>
    <div><label className="block text-sm font-bold mb-2">توضیحات</label><input value={field.description || ""} onChange={e => update({ description: e.target.value })} className="w-full border rounded-xl px-4 py-3 bg-white" /></div>
    <label className="flex items-center gap-2"><input type="checkbox" checked={field.required} onChange={e => update({ required: e.target.checked })} className="accent-[#09967C]" /><span className="text-sm">این فیلد اجباری است</span></label>
    {isChoice && <div className="border-t pt-4"><div className="flex justify-between items-center mb-3"><h4 className="font-bold">گزینه‌ها</h4><button type="button" onClick={addOption} className="text-[#09967C] font-bold text-sm">+ افزودن گزینه</button></div>{(field.options || []).map((o, i) => <div key={`${field.id}-${i}`} className="flex flex-col md:flex-row gap-2 mb-2"><input value={o.label} onChange={e => updateOption(i, { label: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 bg-white" placeholder="عنوان گزینه" /><input value={o.value} onChange={e => updateOption(i, { value: uniqueOptionValue(e.target.value, field.options || [], i) })} className="flex-1 border rounded-lg px-3 py-2 bg-white" dir="ltr" placeholder="مقدار فنی" /><button type="button" onClick={() => removeOption(i)} className="text-red-500 px-2">حذف</button></div>)}</div>}
    {field.type === "repeatable" && <div className="border-2 border-dashed border-[#09967C]/30 rounded-2xl p-4 space-y-3"><div className="flex items-center justify-between"><div><b>فیلدهای داخل گروه تکرارشونده</b><p className="text-xs text-gray-500 mt-1">برای وراث، شرکا، اموال یا حساب‌های بانکی.</p></div><button type="button" onClick={() => update({ fields: [...(field.fields || []), newNestedField()] })} className="text-[#09967C] font-bold text-sm">+ افزودن فیلد</button></div>{(field.fields || []).map(child => <div key={child.id} className="rounded-xl border bg-white p-3"><FieldEditor field={child} allFields={field.fields || []} nested onChange={next => update({ fields: (field.fields || []).map(x => x.id === child.id ? next : x) })}/><button type="button" onClick={() => update({ fields: (field.fields || []).filter(x => x.id !== child.id) })} className="text-red-600 text-xs mt-2">حذف این فیلد</button></div>)}<div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold mb-1">حداقل تعداد</label><input type="number" min="0" value={field.minItems ?? ""} onChange={e => update({ minItems: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white" /></div><div><label className="block text-xs font-bold mb-1">حداکثر تعداد</label><input type="number" min="1" value={field.maxItems ?? ""} onChange={e => update({ maxItems: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white" /></div></div></div>}
    {!nested && allFields.length > 1 && <div className="border-t pt-4"><div className="flex items-center justify-between mb-3"><div><h4 className="font-bold text-[#09967C]">نمایش شرطی</h4><p className="text-xs text-gray-500">این فیلد می‌تواند بر اساس فیلدهای قبلی نمایش داده شود.</p></div><div className="flex items-center gap-2">{(field.conditions?.length || 0) > 1 && <select value={field.conditionLogic || "AND"} onChange={e => update({ conditionLogic: e.target.value as "AND" | "OR" })} className="border rounded-lg px-3 py-2 bg-white text-sm"><option value="AND">همه شرط‌ها (AND)</option><option value="OR">حداقل یکی (OR)</option></select>}<button type="button" onClick={addCondition} className="text-[#09967C] text-sm font-bold">+ افزودن شرط</button></div></div>{(field.conditions || []).map((c, i) => { const parent = allFields.find(f => f.id === c.fieldId || f.name === c.field); const conditionOperators = getConditionOperators(parent); const booleanParent = parent?.type === "boolean" || parent?.type === "checkbox"; const choiceParent = parent?.type === "select" || parent?.type === "multiselect"; const numericParent = parent?.type === "number"; const currentOperator = conditionOperators.some(o => o.value === c.operator) ? c.operator : conditionOperators[0]?.value || "equals"; return <div key={`${field.id}-condition-${i}`} className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2"><select value={c.fieldId || c.field} onChange={e => { const p = allFields.find(x => x.id === e.target.value); const bool = p?.type === "boolean" || p?.type === "checkbox"; updateCondition(i, { fieldId: p?.id, field: p?.name || e.target.value, operator: bool ? "is_true" : "equals", value: bool ? true : p?.options?.[0]?.value || "" }); }} className="border rounded-lg px-3 py-2 bg-white">{allFields.filter(f => f.id !== field.id).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select><select value={currentOperator} onChange={e => { const op = e.target.value as ConditionOperator; updateCondition(i, { operator: op, value: op === "is_true" ? true : op === "is_false" ? false : c.value }); }} className="border rounded-lg px-3 py-2 bg-white">{conditionOperators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{booleanParent || currentOperator === "is_true" || currentOperator === "is_false" ? <select value={String(c.value === true || currentOperator === "is_true")} onChange={e => updateCondition(i, { value: e.target.value === "true" })} className="border rounded-lg px-3 py-2 bg-white"><option value="true">بله</option><option value="false">خیر</option></select> : choiceParent ? <select value={String(c.value ?? "")} onChange={e => updateCondition(i, { value: e.target.value })} className="border rounded-lg px-3 py-2 bg-white">{(parent?.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input type={numericParent ? "number" : "text"} value={String(c.value ?? "")} onChange={e => updateCondition(i, { value: numericParent ? Number(e.target.value) : e.target.value })} className="border rounded-lg px-3 py-2 bg-white" dir={numericParent ? "ltr" : undefined} placeholder="مقدار شرط" />}{<button type="button" onClick={() => removeCondition(i)} className="text-red-500">حذف</button>}</div>; })}</div>}
    <div className="border-t pt-4"><h4 className="font-bold text-blue-700 mb-3">قوانین اعتبارسنجی</h4><div className="grid md:grid-cols-2 gap-3"><div><label className="block text-xs font-bold mb-1">حداقل طول</label><input type="number" min="0" value={field.validation?.minLength ?? ""} onChange={e => updateRule({ minLength: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white" /></div><div><label className="block text-xs font-bold mb-1">حداکثر طول</label><input type="number" min="0" value={field.validation?.maxLength ?? ""} onChange={e => updateRule({ maxLength: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white" /></div><div><label className="block text-xs font-bold mb-1">حداقل مقدار</label><input type="number" value={field.validation?.min ?? ""} onChange={e => updateRule({ min: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white" /></div><div><label className="block text-xs font-bold mb-1">حداکثر مقدار</label><input type="number" value={field.validation?.max ?? ""} onChange={e => updateRule({ max: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white" /></div></div><div className="mt-3"><label className="block text-xs font-bold mb-1">Pattern / Regex</label><input value={field.validation?.pattern ?? ""} onChange={e => updateRule({ pattern: e.target.value || undefined })} className="w-full border rounded-lg px-3 py-2 bg-white" dir="ltr" /></div></div>
  </div>;
}

export default function ServiceFormBuilderV2({ value, onChange, nested = false }: Props) {
  const [fields, setFields] = useState<FormField[]>(value || []);
  const [openFields, setOpenFields] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  useEffect(() => setFields(value || []), [value]);
  const names = useMemo(() => new Set(fields.map(f => f.name)), [fields]);
  const commit = (next: FormField[]) => { const validationError = validateFields(next, nested); if (validationError) { setError(validationError); return; } setError(""); setFields(next); onChange(next); };
  const update = (fieldId: string, changes: Partial<FormField>) => commit(fields.map(f => f.id === fieldId ? { ...f, ...changes } : f));
  const addField = () => { const f = newField(); commit([...fields, f]); setOpenFields(s => new Set(s).add(f.id)); };
  const remove = (id: string) => { if (!confirm("آیا از حذف این فیلد مطمئن هستید؟")) return; const removed = fields.find(f => f.id === id); commit(fields.filter(f => f.id !== id).map(f => ({ ...f, conditions: f.conditions?.filter(c => c.field !== removed?.name) }))); setOpenFields(s => { const n = new Set(s); n.delete(id); return n; }); };
  const move = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= fields.length) return; const next = [...fields]; [next[index], next[target]] = [next[target], next[index]]; commit(next); };
  return <div dir="rtl" className="space-y-4">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h3 className="text-lg font-bold">فرم اطلاعات مشتری</h3><p className="text-sm text-gray-500 mt-1">فیلدها، شرط نمایش، گروه‌های تکرارشونده و قوانین اعتبارسنجی.</p></div>{!nested && <button type="button" onClick={addField} className="bg-[#09967C] text-white px-4 py-2 rounded-xl">+ افزودن فیلد</button>}</div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {!fields.length && <div className="border border-dashed rounded-xl p-8 text-center text-gray-500">هنوز فیلدی ایجاد نشده است.</div>}
    {fields.map((field, index) => { const open = openFields.has(field.id); const parents = fields.slice(0, index); return <div key={field.id} className={`border rounded-2xl overflow-hidden ${open ? "border-[#09967C]/30 bg-gray-50" : "border-gray-200 bg-white"}`}>
      <div className="flex flex-wrap items-center gap-2 p-4"><button type="button" onClick={() => setOpenFields(s => { const n = new Set(s); n.has(field.id) ? n.delete(field.id) : n.add(field.id); return n; })} className="flex-1 min-w-[220px] text-right"><div className="flex items-center gap-3"><span className="bg-gray-100 border rounded-lg px-3 py-1 text-sm">فیلد {index + 1}</span><strong>{field.label || "بدون عنوان"}</strong><span className="text-xs text-gray-500">{fieldTypes.find(t => t.value === field.type)?.label || field.type}</span>{field.required && <span className="text-xs text-[#09967C]">اجباری</span>}{field.type === "repeatable" && <span className="text-xs text-purple-600">تکرارشونده</span>}{field.validation && <span className="text-xs text-blue-600">اعتبارسنجی</span>}{field.conditions?.length ? <span className="text-xs text-amber-700">شرطی ({field.conditions.length})</span> : null}</div></button><button type="button" disabled={!index} onClick={() => move(index, -1)} className="bg-white border rounded-lg px-3 py-1 disabled:opacity-30">↑</button><button type="button" disabled={index === fields.length - 1} onClick={() => move(index, 1)} className="bg-white border rounded-lg px-3 py-1 disabled:opacity-30">↓</button><button type="button" onClick={() => setOpenFields(s => { const n = new Set(s); n.has(field.id) ? n.delete(field.id) : n.add(field.id); return n; })} className="rounded-lg border border-[#09967C]/30 px-3 py-1 text-sm text-[#09967C]">{open ? "بستن" : "ویرایش"}</button><button type="button" onClick={() => remove(field.id)} className="rounded-lg px-3 py-1 text-sm text-red-600">حذف</button></div>
      {open && <div className="border-t p-5 bg-gray-50"><FieldEditor field={field} allFields={parents} onChange={next => update(field.id, next)} nested={nested}/></div>}
    </div>; })}
    {names.size !== fields.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">نام فنی فیلدها باید یکتا باشند.</div>}
  </div>;
}
