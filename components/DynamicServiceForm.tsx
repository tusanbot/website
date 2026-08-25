"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConditionOperator, FieldCondition, FormField } from "@/types/forms";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

type Props = {
  fields: FormField[];
  onSubmit: (formData: Record<string, any>) => void;
  onChange?: (formData: Record<string, any>) => void;
  submitting?: boolean;
};

const emptyValue = (field: FormField): any => {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return null;
  if (field.type === "checkbox") return false;
  if (field.type === "multiselect" || field.type === "repeatable") return [];
  return "";
};
const normalize = (value: any) => (value == null ? "" : String(value).trim());

function evaluateCondition(condition: FieldCondition, data: Record<string, any>) {
  const actual = condition.field ? data[condition.field] : condition.fieldId ? data[condition.fieldId] : undefined;
  const expected = condition.value;
  const left = normalize(actual);
  const right = normalize(expected);
  switch (condition.operator as ConditionOperator) {
    case "equals": return Array.isArray(actual) ? actual.some((value) => normalize(value) === right) : left === right;
    case "not_equals": return Array.isArray(actual) ? !actual.some((value) => normalize(value) === right) : left !== right;
    case "contains": return Array.isArray(actual) ? actual.some((value) => normalize(value) === right) : left.toLowerCase().includes(right.toLowerCase());
    case "not_contains": return Array.isArray(actual) ? !actual.some((value) => normalize(value) === right) : !left.toLowerCase().includes(right.toLowerCase());
    case "is_true": return actual === true || left === "true";
    case "is_false": return actual === false || left === "false";
    case "gt": return Number(actual) > Number(expected);
    case "gte": return Number(actual) >= Number(expected);
    case "lt": return Number(actual) < Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    default: return false;
  }
}

function isVisible(field: FormField, data: Record<string, any>) {
  if (!field.conditions?.length) return true;
  const results = field.conditions.map((condition) => evaluateCondition(condition, data));
  return field.conditionLogic === "OR" ? results.some(Boolean) : results.every(Boolean);
}

function isEmpty(value: any) { return value == null || value === "" || (Array.isArray(value) && value.length === 0); }
function validateField(field: FormField, value: any): string | null {
  if (field.required && isEmpty(value)) return "تکمیل این فیلد الزامی است.";
  if (isEmpty(value)) return null;
  if (field.type === "repeatable") {
    if (!Array.isArray(value)) return "مقدار گروه نامعتبر است.";
    if (field.minItems !== undefined && value.length < field.minItems) return `حداقل ${field.minItems} مورد وارد کنید.`;
    if (field.maxItems !== undefined && value.length > field.maxItems) return `حداکثر ${field.maxItems} مورد مجاز است.`;
    for (const item of value) for (const child of field.fields || []) { if (!isVisible(child, item)) continue; const error = validateField(child, item[child.name]); if (error) return `${child.label}: ${error}`; }
  }
  if (field.type === "number" && !Number.isFinite(Number(value))) return "مقدار باید عددی باشد.";
  if (field.type === "email" && typeof value === "string" && !/^\S+@\S+\.\S+$/.test(value)) return "ایمیل معتبر نیست.";
  if (field.type === "phone" && typeof value === "string" && !/^(?:\+98|0098|0)?9\d{9}$/.test(value.replace(/[\s-]/g, ""))) return "شماره موبایل معتبر نیست.";
  if (field.type === "national_code" && typeof value === "string" && !/^\d{10}$/.test(value)) return "کد ملی باید ۱۰ رقم باشد.";
  const rules = field.validation;
  if (rules) {
    if (rules.minLength !== undefined && String(value).length < rules.minLength) return `حداقل ${rules.minLength} کاراکتر وارد کنید.`;
    if (rules.maxLength !== undefined && String(value).length > rules.maxLength) return `حداکثر ${rules.maxLength} کاراکتر مجاز است.`;
    if (field.type === "number" || typeof value === "number") { const number = Number(value); if (rules.min !== undefined && number < rules.min) return `مقدار باید حداقل ${rules.min} باشد.`; if (rules.max !== undefined && number > rules.max) return `مقدار باید حداکثر ${rules.max} باشد.`; }
    if (rules.pattern !== undefined) { try { if (!new RegExp(rules.pattern).test(String(value))) return "فرمت واردشده صحیح نیست."; } catch { return "قانون اعتبارسنجی فرم نامعتبر است."; } }
  }
  return null;
}

export default function DynamicServiceForm({ fields, onSubmit, onChange, submitting = false }: Props) {
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { const initial: Record<string, any> = {}; fields.forEach((field) => { initial[field.name] = emptyValue(field); }); setData(initial); setErrors({}); onChange?.(initial); }, [fields, onChange]);
  const visibleFields = useMemo(() => fields.filter((field) => isVisible(field, data)), [fields, data]);
  const setValue = (name: string, value: any) => { setData((previous) => { const next = { ...previous, [name]: value }; onChange?.(next); return next; }); const field = fields.find((item) => item.name === name); setErrors((previous) => ({ ...previous, [name]: field ? validateField(field, value) || "" : "" })); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); const nextErrors: Record<string, string> = {}; visibleFields.forEach((field) => { const error = validateField(field, data[field.name]); if (error) nextErrors[field.name] = error; }); setErrors(nextErrors); if (Object.keys(nextErrors).length > 0) return; const output: Record<string, any> = {}; visibleFields.forEach((field) => { output[field.name] = field.type === "number" && data[field.name] !== "" ? Number(data[field.name]) : data[field.name]; }); onSubmit(output); };
  const baseClass = "w-full border rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-[#09967C]";
  const renderField = (field: FormField, value: any, set: (next: any) => void, error?: string): React.ReactNode => {
    const common = { disabled: submitting };
    return <div key={field.id} className="space-y-2"><label className="block font-bold text-gray-800">{field.label}{field.required && <span className="text-red-500 mr-1">*</span>}</label>{field.description && <p className="text-sm text-gray-500 leading-6">{field.description}</p>}
      {field.type === "text" && <input {...common} value={value ?? ""} onChange={(e) => set(e.target.value)} placeholder={field.placeholder || ""} className={baseClass} />}
      {field.type === "password" && <input {...common} type="password" value={value ?? ""} onChange={(e) => set(e.target.value)} placeholder={field.placeholder || ""} className={baseClass} />}
      {field.type === "textarea" && <textarea {...common} value={value ?? ""} onChange={(e) => set(e.target.value)} rows={5} className={`${baseClass} resize-none`} />}
      {field.type === "number" && <input {...common} type="number" value={value ?? ""} onChange={(e) => set(e.target.value)} className={baseClass} />}
      {field.type === "phone" && <input {...common} type="tel" value={value ?? ""} onChange={(e) => set(e.target.value)} dir="ltr" className={`${baseClass} text-right`} />}
      {field.type === "national_code" && <input {...common} inputMode="numeric" maxLength={10} value={value ?? ""} onChange={(e) => set(e.target.value.replace(/\D/g, ""))} dir="ltr" className={`${baseClass} text-right`} />}
      {field.type === "email" && <input {...common} type="email" value={value ?? ""} onChange={(e) => set(e.target.value)} dir="ltr" className={`${baseClass} text-left`} />}
      {field.type === "date" && <DatePicker value={value || ""} onChange={(date) => set(date ? date.format("YYYY/MM/DD") : "")} calendar={persian} locale={persian_fa} format="YYYY/MM/DD" disabled={submitting} inputClass={`${baseClass} cursor-pointer`} containerClassName="w-full" />}
      {field.type === "select" && <select {...common} value={value ?? ""} onChange={(e) => set(e.target.value)} className={baseClass}><option value="">{field.placeholder || "انتخاب کنید"}</option>{(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
      {field.type === "multiselect" && <div className="space-y-2 border rounded-xl p-4 bg-white">{(field.options || []).map((option) => { const selected = Array.isArray(value) && value.includes(option.value); return <label key={option.value} className="flex items-center gap-3"><input type="checkbox" checked={selected} onChange={(event) => { const current = Array.isArray(value) ? value : []; set(event.target.checked ? [...current, option.value] : current.filter((item: string) => item !== option.value)); }} className="accent-[#09967C]" /><span>{option.label}</span></label>; })}</div>}
      {field.type === "boolean" && <div className="grid grid-cols-2 gap-3">{[[true, "بله"], [false, "خیر"]].map(([optionValue, label]) => <label key={String(optionValue)} className={`flex justify-center gap-2 border rounded-xl p-4 ${value === optionValue ? "border-[#09967C]" : "border-gray-200"}`}><input type="radio" checked={value === optionValue} onChange={() => set(optionValue)} className="accent-[#09967C]" /><span>{label as string}</span></label>)}</div>}
      {field.type === "checkbox" && <label className="flex items-center gap-3 border rounded-xl p-4"><input type="checkbox" checked={Boolean(value)} onChange={(e) => set(e.target.checked)} className="accent-[#09967C]" /><span>{field.placeholder || field.label}</span></label>}
      {field.type === "repeatable" && <div className="border-2 border-dashed border-[#09967C]/30 rounded-2xl p-4 space-y-4"><div className="flex justify-between"><b>موارد {field.label}</b><button type="button" disabled={submitting} onClick={() => set([...(Array.isArray(value) ? value : []), Object.fromEntries((field.fields || []).map((child) => [child.name, emptyValue(child)]))])} className="text-[#09967C] font-bold">+ افزودن مورد</button></div>{(Array.isArray(value) ? value : []).map((item: any, index: number) => <div key={index} className="rounded-xl border bg-gray-50 p-4 space-y-4"><div className="flex justify-between"><b>مورد {index + 1}</b><button type="button" disabled={submitting} onClick={() => set((value as any[]).filter((_, itemIndex) => itemIndex !== index))} className="text-red-600 text-sm">حذف</button></div>{(field.fields || []).filter((child) => isVisible(child, item)).map((child) => <div key={child.id}>{renderField(child, item[child.name], (next) => { const nextRows = (value as any[]).map((row, rowIndex) => rowIndex === index ? { ...row, [child.name]: next } : row); set(nextRows); })}</div>)}</div>)}</div>}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>;
  };
  return <form dir="rtl" onSubmit={submit} className="space-y-6">{visibleFields.map((field) => renderField(field, data[field.name], (value) => setValue(field.name, value), errors[field.name]))}<button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#09967C] text-white py-3 font-bold">{submitting ? "در حال ارسال..." : "ثبت اطلاعات"}</button></form>;
}
