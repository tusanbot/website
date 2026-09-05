export type FieldType =
  | "text" | "textarea" | "number" | "phone" | "email" | "date"
  | "select" | "multiselect" | "boolean" | "checkbox" | "password" | "national_code"
  | "repeatable";

export type FormOption = { label: string; value: string };
export type ConditionOperator = "equals" | "not_equals" | "contains" | "not_contains" | "is_true" | "is_false" | "gt" | "gte" | "lt" | "lte" | "empty" | "not_empty";
export type FieldCondition = { fieldId?: string; field: string; operator: ConditionOperator; value?: string | boolean };
export type FieldValidationRules = { minLength?: number; maxLength?: number; min?: number; max?: number; pattern?: string };
export type FormField = { id: string; type: FieldType; label: string; name: string; placeholder?: string; description?: string; required: boolean; options?: FormOption[]; conditions?: FieldCondition[]; conditionLogic?: "AND" | "OR"; defaultValue?: string | number | boolean | string[]; validation?: FieldValidationRules; fields?: FormField[]; minItems?: number; maxItems?: number };
export type FormSchema = { fields: FormField[] };
