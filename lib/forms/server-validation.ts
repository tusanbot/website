import type { FormField, FormSchema, FieldCondition } from '@/types/forms';

type FormValue = unknown;
export type FormValidationError = { fieldId: string; message: string };
export type FormValidationResult = { valid: boolean; errors: FormValidationError[]; data: Record<string, FormValue> };

function isVisible(field: FormField, values: Record<string, FormValue>) {
  const conditions: FieldCondition[] = field.conditions ?? [];
  if (!conditions.length) return true;
  const results = conditions.map(c => { const key=c.fieldId ?? c.field; const value=values[key]; switch(c.operator){case 'equals':return value===c.value;case 'not_equals':return value!==c.value;case 'contains':return Array.isArray(value)?value.includes(c.value):String(value??'').includes(String(c.value??''));case 'not_contains':return Array.isArray(value)?!value.includes(c.value):!String(value??'').includes(String(c.value??''));case 'is_true':return value===true;case 'is_false':return value===false;default:return false;} });
  return field.conditionLogic === 'OR' ? results.some(Boolean) : results.every(Boolean);
}
function empty(v: FormValue){return v===undefined||v===null||v===''||(Array.isArray(v)&&v.length===0);}
function validateField(field: FormField,value:FormValue):string|null{
  if(field.required&&empty(value))return 'این فیلد الزامی است.';
  if(empty(value))return null;
  if(field.type==='repeatable'){
    if(!Array.isArray(value))return 'مقدار گروه تکرارشونده نامعتبر است.';
    if(field.minItems!==undefined&&value.length<field.minItems)return `حداقل ${field.minItems} مورد لازم است.`;
    if(field.maxItems!==undefined&&value.length>field.maxItems)return `حداکثر ${field.maxItems} مورد مجاز است.`;
    for(const item of value){if(!item||typeof item!=='object')return 'یکی از موارد گروه نامعتبر است.';for(const child of field.fields??[]){const childValue=(item as Record<string,unknown>)[child.id] ?? (item as Record<string,unknown>)[child.name];if(!isVisible(child,item as Record<string,unknown>))continue;const error=validateField(child,childValue);if(error)return `${child.label}: ${error}`;}}
    return null;
  }
  if(field.type==='number'){const n=typeof value==='number'?value:Number(value);if(!Number.isFinite(n))return 'مقدار باید عددی باشد.';if(field.validation?.min!==undefined&&n<field.validation.min)return `مقدار باید حداقل ${field.validation.min} باشد.`;if(field.validation?.max!==undefined&&n>field.validation.max)return `مقدار باید حداکثر ${field.validation.max} باشد.`;}
  if(typeof value==='string'){if(field.validation?.minLength!==undefined&&value.length<field.validation.minLength)return `حداقل ${field.validation.minLength} کاراکتر وارد کنید.`;if(field.validation?.maxLength!==undefined&&value.length>field.validation.maxLength)return `حداکثر ${field.validation.maxLength} کاراکتر مجاز است.`;if(field.validation?.pattern){try{if(!new RegExp(field.validation.pattern).test(value))return 'فرمت مقدار واردشده صحیح نیست.';}catch{return 'قانون الگوی این فیلد معتبر نیست.';}}}
  if(field.type==='email'&&typeof value==='string'&&!/^\S+@\S+\.\S+$/.test(value))return 'ایمیل معتبر نیست.';
  if(field.type==='phone'&&typeof value==='string'&&!/^(?:\+98|0098|0)?9\d{9}$/.test(value.replace(/[\s-]/g,'')))return 'شماره موبایل معتبر نیست.';
  if(field.type==='national_code'&&typeof value==='string'&&!/^\d{10}$/.test(value))return 'کد ملی باید ۱۰ رقم باشد.';
  return null;
}
export function validateFormData(schema:FormSchema,input:Record<string,FormValue>):FormValidationResult{const data:Record<string,FormValue>={};const errors:FormValidationError[]=[];for(const field of schema.fields??[]){if(!isVisible(field,input))continue;const value=input[field.id]??input[field.name];const error=validateField(field,value);if(error)errors.push({fieldId:field.id,message:error});if(!empty(value))data[field.id]=value;}return{valid:errors.length===0,errors,data};}
