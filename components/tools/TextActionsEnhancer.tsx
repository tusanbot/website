"use client";

import { useEffect } from "react";
import { Copy, Share2 } from "lucide-react";

export default function TextActionsEnhancer() {
  useEffect(() => {
    const path = window.location.pathname;
    if (path !== "/tools/ocr" && path !== "/tools/pdf-to-word") return;

    const enhance = () => {
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
      if (!textarea || textarea.dataset.tusanTextActions === "true") return;
      textarea.dataset.tusanTextActions = "true";
      const wrapper = document.createElement("div");
      wrapper.className = "mt-3 flex flex-wrap gap-2";

      const makeButton = (label: string, icon: SVGElement, onClick: () => void) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold transition hover:border-[var(--primary)] disabled:opacity-40";
        button.appendChild(icon);
        button.appendChild(document.createTextNode(label));
        button.addEventListener("click", onClick);
        return button;
      };

      const copyIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      copyIcon.setAttribute("viewBox", "0 0 24 24"); copyIcon.setAttribute("width", "16"); copyIcon.setAttribute("height", "16"); copyIcon.innerHTML = '<rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
      const shareIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      shareIcon.setAttribute("viewBox", "0 0 24 24"); shareIcon.setAttribute("width", "16"); shareIcon.setAttribute("height", "16"); shareIcon.innerHTML = '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>';

      const copyButton = makeButton("کپی متن", copyIcon, async () => {
        if (!textarea.value) return;
        try { await navigator.clipboard.writeText(textarea.value); copyButton.textContent = "✓ کپی شد"; window.setTimeout(() => { copyButton.textContent = "کپی متن"; }, 1500); }
        catch { textarea.select(); document.execCommand("copy"); }
      });
      const shareButton = makeButton("اشتراک‌گذاری متن", shareIcon, async () => {
        if (!textarea.value) return;
        try {
          if (navigator.share) await navigator.share({ title: "متن استخراج‌شده | توسن", text: textarea.value });
          else { await navigator.clipboard.writeText(textarea.value); shareButton.textContent = "✓ متن کپی شد"; window.setTimeout(() => { shareButton.textContent = "اشتراک‌گذاری متن"; }, 1800); }
        } catch { /* user cancelled share */ }
      });
      const sync = () => { copyButton.disabled = !textarea.value.trim(); shareButton.disabled = !textarea.value.trim(); };
      textarea.addEventListener("input", sync); sync();
      wrapper.append(copyButton, shareButton);
      textarea.insertAdjacentElement("afterend", wrapper);
      return () => { textarea.removeEventListener("input", sync); wrapper.remove(); delete textarea.dataset.tusanTextActions; };
    };

    let cleanup: (() => void) | undefined;
    const observer = new MutationObserver(() => { if (!cleanup) cleanup = enhance(); });
    observer.observe(document.body, { childList: true, subtree: true });
    cleanup = enhance();
    return () => { observer.disconnect(); cleanup?.(); };
  }, []);

  return null;
}
