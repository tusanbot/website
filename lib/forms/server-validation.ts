import type { FormField, FormSchema, FieldCondition } from '@/types/forms';

type FormValue = unknown;
export type FormValidationError = { fieldId: string; message: string };
export type FormValidationResult = { valid: boolean; errors: FormValidationError[]; data: Record<string, FormValue> };

function normalize(value: FormValue) {
  return value == null ? '' : String(value).trim();
}

function findField(fields: FormField[], key: string): FormField | undefined {
  for (const field of fields) {
    if (field.id === key || field.name === key) return field;
    if (field.type === 'repeatable') {
      const nested = findField(field.fields ?? [], key);
      if (nested) return nested;
    }
  }
  return undefined;
}

function readFieldValue(field: FormField | undefined, key: string, values: Record<string, FormValue>) {
  if (field) return values[field.name] ?? values[field.id];
  return values[key];
}

function evaluateCondition(condition: FieldCondition, values: Record<string, FormValue>, fields: FormField[] = []) {
  const key = condition.fieldId ?? condition.field;
  const actual = readFieldValue(findField(fields, key), key, values);
  const expected = condition.value;
  const left = normalize(actual);
  const right = normalize(expected);

  switch (condition.operator) {
    case 'equals': return Array.isArray(actual) ? actual.some(value => normalize(value) === right) : left === right;
    case 'not_equals': return Array.isArray(actual) ? !actual.some(value => normalize(value) === right) : left !== right;
    case 'contains': return Array.isArray(actual) ? actual.some(value => normalize(value).toLowerCase().includes(right.toLowerCase())) : left.toLowerCase().includes(right.toLowerCase());
    case 'not_contains': return Array.isArray(actual) ? !actual.some(value => normalize(value).toLowerCase().includes(right.toLowerCase())) : !left.toLowerCase().includes(right.toLowerCase());
    case 'is_true': return actual === true || left === 'true' || left === '1';
    case 'is_false': return actual === false || left === 'false' || left === '0';
    case 'gt': return Number(actual) > Number(expected);
    case 'gte': return Number(actual) >= Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    case 'lte': return Number(actual) <= Number(expected);
    case 'empty': return actual == null || left === '' || (Array.isArray(actual) && actual.length === 0);
    case 'not_empty': return !(actual == null || left === '' || (Array.isArray(actual) && actual.length === 0));
    default: return false;
  }
}

function isVisible(field: FormField, values: Record<string, FormValue>, fields: FormField[]) {
  const conditions: FieldCondition[] = field.conditions ?? [];
  if (!conditions.length) return true;
  const results = conditions.map(condition => evaluateCondition(condition, values, fields));
  return field.conditionLogic === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

function empty(value: FormValue) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

function validateField(field: FormField, value: FormValue, fields: FormField[] = []): string | null {
  if (field.required && empty(value)) return 'این فیلد الزامی است.';
  if (empty(value)) return null;

  if (field.type === 'repeatable') {
    if (!Array.isArray(value)) return 'مقدار گروه تکرارشونده نامعتبر است.';
    if (field.minItems !== undefined && value.length < field.minItems) return `حداقل ${field.minItems} مورد لازم است.`;
    if (field.maxItems !== undefined && value.length > field.maxItems) return `حداکثر ${field.maxItems} مورد مجاز است.`;
    const childFields = field.fields ?? [];
    for (const item of value) {
      if (!item || typeof item !== 'object') return 'یکی از موارد گروه نامعتبر است.';
      const row = item as Record<string, FormValue>;
      for (const child of childFields) {
        const childValue = row[child.name] ?? row[child.id];
        if (!isVisible(child, row, childFields)) continue;
        const error = validateField(child, childValue, childFields);
        if (error) return `${child.label}: ${error}`;
      }
    }
    return null;
  }

  if (field.type === 'number') {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return 'مقدار باید عددی باشد.';
    const min = field.validation?.min ?? field.min;
    const max = field.validation?.max ?? field.max;
    if (min !== undefined && number < min) return `مقدار باید حداقل ${min} باشد.`;
    if (max !== undefined && number > max) return `مقدار باید حداکثر ${max} باشد.`;
  }

  if (typeof value === 'string') {
    if (field.validation?.minLength !== undefined && value.length < field.validation.minLength) return `حداقل ${field.validation.minLength} کاراکتر وارد کنید.`;
    if (field.validation?.maxLength !== undefined && value.length > field.validation.maxLength) return `حداکثر ${field.validation.maxLength} کاراکتر مجاز است.`;
    if (field.validation?.pattern) {
      try {
        if (!new RegExp(field.validation.pattern).test(value)) return 'فرمت مقدار واردشده صحیح نیست.';
      } catch {
        return 'قانون الگوی این فیلد معتبر نیست.';
      }
    }
  }

  if (field.type === 'email' && typeof value === 'string' && !/^\S+@\S+\.\S+$/.test(value)) return 'ایمیل معتبر نیست.';
  if (field.type === 'phone' && typeof value === 'string' && !/^(?:\+98|0098|0)?9\d{9}$/.test(value.replace(/[\s-]/g, ''))) return 'شماره موبایل معتبر نیست.';
  if (field.type === 'national_code' && typeof value === 'string' && !/^\d{10}$/.test(value)) return 'کد ملی باید ۱۰ رقم باشد.';

  return null;
}

export function validateFormData(schema: FormSchema, input: Record<string, FormValue>): FormValidationResult {
  const data: Record<string, FormValue> = {};
  const errors: FormValidationError[] = [];

  for (const field of schema.fields ?? []) {
    if (!isVisible(field, input, schema.fields ?? [])) continue;
    const value = input[field.name] ?? input[field.id];
    const error = validateField(field, value, schema.fields ?? []);
    if (error) errors.push({ fieldId: field.id, message: error });
    if (!empty(value)) data[field.id] = value;
  }

  return { valid: errors.length === 0, errors, data };
}