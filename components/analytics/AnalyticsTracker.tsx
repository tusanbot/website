"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

function serviceIdFromPath(pathname: string) {
  const match = pathname.match(/^\/services\/([^/?#]+)$/);
  return match?.[1] || undefined;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const serviceId = serviceIdFromPath(pathname);
    trackEvent("page_view", { page_path: pathname, page_location: window.location.href });
    if (serviceId) trackEvent("service_view", { service_id: serviceId });

    if (pathname.startsWith("/payment/") && sessionStorage.getItem("tusan_order_flow_started") === "1") {
      trackEvent("order_created", { order_id: pathname.split("/")[2] || undefined });
      sessionStorage.removeItem("tusan_order_flow_started");
    }
  }, [pathname]);

  useEffect(() => {
    let formStarted = false;
    const onFocus = (event: Event) => {
      if (formStarted || !pathname.startsWith("/services/")) return;
      const target = event.target as HTMLElement | null;
      if (!target || !["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      formStarted = true;
      trackEvent("form_start", { service_id: serviceIdFromPath(pathname) });
    };
    const onSubmit = () => {
      if (!pathname.startsWith("/services/")) return;
      sessionStorage.setItem("tusan_order_flow_started", "1");
      trackEvent("form_submit", { service_id: serviceIdFromPath(pathname) });
    };
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a,button") as HTMLAnchorElement | HTMLButtonElement | null;
      if (!target) return;
      const href = target instanceof HTMLAnchorElement ? target.href : "";
      const text = (target.textContent || "").trim();
      if (href.startsWith("tel:")) trackEvent("contact_click", { method: "phone" });
      if (/t\.me\//i.test(href)) trackEvent("telegram_click");
      if (/پرداخت آنلاین|پرداخت/i.test(text) && pathname.startsWith("/payment/")) {
        trackEvent("payment_started", { method: /آنلاین/.test(text) ? "online" : "other" });
      }
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("submit", onSubmit);
      document.removeEventListener("click", onClick);
    };
  }, [pathname]);

  return null;
}
