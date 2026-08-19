export type FormFieldDefinition = {
  id?: string;
  name?: string;
  key?: string;
  label?: string;
};

export const FIELD_LABELS: Record<string, string> = {
  full_name: "نام و نام خانوادگی",
  first_name: "نام",
  last_name: "نام خانوادگی",
  national_code: "کد ملی",
  phone: "شماره موبایل",
  mobile: "شماره موبایل",
  email: "ایمیل",
  birth_date: "تاریخ تولد",
  address: "آدرس",
  gender: "جنسیت",
  province: "استان",
  city: "شهر",
  school: "مدرسه",
  university: "دانشگاه",
  major: "رشته تحصیلی",
  field: "رشته",
  quota: "سهمیه",
};

export function normalizeFormSchema(schema: unknown): FormFieldDefinition[] {
  if (Array.isArray(schema)) return schema as FormFieldDefinition[];
  if (typeof schema === "string") {
    try {
      const parsed = JSON.parse(schema);
      return Array.isArray(parsed) ? (parsed as FormFieldDefinition[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getFieldKey(field: FormFieldDefinition): string {
  return String(field.name ?? field.key ?? field.id ?? "");
}

export function getFieldLabel(field: FormFieldDefinition): string {
  const key = getFieldKey(field);
  return String(field.label ?? FIELD_LABELS[key] ?? key);
}

export function buildFieldLabelMap(schema: unknown): Record<string, string> {
  return normalizeFormSchema(schema).reduce<Record<string, string>>((map, field) => {
    const key = getFieldKey(field);
    if (key) map[key] = getFieldLabel(field);
    return map;
  }, { ...FIELD_LABELS });
}
