"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "tusan-admin-drafts-v1";

type Draft = Record<string, string | boolean>;

function readDrafts(): Record<string, Draft> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDraft(pathname: string, draft: Draft) {
  try {
    const drafts = readDrafts();
    drafts[pathname] = draft;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Draft persistence is best-effort and must never block the admin UI.
  }
}

function controlKey(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  return element.name || element.id || element.getAttribute("aria-label") || "";
}

export default function AdminDraftPersistence() {
  const pathname = usePathname();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (pathname !== "/admin/content-studio" || restoredRef.current) return;
    restoredRef.current = true;

    const restore = () => {
      const draft = readDrafts()[pathname];
      if (!draft) return;

      const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
      if (textarea && typeof draft.__scenario === "string") {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(textarea, draft.__scenario);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }

      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach((element) => {
        const key = controlKey(element);
        if (!key || !(key in draft) || key === "__scenario") return;
        if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
          const checked = Boolean(draft[key]);
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
          setter?.call(element, checked);
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }
        const value = String(draft[key] ?? "");
        const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        setter?.call(element, value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      });
    };

    const timer = window.setTimeout(restore, 150);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/admin/content-studio") return;

    const save = () => {
      const draft: Draft = {};
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
      if (textarea) draft.__scenario = textarea.value;

      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach((element) => {
        const key = controlKey(element);
        if (!key || key === "__scenario") return;
        draft[key] = element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")
          ? element.checked
          : element.value;
      });
      writeDraft(pathname, draft);
    };

    let timeout = 0;
    const onInput = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(save, 250);
    };
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    window.addEventListener("pagehide", save);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      window.removeEventListener("pagehide", save);
    };
  }, [pathname]);

  return null;
}
