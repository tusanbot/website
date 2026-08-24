"use client";

import { useEffect, useState } from "react";

export type FieldType = "text" | "textarea" | "number" | "phone" | "email" | "date" | "select" | "multiselect" | "boolean" | "checkbox" | "password" | "national_code" | "repeatable";
export type FormOption = { label: string; value: string };
export type ConditionOperator = "equals" | "not_equals" | "contains" | "not_contains" | "is_true" | "is_false";
export type FieldCondition = { fieldId?: string; field: string; operator: ConditionOperator; value?: string | boolean };
export type FormField = { id: string; type: FieldType; label: string; name: string; placeholder?: string; description?: string; required: boolean; options?: FormOption[]; conditions?: FieldCondition[]; defaultValue?: string | number | boolean | string[]; fields?: FormField[]; minItems?: number; maxItems?: number };

type Props = { value: FormField[]; onChange: (fields: FormField[]) => void; nested?: boolean };
const types: { value: FieldType; label: string }[] = [
  { value: "text", label: "متن کوتاه" }, { value: "textarea", label: "متن بلند" }, { value: "number", label: "عدد" },
  { value: "phone", label: "شماره موبایل" }, { value: "national_code", label: "کد ملی" }, { value: "email", label: "ایمیل" },
  { value: "date", label: "تاریخ" }, { value: "select", label: "انتخابی" }, { value: "multiselect", label: "چندانتخابی" },
  { value: "boolean", label: "بله / خیر" }, { value: "checkbox", label: "تیک تأیید" }, { value: "repeatable", label: "گروه تکرارشونده" },
];
const operators: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "برابر باشد با" }, { value: "not_equals", label: "برابر نباشد با" }, { value: "contains", label: "شامل باشد" }, { value: "not_contains", label: "شامل نباشد" }, { value: "is_true", label: "بله باشد" }, { value: "is_false", label: "خیر باشد" },
];
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const cleanName = (v: string) => v.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_") || `field_${Date.now()}`;
const newField = (): FormField => ({ id: makeId(), type: "text", label: "فیلد جدید", name: `field_${Date.now()}`, required: false });
const newNestedField = (): FormField => ({ id: makeId(), type: "text", label: "فیلد جدید", name: `item_${Date.now()}`, required: false });

function FieldEditor({ field, fields, onChange, nested = false }: { field: FormField; fields: FormField[]; onChange: (f: FormField) => void; nested?: boolean }) {
  const update = (changes: Partial<FormField>) => onChange({ ...field, ...changes });
  const addOption = () => update({ options: [...(field.options || []), { label: `گزینه ${(field.options?.length || 0) + 1}`, value: `option_${(field.options?.length || 0) + 1}` }] });
  const updateOption = (i: number, changes: Partial<FormOption>) => update({ options: (field.options || []).map((o, n) => n === i ? { ...o, ...changes } : o) });
  const addCondition = () => { const parent = fields.find(f => f.id !== field.id && f.name); if (!parent) return; const bool = parent.type === "boolean" || parent.type === "checkbox"; update({ conditions: [...(field.conditions || []), { field: parent.name, fieldId: parent.id, operator: bool ? "is_true" : "equals", value: bool ? true : parent.options?.[0]?.value || "" }] }); };
  const isChoice = field.type === "select" || field.type === "multiselect";
  return <div className="space-y-4">
    <div className="grid md:grid-cols-2 gap-3">
      <div><label className="block text-sm font-bold mb-1">نوع فیلد</label><select value={field.type} disabled={nested && field.type === "repeatable"} onChange={e => { const type = e.target.value as FieldType; update({ type, options: type === "select" || type === "multiselect" ? (field.options?.length ? field.options : [{ label: "گزینه اول", value: "option_1" }]) : undefined, fields: type === "repeatable" ? (field.fields?.length ? field.fields : [newNestedField()]) : undefined }); }} className="w-full border rounded-xl px-3 py-2.5 bg-white">{types.filter(t => !nested || t.value !== "repeatable").map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
      <div><label className="block text-sm font-bold mb-1">عنوان فیلد</label><input value={field.label} onChange={e => update({ label: e.target.value })} className="w-full border rounded-xl px-3 py-2.5 bg-white" /></div>
      <div><label className="block text-sm font-bold mb-1">نام فنی</label><input value={field.name} onChange={e => update({ name: cleanName(e.target.value) })} dir="ltr" className="w-full border rounded-xl px-3 py-2.5 bg-white" /></div>
      {field.type !== "boolean" && field.type !== "checkbox" && <div><label className="block text-sm font-bold mb-1">Placeholder</label><input value={field.placeholder || ""} onChange={e => update({ placeholder: e.target.value })} className="w-full border rounded-xl px-3 py-2.5 bg-white" /></div>}
    </div>
    <div><label className="block text-sm font-bold mb-1">توضیحات</label><input value={field.description || ""} onChange={e => update({ description: e.target.value })} className="w-full border rounded-xl px-3 py-2.5 bg-white" /></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={field.required} onChange={e => update({ required: e.target.checked })} className="accent-[#09967C]" /> این فیلد اجباری است</label>
    {isChoice && <div className="border-t pt-3"><div className="flex justify-between mb-2"><b>گزینه‌ها</b><button type="button" onClick={addOption} className="text-[#09967C] font-bold text-sm">+ گزینه</button></div>{(field.options || []).map((o, i) => <div key={i} className="flex gap-2 mb-2"><input value={o.label} onChange={e => updateOption(i, { label: e.target.value })} placeholder="عنوان" className="flex-1 border rounded-lg px-2 py-2 bg-white" /><input value={o.value} onChange={e => updateOption(i, { value: cleanName(e.target.value) })} placeholder="مقدار" dir="ltr" className="flex-1 border rounded-lg px-2 py-2 bg-white" /></div>)}</div>}
    {field.type === "repeatable" && <div className="border-2 border-dashed border-[#09967C]/30 rounded-2xl p-4 space-y-3"><div className="flex items-center justify-between"><div><b>فیلدهای داخل گروه تکرارشونده</b><p className="text-xs text-gray-500 mt-1">برای مواردی مثل وراث، شرکا، اموال یا حساب‌های بانکی.</p></div><button type="button" onClick={() => update({ fields: [...(field.fields || []), newNestedField()] })} className="text-[#09967C] font-bold text-sm">+ افزودن فیلد</button></div>{(field.fields || []).map((child, i) => <div key={child.id} className="rounded-xl border bg-white p-3"><FieldEditor field={child} fields={field.fields || []} nested onChange={next => update({ fields: (field.fields || []).map(x => x.id === child.id ? next : x) })} /><button type="button" onClick={() => update({ fields: (field.fields || []).filter(x => x.id !== child.id) })} className="text-red-600 text-xs mt-2">حذف این فیلد</button></div>)}<div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold mb-1">حداقل تعداد</label><input type="number" min="0" value={field.minItems ?? ""} onChange={e => update({ minItems: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white" /></div><div><label className="block text-xs font-bold mb-1">حداکثر تعداد</label><input type="number" min="1" value={field.maxItems ?? ""} onChange={e => update({ maxItems: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white" /></div></div></div>}
    {!nested && fields.length > 1 && field.type !== "repeatable" && <div className="border-t pt-3"><div className="flex justify-between mb-2"><div><b className="text-[#09967C]">نمایش شرطی</b><p className="text-xs text-gray-500">شرط‌های این فیلد بر اساس فیلدهای دیگر فرم.</p></div><button type="button" onClick={addCondition} className="text-[#09967C] text-sm font-bold">+ افزودن شرط</button></div>{(field.conditions || []).map((c, i) => <div key={i} className="grid md:grid-cols-3 gap-2 mb-2"><select value={c.field} onChange={e => update({ conditions: (field.conditions || []).map((x,n) => n===i ? {...x,field:e.target.value,fieldId:fields.find(f=>f.name===e.target.value)?.id} : x) })} className="border rounded-lg px-2 py-2 bg-white">{fields.filter(f=>f.id!==field.id).map(f => <option key={f.id} value={f.name}>{f.label}</option>)}</select><select value={c.operator} onChange={e => update({ conditions: (field.conditions || []).map((x,n) => n===i ? {...x,operator:e.target.value as ConditionOperator} : x) })} className="border rounded-lg px-2 py-2 bg-white">{operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><input value={String(c.value ?? "")} onChange={e => update({ conditions: (field.conditions || []).map((x,n) => n===i ? {...x,value:e.target.value} : x) })} className="border rounded-lg px-2 py-2 bg-white" /></div>)}</div>}
  </div>;
}

export default function ServiceFormBuilder({ value, onChange, nested = false }: Props) {
  const [fields, setFields] = useState<FormField[]>(value || []);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => setFields(value || []), [value]);
  const commit = (next: FormField[]) => { const names = new Set<string>(); for (const f of next) { if (!f.name.trim()) return setError(`نام فنی «${f.label || "بدون عنوان"}» الزامی است.`); if (names.has(f.name)) return setError(`نام فنی «${f.name}» تکراری است.`); names.add(f.name); if (f.type === "repeatable" && !(f.fields || []).length) return setError(`گروه «${f.label}» حداقل یک فیلد داخلی نیاز دارد.`); } setError(""); setFields(next); onChange(next); };
  const update = (id: string, f: FormField) => commit(fields.map(x => x.id === id ? f : x));
  return <div dir="rtl" className="space-y-3">
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="flex items-center justify-between"><div><h3 className="font-bold">فرم اطلاعات مشتری</h3><p className="text-xs text-gray-500 mt-1">فیلدهای عادی، شرطی و گروه‌های تکرارشونده را تعریف کنید.</p></div>{!nested && <button type="button" onClick={() => { const f=newField(); const next=[...fields,f]; commit(next); setOpen(f.id); }} className="bg-[#09967C] text-white px-4 py-2 rounded-xl">+ افزودن فیلد</button>}</div>
    {fields.map((f,i) => <div key={f.id} className="border rounded-2xl bg-white overflow-hidden"><div className="flex items-center gap-2 p-3"><button type="button" onClick={() => setOpen(open===f.id?null:f.id)} className="flex-1 text-right"><b>{i+1}. {f.label}</b><span className="text-xs text-gray-500 mr-2">{types.find(t=>t.value===f.type)?.label}</span></button><button type="button" onClick={() => commit(fields.filter(x=>x.id!==f.id))} className="text-red-600 text-sm">حذف</button></div>{open===f.id && <div className="border-t bg-gray-50 p-4"><FieldEditor field={f} fields={fields} onChange={next => update(f.id,next)} nested={nested} /></div>}</div>)}
  </div>;
}
