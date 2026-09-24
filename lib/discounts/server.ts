import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type DiscountQuoteItem = {
  discount_id: string;
  discount_code_id: string | null;
  name: string;
  discount_type: "percent" | "fixed";
  value: number;
  discount_amount: number;
  original_amount: number;
  final_amount: number;
  priority: number;
  stackable: boolean;
};

function activeWindow(startsAt: string | null, endsAt: string | null, now: Date) {
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  return (!start || start <= now) && (!end || end >= now);
}

export async function evaluateDiscounts(params: {
  userId: string;
  serviceId: string;
  originalAmount: number;
  code?: string | null;
}) {
  const db = supabaseAdmin();
  const now = new Date();
  const originalAmount = Math.max(0, Math.round(Number(params.originalAmount) || 0));
  const normalizedCode = String(params.code || "").trim().toUpperCase();

  const [{ data: discounts, error: discountError }, { data: assignments, error: assignmentError }] = await Promise.all([
    db.from("discounts").select("*").eq("is_active", true).order("priority", { ascending: false }),
    db.from("member_tag_assignments").select("tag_id,expires_at").eq("user_id", params.userId),
  ]);
  if (discountError) throw new Error(discountError.message);
  if (assignmentError) throw new Error(assignmentError.message);

  const activeTagIds = new Set((assignments || []).filter((a) => !a.expires_at || new Date(a.expires_at) >= now).map((a) => a.tag_id));
  const discountIds = (discounts || []).map((d) => d.id);
  const [{ data: tagRules, error: tagRuleError }, { data: serviceRules, error: serviceRuleError }, { data: codes, error: codeError }] = await Promise.all([
    discountIds.length ? db.from("discount_tag_rules").select("discount_id,tag_id").in("discount_id", discountIds) : Promise.resolve({ data: [], error: null } as any),
    discountIds.length ? db.from("discount_services").select("discount_id,service_id").in("discount_id", discountIds) : Promise.resolve({ data: [], error: null } as any),
    normalizedCode ? db.from("discount_codes").select("id,discount_id,code,is_active,usage_limit,per_user_limit,starts_at,ends_at").eq("code", normalizedCode).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
  ]);
  if (tagRuleError) throw new Error(tagRuleError.message);
  if (serviceRuleError) throw new Error(serviceRuleError.message);
  if (codeError) throw new Error(codeError.message);

  const tagMap = new Map<string, string[]>();
  for (const row of tagRules || []) tagMap.set(row.discount_id, [...(tagMap.get(row.discount_id) || []), row.tag_id]);
  const serviceMap = new Map<string, string[]>();
  for (const row of serviceRules || []) serviceMap.set(row.discount_id, [...(serviceMap.get(row.discount_id) || []), row.service_id]);

  const usageCounts = new Map<string, { total: number; user: number }>();
  if (discountIds.length) {
    const { data: usages, error: usageError } = await db.from("discount_usages").select("discount_id,user_id").in("discount_id", discountIds);
    if (usageError) throw new Error(usageError.message);
    for (const usage of usages || []) {
      const current = usageCounts.get(usage.discount_id) || { total: 0, user: 0 };
      current.total += 1;
      if (usage.user_id === params.userId) current.user += 1;
      usageCounts.set(usage.discount_id, current);
    }
  }

  const codeRow = codes as any;
  const eligible: any[] = [];
  for (const discount of discounts || []) {
    if (!activeWindow(discount.starts_at, discount.ends_at, now)) continue;
    if (discount.min_order_amount != null && originalAmount < Number(discount.min_order_amount)) continue;
    const services = serviceMap.get(discount.id) || [];
    if (!discount.applies_to_all_services && !services.includes(params.serviceId)) continue;
    const tags = tagMap.get(discount.id) || [];
    if (tags.length && !tags.some((tagId) => activeTagIds.has(tagId))) continue;
    const usage = usageCounts.get(discount.id) || { total: 0, user: 0 };
    if (discount.usage_limit != null && usage.total >= Number(discount.usage_limit)) continue;
    if (discount.per_user_limit != null && usage.user >= Number(discount.per_user_limit)) continue;

    let discountCodeId: string | null = null;
    if (normalizedCode) {
      if (!codeRow || !codeRow.is_active || codeRow.discount_id !== discount.id || !activeWindow(codeRow.starts_at, codeRow.ends_at, now)) continue;
      discountCodeId = codeRow.id;
      const { count: codeTotal, error: codeTotalError } = await db.from("discount_usages").select("id", { count: "exact", head: true }).eq("discount_code_id", codeRow.id);
      const { count: codeUser, error: codeUserError } = await db.from("discount_usages").select("id", { count: "exact", head: true }).eq("discount_code_id", codeRow.id).eq("user_id", params.userId);
      if (codeTotalError || codeUserError) throw new Error(codeTotalError?.message || codeUserError?.message || "خطا در بررسی کد تخفیف.");
      if (codeRow.usage_limit != null && (codeTotal || 0) >= Number(codeRow.usage_limit)) continue;
      if (codeRow.per_user_limit != null && (codeUser || 0) >= Number(codeRow.per_user_limit)) continue;
    }
    eligible.push({ ...discount, discountCodeId });
  }

  if (normalizedCode && !eligible.length) throw new Error("کد تخفیف معتبر، فعال یا قابل استفاده نیست.");

  let remaining = originalAmount;
  const applied: DiscountQuoteItem[] = [];
  for (const discount of eligible) {
    if (remaining <= 0) break;
    let amount = discount.discount_type === "percent"
      ? Math.floor(remaining * Math.min(100, Math.max(0, Number(discount.value))) / 100)
      : Math.max(0, Math.round(Number(discount.value) || 0));
    if (discount.max_discount_amount != null) amount = Math.min(amount, Math.max(0, Number(discount.max_discount_amount)));
    amount = Math.min(amount, remaining);
    if (amount <= 0) continue;
    const finalAmount = remaining - amount;
    applied.push({
      discount_id: discount.id,
      discount_code_id: discount.discountCodeId || null,
      name: discount.name,
      discount_type: discount.discount_type,
      value: Number(discount.value),
      discount_amount: amount,
      original_amount: remaining,
      final_amount: finalAmount,
      priority: Number(discount.priority || 0),
      stackable: Boolean(discount.stackable),
    });
    remaining = finalAmount;
    if (!discount.stackable) break;
  }

  return { originalAmount, discountAmount: originalAmount - remaining, finalAmount: remaining, applied };
}
