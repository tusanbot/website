import type { SocialService } from "@/lib/social/types";

/**
 * FJPanel's provider_rate is the provider cost for one unit.
 * Tusan sells social services at exactly 2x the provider cost.
 * Provider pricing must never be exposed as the customer-facing price.
 */
export function calculateUnitPrice(service: Pick<SocialService, "provider_rate">) {
    if (service.provider_rate == null || !Number.isFinite(Number(service.provider_rate))) return null;

    return Number(service.provider_rate) * 2;
}

export function calculateOrderPrice(
    service: Pick<SocialService, "provider_rate">,
    quantity: number,
) {
    const unitPrice = calculateUnitPrice(service);
    return unitPrice == null ? null : unitPrice * quantity;
}

export function formatSocialPrice(value: number) {
    return new Intl.NumberFormat("fa-IR").format(Math.round(value));
}

export function formatSocialUnitPrice(value: number) {
    return `${formatSocialPrice(value)} تومان (${formatSocialPrice(value * 1000)} تومان برای ۱۰۰۰ عدد)`;
}
