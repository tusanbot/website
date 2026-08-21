import type { SocialService } from "@/lib/social/types";

/**
 * Returns the customer-facing unit price in Toman.
 * FJPanel provider_rate is stored as the provider price for one unit.
 */
export function calculateUnitPrice(service: Pick<SocialService, "provider_rate" | "profit_type" | "profit_value">) {
    if (service.provider_rate == null || !Number.isFinite(Number(service.provider_rate))) return null;

    const providerRate = Number(service.provider_rate);
    const profitValue = Number(service.profit_value || 0);

    if (service.profit_type === "percentage") {
        return providerRate * (1 + profitValue / 100);
    }

    if (service.profit_type === "fixed") {
        return providerRate + profitValue;
    }

    return providerRate;
}

export function calculateOrderPrice(
    service: Pick<SocialService, "provider_rate" | "profit_type" | "profit_value">,
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
