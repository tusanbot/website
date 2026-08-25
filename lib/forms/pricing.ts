import type { ConditionOperator } from "@/types/forms";

export type PricingRuleMode = "set" | "add" | "per_item";
export type PricingRule = { id: string; field: string; operator: ConditionOperator; value?: string | boolean; mode: PricingRuleMode; amount: number; includedItems?: number; label?: string; enabled?: boolean };
const normalize = (value: unknown) => (value == null ? "" : String(value).trim());
const numericPair = (actual: unknown, expected: unknown) => ({ actual: Number(actual), expected: Number(expected) });
export function matchesPricingRule(rule: PricingRule, data: Record<string, unknown>): boolean {
  const actual = data[rule.field]; const expected = rule.value;
  switch (rule.operator) {
    case "equals": return Array.isArray(actual) ? actual.some((item) => normalize(item) === normalize(expected)) : normalize(actual) === normalize(expected);
    case "not_equals": return Array.isArray(actual) ? !actual.some((item) => normalize(item) === normalize(expected)) : normalize(actual) !== normalize(expected);
    case "contains": return Array.isArray(actual) ? actual.some((item) => normalize(item).toLowerCase().includes(normalize(expected).toLowerCase())) : normalize(actual).toLowerCase().includes(normalize(expected).toLowerCase());
    case "not_contains": return Array.isArray(actual) ? !actual.some((item) => normalize(item).toLowerCase().includes(normalize(expected).toLowerCase())) : !normalize(actual).toLowerCase().includes(normalize(expected).toLowerCase());
    case "is_true": return actual === true;
    case "is_false": return actual === false;
    case "gt": { const { actual: a, expected: e } = numericPair(actual, expected); return Number.isFinite(a) && Number.isFinite(e) && a > e; }
    case "gte": { const { actual: a, expected: e } = numericPair(actual, expected); return Number.isFinite(a) && Number.isFinite(e) && a >= e; }
    case "lt": { const { actual: a, expected: e } = numericPair(actual, expected); return Number.isFinite(a) && Number.isFinite(e) && a < e; }
    case "lte": { const { actual: a, expected: e } = numericPair(actual, expected); return Number.isFinite(a) && Number.isFinite(e) && a <= e; }
    default: return false;
  }
}
export function calculateServicePrice(basePrice: number, rules: PricingRule[], data: Record<string, unknown>): number {
  let price = Math.max(0, Number(basePrice) || 0); const enabledRules = (rules || []).filter((rule) => rule.enabled !== false && Number.isFinite(Number(rule.amount)));
  for (const rule of enabledRules) if (rule.mode === "set" && matchesPricingRule(rule, data)) price = Math.max(0, Number(rule.amount));
  for (const rule of enabledRules) { if (!matchesPricingRule(rule, data)) continue; const amount = Number(rule.amount) || 0; if (rule.mode === "add") price += amount; if (rule.mode === "per_item") { const raw = data[rule.field]; const count = Array.isArray(raw) ? raw.length : Math.max(0, Number(raw) || 0); const included = Math.max(0, Number(rule.includedItems) || 0); price += Math.max(0, count - included) * amount; } }
  return Math.max(0, Math.round(price));
}
