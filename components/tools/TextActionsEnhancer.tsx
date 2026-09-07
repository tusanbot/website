"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TextActionsEnhancer() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/tools/ocr" && pathname !== "/tools/pdf-to-word") return;
    const enhance = () => {
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
      if (!textarea || textarea.dataset.tusanTextActions === "true") return;
      textarea.dataset.tusanTextActions = "true";
      const wrapper = document.createElement("div"); wrapper.className = "mt-3 flex flex-wrap gap-2";
      const makeButton = (label: string, symbol: string, onClick: () => void) => { const button = document.createElement("button"); button.type = "button"; button.className = "inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold transition hover:border-[var(--primary)] disabled:opacity-40"; button.textContent = `${symbol} ${label}`; button.addEventListener("click", onClick); return button; };
      const copyButton = makeButton("کپی متن", "⧉", async () => { if (!textarea.value) return; try { await navigator.clipboard.writeText(textarea.value); copyButton.textContent = "✓ کپی شد"; window.setTimeout(() => { copyButton.textContent = "⧉ کپی متن"; }, 1500); } catch { textarea.select(); document.execCommand("copy"); } });
      const shareButton = makeButton("اشتراک‌گذاری متن", "↗", async () => { if (!textarea.value) return; try { if (navigator.share) await navigator.share({ title: "متن استخراج‌شده | توسن", text: textarea.value }); else { await navigator.clipboard.writeText(textarea.value); shareButton.textContent = "✓ متن کپی شد"; window.setTimeout(() => { shareButton.textContent = "↗ اشتراک‌گذاری متن"; }, 1800); } } catch { /* کاربر اشتراک‌گذاری را لغو کرد */ } });
      const sync = () => { copyButton.disabled = !textarea.value.trim(); shareButton.disabled = !textarea.value.trim(); }; textarea.addEventListener("input", sync); sync(); wrapper.append(copyButton, shareButton); textarea.insertAdjacentElement("afterend", wrapper);
      return () => { textarea.removeEventListener("input", sync); wrapper.remove(); delete textarea.dataset.tusanTextActions; };
    };
    let cleanup: (() => void) | undefined; const observer = new MutationObserver(() => { if (!cleanup) cleanup = enhance(); }); observer.observe(document.body, { childList: true, subtree: true }); cleanup = enhance(); return () => { observer.disconnect(); cleanup?.(); };
  }, [pathname]);
  return null;
}
