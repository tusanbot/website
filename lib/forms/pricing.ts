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
};

const normalize = (value: unknown) => (value == null ? "" : String(value).trim());
const numericPair = (actual: unknown, expected: unknown) => ({ actual: Number(actual), expected: Number(expected) });

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

function calculateAdditional(basePrice: number, rule: PricingRule, data: Record<string, unknown>): number {
  if (!rule.additional_per_unit) return basePrice;
  const config = rule.additional_per_unit;
  const count = Array.isArray(data[config.field]) ? (data[config.field] as unknown[]).length : Number(data[config.field] ?? 0);
  if (!Number.isFinite(count)) return basePrice;
  const threshold = Math.max(0, Number(config.threshold ?? 0));
  const unitPrice = Math.max(0, Number(config.unit_price ?? 0));
  return basePrice + Math.max(0, count - threshold) * unitPrice;
}

/**
 * Calculates the canonical numeric order price. It supports both the current
 * editor format (field/operator/mode) and the richer legacy/import format
 * (conditions/base_price/additional_per_unit). This keeps old services working
 * while allowing all database pricing rules to use one evaluator.
 */
export function calculateServicePrice(basePrice: number, rules: PricingRule[], data: Record<string, unknown>): number {
  let price = Math.max(0, Number(basePrice) || 0);
  const enabledRules = (rules || []).filter((rule) => rule.enabled !== false);

  // Rich/import rules: choose the first matching base price and apply its
  // per-unit surcharge. A quote-only rule intentionally leaves the numeric
  // price unchanged because there is no safe amount to charge automatically.
  const richRules = enabledRules.filter((rule) => rule.conditions?.length || rule.base_price !== undefined || rule.additional_per_unit || rule.quote_required);
  for (const rule of richRules) {
    if (!matchesConditions(rule, data)) continue;
    if (rule.base_price !== undefined && Number.isFinite(Number(rule.base_price))) price = Math.max(0, Number(rule.base_price));
    price = calculateAdditional(price, rule, data);
    if (rule.quote_required || rule.pricing_status === "quote_required") return Math.max(0, Math.round(price));
  }

  // Canonical rules created by ServicePricingRules.tsx.
  const canonicalRules = enabledRules.filter((rule) => !richRules.includes(rule) && (rule.field || rule.operator));
  for (const rule of canonicalRules) {
    if (!matchesPricingRule(rule, data)) continue;
    const amount = Number(rule.amount) || 0;
    if (rule.mode === "set") price = Math.max(0, amount);
  }
  for (const rule of canonicalRules) {
    if (!matchesPricingRule(rule, data)) continue;
    const amount = Number(rule.amount) || 0;
    if (rule.mode === "add") price += amount;
    if (rule.mode === "per_item") {
      const raw = data[rule.field || ""];
      const count = Array.isArray(raw) ? raw.length : Math.max(0, Number(raw) || 0);
      const included = Math.max(0, Number(rule.includedItems) || 0);
      price += Math.max(0, count - included) * amount;
    }
  }

  return Math.max(0, Math.round(price));
}
