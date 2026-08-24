"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConditionOperator, FieldCondition, FormField } from "@/components/ServiceFormBuilder";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

type Props = { fields: FormField[]; onSubmit: (formData: Record<string, any>) => void; submitting?: boolean };
const emptyValue = (field: FormField): any => field.defaultValue !== undefined ? field.defaultValue : field.type === "boolean" ? null : field.type === "checkbox" ? false : field.type === "multiselect" ? [] : field.type === "repeatable" ? [] : "";
const norm = (v: any) => v === undefined || v === null ? "" : String(v).trim();
function evaluate(c: FieldCondition, data: Record<string, any>) { const actual=data[c.field]; const expected=c.value; switch(c.operator as ConditionOperator){case "equals": return Array.isArray(actual)?actual.some(v=>norm(v)===norm(expected)):norm(actual)===norm(expected);case "not_equals":return Array.isArray(actual)?!actual.some(v=>norm(v)===norm(expected)):norm(actual)!==norm(expected);case "contains":return Array.isArray(actual)?actual.some(v=>norm(v)===norm(expected)):norm(actual).toLowerCase().includes(norm(expected).toLowerCase());case "not_contains":return Array.isArray(actual)?!actual.some(v=>norm(v)===norm(expected)):!norm(actual).toLowerCase().includes(norm(expected).toLowerCase());case "is_true":return actual===true;case "is_false":return actual===false;default:return false;}}
function visible(field: FormField, data: Record<string,any>){return !field.conditions?.length || field.conditions.every(c=>c.field in data && evaluate(c,data));}
function visibleFields(fields: FormField[], data: Record<string,any>){return fields.filter(f=>visible(f,data));}

export default function DynamicServiceForm({ fields, onSubmit, submitting=false }: Props){
  const [data,setData]=useState<Record<string,any>>({}); const [errors,setErrors]=useState<Record<string,string>>({});
  useEffect(()=>{const initial:Record<string,any>={}; fields.forEach(f=>initial[f.name]=emptyValue(f)); setData(initial); setErrors({});},[fields]);
  const shown=useMemo(()=>visibleFields(fields,data),[fields,data]);
  const setValue=(name:string,value:any)=>{setData(prev=>({...prev,[name]:value}));setErrors(prev=>({...prev,[name]:""}));};
  const validateField=(field:FormField,value:any,path=field.name):string|null=>{
    if(field.required && (value===undefined||value===null||value===""||(Array.isArray(value)&&value.length===0))) return "تکمیل این فیلد الزامی است.";
    if(value===undefined||value===null||value==="") return null;
    if(field.type==="boolean" && field.required && value!==true && value!==false) return "لطفاً بله یا خیر را انتخاب کنید.";
    if(field.type==="checkbox" && field.required && value!==true) return "این گزینه باید تأیید شود.";
    if(field.type==="repeatable") { if(!Array.isArray(value)) return "مقدار گروه نامعتبر است."; if(field.minItems!==undefined&&value.length<field.minItems)return `حداقل ${field.minItems} مورد وارد کنید.`; if(field.maxItems!==undefined&&value.length>field.maxItems)return `حداکثر ${field.maxItems} مورد مجاز است.`; for(let i=0;i<value.length;i++){for(const child of field.fields||[]){const e=validateField(child,value[i]?.[child.name],`${path}[${i}].${child.name}`);if(e)return e;}} }
    if(field.type==="number" && !Number.isFinite(Number(value))) return "مقدار باید عددی باشد.";
    if(field.type==="phone" && typeof value==="string" && !/^(?:\+98|0098|0)?9\d{9}$/.test(value.replace(/[\s-]/g,""))) return "شماره موبایل معتبر نیست.";
    if(field.type==="national_code" && typeof value==="string" && !/^\d{10}$/.test(value)) return "کد ملی باید ۱۰ رقم باشد.";
    return null;
  };
  const submit=(e:React.FormEvent)=>{e.preventDefault();const next:Record<string,string>={};for(const f of shown){const err=validateField(f,data[f.name]);if(err)next[f.name]=err;}setErrors(next);if(Object.keys(next).length)return;const out:Record<string,any>={};for(const f of shown){const v=data[f.name];out[f.name]=f.type==="number"?(v===""?null:Number(v)):v;}onSubmit(out);};
  const base="w-full border rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-[#09967C]";
  const render=(field:FormField,value:any,onValue:(v:any)=>void,localErrors:Record<string,string>={},prefix="")=>{
    const err=localErrors[field.name];
    return <div key={field.id} className="space-y-2"><label className="block font-bold text-gray-800">{field.label}{field.required&&<span className="text-red-500 mr-1">*</span>}</label>{field.description&&<p className="text-sm text-gray-500 leading-6">{field.description}</p>}
      {field.type==="text"&&<input type="text" value={value??""} onChange={e=>onValue(e.target.value)} placeholder={field.placeholder||""} disabled={submitting} className={base}/>} 
      {field.type==="textarea"&&<textarea value={value??""} onChange={e=>onValue(e.target.value)} placeholder={field.placeholder||""} rows={5} disabled={submitting} className={`${base} resize-none`}/>} 
      {field.type==="number"&&<input type="number" value={value??""} onChange={e=>onValue(e.target.value)} placeholder={field.placeholder||""} disabled={submitting} className={base}/>} 
      {field.type==="phone"&&<input type="tel" value={value??""} onChange={e=>onValue(e.target.value)} placeholder={field.placeholder||"مثلاً 09123456789"} dir="ltr" disabled={submitting} className={`${base} text-right`}/>} 
      {field.type==="national_code"&&<input type="text" inputMode="numeric" maxLength={10} value={value??""} onChange={e=>onValue(e.target.value.replace(/\D/g,""))} placeholder={field.placeholder||"مثلاً 0012345678"} dir="ltr" disabled={submitting} className={`${base} text-right`}/>} 
      {field.type==="email"&&<input type="email" value={value??""} onChange={e=>onValue(e.target.value)} placeholder={field.placeholder||"example@email.com"} dir="ltr" disabled={submitting} className={`${base} text-left`}/>} 
      {field.type==="date"&&<DatePicker value={value||""} onChange={d=>onValue(d?d.format("YYYY/MM/DD"):"")} calendar={persian} locale={persian_fa} format="YYYY/MM/DD" placeholder={field.placeholder||"تاریخ را انتخاب کنید"} disabled={submitting} inputClass={`${base} cursor-pointer`} containerClassName="w-full"/>} 
      {field.type==="select"&&<select value={value??""} onChange={e=>onValue(e.target.value)} disabled={submitting} className={base}><option value="">{field.placeholder||"انتخاب کنید"}</option>{(field.options||[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>}
      {field.type==="multiselect"&&<div className="space-y-2 border rounded-xl p-4 bg-white">{(field.options||[]).map(o=>{const selected=Array.isArray(value)&&value.includes(o.value);return <label key={o.value} className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={selected} disabled={submitting} onChange={e=>onValue(e.target.checked?[...(Array.isArray(value)?value:[]),o.value]:(Array.isArray(value)?value:[]).filter((x:string)=>x!==o.value))} className="w-4 h-4 accent-[#09967C]"/><span>{o.label}</span></label>})}</div>}
      {field.type==="boolean"&&<div className="grid grid-cols-2 gap-3">{[[true,"بله"],[false,"خیر"]].map(([v,label])=><label key={String(v)} className={`flex items-center justify-center gap-2 border rounded-xl p-4 cursor-pointer ${value===v?"border-[#09967C] bg-[#09967C]/5":"border-gray-200 bg-white"}`}><input type="radio" checked={value===v} disabled={submitting} onChange={()=>onValue(v)} className="accent-[#09967C]"/><span>{label as string}</span></label>)}</div>}
      {field.type==="checkbox"&&<label className="flex items-center gap-3 border rounded-xl p-4 bg-white cursor-pointer"><input type="checkbox" checked={Boolean(value)} disabled={submitting} onChange={e=>onValue(e.target.checked)} className="w-5 h-5 accent-[#09967C]"/><span>{field.placeholder||field.label}</span></label>}
      {field.type==="repeatable"&&<div className="border-2 border-dashed border-[#09967C]/30 rounded-2xl p-4 space-y-4 bg-white"><div className="flex items-center justify-between"><span className="font-bold">{field.label}</span><button type="button" disabled={submitting} onClick={()=>onValue([...(Array.isArray(value)?value:[]),Object.fromEntries((field.fields||[]).map(c=>[c.name,emptyValue(c)]))])} className="text-[#09967C] font-bold">+ افزودن مورد</button></div>{(Array.isArray(value)?value:[]).map((item:any,i:number)=><div key={i} className="rounded-xl border bg-gray-50 p-4 space-y-4"><div className="flex justify-between"><b>مورد {i+1}</b><button type="button" onClick={()=>onValue((value as any[]).filter((_,n)=>n!==i))} className="text-red-600 text-sm">حذف</button></div>{(field.fields||[]).map(child=>visible(child,item)&&render(child,item?.[child.name],v=>onValue((value as any[]).map((x,n)=>n===i?{...x,[child.name]:v}:x)),{},`${field.name}[${i}]`))}</div>)}</div>}
      {err&&<p className="text-sm text-red-600">{err}</p>}</div>;
  };
  return <form dir="rtl" onSubmit={submit} className="space-y-6">{shown.map(f=>render(f,data[f.name],v=>setValue(f.name,v),errors))}<button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#09967C] text-white py-3 font-bold disabled:opacity-50">{submitting?"در حال ارسال...":"ثبت اطلاعات"}</button></form>;
}
