import type { ConditionOperator } from "@/types/forms";

export type PricingRuleMode = "set" | "add" | "per_item";
export type PricingCondition = { field?: string; fieldId?: string; operator: ConditionOperator; value?: string | boolean | number };
export type PricingRule = {
  id?: string;
  field?: string;
  operator?: ConditionOperator;
  value?: string | boolean | number;
  mode?: PricingRuleMode;
  amount?: number;
  includedItems?: number;
  label?: string;
  enabled?: boolean;
  conditions?: PricingCondition[];
  conditionLogic?: "AND" | "OR";
  base_price?: number;
  additional_per_unit?: { field: string; threshold?: number; unit_price: number };
  quote_required?: boolean;
  pricing_status?: string;
  type?: string;
  price?: number;
  extra_price?: number;
  step?: number;
  max_price?: number;
  min_price?: number;
  included?: number;
  base_amount?: number;
};

const normalize = (value: unknown) => (value == null ? "" : String(value).trim());
const numericPair = (actual: unknown, expected: unknown) => ({ actual: Number(actual), expected: Number(expected) });
const isEmpty = (value: unknown) => value == null || normalize(value) === "" || (Array.isArray(value) && value.length === 0);

export function matchesPricingRule(rule: PricingRule, data: Record<string, unknown>): boolean {
  const actual = rule.field ? data[rule.field] : undefined;
  const expected = rule.value;
  switch (rule.operator) {
    case "equals": return Array.isArray(actual) ? actual.some((item) => normalize(item) === normalize(expected)) : normalize(actual) === normalize(expected);
    case "not_equals": return Array.isArray(actual) ? !actual.some((item) => normalize(item) === normalize(expected)) : normalize(actual) !== normalize(expected);
    case "contains": return Array.isArray(actual) ? actual.some((item) => normalize(item).toLowerCase().includes(normalize(expected).toLowerCase())) : normalize(actual).toLowerCase().includes(normalize(expected).toLowerCase());
    case "not_contains": return Array.isArray(actual) ? !actual.some((item) => normalize(item).toLowerCase().includes(normalize(expected).toLowerCase())) : !normalize(actual).toLowerCase().includes(normalize(expected).toLowerCase());
    case "is_true": return actual === true || normalize(actual).toLowerCase() === "true" || normalize(actual) === "1";
    case "is_false": return actual === false || normalize(actual).toLowerCase() === "false" || normalize(actual) === "0";
    case "empty": return isEmpty(actual);
    case "not_empty": return !isEmpty(actual);
    case "gt": { const { actual: a, expected: e } = numericPair(actual, expected); return Number.isFinite(a) && Number.isFinite(e) && a > e; }
    case "gte": { const { actual: a, expected: e } = numericPair(actual, expected); return Number.isFinite(a) && Number.isFinite(e) && a >= e; }
    case "lt": { const { actual: a, expected: e } = numericPair(actual, expected); return Number.isFinite(a) && Number.isFinite(e) && a < e; }
    case "lte": { const { actual: a, expected: e } = numericPair(actual, expected); return Number.isFinite(a) && Number.isFinite(e) && a <= e; }
    default: return false;
  }
}

function matchesConditions(rule: PricingRule, data: Record<string, unknown>): boolean {
  if (!rule.conditions?.length) return Boolean(rule.field && rule.operator ? matchesPricingRule(rule, data) : true);
  const results = rule.conditions.map((condition) => matchesPricingRule({ field: condition.field || condition.fieldId, operator: condition.operator, value: condition.value }, data));
  return rule.conditionLogic === "OR" ? results.some(Boolean) : results.every(Boolean);
}

function countValue(raw: unknown): number {
  if (Array.isArray(raw)) return raw.length;
  const count = Number(raw ?? 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function calculateAdditional(basePrice: number, rule: PricingRule, data: Record<string, unknown>): number {
  if (!rule.additional_per_unit) return basePrice;
  const config = rule.additional_per_unit;
  const count = countValue(data[config.field]);
  const threshold = Math.max(0, Number(config.threshold ?? 0));
  const unitPrice = Math.max(0, Number(config.unit_price ?? 0));
  return basePrice + Math.max(0, count - threshold) * unitPrice;
}

function calculateLegacyPerItem(basePrice: number, rule: PricingRule, data: Record<string, unknown>): number {
  const count = countValue(rule.field ? data[rule.field] : 0);
  const unitPrice = Math.max(0, Number(rule.extra_price ?? rule.amount ?? 0));
  const configuredBase = rule.base_price ?? rule.base_amount;
  if (configuredBase === undefined && rule.step === undefined && rule.included === undefined && rule.includedItems === undefined) {
    return count * unitPrice;
  }
  const included = Math.max(0, Number(rule.included ?? rule.includedItems ?? 0));
  const step = Math.max(1, Number(rule.step ?? 1));
  const extraUnits = Math.ceil(Math.max(0, count - included) / step);
  return (configuredBase !== undefined ? Math.max(0, Number(configuredBase) || 0) : basePrice) + extraUnits * unitPrice;
}

/** Canonical evaluator shared by the browser preview and server-side order creation. */
export function calculateServicePrice(basePrice: number, rules: PricingRule[], data: Record<string, unknown>): number {
  let price = Math.max(0, Number(basePrice) || 0);
  const enabledRules = (rules || []).filter((rule) => rule.enabled !== false);

  const richRules = enabledRules.filter((rule) => rule.conditions?.length || rule.base_price !== undefined || rule.base_amount !== undefined || rule.additional_per_unit || rule.quote_required || rule.pricing_status === "quote_required" || rule.type === "per_item" || rule.type === "range");
  for (const rule of richRules) {
    if (rule.type === "per_item" && !rule.conditions?.length && !rule.field) continue;
    if (rule.conditions?.length || rule.field) {
      if (!matchesConditions(rule, data)) continue;
    }
    if (rule.type === "per_item") {
      price = calculateLegacyPerItem(price, rule, data);
    } else if (rule.base_price !== undefined || rule.base_amount !== undefined) {
      price = Math.max(0, Number(rule.base_price ?? rule.base_amount) || 0);
      price = calculateAdditional(price, rule, data);
    } else {
      price = calculateAdditional(price, rule, data);
    }
    if (rule.quote_required || rule.pricing_status === "quote_required") return Math.max(0, Math.round(price));
  }

  const canonicalRules = enabledRules.filter((rule) => !richRules.includes(rule) && (rule.field || rule.operator));
  for (const rule of canonicalRules) {
    if (rule.mode !== "set" || !matchesPricingRule(rule, data)) continue;
    price = Math.max(0, Number(rule.amount) || 0);
    break;
  }
  for (const rule of canonicalRules) {
    if (!matchesPricingRule(rule, data)) continue;
    const amount = Math.max(0, Number(rule.amount) || 0);
    if (rule.mode === "add") price += amount;
    if (rule.mode === "per_item") {
      const count = countValue(data[rule.field || ""]);
      const step = Math.max(1, Number(rule.step ?? 1));
      const included = rule.includedItems !== undefined ? Math.max(0, Number(rule.includedItems) || 0) : (rule.step !== undefined ? step : 0);
      const units = Math.ceil(Math.max(0, count - included) / step);
      price += units * amount;
    }
  }

  return Math.max(0, Math.round(price));
}
