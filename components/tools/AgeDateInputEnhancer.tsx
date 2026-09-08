"use client";

import { useEffect } from "react";

const normalize = (value: string) => {
  const digits = value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
};

export default function AgeDateInputEnhancer() {
  useEffect(() => {
    if (!window.location.pathname.includes("/tools/age-calculator")) return;

    const handleInput = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.placeholder !== "1378/05/20") return;
      const next = normalize(input.value);
      if (next === input.value) return;

      // Do not dispatch a second input event here. React's controlled input
      // must receive the original event with the already-normalized value;
      // dispatching a nested event can cause the following digit to be lost.
      input.value = next;
      requestAnimationFrame(() => {
        if (document.activeElement === input) input.setSelectionRange(next.length, next.length);
      });
    };

    document.addEventListener("input", handleInput, true);
    return () => document.removeEventListener("input", handleInput, true);
  }, []);

  return null;
}
