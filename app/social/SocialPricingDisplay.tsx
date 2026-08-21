"use client";

import { useEffect } from "react";
import { calculateUnitPrice, formatSocialUnitPrice } from "@/lib/social/pricing";

function toNumber(text: string) {
    const normalized = text
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٬,]/g, "")
        .replace(/\s*(تومان|ریال)\s*$/u, "")
        .trim();
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
}

function applyPricingLabels() {
    if (window.location.pathname !== "/social") return;

    document.querySelectorAll<HTMLElement>("main span").forEach((label) => {
        if (label.textContent?.trim() !== "قیمت پایه") return;
        const container = label.parentElement;
        const value = container?.querySelector<HTMLElement>("strong");
        if (!value) return;

        const providerRate = toNumber(value.textContent || "");
        if (providerRate == null) return;

        const unitPrice = calculateUnitPrice({ provider_rate: providerRate });
        if (unitPrice == null) return;

        label.textContent = "قیمت واحد";
        value.textContent = formatSocialUnitPrice(unitPrice);
    });

    document.querySelectorAll<HTMLElement>("main strong").forEach((value) => {
        if (!value.textContent?.trim().endsWith("ریال")) return;
        const providerRate = toNumber(value.textContent);
        if (providerRate == null) return;
        const unitPrice = calculateUnitPrice({ provider_rate: providerRate });
        if (unitPrice == null) return;
        value.textContent = formatSocialUnitPrice(unitPrice);
    });
}

export default function SocialPricingDisplay() {
    useEffect(() => {
        applyPricingLabels();
        const observer = new MutationObserver(() => applyPricingLabels());
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    return null;
}
