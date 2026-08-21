"use client";

import { useEffect } from "react";

function toNumber(text: string) {
    const normalized = text
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٬,]/g, "")
        .replace(/\s*ریال\s*$/u, "")
        .trim();
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
}

function format(value: number) {
    return new Intl.NumberFormat("fa-IR").format(Math.round(value));
}

function applyPricingLabels() {
    if (window.location.pathname !== "/social") return;

    document.querySelectorAll<HTMLElement>("main span").forEach((label) => {
        if (label.textContent?.trim() !== "قیمت پایه") return;
        const container = label.parentElement;
        const value = container?.querySelector<HTMLElement>("strong");
        if (!value) return;

        const unitPrice = toNumber(value.textContent || "");
        if (unitPrice == null) return;

        label.textContent = "قیمت واحد";
        value.textContent = `${format(unitPrice)} تومان (${format(unitPrice * 1000)} تومان برای ۱۰۰۰ عدد)`;
    });

    document.querySelectorAll<HTMLElement>("main strong").forEach((value) => {
        if (!value.textContent?.trim().endsWith("ریال")) return;
        const unitPrice = toNumber(value.textContent);
        if (unitPrice == null) return;
        value.textContent = `${format(unitPrice)} تومان (${format(unitPrice * 1000)} تومان برای ۱۰۰۰ عدد)`;
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
