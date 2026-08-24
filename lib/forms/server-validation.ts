import type { FormField, FormSchema, FieldCondition } from '@/types/forms';

type FormValue = unknown;

export type FormValidationError = { fieldId: string; message: string };
export type FormValidationResult = { valid: boolean; errors: FormValidationError[]; data: Record<string, FormValue> };

function isVisible(field: FormField, values: Record<string, FormValue>): boolean {
  const conditions: FieldCondition[] = field.conditions ?? [];
  if (!conditions.length) return true;
  const results = conditions.map((condition) => {
    const conditionFieldId = condition.fieldId ?? condition.field;
    const value = values[conditionFieldId];
    switch (condition.operator) {
      case 'equals': return value === condition.value;
      case 'not_equals': return value !== condition.value;
      case 'contains': return Array.isArray(value) ? value.includes(condition.value) : String(value ?? '').includes(String(condition.value ?? ''));
      case 'not_contains': return Array.isArray(value) ? !value.includes(condition.value) : !String(value ?? '').includes(String(condition.value ?? ''));
      case 'is_true': return value === true;
      case 'is_false': return value === false;
      default: return false;
    }
  });
  return field.conditionLogic === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

function isEmpty(value: FormValue): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

function validateField(field: FormField, value: FormValue): string | null {
  if (field.required && isEmpty(value)) return 'این فیلد الزامی است.';
  if (isEmpty(value)) return null;

  if (field.type === 'number') {
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numberValue)) return 'مقدار باید عددی باشد.';
    if (field.validation?.min !== undefined && numberValue < field.validation.min) return `مقدار باید حداقل ${field.validation.min} باشد.`;
    if (field.validation?.max !== undefined && numberValue > field.validation.max) return `مقدار باید حداکثر ${field.validation.max} باشد.`;
  }

  if (typeof value === 'string') {
    const length = value.length;
    if (field.validation?.minLength !== undefined && length < field.validation.minLength) return `حداقل ${field.validation.minLength} کاراکتر وارد کنید.`;
    if (field.validation?.maxLength !== undefined && length > field.validation.maxLength) return `حداکثر ${field.validation.maxLength} کاراکتر مجاز است.`;
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

  return null;
}

export function validateFormData(schema: FormSchema, input: Record<string, FormValue>): FormValidationResult {
  const data: Record<string, FormValue> = {};
  const errors: FormValidationError[] = [];
  for (const field of schema.fields ?? []) {
    if (!isVisible(field, input)) continue;
    const value = input[field.id];
    const error = validateField(field, value);
    if (error) errors.push({ fieldId: field.id, message: error });
    if (!isEmpty(value)) data[field.id] = value;
  }
  return { valid: errors.length === 0, errors, data };
}
